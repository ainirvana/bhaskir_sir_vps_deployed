import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Get sections with article count
    const { data: sections, error } = await supabase
      .from('sections')
      .select(`
        id,
        section_title,
        created_at,
        gk_today_content!inner(id)
      `)
      .order('section_title', { ascending: true })

    if (error) {
      throw error
    }

    // Process sections to include article count
    const sectionsWithCount = sections.map(section => ({
      id: section.id,
      section_title: section.section_title,
      created_at: section.created_at,
      article_count: section.gk_today_content?.length || 0
    }))

    return NextResponse.json({
      sections: sectionsWithCount
    })

  } catch (error) {
    console.error('Sections fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sections' },
      { status: 500 }
    )
  }
}
