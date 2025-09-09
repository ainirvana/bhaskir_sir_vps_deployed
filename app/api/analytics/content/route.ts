import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabaseServer = createServerClient();

    // Get content statistics by source
    const { data: contentBySource, error } = await supabaseServer
      .from('gk_today_content')
      .select('source_name')
      .order('source_name');

    if (error) {
      console.error('Error fetching content stats:', error);
      return NextResponse.json({ stats: [] });
    }

    // Group and count by source
    const sourceStats = contentBySource?.reduce((acc: any, item: any) => {
      const source = item.source_name || 'Unknown';
      if (!acc[source]) {
        acc[source] = { count: 0 };
      }
      acc[source].count++;
      return acc;
    }, {});

    // Convert to array format with mock engagement data
    const stats = Object.entries(sourceStats || {}).map(([source, data]: [string, any]) => ({
      source,
      articles: data.count,
      views: Math.round(data.count * (50 + Math.random() * 200)), // Mock view data
      engagement: 0.3 + Math.random() * 0.4, // Mock engagement rate (30-70%)
    }));

    // Sort by article count
    stats.sort((a, b) => b.articles - a.articles);

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Analytics content error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch content statistics' },
      { status: 500 }
    );
  }
}
