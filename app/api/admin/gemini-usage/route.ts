// app/api/admin/gemini-usage/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getGeminiApiUsageStats, estimateGeminiApiCost } from '@/lib/gemini-tracking';

/**
 * GET handler for retrieving Gemini API usage statistics
 * @param request The incoming request
 * @returns NextResponse with usage statistics
 */
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const url = new URL(request.url);
    const startDateParam = url.searchParams.get('startDate');
    const endDateParam = url.searchParams.get('endDate');
    const includeCost = url.searchParams.get('includeCost') === 'true';
    
    // Parse dates if provided
    const startDate = startDateParam ? new Date(startDateParam) : undefined;
    const endDate = endDateParam ? new Date(endDateParam) : undefined;
    
    // Get usage statistics
    let usageStats;
    
    if (includeCost) {
      usageStats = await estimateGeminiApiCost(startDate, endDate);
    } else {
      usageStats = await getGeminiApiUsageStats(startDate, endDate);
    }
    
    // Calculate summary statistics
    const summary = {
      totalRequests: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCostUsd: 0,
      averageDurationMs: 0,
      errorRate: 0,
    };
    
    if (usageStats.length > 0) {
      let totalDuration = 0;
      let totalErrors = 0;
      
      usageStats.forEach((stat: any) => {
        summary.totalRequests += parseInt(stat.request_count || '0');
        summary.totalInputTokens += parseInt(stat.total_input_tokens || '0');
        summary.totalOutputTokens += parseInt(stat.total_output_tokens || '0');
        totalDuration += parseFloat(stat.avg_duration_ms || '0') * parseInt(stat.request_count || '0');
        totalErrors += parseInt(stat.error_count || '0');
        
        if (stat.total_cost_usd) {
          summary.totalCostUsd += parseFloat(stat.total_cost_usd || '0');
        }
      });
      
      summary.averageDurationMs = totalDuration / summary.totalRequests;
      summary.errorRate = (totalErrors / summary.totalRequests) * 100;
    }
    
    return NextResponse.json({
      success: true,
      data: {
        summary,
        details: usageStats
      }
    });
  } catch (error) {
    console.error('Error retrieving Gemini API usage statistics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve Gemini API usage statistics' },
      { status: 500 }
    );
  }
}