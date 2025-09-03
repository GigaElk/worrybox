import { PrismaClient } from '@prisma/client'

interface QueryPerformanceMetrics {
  query: string
  duration: number
  timestamp: Date
  params?: any
}

interface PerformanceStats {
  averageQueryTime: number
  slowQueries: QueryPerformanceMetrics[]
  totalQueries: number
  cacheHitRate?: number
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private queryMetrics: QueryPerformanceMetrics[] = []
  private readonly SLOW_QUERY_THRESHOLD = 1000 // 1 second
  private readonly MAX_METRICS_HISTORY = 1000

  private constructor() {}

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  // Wrap Prisma queries with performance monitoring
  public async monitorQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>,
    params?: any
  ): Promise<T> {
    const startTime = Date.now()
    
    try {
      const result = await queryFn()
      const duration = Date.now() - startTime
      
      this.recordQuery({
        query: queryName,
        duration,
        timestamp: new Date(),
        params
      })
      
      if (duration > this.SLOW_QUERY_THRESHOLD) {
        console.warn(`🐌 Slow query detected: ${queryName} took ${duration}ms`, params)
      }
      
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`❌ Query failed: ${queryName} after ${duration}ms`, error)
      throw error
    }
  }

  private recordQuery(metric: QueryPerformanceMetrics): void {
    this.queryMetrics.push(metric)
    
    // Keep only recent metrics to prevent memory leaks
    if (this.queryMetrics.length > this.MAX_METRICS_HISTORY) {
      this.queryMetrics = this.queryMetrics.slice(-this.MAX_METRICS_HISTORY)
    }
  }

  // Get performance statistics
  public getStats(): PerformanceStats {
    if (this.queryMetrics.length === 0) {
      return {
        averageQueryTime: 0,
        slowQueries: [],
        totalQueries: 0
      }
    }

    const totalTime = this.queryMetrics.reduce((sum, metric) => sum + metric.duration, 0)
    const averageQueryTime = totalTime / this.queryMetrics.length
    
    const slowQueries = this.queryMetrics
      .filter(metric => metric.duration > this.SLOW_QUERY_THRESHOLD)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10) // Top 10 slowest queries

    return {
      averageQueryTime: Math.round(averageQueryTime * 100) / 100,
      slowQueries,
      totalQueries: this.queryMetrics.length
    }
  }

  // Get query performance for specific operations
  public getQueryStats(queryName: string): {
    count: number
    averageTime: number
    minTime: number
    maxTime: number
  } {
    const queryMetrics = this.queryMetrics.filter(m => m.query === queryName)
    
    if (queryMetrics.length === 0) {
      return { count: 0, averageTime: 0, minTime: 0, maxTime: 0 }
    }

    const times = queryMetrics.map(m => m.duration)
    const totalTime = times.reduce((sum, time) => sum + time, 0)

    return {
      count: queryMetrics.length,
      averageTime: Math.round((totalTime / queryMetrics.length) * 100) / 100,
      minTime: Math.min(...times),
      maxTime: Math.max(...times)
    }
  }

  // Clear metrics (useful for testing or periodic cleanup)
  public clearMetrics(): void {
    this.queryMetrics = []
  }

  // Log performance summary
  public logPerformanceSummary(): void {
    const stats = this.getStats()
    
    console.log('📊 Database Performance Summary:')
    console.log(`   Total Queries: ${stats.totalQueries}`)
    console.log(`   Average Query Time: ${stats.averageQueryTime}ms`)
    console.log(`   Slow Queries (>${this.SLOW_QUERY_THRESHOLD}ms): ${stats.slowQueries.length}`)
    
    if (stats.slowQueries.length > 0) {
      console.log('   Top Slow Queries:')
      stats.slowQueries.slice(0, 5).forEach((query, index) => {
        console.log(`     ${index + 1}. ${query.query}: ${query.duration}ms`)
      })
    }
  }
}

// Enhanced Prisma client with performance monitoring
export function createMonitoredPrismaClient(): PrismaClient {
  const prisma = new PrismaClient({
    log: [
      { level: 'query', emit: 'event' },
      { level: 'error', emit: 'stdout' },
      { level: 'warn', emit: 'stdout' },
    ],
  })

  const monitor = PerformanceMonitor.getInstance()

  // Monitor query events
  prisma.$on('query', (e) => {
    const duration = e.duration
    if (duration > 100) { // Log queries taking more than 100ms
      console.log(`🔍 Query: ${e.query}`)
      console.log(`⏱️  Duration: ${duration}ms`)
      console.log(`📝 Params: ${e.params}`)
    }
  })

  return prisma
}

export const performanceMonitor = PerformanceMonitor.getInstance()

// Middleware for Express to log performance stats periodically
export function createPerformanceMiddleware() {
  let requestCount = 0
  const STATS_INTERVAL = 100 // Log stats every 100 requests

  return (req: any, res: any, next: any) => {
    requestCount++
    
    if (requestCount % STATS_INTERVAL === 0) {
      performanceMonitor.logPerformanceSummary()
    }
    
    next()
  }
}

// Utility functions for common performance optimizations
export const performanceUtils = {
  // Batch multiple database operations
  async batchOperations<T>(
    operations: (() => Promise<T>)[],
    batchSize = 10
  ): Promise<T[]> {
    const results: T[] = []
    
    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize)
      const batchResults = await Promise.all(batch.map(op => op()))
      results.push(...batchResults)
    }
    
    return results
  },

  // Debounce function for reducing API calls
  debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => func(...args), wait)
    }
  },

  // Throttle function for rate limiting
  throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean
    
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args)
        inThrottle = true
        setTimeout(() => inThrottle = false, limit)
      }
    }
  }
}