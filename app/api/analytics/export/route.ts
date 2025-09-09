import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabaseServer = createServerClient();

    // Fetch comprehensive data for export
    const [
      usersResult,
      articlesResult,
      quizzesResult,
    ] = await Promise.allSettled([
      supabaseServer.from('student_profiles').select('*'),
      supabaseServer.from('gk_today_content').select('*'),
      supabaseServer.from('quizzes').select('*'),
    ]);

    // Prepare CSV data
    const csvData = [];
    
    // Header
    csvData.push([
      'Date',
      'Total Users',
      'Total Articles', 
      'Total Quizzes',
      'Export Time'
    ]);

    // Data row
    csvData.push([
      new Date().toISOString().split('T')[0],
      usersResult.status === 'fulfilled' ? (usersResult.value.data?.length || 0) : 0,
      articlesResult.status === 'fulfilled' ? (articlesResult.value.data?.length || 0) : 0,
      quizzesResult.status === 'fulfilled' ? (quizzesResult.value.data?.length || 0) : 0,
      new Date().toISOString()
    ]);

    // Convert to CSV string
    const csvString = csvData
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    // Return as downloadable file
    return new Response(csvString, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="analytics-export-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (error) {
    console.error('Analytics export error:', error);
    return NextResponse.json(
      { error: 'Failed to export analytics data' },
      { status: 500 }
    );
  }
}
