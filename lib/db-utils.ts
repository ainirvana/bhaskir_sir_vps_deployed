import { getServerSupabase } from './supabase'

export interface RetryOptions {
  maxRetries?: number
  delay?: number
  timeout?: number
}

// Circuit breaker state
let circuitBreakerOpen = false
let lastFailureTime = 0
const CIRCUIT_BREAKER_TIMEOUT = 30000 // 30 seconds

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries = 3, delay = 1000, timeout = 10000 } = options
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Operation timeout after ${timeout}ms`)), timeout)
      )
      
      const result = await Promise.race([operation(), timeoutPromise])
      return result
    } catch (error) {
      console.warn(`Attempt ${attempt}/${maxRetries} failed:`, error)
      
      if (attempt === maxRetries) {
        throw error
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)))
    }
  }
  
  throw new Error('Max retries exceeded')
}

export async function safeQuery<T>(
  queryFn: (supabase: any) => Promise<{ data: T; error: any }>,
  fallback: T,
  options: RetryOptions = {}
): Promise<T> {
  // Check circuit breaker
  if (circuitBreakerOpen) {
    if (Date.now() - lastFailureTime < CIRCUIT_BREAKER_TIMEOUT) {
      console.warn('Circuit breaker open, returning fallback')
      return fallback
    } else {
      circuitBreakerOpen = false // Reset circuit breaker
    }
  }

  try {
    const result = await withRetry(async () => {
      const supabase = getServerSupabase()
      const { data, error } = await queryFn(supabase)
      
      if (error) {
        throw error
      }
      
      return data
    }, options)
    
    // Reset circuit breaker on success
    circuitBreakerOpen = false
    return result || fallback
  } catch (error) {
    console.error('Database query failed:', error)
    
    // Open circuit breaker on repeated failures
    lastFailureTime = Date.now()
    circuitBreakerOpen = true
    
    return fallback
  }
}

export async function safeCount(
  tableName: string,
  filters: Record<string, any> = {},
  options: RetryOptions = {}
): Promise<number> {
  return safeQuery(
    async (supabase) => {
      let query = supabase.from(tableName).select('id', { count: 'exact', head: true })
      
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value)
      })
      
      return query
    },
    0,
    options
  )
}