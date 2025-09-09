import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

interface SearchResult {
  id: string;
  title: string;
  content?: string;
  type: 'article' | 'quiz' | 'slide' | 'student';
  url: string;
  metadata?: {
    source?: string;
    date?: string;
    author?: string;
    tags?: string[];
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabaseServer = createServerClient();
    const url = new URL(request.url);
    
    const query = url.searchParams.get('q') || '';
    const type = url.searchParams.get('type') || 'all';
    const source = url.searchParams.get('source') || 'all';
    const dateRange = url.searchParams.get('dateRange') || 'all';
    const limit = parseInt(url.searchParams.get('limit') || '20');

    if (!query.trim()) {
      return NextResponse.json({
        results: [],
        total: 0,
        query,
        filters: { type, source, dateRange }
      });
    }

    const results: SearchResult[] = [];

    // Search Articles (from gk_today_content)
    if (type === 'all' || type === 'article') {
      try {
        let articleQuery = supabaseServer
          .from('gk_today_content')
          .select(`
            id,
            title,
            intro,
            url,
            source_name,
            published_date,
            created_at
          `)
          .or(`title.ilike.%${query}%,intro.ilike.%${query}%`)
          .order('published_date', { ascending: false })
          .limit(Math.min(limit, 10));

        if (source !== 'all') {
          articleQuery = articleQuery.eq('source_name', source);
        }

        // Apply date filter
        if (dateRange !== 'all') {
          const now = new Date();
          let dateFilter: Date;
          
          switch (dateRange) {
            case 'today':
              dateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              break;
            case 'week':
              dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              break;
            case 'month':
              dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
              break;
            default:
              dateFilter = new Date(0);
          }
          
          articleQuery = articleQuery.gte('published_date', dateFilter.toISOString());
        }

        const { data: articles, error: articlesError } = await articleQuery;
        
        if (articlesError) {
          console.error('Error searching articles:', articlesError);
        } else if (articles) {
          articles.forEach(article => {
            results.push({
              id: `article-${article.id}`,
              title: article.title,
              content: article.intro,
              type: 'article',
              url: `/articles/${article.id}`,
              metadata: {
                source: article.source_name,
                date: article.published_date || article.created_at,
              }
            });
          });
        }
      } catch (error) {
        console.error('Error in article search:', error);
      }
    }

    // Search Quizzes
    if (type === 'all' || type === 'quiz') {
      try {
        const { data: quizzes, error: quizzesError } = await supabaseServer
          .from('quizzes')
          .select(`
            id,
            title,
            description,
            created_at,
            is_published
          `)
          .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(Math.min(limit, 5));

        if (quizzesError) {
          console.error('Error searching quizzes:', quizzesError);
        } else if (quizzes) {
          quizzes.forEach(quiz => {
            results.push({
              id: `quiz-${quiz.id}`,
              title: quiz.title,
              content: quiz.description,
              type: 'quiz',
              url: `/quizzes/${quiz.id}`,
              metadata: {
                date: quiz.created_at,
              }
            });
          });
        }
      } catch (error) {
        console.error('Error in quiz search:', error);
      }
    }

    // Search Slides
    if (type === 'all' || type === 'slide') {
      try {
        const { data: slides, error: slidesError } = await supabaseServer
          .from('slides')
          .select(`
            id,
            title,
            content,
            created_at,
            is_published
          `)
          .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(Math.min(limit, 5));

        if (slidesError) {
          console.error('Error searching slides:', slidesError);
        } else if (slides) {
          slides.forEach(slide => {
            results.push({
              id: `slide-${slide.id}`,
              title: slide.title,
              content: slide.content?.substring(0, 200) + '...',
              type: 'slide',
              url: `/admin/slides/${slide.id}`,
              metadata: {
                date: slide.created_at,
              }
            });
          });
        }
      } catch (error) {
        console.error('Error in slide search:', error);
      }
    }

    // Search Students (admin only - simplified for now)
    if (type === 'student') {
      try {
        const { data: students, error: studentsError } = await supabaseServer
          .from('student_profiles')
          .select(`
            id,
            full_name,
            email,
            student_id,
            created_at
          `)
          .or(`full_name.ilike.%${query}%,email.ilike.%${query}%,student_id.ilike.%${query}%`)
          .order('created_at', { ascending: false })
          .limit(Math.min(limit, 5));

        if (studentsError) {
          console.error('Error searching students:', studentsError);
        } else if (students) {
          students.forEach(student => {
            results.push({
              id: `student-${student.id}`,
              title: `${student.full_name} (${student.student_id})`,
              content: student.email,
              type: 'student',
              url: `/admin/students/${student.id}`,
              metadata: {
                date: student.created_at,
              }
            });
          });
        }
      } catch (error) {
        console.error('Error in student search:', error);
      }
    }

    // Sort results by relevance (simple: by type priority and date)
    const typePriority = { 'article': 1, 'quiz': 2, 'slide': 3, 'student': 4 };
    results.sort((a, b) => {
      // First by type priority
      const typeDiff = (typePriority[a.type] || 999) - (typePriority[b.type] || 999);
      if (typeDiff !== 0) return typeDiff;
      
      // Then by date (newest first)
      const aDate = new Date(a.metadata?.date || 0);
      const bDate = new Date(b.metadata?.date || 0);
      return bDate.getTime() - aDate.getTime();
    });

    // Limit final results
    const limitedResults = results.slice(0, limit);

    return NextResponse.json({
      results: limitedResults,
      total: limitedResults.length,
      query,
      filters: { type, source, dateRange },
      performance: {
        searchTime: Date.now() - new Date().getTime(),
        resultCount: limitedResults.length
      }
    });

  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { 
        error: 'Search failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        results: [],
        total: 0
      },
      { status: 500 }
    );
  }
}
