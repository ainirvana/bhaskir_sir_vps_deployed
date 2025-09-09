// lib/gemini-tracking.ts
import pool from './postgres';

// Interface for Gemini API log entry
export interface GeminiApiLogEntry {
  endpoint: string;
  requestType: string;
  inputTokens: number;
  outputTokens: number;
  modelName: string;
  durationMs: number;
  status: 'success' | 'error';
  errorMessage?: string;
  userId?: string;
  requestData?: Record<string, any>;
}

/**
 * Logs Gemini API usage metrics to the database
 * @param logEntry The log entry containing API usage metrics
 * @returns Promise that resolves when the log entry is saved
 */
export async function logGeminiApiUsage(logEntry: GeminiApiLogEntry): Promise<void> {
  try {
    const query = `
      INSERT INTO gemini_api_logs (
        endpoint, 
        request_type, 
        input_tokens, 
        output_tokens, 
        model_name, 
        duration_ms, 
        status, 
        error_message, 
        user_id, 
        request_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;

    const values = [
      logEntry.endpoint,
      logEntry.requestType,
      logEntry.inputTokens,
      logEntry.outputTokens,
      logEntry.modelName,
      logEntry.durationMs,
      logEntry.status,
      logEntry.errorMessage || null,
      logEntry.userId || null,
      logEntry.requestData ? JSON.stringify(logEntry.requestData) : null
    ];

    await pool.query(query, values);
    console.log(`✅ Logged Gemini API usage: ${logEntry.inputTokens} input tokens, ${logEntry.outputTokens} output tokens`);
  } catch (error) {
    console.error('❌ Error logging Gemini API usage:', error);
    // Don't throw the error to prevent disrupting the main application flow
  }
}

/**
 * Retrieves Gemini API usage statistics
 * @param startDate Optional start date for filtering
 * @param endDate Optional end date for filtering
 * @returns Promise that resolves to usage statistics
 */
export async function getGeminiApiUsageStats(startDate?: Date, endDate?: Date): Promise<any> {
  try {
    let query = `
      SELECT 
        model_name,
        COUNT(*) as request_count,
        SUM(input_tokens) as total_input_tokens,
        SUM(output_tokens) as total_output_tokens,
        AVG(duration_ms) as avg_duration_ms,
        COUNT(CASE WHEN status = 'error' THEN 1 END) as error_count
      FROM gemini_api_logs
    `;

    const values: any[] = [];
    let whereClauseAdded = false;

    if (startDate) {
      query += ' WHERE created_at >= $1';
      values.push(startDate);
      whereClauseAdded = true;
    }

    if (endDate) {
      query += whereClauseAdded ? ' AND created_at <= $2' : ' WHERE created_at <= $1';
      values.push(endDate);
    }

    query += ' GROUP BY model_name ORDER BY total_input_tokens DESC';

    const result = await pool.query(query, values);
    return result.rows;
  } catch (error) {
    console.error('❌ Error retrieving Gemini API usage statistics:', error);
    throw error;
  }
}

/**
 * Estimates the cost of Gemini API usage based on current pricing
 * Note: Pricing is subject to change, this is just an estimate
 * @param startDate Optional start date for filtering
 * @param endDate Optional end date for filtering
 * @returns Promise that resolves to cost estimate
 */
export async function estimateGeminiApiCost(startDate?: Date, endDate?: Date): Promise<any> {
  try {
    const stats = await getGeminiApiUsageStats(startDate, endDate);
    
    // Current pricing (as of implementation date)
    // These rates should be updated if Google changes their pricing
    const pricingRates: Record<string, { inputRate: number; outputRate: number }> = {
      'gemini-1.5-pro-latest': {
        inputRate: 0.00001, // $0.00001 per 1K input tokens
        outputRate: 0.00003  // $0.00003 per 1K output tokens
      },
      'gemini-1.5-flash-latest': {
        inputRate: 0.000003, // $0.000003 per 1K input tokens
        outputRate: 0.000005 // $0.000005 per 1K output tokens
      }
    };

    // Calculate cost for each model
    return stats.map((stat: any) => {
      const rates = pricingRates[stat.model_name] || { inputRate: 0, outputRate: 0 };
      
      const inputCost = (stat.total_input_tokens / 1000) * rates.inputRate;
      const outputCost = (stat.total_output_tokens / 1000) * rates.outputRate;
      const totalCost = inputCost + outputCost;
      
      return {
        ...stat,
        input_cost_usd: inputCost,
        output_cost_usd: outputCost,
        total_cost_usd: totalCost
      };
    });
  } catch (error) {
    console.error('❌ Error estimating Gemini API cost:', error);
    throw error;
  }
}