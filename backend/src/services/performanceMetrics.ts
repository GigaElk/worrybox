import { PerformanceMetric, RequestMetrics } from '../types/monitoring';
import logger from './logger';

export class PerformanceMetricsService {
  private static instance: PerformanceMetricsService;
  private metrics: PerformanceMetric[] = [];
  private requestCounts: Map<string, number> = new Map();
  private responseTimes: Map<string, number[]> = new Map();
  private activeRequests = 0;
  private totalRequests = 0;
  private slowRequestThreshold = 2000; // 2 seconds
  private maxMetricsHistory = 1000; // Keep last 1000 metrics

  public static getInstance(): PerformanceMetricsService {
    if (!PerformanceMetricsService.instance) {
      PerformanceMetricsService.instance = new PerformanceMetricsService();
    }
    return PerformanceMetricsService.instance;
  }

  /**
   * Record a performance metric for an API endpoint
   */
  recordMetric(metric: PerformanceMetric): void {
    try {
      // Add to metrics history
      this.metrics.push(metric);
      
      // Maintain max history size
      if (this.metrics.length > this.maxMetricsHistory) {
        this.metrics = this.metrics.slice(-this.maxMetricsHistory);
      }

      // Update endpoint-specific tracking
      const endpointKey = `${metric.method} ${metric.endpoint}`;
      
      // Update request counts
      const currentCount = this.requestCounts.get(endpointKey) || 0;
      this.requestCounts.set(endpointKey, currentCount + 1);

      // Update response times
      const times = this.responseTimes.get(endpointKey) || [];
      times.push(metric.responseTime);
      
      // Keep only last 100 response times per endpoint
      if (times.length > 100) {
        times.splice(0, times.length - 100);
      }
      this.responseTimes.set(endpointKey, times);

      // Log slow requests
      if (metric.responseTime > this.slowRequestThreshold) {
        logger.warn('Slow request detected', {
          correlationId: metric.correlationId,
          endpoint: metric.endpoint,
          method: metric.method,
          responseTime: metric.responseTime,
          statusCode: metric.statusCode,
          memoryDelta: metric.memoryDelta,
          databaseQueries: metric.databaseQueries,
        });
      }

      // Log high memory usage requests
      if (metric.memoryDelta > 50) { // 50MB delta
        logger.warn('High memory usage request', {
          correlationId: metric.correlationId,
          endpoint: metric.endpoint,
          memoryDelta: metric.memoryDelta,
        });
      }

    } catch (error) {
      logger.error('Failed to record performance metric', error);
    }
  }

  /**
   * Start tracking a request
   */
  startRequest(): void {
    this.activeRequests++;
    this.totalRequests++;
  }

  /**
   * End tracking a request
   */
  endRequest(): void {
    if (this.activeRequests > 0) {
      this.activeRequests--;
    }
  }

  /**
   * Get current request metrics
   */
  getRequestMetrics(): RequestMetrics {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Count requests in last minute
    const recentMetrics = this.metrics.filter(m => 
      new Date(m.timestamp).getTime() > oneMinuteAgo
    );

    // Calculate average response time
    const responseTimes = this.metrics.map(m => m.responseTime);
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 0;

    // Count slow requests
    const slowRequests = this.metrics.filter(m => 
      m.responseTime > this.slowRequestThreshold
    ).length;

    // Calculate error rate
    const errorRequests = this.metrics.filter(m => 
      m.statusCode >= 400
    ).length;
    const errorRate = this.metrics.length > 0 
      ? (errorRequests / this.metrics.length) * 100 
      : 0;

    // Get last request time
    const lastMetric = this.metrics[this.metrics.length - 1];
    const lastRequestTime = lastMetric ? lastMetric.timestamp : new Date().toISOString();

    return {
      totalRequests: this.totalRequests,
      requestsPerMinute: recentMetrics.length,
      averageResponseTime: Math.round(averageResponseTime),
      slowRequests,
      errorRate: Math.round(errorRate * 100) / 100,
      activeRequests: this.activeRequests,
      lastRequestTime,
    };
  }

  /**
   * Get slowest endpoints
   */
  getSlowestEndpoints(limit: number = 10): PerformanceMetric[] {
    return [...this.metrics]
      .sort((a, b) => b.responseTime - a.responseTime)
      .slice(0, limit);
  }

  /**
   * Get endpoint statistics
   */
  getEndpointStats(endpoint: string, method: string): {
    requestCount: number;
    averageResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
    errorRate: number;
  } {
    const endpointKey = `${method} ${endpoint}`;
    const endpointMetrics = this.metrics.filter(m => 
      m.endpoint === endpoint && m.method === method
    );

    if (endpointMetrics.length === 0) {
      return {
        requestCount: 0,
        averageResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
        errorRate: 0,
      };
    }

    const responseTimes = endpointMetrics.map(m => m.responseTime);
    const errorCount = endpointMetrics.filter(m => m.statusCode >= 400).length;

    return {
      requestCount: endpointMetrics.length,
      averageResponseTime: Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length),
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      errorRate: Math.round((errorCount / endpointMetrics.length) * 10000) / 100,
    };
  }

  /**
   * Clear old metrics (cleanup)
   */
  cleanup(): void {
    const oneHourAgo = Date.now() - 3600000; // 1 hour
    
    this.metrics = this.metrics.filter(m => 
      new Date(m.timestamp).getTime() > oneHourAgo
    );

    logger.debug('Performance metrics cleanup completed', {
      remainingMetrics: this.metrics.length,
    });
  }

  /**
   * Get memory usage trend
   */
  getMemoryTrend(minutes: number = 30): number[] {
    const cutoff = Date.now() - (minutes * 60000);
    const recentMetrics = this.metrics.filter(m => 
      new Date(m.timestamp).getTime() > cutoff
    );

    // Group by 5-minute intervals
    const intervals: { [key: number]: number[] } = {};
    
    recentMetrics.forEach(metric => {
      const intervalKey = Math.floor(new Date(metric.timestamp).getTime() / 300000) * 300000;
      if (!intervals[intervalKey]) {
        intervals[intervalKey] = [];
      }
      intervals[intervalKey].push(metric.memoryDelta);
    });

    // Calculate average memory delta for each interval
    return Object.keys(intervals)
      .sort()
      .map(key => {
        const deltas = intervals[parseInt(key)];
        return deltas.reduce((a, b) => a + b, 0) / deltas.length;
      });
  }
}