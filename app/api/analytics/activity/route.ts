import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabaseServer = createServerClient();

    // Generate mock activity data for the last 24 hours
    // In a real implementation, this would come from actual user tracking
    const activityData = [];
    const now = new Date();
    
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourString = hour.getHours().toString().padStart(2, '0') + ':00';
      
      // Simulate realistic activity patterns
      const isBusinessHour = hour.getHours() >= 9 && hour.getHours() <= 17;
      const baseActivity = isBusinessHour ? 50 : 20;
      const randomVariation = Math.random() * 30;
      
      activityData.push({
        hour: hourString,
        users: Math.round(baseActivity + randomVariation),
        articles: Math.round((baseActivity + randomVariation) * 0.6),
        quizzes: Math.round((baseActivity + randomVariation) * 0.3),
      });
    }

    return NextResponse.json({ activity: activityData });
  } catch (error) {
    console.error('Analytics activity error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity data' },
      { status: 500 }
    );
  }
}
