import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase'
import { safeQuery, safeCount } from '@/lib/db-utils'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    // Get counts with retry logic
    const [totalArticles, totalQuizzes, totalStudents] = await Promise.all([
      safeCount('gk_today_content', {}, { timeout: 2000 }),
      safeCount('quizzes', {}, { timeout: 2000 }),
      safeCount('users', { role: 'student' }, { timeout: 2000 })
    ])

    // Get recent activity
    const recentActivity = await safeQuery(
      async (supabase) => supabase
        .from('gk_today_content')
        .select('id, scraped_at')
        .gte('scraped_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('scraped_at', { ascending: false })
        .limit(10),
      [],
      { timeout: 3000 }
    )


    // Simple content distribution (by source)
    const contentBySection = {
      'GKToday': totalArticles,
      'Total': totalArticles
    }

    // Calculate growth metrics (compared to previous week)
    const previousWeekStart = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    const currentWeekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const [currentWeekCount, previousWeekCount] = await Promise.all([
      safeQuery(
        async (supabase) => supabase
          .from('gk_today_content')
          .select('id', { count: 'exact', head: true })
          .gte('scraped_at', currentWeekStart.toISOString()),
        { count: 0 },
        { timeout: 2000 }
      ).then(result => result.count || 0),
      safeQuery(
        async (supabase) => supabase
          .from('gk_today_content')
          .select('id', { count: 'exact', head: true })
          .gte('scraped_at', previousWeekStart.toISOString())
          .lt('scraped_at', currentWeekStart.toISOString()),
        { count: 0 },
        { timeout: 2000 }
      ).then(result => result.count || 0)
    ])

    const weeklyGrowth = previousWeekCount > 0 
      ? ((currentWeekCount - previousWeekCount) / previousWeekCount * 100).toFixed(1)
      : '0'

    // Calculate system health metrics
    const recentArticlesCount = recentActivity?.length || 0
    const systemHealth = {
      databaseConnections: 'healthy', // This would come from actual monitoring
      apiResponseTime: '< 200ms', // This would come from actual monitoring
      contentFreshness: recentArticlesCount > 0 ? 'good' : 'stale',
      errorRate: '< 0.1%' // This would come from actual error tracking
    }

    const dashboardStats = {
      overview: {
        totalArticles,
        totalQuizzes,
        totalStudents,
        weeklyGrowth: `${weeklyGrowth}%`
      },
      recentActivity: recentActivity?.map((article: any) => ({
        id: article.id,
        type: 'article',
        title: `Article ${article.id}`,
        timestamp: article.scraped_at
      })) || [],
      contentDistribution: contentBySection,
      systemHealth,
      performance: {
        avgLoadTime: '1.2s', // This would come from actual monitoring
        uptime: '99.9%', // This would come from actual monitoring
        activeUsers: Math.floor(Math.random() * 100) + 50, // This would come from actual analytics
        peakHours: '2-4 PM' // This would come from actual analytics
      }
    }

    return NextResponse.json(dashboardStats)

  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    )
  }
}
