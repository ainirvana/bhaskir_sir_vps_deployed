import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase'
import { safeQuery } from '@/lib/db-utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const difficulty = searchParams.get('difficulty')
    const sort = searchParams.get('sort')

    // Get published quizzes only
    const quizzes = await safeQuery(
      async (supabase) => {
        let query = supabase
          .from('quizzes')
          .select('*')
          .eq('is_published', true)
          .eq('is_expired', false)

        // Apply filters
        if (search) {
          query = query.ilike('title', `%${search}%`)
        }
        if (difficulty && difficulty !== 'all') {
          query = query.eq('difficulty', difficulty)
        }

        // Apply sorting
        if (sort === 'oldest') {
          query = query.order('created_at', { ascending: true })
        } else {
          query = query.order('created_at', { ascending: false })
        }

        return query
      },
      [],
      { timeout: 10000, maxRetries: 1 }
    )

    return NextResponse.json({
      success: true,
      quizzes
    })

  } catch (error) {
    console.error('Student quizzes fetch error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch quizzes',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}