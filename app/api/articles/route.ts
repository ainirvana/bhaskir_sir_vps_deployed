import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabaseServer = createServerClient();
    
    // Get the query parameters    
    const url = new URL(request.url);
    const pageParam = url.searchParams.get('page');
    const limitParam = url.searchParams.get('limit');
    const sourceParam = url.searchParams.get('source');
    const searchParam = url.searchParams.get('search');
    const publishedOnlyParam = url.searchParams.get('publishedOnly');
    const sortParam = url.searchParams.get('sort');
    
    const page = pageParam ? parseInt(pageParam) : 1;
    const limit = limitParam ? parseInt(limitParam) : 10;
    const pageSize = Math.min(limit, 100); // Cap at 100 for performance
    const offset = (page - 1) * pageSize;
    const publishedOnly = publishedOnlyParam !== 'false'; // Default to true for students
    
    // Build the query - use unified schema
    let query = supabaseServer
      .from('gk_today_content')
      .select(`
        id, 
        title, 
        url, 
        image_url, 
        published_date, 
        intro, 
        sequence_order, 
        source_name,
        scraped_at,
        date,
        importance_rating,
        created_at,
        is_published,
        published_at
      `);
      
    // Filter for published articles only (default behavior for students)
    if (publishedOnly) {
      query = query.eq('is_published', true);
    }
      
    // Apply source filter if provided
    if (sourceParam) {
      query = query.eq('source_name', sourceParam);
    }
    
    // Apply search filter if provided
    if (searchParam) {
      query = query.or(`title.ilike.%${searchParam}%,intro.ilike.%${searchParam}%`);
    }
    
    // Apply pagination and ordering with retry logic
    let articles, error;
    let retryCount = 0;
    const maxRetries = 2;
    const isOldestFirst = sortParam === 'oldest';
    
    while (retryCount <= maxRetries) {
      const result = await query;
        
      articles = result.data;
      error = result.error;
      
      if (!error) break;
      
      retryCount++;
      if (retryCount <= maxRetries) {
        console.log(`Retrying articles query (attempt ${retryCount + 1})...`);
        await new Promise(resolve => setTimeout(resolve, 500 * retryCount));
      }
    }
    
    if (error) {
      console.error('Error fetching articles:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return NextResponse.json(
        { 
          error: 'Failed to fetch articles',
          details: error.message,
          code: error.code || 'UNKNOWN_ERROR'
        },
        { status: 500 }
      );
    }
    
    // Get total count for pagination
    let countQuery = supabaseServer
      .from('gk_today_content')
      .select('*', { count: 'exact', head: true });
      
    // Apply same filters for count
    if (publishedOnly) {
      countQuery = countQuery.eq('is_published', true);
    }
      
    if (sourceParam) {
      countQuery = countQuery.eq('source_name', sourceParam);
    }
    
    if (searchParam) {
      countQuery = countQuery.or(`title.ilike.%${searchParam}%,intro.ilike.%${searchParam}%`);
    }
    
    const { count, error: countError } = await countQuery;
    
    if (countError) {
      console.error('Error counting articles:', countError);
      // Provide default pagination even if count fails
      return NextResponse.json({
        articles,
        pagination: {
          total: articles.length,
          page,
          pageSize,
          totalPages: 1
        }
      });
    }
    
    // Sort articles by published_date chronologically
    if (articles && articles.length > 0) {
      articles.sort((a, b) => {
        const dateA = new Date(a.published_date || a.created_at || '1970-01-01').getTime()
        const dateB = new Date(b.published_date || b.created_at || '1970-01-01').getTime()
        return isOldestFirst ? dateA - dateB : dateB - dateA
      })
      
      // Apply pagination after sorting
      const startIndex = offset
      const endIndex = offset + pageSize
      articles = articles.slice(startIndex, endIndex)
    }
    
    return NextResponse.json({
      articles,
      pagination: {
        total: count || 0,
        page,
        pageSize,
        totalPages: count ? Math.ceil(count / pageSize) : 0
      },
      filters: {
        source: sourceParam,
        search: searchParam
      }
    });
  } catch (error: any) {
    console.error('Articles API error:', {
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
