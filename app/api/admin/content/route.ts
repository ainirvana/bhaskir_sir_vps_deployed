import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase'
import { safeQuery, safeCount } from '@/lib/db-utils'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const source = searchParams.get('source')
    const status = searchParams.get('status')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const sort = searchParams.get('sort')

    // Get articles from both tables without sorting
    const isOldestFirst = sort === 'oldest'
    const [gkTodayArticles, scrapedArticles] = await Promise.all([
      safeQuery(
        async (supabase) => {
          let query = supabase
            .from('gk_today_content')
            .select('id, title, intro, source_name, is_published, published_at, created_at, scraped_at, published_date')

          // Apply filters
          if (search) {
            query = query.ilike('title', `%${search}%`)
          }
          if (source && source !== 'all') {
            query = query.eq('source_name', source)
          }
          if (status === 'published') {
            query = query.eq('is_published', true)
          } else if (status === 'draft') {
            query = query.eq('is_published', false)
          }
          if (dateFrom) {
            query = query.gte('scraped_at', dateFrom)
          }
          if (dateTo) {
            query = query.lte('scraped_at', dateTo)
          }

          return query
        },
        [],
        { timeout: 10000, maxRetries: 1 }
      ),
      safeQuery(
        async (supabase) => {
          let query = supabase
            .from('scraped_content')
            .select('id, title, intro, source_name, is_published, published_at, created_at')

          // Apply filters
          if (search) {
            query = query.ilike('title', `%${search}%`)
          }
          if (source && source !== 'all') {
            query = query.eq('source_name', source)
          }
          if (status === 'published') {
            query = query.eq('is_published', true)
          } else if (status === 'draft') {
            query = query.eq('is_published', false)
          }
          if (dateFrom) {
            query = query.gte('created_at', dateFrom)
          }
          if (dateTo) {
            query = query.lte('created_at', dateTo)
          }

          return query
        },
        [],
        { timeout: 10000, maxRetries: 1 }
      )
    ])

    // Combine articles from both tables
    const combinedArticles = [
      ...gkTodayArticles.map(article => ({ ...article, table_source: 'gk_today_content' })),
      ...scrapedArticles.map(article => ({ ...article, table_source: 'scraped_content' }))
    ]

    // Sort by created_at chronologically, mixing all sources
    combinedArticles.sort((a, b) => {
      const dateA = new Date(a.published_date || a.scraped_at || a.created_at || '1970-01-01').getTime()
      const dateB = new Date(b.published_date || b.scraped_at || b.created_at || '1970-01-01').getTime()
      return isOldestFirst ? dateA - dateB : dateB - dateA
    })

    // Get quizzes with retry logic
    const quizzes = await safeQuery(
      async (supabase) => supabase
        .from('quizzes')
        .select('*')
        .order('created_at', { ascending: false }),
      [],
      { timeout: 10000, maxRetries: 1 }
    )

    return NextResponse.json({
      success: true,
      articles: combinedArticles,
      quizzes
    })

  } catch (error) {
    console.error('Content fetch error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : String(error),
      hint: 'Check database connection and table existence',
      code: error instanceof Error && 'code' in error ? error.code : ''
    })
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch content',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { articleId, quizId, updates } = await request.json()

    if (!articleId && !quizId) {
      return NextResponse.json({ error: 'Article ID or Quiz ID is required' }, { status: 400 })
    }

    const supabase = getServerSupabase()
    
    if (quizId) {
      // Update quiz
      const { data, error } = await supabase
        .from('quizzes')
        .update({
          ...updates,
          published_at: updates.is_published ? new Date().toISOString() : null
        })
        .eq('id', quizId)
        .select()

      if (error) {
        throw error
      }

      return NextResponse.json({ 
        success: true, 
        quiz: data[0],
        message: 'Quiz updated successfully' 
      })
    } else {
      // Update article - try both tables
      const [gkTodayResult, scrapedResult] = await Promise.all([
        supabase
          .from('gk_today_content')
          .update({
            ...updates,
            published_at: updates.is_published ? new Date().toISOString() : null
          })
          .eq('id', articleId)
          .select(),
        
        supabase
          .from('scraped_content')
          .update({
            ...updates,
            published_at: updates.is_published ? new Date().toISOString() : null
          })
          .eq('id', articleId)
          .select()
      ])

      const updatedArticle = gkTodayResult.data?.[0] || scrapedResult.data?.[0]
      
      if (!updatedArticle && gkTodayResult.error && scrapedResult.error) {
        console.error('Article update errors:', { gkTodayResult, scrapedResult })
        throw new Error('Failed to update article in any table')
      }

      return NextResponse.json({ 
        success: true, 
        article: updatedArticle,
        message: 'Article updated successfully' 
      })
    }

  } catch (error) {
    console.error('Content update error:', error)
    return NextResponse.json(
      { error: 'Failed to update content' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const articleId = searchParams.get('articleId')

    if (!articleId) {
      return NextResponse.json({ error: 'Article ID is required' }, { status: 400 })
    }

    const supabase = getServerSupabase()
    
    // Try to delete from both tables
    const [gkTodayResult, scrapedResult] = await Promise.all([
      supabase
        .from('gk_today_content')
        .delete()
        .eq('id', articleId),
      
      supabase
        .from('scraped_content')
        .delete()
        .eq('id', articleId)
    ])

    // Check if at least one deletion was successful
    if (gkTodayResult.error && scrapedResult.error) {
      console.error('Article deletion errors:', { gkTodayResult, scrapedResult })
      throw new Error('Failed to delete article from any table')
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Article deleted successfully' 
    })

  } catch (error) {
    console.error('Article deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete article' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const articleData = await request.json()

    // Validate required fields
    if (!articleData.title || !articleData.content) {
      return NextResponse.json({ 
        error: 'Title and content are required' 
      }, { status: 400 })
    }

    const supabase = getServerSupabase()
    
    // Create new article in scraped_content table (preferred)
    const { data, error } = await supabase
      .from('scraped_content')
      .insert({
        ...articleData,
        created_at: new Date().toISOString(),
        is_published: articleData.is_published || false
      })
      .select()

    if (error) {
      throw error
    }

    return NextResponse.json({ 
      success: true, 
      article: data[0],
      message: 'Article created successfully' 
    }, { status: 201 })

  } catch (error) {
    console.error('Article creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create article' },
      { status: 500 }
    )
  }
}
