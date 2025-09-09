'use server';

import { createServerClient } from '@/lib/supabase';

export interface ContentPublishingData {
  id: string;
  title: string;
  is_published: boolean;
  published_at?: string;
  created_at: string;
}

export interface QuizData {
  id: string;
  title: string;
  description?: string;
  quiz_data: any;
  article_ids: string[];
  is_published: boolean;
  published_at?: string;
  created_at: string;
}

// Article Management Functions
export async function getArticlesForManagement(filters?: {
  search?: string;
  source?: string;
  dateFrom?: string;
  dateTo?: string;
  publishedOnly?: boolean;
}) {
  try {
    const supabase = createServerClient();
    
    // First, try to get articles from scraped_content table (newer format)
    let scrapedQuery = supabase
      .from('scraped_content')
      .select('id, title, intro, source_name, is_published, published_at, created_at')
      .order('created_at', { ascending: false });

    if (filters?.search) {
      scrapedQuery = scrapedQuery.or(`title.ilike.%${filters.search}%,intro.ilike.%${filters.search}%`);
    }

    if (filters?.source && filters.source !== 'all') {
      scrapedQuery = scrapedQuery.eq('source_name', filters.source);
    }

    if (filters?.dateFrom) {
      scrapedQuery = scrapedQuery.gte('created_at', filters.dateFrom);
    }

    if (filters?.dateTo) {
      scrapedQuery = scrapedQuery.lte('created_at', filters.dateTo);
    }

    if (filters?.publishedOnly !== undefined) {
      scrapedQuery = scrapedQuery.eq('is_published', filters.publishedOnly);
    }

    const { data: scrapedData, error: scrapedError } = await scrapedQuery;

    // Also get articles from gk_today_content table (legacy scraped data)
    let legacyQuery = supabase
      .from('gk_today_content')
      .select('id, title, intro, source_name, created_at, scraped_at, url')
      .order('created_at', { ascending: false });

    if (filters?.search) {
      legacyQuery = legacyQuery.or(`title.ilike.%${filters.search}%,intro.ilike.%${filters.search}%`);
    }

    if (filters?.source && filters.source !== 'all') {
      legacyQuery = legacyQuery.eq('source_name', filters.source);
    }

    if (filters?.dateFrom) {
      legacyQuery = legacyQuery.gte('created_at', filters.dateFrom);
    }

    if (filters?.dateTo) {
      legacyQuery = legacyQuery.lte('created_at', filters.dateTo);
    }

    const { data: legacyData, error: legacyError } = await legacyQuery;

    // Combine and normalize the data
    const combinedData: any[] = [];

    // Add scraped_content articles
    if (scrapedData && Array.isArray(scrapedData)) {
      scrapedData.forEach(article => {
        combinedData.push({
          id: article.id,
          title: article.title,
          intro: article.intro,
          source_name: article.source_name,
          is_published: article.is_published || false,
          published_at: article.published_at,
          created_at: article.created_at,
          scraped_date: article.created_at,
          table_source: 'scraped_content'
        });
      });
    }

    // Add gk_today_content articles (legacy format, default to unpublished)
    if (legacyData && Array.isArray(legacyData)) {
      legacyData.forEach(article => {
        combinedData.push({
          id: article.id,
          title: article.title,
          intro: article.intro,
          source_name: article.source_name,
          is_published: false, // Legacy articles default to unpublished
          published_at: null,
          created_at: article.created_at,
          scraped_date: article.scraped_at || article.created_at,
          table_source: 'gk_today_content'
        });
      });
    }

    // Sort by date (most recent first)
    combinedData.sort((a, b) => new Date(b.scraped_date).getTime() - new Date(a.scraped_date).getTime());

    // Apply published filter if needed
    let finalData = combinedData;
    if (filters?.publishedOnly !== undefined) {
      finalData = combinedData.filter(article => article.is_published === filters.publishedOnly);
    }

    if (scrapedError && legacyError) {
      console.error('Error fetching articles:', { scrapedError, legacyError });
      return { success: false, error: 'Failed to fetch articles', data: [] };
    }

    return { success: true, data: finalData };
  } catch (error: any) {
    console.error('Error fetching articles:', error);
    return { success: false, error: error.message, data: [] };
  }
}

export async function publishArticles(articleIds: string[], userId: string) {
  try {
    const supabase = createServerClient();
    const publishedAt = new Date().toISOString();
    
    // Try to update in both tables
    const [scrapedResult, gkTodayResult] = await Promise.all([
      supabase
        .from('scraped_content')
        .update({
          is_published: true,
          published_at: publishedAt,
          published_by: userId
        })
        .in('id', articleIds)
        .select(),
      
      supabase
        .from('gk_today_content')
        .update({
          is_published: true,
          published_at: publishedAt,
          published_by: userId
        })
        .in('id', articleIds)
        .select()
    ]);

    const combinedData = [
      ...(scrapedResult.data || []),
      ...(gkTodayResult.data || [])
    ];

    if (scrapedResult.error && gkTodayResult.error) {
      console.error('Error publishing articles:', { scrapedResult, gkTodayResult });
      return { success: false, error: 'Failed to publish articles' };
    }

    return { success: true, data: combinedData };
  } catch (error: any) {
    console.error('Error publishing articles:', error);
    return { success: false, error: error.message };
  }
}

export async function unpublishArticles(articleIds: string[]) {
  try {
    const supabase = createServerClient();
    
    // Try to update in both tables
    const [scrapedResult, gkTodayResult] = await Promise.all([
      supabase
        .from('scraped_content')
        .update({
          is_published: false,
          published_at: null,
          published_by: null
        })
        .in('id', articleIds)
        .select(),
      
      supabase
        .from('gk_today_content')
        .update({
          is_published: false,
          published_at: null,
          published_by: null
        })
        .in('id', articleIds)
        .select()
    ]);

    const combinedData = [
      ...(scrapedResult.data || []),
      ...(gkTodayResult.data || [])
    ];

    if (scrapedResult.error && gkTodayResult.error) {
      console.error('Error unpublishing articles:', { scrapedResult, gkTodayResult });
      return { success: false, error: 'Failed to unpublish articles' };
    }

    return { success: true, data: combinedData };
  } catch (error: any) {
    console.error('Error unpublishing articles:', error);
    return { success: false, error: error.message };
  }
}

// Quiz Management Functions
export async function saveQuizToDatabase(quizData: {
  title: string;
  description?: string;
  quiz_data: any;
  article_ids: string[];
  created_by: string;
}) {
  try {
    const supabase = createServerClient();
    
    const { data, error } = await supabase
      .from('quizzes')
      .insert([quizData])
      .select()
      .single();

    if (error) {
      console.error('Error saving quiz:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('Error saving quiz:', error);
    return { success: false, error: error.message };
  }
}

export async function getQuizzesForManagement(filters?: {
  search?: string;
  publishedOnly?: boolean;
}) {
  try {
    const supabase = createServerClient();
    
    let query = supabase
      .from('quizzes')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    if (filters?.publishedOnly !== undefined) {
      query = query.eq('is_published', filters.publishedOnly);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching quizzes:', error);
      return { success: false, error: error.message, data: [] };
    }

    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('Error fetching quizzes:', error);
    return { success: false, error: error.message, data: [] };
  }
}

export async function publishQuiz(quizId: string, userId: string) {
  try {
    const supabase = createServerClient();
    
    const { data, error } = await supabase
      .from('quizzes')
      .update({
        is_published: true,
        published_at: new Date().toISOString(),
        published_by: userId
      })
      .eq('id', quizId)
      .select()
      .single();

    if (error) {
      console.error('Error publishing quiz:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('Error publishing quiz:', error);
    return { success: false, error: error.message };
  }
}

export async function unpublishQuiz(quizId: string) {
  try {
    const supabase = createServerClient();
    
    const { data, error } = await supabase
      .from('quizzes')
      .update({
        is_published: false,
        published_at: null,
        published_by: null
      })
      .eq('id', quizId)
      .select()
      .single();

    if (error) {
      console.error('Error unpublishing quiz:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('Error unpublishing quiz:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteQuiz(quizId: string) {
  try {
    const supabase = createServerClient();
    
    const { error } = await supabase
      .from('quizzes')
      .delete()
      .eq('id', quizId);

    if (error) {
      console.error('Error deleting quiz:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting quiz:', error);
    return { success: false, error: error.message };
  }
}

// Get published content for students
export async function getPublishedArticles(limit?: number) {
  try {
    const supabase = createServerClient();
    
    // Get published articles from both tables
    const [scrapedResult, gkTodayResult] = await Promise.all([
      // From scraped_content table
      supabase
        .from('scraped_content')
        .select('id, title, intro, source_name, is_published, published_at, created_at')
        .eq('is_published', true)
        .order('published_at', { ascending: false }),
      
      // From gk_today_content table
      supabase
        .from('gk_today_content')
        .select('id, title, intro, source_name, is_published, published_at, created_at, scraped_at')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
    ]);

    const combinedData: any[] = [];

    // Add scraped_content articles
    if (scrapedResult.data && Array.isArray(scrapedResult.data)) {
      scrapedResult.data.forEach(article => {
        combinedData.push({
          ...article,
          scraped_date: article.created_at,
          table_source: 'scraped_content'
        });
      });
    }

    // Add gk_today_content articles
    if (gkTodayResult.data && Array.isArray(gkTodayResult.data)) {
      gkTodayResult.data.forEach(article => {
        combinedData.push({
          ...article,
          scraped_date: article.scraped_at || article.created_at,
          table_source: 'gk_today_content'
        });
      });
    }

    // Sort by published_at (most recent first)
    combinedData.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());

    // Apply limit if specified
    const finalData = limit ? combinedData.slice(0, limit) : combinedData;

    if (scrapedResult.error && gkTodayResult.error) {
      console.error('Error fetching published articles:', { scrapedResult, gkTodayResult });
      return { success: false, error: 'Failed to fetch articles', data: [] };
    }

    return { success: true, data: finalData };
  } catch (error: any) {
    console.error('Error fetching published articles:', error);
    return { success: false, error: error.message, data: [] };
  }
}

export async function getPublishedQuizzes() {
  try {
    const supabase = createServerClient();
    
    const { data, error } = await supabase
      .from('quizzes')
      .select('id, title, description, quiz_data, created_at, published_at')
      .eq('is_published', true)
      .order('published_at', { ascending: false });

    if (error) {
      console.error('Error fetching published quizzes:', error);
      return { success: false, error: error.message, data: [] };
    }

    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('Error fetching published quizzes:', error);
    return { success: false, error: error.message, data: [] };
  }
}

export async function getQuizById(quizId: string) {
  try {
    const supabase = createServerClient();
    
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', quizId)
      .single();

    if (error) {
      console.error('Error fetching quiz:', error);
      return { success: false, error: error.message };
    }

    // Ensure questions are properly formatted
    if (data && data.quiz_data && data.quiz_data.questions) {
      data.questions = data.quiz_data.questions;
    } else if (data && data.questions) {
      // Questions are already in the right place
    } else {
      // No questions found
      data.questions = [];
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('Error fetching quiz:', error);
    return { success: false, error: error.message };
  }
}

export async function saveQuiz(quizData: any) {
  try {
    const supabase = createServerClient();
    
    const { data, error } = await supabase
      .from('quizzes')
      .insert({
        title: quizData.title,
        description: quizData.description,
        quiz_data: {
          questions: quizData.questions,
          timeLimit: quizData.timeLimit,
          difficulty: quizData.difficulty,
          subject: quizData.subject
        },
        article_ids: [],
        is_published: quizData.isPublished,
        published_at: quizData.isPublished ? new Date().toISOString() : null,
        published_by: quizData.createdBy
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving quiz:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('Error saving quiz:', error);
    return { success: false, error: error.message };
  }
}

// Delete articles function
export async function deleteArticles(articleIds: string[]) {
  try {
    const supabase = createServerClient();
    
    // Try to delete from both tables
    const [scrapedResult, gkTodayResult] = await Promise.all([
      supabase
        .from('scraped_content')
        .delete()
        .in('id', articleIds),
      
      supabase
        .from('gk_today_content')
        .delete()
        .in('id', articleIds)
    ]);

    if (scrapedResult.error && gkTodayResult.error) {
      console.error('Error deleting articles:', { scrapedResult, gkTodayResult });
      return { success: false, error: 'Failed to delete articles' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting articles:', error);
    return { success: false, error: error.message };
  }
}
