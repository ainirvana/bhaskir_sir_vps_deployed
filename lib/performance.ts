/**
 * Performance optimization utilities for the educational platform
 * Includes caching, debouncing, prefetching, and query optimization
 */

import React from 'react';

// Cache implementation with TTL support
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize: number;
  
  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    // Remove expired entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.cleanup();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Global cache instance
export const globalCache = new MemoryCache(200);

// API request optimizer with caching and deduplication
interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  cache?: boolean;
  cacheTtl?: number;
  retry?: number;
  timeout?: number;
}

class APIOptimizer {
  private pendingRequests = new Map<string, Promise<any>>();
  private retryDelays = [1000, 2000, 4000]; // Exponential backoff
  
  async request<T>(url: string, options: RequestOptions = {}): Promise<T> {
    const {
      method = 'GET',
      headers = {},
      body,
      cache = true,
      cacheTtl = 5 * 60 * 1000, // 5 minutes default
      retry = 2,
      timeout = 10000
    } = options;

    const cacheKey = this.generateCacheKey(url, method, body);

    // Return cached data for GET requests
    if (method === 'GET' && cache) {
      const cached = globalCache.get<T>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Deduplicate identical requests
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    const requestPromise = this.executeRequest<T>(url, {
      method,
      headers,
      body,
      timeout,
      retry
    });

    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      
      // Cache successful GET requests
      if (method === 'GET' && cache) {
        globalCache.set(cacheKey, result, cacheTtl);
      }
      
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  private async executeRequest<T>(
    url: string, 
    options: { method: string; headers: Record<string, string>; body?: any; timeout: number; retry: number }
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= options.retry; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), options.timeout);

        const response = await fetch(url, {
          method: options.method,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers
          },
          body: options.body ? JSON.stringify(options.body) : undefined,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on client errors (4xx)
        if (error instanceof Error && error.message.includes('HTTP 4')) {
          throw error;
        }
        
        // Wait before retry (exponential backoff)
        if (attempt < options.retry) {
          await this.delay(this.retryDelays[attempt] || 4000);
        }
      }
    }
    
    throw lastError!;
  }

  private generateCacheKey(url: string, method: string, body?: any): string {
    const bodyHash = body ? JSON.stringify(body) : '';
    return `${method}:${url}:${bodyHash}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  clearCache(): void {
    globalCache.clear();
  }

  getCacheStats() {
    return globalCache.getStats();
  }
}

export const apiOptimizer = new APIOptimizer();

// Preloader for critical resources
export class ResourcePreloader {
  private preloadedUrls = new Set<string>();

  preloadPage(href: string): void {
    if (this.preloadedUrls.has(href)) return;
    
    this.preloadedUrls.add(href);
    
    // Preload the page
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    document.head.appendChild(link);
  }

  preloadImage(src: string): Promise<void> {
    if (this.preloadedUrls.has(src)) return Promise.resolve();
    
    this.preloadedUrls.add(src);
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = src;
    });
  }

  preloadImages(sources: string[]): Promise<void[]> {
    return Promise.all(sources.map(src => this.preloadImage(src)));
  }

  preloadArticles(articleIds: string[]): void {
    articleIds.forEach(id => {
      this.preloadPage(`/articles/${id}`);
    });
  }

  preloadQuizzes(quizIds: string[]): void {
    quizIds.forEach(id => {
      this.preloadPage(`/quizzes/${id}`);
    });
  }

  getPreloadedCount(): number {
    return this.preloadedUrls.size;
  }
}

export const resourcePreloader = new ResourcePreloader();

// Performance monitoring
interface PerformanceMetrics {
  apiCalls: number;
  cacheHits: number;
  cacheMisses: number;
  averageResponseTime: number;
  errorRate: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    apiCalls: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageResponseTime: 0,
    errorRate: 0
  };
  
  private responseTimes: number[] = [];
  private errors: number = 0;

  recordApiCall(responseTime: number, fromCache: boolean, error?: boolean): void {
    this.metrics.apiCalls++;
    
    if (fromCache) {
      this.metrics.cacheHits++;
    } else {
      this.metrics.cacheMisses++;
      this.responseTimes.push(responseTime);
    }
    
    if (error) {
      this.errors++;
    }
    
    this.updateAverages();
  }

  private updateAverages(): void {
    if (this.responseTimes.length > 0) {
      this.metrics.averageResponseTime = 
        this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;
    }
    
    this.metrics.errorRate = this.metrics.apiCalls > 0 
      ? this.errors / this.metrics.apiCalls 
      : 0;
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  getCacheHitRate(): number {
    const total = this.metrics.cacheHits + this.metrics.cacheMisses;
    return total > 0 ? this.metrics.cacheHits / total : 0;
  }

  reset(): void {
    this.metrics = {
      apiCalls: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageResponseTime: 0,
      errorRate: 0
    };
    this.responseTimes = [];
    this.errors = 0;
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Optimized API hooks
export function useOptimizedAPI() {
  const get = async <T>(url: string, options?: Omit<RequestOptions, 'method'>) => {
    const startTime = Date.now();
    const cacheKey = apiOptimizer['generateCacheKey'](url, 'GET');
    const fromCache = globalCache.has(cacheKey);
    
    try {
      const result = await apiOptimizer.request<T>(url, { ...options, method: 'GET' });
      const responseTime = Date.now() - startTime;
      performanceMonitor.recordApiCall(responseTime, fromCache);
      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      performanceMonitor.recordApiCall(responseTime, fromCache, true);
      throw error;
    }
  };

  const post = async <T>(url: string, data?: any, options?: Omit<RequestOptions, 'method' | 'body'>) => {
    const startTime = Date.now();
    
    try {
      const result = await apiOptimizer.request<T>(url, { 
        ...options, 
        method: 'POST', 
        body: data,
        cache: false 
      });
      const responseTime = Date.now() - startTime;
      performanceMonitor.recordApiCall(responseTime, false);
      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      performanceMonitor.recordApiCall(responseTime, false, true);
      throw error;
    }
  };

  const invalidateCache = (pattern?: string) => {
    if (pattern) {
      // TODO: Implement pattern-based cache invalidation
      globalCache.clear();
    } else {
      globalCache.clear();
    }
  };

  return {
    get,
    post,
    invalidateCache,
    getMetrics: () => performanceMonitor.getMetrics(),
    getCacheStats: () => apiOptimizer.getCacheStats()
  };
}

// Image optimization utilities
export const imageOptimization = {
  getOptimizedSrc: (src: string, width?: number, height?: number, quality = 80) => {
    if (!src) return '';
    
    // For external images, return as-is
    if (src.startsWith('http') && !src.includes(window.location.hostname)) {
      return src;
    }
    
    // For Next.js image optimization
    const params = new URLSearchParams();
    if (width) params.set('w', width.toString());
    if (height) params.set('h', height.toString());
    params.set('q', quality.toString());
    
    return `${src}?${params.toString()}`;
  },

  preloadCriticalImages: (images: string[]) => {
    images.forEach(src => {
      resourcePreloader.preloadImage(src).catch(console.warn);
    });
  }
};

// Bundle size optimization
export const codeOptimization = {
  // Lazy load components
  lazyComponent: <T extends React.ComponentType<any>>(
    importFunc: () => Promise<{ default: T }>
  ) => {
    return React.lazy(importFunc);
  },

  // Dynamic imports for routes
  dynamicRoute: (importFunc: () => Promise<any>) => {
    return React.lazy(() => importFunc().then(module => ({ default: module.default })));
  }
};

// Export all optimizations
export {
  MemoryCache,
  APIOptimizer
};
