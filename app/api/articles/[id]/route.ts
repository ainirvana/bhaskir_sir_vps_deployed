import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: articleId } = await params;
    
    // Add a small delay to prevent race conditions
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const supabaseServer = createServerClient();
    
    // Try to fetch the article from both tables
    const [gkTodayResult, scrapedResult] = await Promise.all([
      supabaseServer
        .from('gk_today_content')
        .select('*')
        .eq('id', articleId)
        .eq('is_published', true) // Only published articles
        .single(),
      
      supabaseServer
        .from('scraped_content')
        .select('*')
        .eq('id', articleId)
        .eq('is_published', true) // Only published articles
        .single()
    ]);
    
    let article = null;
    let tableSource = null;
    
    if (gkTodayResult.data) {
      article = gkTodayResult.data;
      tableSource = 'gk_today_content';
    } else if (scrapedResult.data) {
      article = scrapedResult.data;
      tableSource = 'scraped_content';
    }
    
    if (!article) {
      console.error('Article not found or not published:', { gkTodayResult, scrapedResult });
      return NextResponse.json(
        { error: 'Article not found or not published' },
        { status: 404 }
      );
    }
    
    // Fetch the sections for this article
    const { data: sections, error: sectionsError } = await supabaseServer
      .from('sections')
      .select('*')
      .eq('article_id', articleId)
      .order('sequence_order', { ascending: true });
    
    if (sectionsError) {
      console.error('Error fetching sections:', sectionsError);
      return NextResponse.json(
        { error: 'Failed to fetch article sections' },
        { status: 500 }
      );
    }
    
    // For each section with bullet points, fetch the bullets
    const sectionsWithBullets = await Promise.all(
      sections.map(async (section) => {
        if (section.type === 'list') {
          // Add retry logic for bullet fetching
          let bullets, bulletsError;
          let retryCount = 0;
          const maxRetries = 2;
          
          while (retryCount <= maxRetries) {
            const result = await supabaseServer
              .from('section_bullets')
              .select('*')
              .eq('section_id', section.id)
              .order('bullet_order', { ascending: true });
              
            bullets = result.data;
            bulletsError = result.error;
            
            if (!bulletsError) break;
            
            retryCount++;
            if (retryCount <= maxRetries) {
              console.log(`Retrying bullets fetch (attempt ${retryCount + 1})...`);
              await new Promise(resolve => setTimeout(resolve, 300 * retryCount));
            }
          }
          
          if (bulletsError) {
            console.error('Error fetching bullets:', {
              message: bulletsError.message,
              details: bulletsError.details,
              hint: bulletsError.hint,
              code: bulletsError.code
            });
            return { ...section, bullets: [] };
          }
          
          return { ...section, bullets };
        }
        
        return section;
      })
    );
    
    // Return the complete article with sections and bullets
    return NextResponse.json({
      article: {
        ...article,
        table_source: tableSource
      },
      sections: sectionsWithBullets
    });
  } catch (error: any) {
    console.error('Article detail API error:', {
      message: error?.message || 'Unknown error',
      details: error?.stack || error?.toString(),
      hint: error?.hint || '',
      code: error?.code || ''
    });
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error?.message || 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
