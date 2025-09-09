import { NextRequest, NextResponse } from 'next/server';
import { generateSlidesFromArticle } from '@/lib/gemini-service';
import { createServerClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { articleId } = await request.json();

    if (!articleId) {
      return NextResponse.json(
        { error: 'Article ID is required' },
        { status: 400 }
      );
    }    // Get the article content from database
    const supabase = createServerClient();
    const { data: article, error: articleError } = await supabase
      .from('gk_today_content')
      .select('title, intro, id')
      .eq('id', articleId)
      .single();

    if (articleError || !article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    // Get sections for this article
    const { data: sections, error: sectionsError } = await supabase
      .from('sections')
      .select('id, heading, content, type, sequence_order')
      .eq('article_id', articleId)
      .order('sequence_order', { ascending: true });

    if (sectionsError) {
      console.error('Error fetching sections:', sectionsError);
    }

    // Prepare content for AI processing
    let fullContent = `Title: ${article.title}\n\n`;
    
    if (article.intro) {
      fullContent += `Introduction: ${article.intro}\n\n`;
    }

    if (sections && sections.length > 0) {
      fullContent += 'Sections:\n';
      
      // For each section, get bullet points if it's a list type
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        fullContent += `${i + 1}. ${section.heading || 'Section'}\n`;
        if (section.content) {
          fullContent += `${section.content}\n`;
        }
        
        if (section.type === 'list') {
          // Get bullet points for this section
          const { data: bullets, error: bulletsError } = await supabase
            .from('section_bullets')
            .select('content, bullet_order')
            .eq('section_id', section.id)
            .order('bullet_order', { ascending: true });
          
          if (!bulletsError && bullets && bullets.length > 0) {
            bullets.forEach((bullet: any) => {
              fullContent += `• ${bullet.content}\n`;
            });
          }
        }
        fullContent += '\n';
      }
    }    // Generate slides using Gemini AI
    const slides = await generateSlidesFromArticle(fullContent);

    if (!slides || slides.length === 0) {
      return NextResponse.json(
        { error: 'Failed to generate slides from article content' },
        { status: 500 }
      );
    }

    // First create a directory for the slides
    const { data: directory, error: dirError } = await supabase
      .from('slide_directories')
      .insert([{
        name: `AI Generated: ${article.title}`,
        description: `AI-generated slides from article: ${article.title}`,
        is_published: false,
        created_by: null, // Will be set by admin when reviewing
        directory_order: 0
      }])
      .select()
      .single();

    if (dirError) {
      console.error('Error creating directory:', dirError);
      return NextResponse.json(
        { error: 'Failed to create slide directory' },
        { status: 500 }
      );
    }

    // Store the generated slides in the database
    const { data: insertedSlides, error: insertError } = await supabase
      .from('slides')
      .insert(
        slides.map((slide, index) => ({
          directory_id: directory.id,
          title: slide.title,
          body_content: slide.content,
          type: 'standard',
          slide_order: index + 1,
          is_published: false,
          created_by: null, // Will be set by admin when reviewing
        }))
      )
      .select();

    if (insertError) {
      console.error('Error inserting slides:', insertError);
      return NextResponse.json(
        { error: 'Failed to save generated slides' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      slides: insertedSlides,
      message: `Successfully generated ${slides.length} slides`
    });

  } catch (error) {
    console.error('Error generating slides:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate slides',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
