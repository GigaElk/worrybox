import React, { useMemo, useState, useEffect, useCallback } from 'react'

interface PerformanceMetric {
  name: string
  startTime: number
  endTime?: number
  duration?: number
  metadata?: Record<string, any>
}

interface ComponentMetrics {
  renderCount: number
  averageRenderTime: number
  lastRenderTime: number
  totalRenderTime: number
  errorCount: number
  cacheHitRate: number
}

class PerformanceMonitor {
  private metrics = new Map<string, PerformanceMetric[]>()
  private componentMetrics = new Map<string, ComponentMetrics>()
  private observers = new Map<string, PerformanceObserver>()
  private isEnabled = process.env.NODE_ENV === 'development'

  constructor() {
    if (this.isEnabled && typeof window !== 'undefined') {
      this.initializeObservers()
    }
  }

  private initializeObservers() {
    // Observe long tasks
    if ('PerformanceObserver' in window) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) { // Tasks longer than 50ms
              this.recordMetric('long-task', {
                duration: entry.duration,
                startTime: entry.startTime,
                name: entry.name
              })
            }
          }
        })
        longTaskObserver.observe({ entryTypes: ['longtask'] })
        this.observers.set('longtask', longTaskObserver)
      } catch (e) {
        console.warn('Long task observer not supported')
      }

      // Observe navigation timing
      try {
        const navigationObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordNavigationMetrics(entry as PerformanceNavigationTiming)
          }
        })
        navigationObserver.observe({ entryTypes: ['navigation'] })
        this.observers.set('navigation', navigationObserver)
      } catch (e) {
        console.warn('Navigation observer not supported')
      }

      // Observe resource loading
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name.includes('api/') || entry.name.includes('similar') || entry.name.includes('metoo')) {
              this.recordResourceMetrics(entry as PerformanceResourceTiming)
            }
          }
        })
        resourceObserver.observe({ entryTypes: ['resource'] })
        this.observers.set('resource', resourceObserver)
      } catch (e) {
        console.warn('Resource observer not supported')
      }
    }
  }

  // Start timing a specific operation
  startTiming(name: string, metadata?: Record<string, any>): string {
    if (!this.isEnabled) return name

    const id = `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const metric: PerformanceMetric = {
      name,
      startTime: performance.now(),
      metadata
    }

    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }
    this.metrics.get(name)!.push(metric)

    return id
  }

  // End timing for a specific operation
  endTiming(id: string): number | null {
    if (!this.isEnabled) return null

    const [name] = id.split('_')
    const metrics = this.metrics.get(name)
    if (!metrics) return null

    const metric = metrics.find(m => 
      id.includes(m.startTime.toString()) && !m.endTime
    )
    
    if (metric) {
      metric.endTime = performance.now()
      metric.duration = metric.endTime - metric.startTime
      return metric.duration
    }

    return null
  }

  // Record a simple metric
  recordMetric(name: string, data: Record<string, any>): void {
    if (!this.isEnabled) return

    const metric: PerformanceMetric = {
      name,
      startTime: performance.now(),
      endTime: performance.now(),
      duration: 0,
      metadata: data
    }

    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }
    this.metrics.get(name)!.push(metric)
  }

  // Record component render metrics
  recordComponentRender(componentName: string, renderTime: number, hadError = false): void {
    if (!this.isEnabled) return

    const existing = this.componentMetrics.get(componentName) || {
      renderCount: 0,
      averageRenderTime: 0,
      lastRenderTime: 0,
      totalRenderTime: 0,
      errorCount: 0,
      cacheHitRate: 0
    }

    existing.renderCount++
    existing.lastRenderTime = renderTime
    existing.totalRenderTime += renderTime
    existing.averageRenderTime = existing.totalRenderTime / existing.renderCount
    
    if (hadError) {
      existing.errorCount++
    }

    this.componentMetrics.set(componentName, existing)
  }

  // Record cache hit/miss
  recordCacheMetric(componentName: string, isHit: boolean): void {
    if (!this.isEnabled) return

    const existing = this.componentMetrics.get(componentName)
    if (existing) {
      const totalRequests = existing.renderCount
      const currentHits = existing.cacheHitRate * totalRequests
      const newHits = isHit ? currentHits + 1 : currentHits
      existing.cacheHitRate = newHits / (totalRequests + 1)
      this.componentMetrics.set(componentName, existing)
    }
  }

  // Get metrics for a specific operation
  getMetrics(name: string): PerformanceMetric[] {
    return this.metrics.get(name) || []
  }

  // Get component metrics
  getComponentMetrics(componentName: string): ComponentMetrics | null {
    return this.componentMetrics.get(componentName) || null
  }

  // Get all metrics
  getAllMetrics(): Record<string, PerformanceMetric[]> {
    const result: Record<string, PerformanceMetric[]> = {}
    for (const [key, value] of this.metrics.entries()) {
      result[key] = value
    }
    return result
  }

  // Get performance summary
  getPerformanceSummary(): {
    apiCalls: { average: number; count: number; slowest: number }
    componentRenders: { average: number; count: number; slowest: number }
    cachePerformance: { averageHitRate: number; totalRequests: number }
    longTasks: { count: number; totalDuration: number }
  } {
    const apiMetrics = this.getMetrics('api-call')
    const renderMetrics = Array.from(this.componentMetrics.values())
    const longTaskMetrics = this.getMetrics('long-task')

    const apiDurations = apiMetrics.filter(m => m.duration).map(m => m.duration!)
    const renderTimes = renderMetrics.map(m => m.averageRenderTime)
    const longTaskDurations = longTaskMetrics.map(m => m.metadata?.duration || 0)

    return {
      apiCalls: {
        average: apiDurations.length > 0 ? apiDurations.reduce((a, b) => a + b, 0) / apiDurations.length : 0,
        count: apiDurations.length,
        slowest: apiDurations.length > 0 ? Math.max(...apiDurations) : 0
      },
      componentRenders: {
        average: renderTimes.length > 0 ? renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length : 0,
        count: renderMetrics.reduce((sum, m) => sum + m.renderCount, 0),
        slowest: renderTimes.length > 0 ? Math.max(...renderTimes) : 0
      },
      cachePerformance: {
        averageHitRate: renderMetrics.length > 0 ? 
          renderMetrics.reduce((sum, m) => sum + m.cacheHitRate, 0) / renderMetrics.length : 0,
        totalRequests: renderMetrics.reduce((sum, m) => sum + m.renderCount, 0)
      },
      longTasks: {
        count: longTaskDurations.length,
        totalDuration: longTaskDurations.reduce((a, b) => a + b, 0)
      }
    }
  }

  // Clear all metrics
  clearMetrics(): void {
    this.metrics.clear()
    this.componentMetrics.clear()
  }

  // Record navigation metrics
  private recordNavigationMetrics(entry: PerformanceNavigationTiming): void {
    this.recordMetric('navigation', {
      domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
      loadComplete: entry.loadEventEnd - entry.loadEventStart,
      domInteractive: entry.domInteractive - entry.navigationStart,
      firstPaint: entry.responseEnd - entry.requestStart,
      redirectTime: entry.redirectEnd - entry.redirectStart,
      dnsTime: entry.domainLookupEnd - entry.domainLookupStart,
      connectTime: entry.connectEnd - entry.connectStart,
      responseTime: entry.responseEnd - entry.responseStart
    })
  }

  // Record resource loading metrics
  private recordResourceMetrics(entry: PerformanceResourceTiming): void {
    this.recordMetric('resource-load', {
      name: entry.name,
      duration: entry.duration,
      size: entry.transferSize,
      cached: entry.transferSize === 0,
      type: this.getResourceType(entry.name)
    })
  }

  private getResourceType(url: string): string {
    if (url.includes('/api/')) return 'api'
    if (url.includes('.js')) return 'script'
    if (url.includes('.css')) return 'style'
    if (url.includes('.png') || url.includes('.jpg') || url.includes('.svg')) return 'image'
    return 'other'
  }

  // Cleanup observers
  destroy(): void {
    for (const observer of this.observers.values()) {
      observer.disconnect()
    }
    this.observers.clear()
  }
}

// React hook for component performance monitoring
export const usePerformanceMonitor = (componentName: string) => {
  const monitor = useMemo(() => performanceMonitor, [])
  const [renderStartTime] = useState(() => performance.now())

  useEffect(() => {
    const renderTime = performance.now() - renderStartTime
    monitor.recordComponentRender(componentName, renderTime)
  })

  const startTiming = useCallback((operation: string, metadata?: Record<string, any>) => {
    return monitor.startTiming(`${componentName}-${operation}`, metadata)
  }, [componentName, monitor])

  const endTiming = useCallback((id: string) => {
    return monitor.endTiming(id)
  }, [monitor])

  const recordCache = useCallback((isHit: boolean) => {
    monitor.recordCacheMetric(componentName, isHit)
  }, [componentName, monitor])

  return { startTiming, endTiming, recordCache }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor()

// Performance monitoring decorator for API calls
export const withPerformanceMonitoring = <T extends (...args: any[]) => Promise<any>>(
  fn: T,
  operationName: string
): T => {
  return (async (...args: any[]) => {
    const timingId = performanceMonitor.startTiming('api-call', { 
      operation: operationName,
      args: args.length 
    })
    
    try {
      const result = await fn(...args)
      performanceMonitor.endTiming(timingId)
      return result
    } catch (error) {
      performanceMonitor.endTiming(timingId)
      performanceMonitor.recordMetric('api-error', { 
        operation: operationName, 
        error: error.message 
      })
      throw error
    }
  }) as T
}

// Log performance summary to console (development only)
export const logPerformanceSummary = () => {
  if (process.env.NODE_ENV === 'development') {
    const summary = performanceMonitor.getPerformanceSummary()
    console.group('🚀 Performance Summary')
    console.log('API Calls:', summary.apiCalls)
    console.log('Component Renders:', summary.componentRenders)
    console.log('Cache Performance:', summary.cachePerformance)
    console.log('Long Tasks:', summary.longTasks)
    console.groupEnd()
  }
}