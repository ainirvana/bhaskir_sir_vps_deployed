import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabaseServer = createServerClient();

    // Get basic metrics
    const [
      usersResult,
      articlesResult,
      quizzesResult,
    ] = await Promise.allSettled([
      supabaseServer.from('student_profiles').select('id', { count: 'exact', head: true }),
      supabaseServer.from('gk_today_content').select('id', { count: 'exact', head: true }),
      supabaseServer.from('quizzes').select('id', { count: 'exact', head: true }),
    ]);

    // Get active users (users who logged in within the last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const activeUsersResult = await supabaseServer
      .from('student_profiles')
      .select('id', { count: 'exact', head: true })
      .gte('last_login', twentyFourHoursAgo);

    const metrics = {
      totalUsers: usersResult.status === 'fulfilled' ? (usersResult.value.count || 0) : 0,
      activeUsers: activeUsersResult.data ? (activeUsersResult.count || 0) : 0,
      totalArticles: articlesResult.status === 'fulfilled' ? (articlesResult.value.count || 0) : 0,
      totalQuizzes: quizzesResult.status === 'fulfilled' ? (quizzesResult.value.count || 0) : 0,
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Analytics metrics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
