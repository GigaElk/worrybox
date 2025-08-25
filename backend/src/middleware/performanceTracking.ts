import { Request, Response, NextFunction } from 'express';
import { DiagnosticsService } from '../services/diagnosticsService';
import logger from '../services/logger';
import { randomUUID } from 'crypto';

interface PerformanceMetrics {
  requestId: string;
  method: string;
  path: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  statusCode?: number;
  contentLength?: number;
  userAgent?: string;
  ip?: string;
  correlationId?: string;
  memoryUsage?: NodeJS.MemoryUsage;
  cpuUsage?: NodeJS.CpuUsage;
}

interface RequestTiming {
  dns?: number;
  tcp?: number;
  tls?: number;
  firstByte?: number;
  download?: number;
  total?: number;
}

export class PerformanceTrackingMiddleware {
  private static instance: PerformanceTrackingMiddleware;
  private diagnostics: DiagnosticsService;
  private activeRequests = new Map<string, PerformanceMetrics>();
  private requestTimings = new Map<string, RequestTiming>();
  
  // Performance thresholds
  private readonly SLOW_REQUEST_THRESHOLD = 1000; // ms
  private readonly VERY_SLOW_REQUEST_THRESHOLD = 5000; // ms
  private readonly MEMORY_THRESHOLD = 400; // MB
  
  // Request tracking
  private requestCount = 0;
  private slowRequestCount = 0;
  private errorRequestCount = 0;
  
  private constructor() {
    this.diagnostics = DiagnosticsService.getInstance();
  }

  public static getInstance(): PerformanceTrackingMiddleware {
    if (!PerformanceTrackingMiddleware.instance) {
      PerformanceTrackingMiddleware.instance = new PerformanceTrackingMiddleware();
    }
    return PerformanceTrackingMiddleware.instance;
  }

  /**
   * Main performance tracking middleware
   */
  public trackPerformance() {
    return (req: Request, res: Response, next: NextFunction) => {
      const requestId = randomUUID();
      const startTime = Date.now();
      const startCpuUsage = process.cpuUsage();
      const startMemoryUsage = process.memoryUsage();

      // Add request ID to request and response
      (req as any).requestId = requestId;
      res.setHeader('X-Request-ID', requestId);

      // Create performance metrics object
      const metrics: PerformanceMetrics = {
        requestId,
        method: req.method,
        path: this.normalizePath(req.path),
        startTime,
        userAgent: req.get('User-Agent'),
        ip: this.getClientIP(req),
        correlationId: req.get('X-Correlation-ID') || requestId,
        memoryUsage: startMemoryUsage,
        cpuUsage: startCpuUsage,
      };

      // Store active request
      this.activeRequests.set(requestId, metrics);
      this.requestCount++;

      // Track request start
      logger.debug('Request started', {
        requestId,
        method: req.method,
        path: req.path,
        userAgent: metrics.userAgent,
        ip: metrics.ip,
        correlationId: metrics.correlationId,
      });

      // Override res.end to capture completion metrics
      const originalEnd = res.end;
      res.end = (...args: any[]) => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        const endCpuUsage = process.cpuUsage(startCpuUsage);
        const endMemoryUsage = process.memoryUsage();

        // Update metrics
        metrics.endTime = endTime;
        metrics.duration = duration;
        metrics.statusCode = res.statusCode;
        metrics.contentLength = parseInt(res.get('Content-Length') || '0');

        // Calculate resource usage
        const cpuUsed = (endCpuUsage.user + endCpuUsage.system) / 1000; // Convert to milliseconds
        const memoryDelta = endMemoryUsage.heapUsed - startMemoryUsage.heapUsed;

        // Log request completion
        const logLevel = this.getLogLevel(duration, res.statusCode);
        const logData = {
          requestId,
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration,
          contentLength: metrics.contentLength,
          cpuUsed,
          memoryDelta: Math.round(memoryDelta / 1024), // KB
          userAgent: metrics.userAgent,
          ip: metrics.ip,
          correlationId: metrics.correlationId,
        };

        logger[logLevel]('Request completed', logData);

        // Track performance metrics
        this.trackRequestMetrics(metrics, cpuUsed, memoryDelta);

        // Check for performance issues
        this.checkPerformanceIssues(metrics, cpuUsed, memoryDelta);

        // Clean up
        this.activeRequests.delete(requestId);

        // Call original end method
        return originalEnd.apply(res, args);
      };

      next();
    };
  }

  /**
   * Middleware to track API endpoint performance
   */
  public trackEndpointPerformance() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = process.hrtime.bigint();
      
      res.on('finish', () => {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
        
        // Track with diagnostics service
        this.diagnostics.trackRequest(req, res, duration);
        
        // Log slow endpoints
        if (duration > this.SLOW_REQUEST_THRESHOLD) {
          logger.warn('Slow endpoint detected', {
            method: req.method,
            path: req.path,
            duration,
            statusCode: res.statusCode,
          });
        }
      });
      
      next();
    };
  }

  /**
   * Middleware to add performance headers
   */
  public addPerformanceHeaders() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        
        // Add performance headers
        res.setHeader('X-Response-Time', `${duration}ms`);
        res.setHeader('X-Server-Timing', `total;dur=${duration}`);
        
        // Add memory usage header in development
        if (process.env.NODE_ENV === 'development') {
          const memUsage = process.memoryUsage();
          res.setHeader('X-Memory-Usage', `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
        }
      });
      
      next();
    };
  }

  /**
   * Get current performance statistics
   */
  public getPerformanceStats() {
    const activeRequestCount = this.activeRequests.size;
    const averageMemoryUsage = this.calculateAverageMemoryUsage();
    
    return {
      totalRequests: this.requestCount,
      activeRequests: activeRequestCount,
      slowRequests: this.slowRequestCount,
      errorRequests: this.errorRequestCount,
      slowRequestPercentage: (this.slowRequestCount / this.requestCount) * 100,
      errorRequestPercentage: (this.errorRequestCount / this.requestCount) * 100,
      averageMemoryUsage,
      currentMemoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    };
  }

  /**
   * Get active requests information
   */
  public getActiveRequests() {
    const now = Date.now();
    
    return Array.from(this.activeRequests.values()).map(metrics => ({
      requestId: metrics.requestId,
      method: metrics.method,
      path: metrics.path,
      duration: now - metrics.startTime,
      userAgent: metrics.userAgent,
      ip: metrics.ip,
      correlationId: metrics.correlationId,
    }));
  }

  /**
   * Reset performance statistics
   */
  public resetStats() {
    this.requestCount = 0;
    this.slowRequestCount = 0;
    this.errorRequestCount = 0;
    this.activeRequests.clear();
    this.requestTimings.clear();
    
    logger.info('Performance statistics reset');
  }

  // Private methods

  private trackRequestMetrics(
    metrics: PerformanceMetrics,
    cpuUsed: number,
    memoryDelta: number
  ) {
    // Track slow requests
    if (metrics.duration && metrics.duration > this.SLOW_REQUEST_THRESHOLD) {
      this.slowRequestCount++;
    }

    // Track error requests
    if (metrics.statusCode && metrics.statusCode >= 400) {
      this.errorRequestCount++;
    }

    // Store timing information
    if (metrics.duration) {
      this.requestTimings.set(metrics.requestId, {
        total: metrics.duration,
      });
    }
  }

  private checkPerformanceIssues(
    metrics: PerformanceMetrics,
    cpuUsed: number,
    memoryDelta: number
  ) {
    const issues: string[] = [];

    // Check for very slow requests
    if (metrics.duration && metrics.duration > this.VERY_SLOW_REQUEST_THRESHOLD) {
      issues.push(`Very slow request: ${metrics.duration}ms`);
      
      this.diagnostics.createAlert(
        'error',
        'performance',
        'Very Slow Request',
        `Request ${metrics.requestId} took ${metrics.duration}ms to complete`,
        'response_time',
        this.VERY_SLOW_REQUEST_THRESHOLD,
        metrics.duration
      );
    }

    // Check for high memory usage
    const currentMemoryMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    if (currentMemoryMB > this.MEMORY_THRESHOLD) {
      issues.push(`High memory usage: ${currentMemoryMB}MB`);
      
      this.diagnostics.createAlert(
        'warning',
        'resource',
        'High Memory Usage',
        `Memory usage is ${currentMemoryMB}MB, approaching limits`,
        'memory_usage',
        this.MEMORY_THRESHOLD,
        currentMemoryMB
      );
    }

    // Check for high CPU usage
    if (cpuUsed > 1000) { // More than 1 second of CPU time
      issues.push(`High CPU usage: ${cpuUsed}ms`);
    }

    // Check for large memory allocation
    if (memoryDelta > 10 * 1024 * 1024) { // More than 10MB allocated
      issues.push(`Large memory allocation: ${Math.round(memoryDelta / 1024 / 1024)}MB`);
    }

    // Log performance issues
    if (issues.length > 0) {
      logger.warn('Performance issues detected', {
        requestId: metrics.requestId,
        method: metrics.method,
        path: metrics.path,
        duration: metrics.duration,
        issues,
        cpuUsed,
        memoryDelta: Math.round(memoryDelta / 1024), // KB
      });
    }
  }

  private getLogLevel(duration: number, statusCode: number): 'debug' | 'info' | 'warn' | 'error' {
    if (statusCode >= 500) return 'error';
    if (statusCode >= 400) return 'warn';
    if (duration > this.VERY_SLOW_REQUEST_THRESHOLD) return 'error';
    if (duration > this.SLOW_REQUEST_THRESHOLD) return 'warn';
    return 'info';
  }

  private normalizePath(path: string): string {
    // Replace dynamic segments with placeholders for better grouping
    return path
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-f0-9-]{36}/g, '/:uuid')
      .replace(/\/[a-f0-9]{24}/g, '/:objectId');
  }

  private getClientIP(req: Request): string {
    return (
      req.get('X-Forwarded-For') ||
      req.get('X-Real-IP') ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }

  private calculateAverageMemoryUsage(): number {
    const activeMetrics = Array.from(this.activeRequests.values());
    if (activeMetrics.length === 0) return 0;

    const totalMemory = activeMetrics.reduce((sum, metrics) => {
      return sum + (metrics.memoryUsage?.heapUsed || 0);
    }, 0);

    return Math.round(totalMemory / activeMetrics.length / 1024 / 1024); // MB
  }
}

/**
 * Factory function to create performance tracking middleware
 */
export function createPerformanceMiddleware() {
  const tracker = PerformanceTrackingMiddleware.getInstance();
  
  return {
    trackPerformance: tracker.trackPerformance(),
    trackEndpointPerformance: tracker.trackEndpointPerformance(),
    addPerformanceHeaders: tracker.addPerformanceHeaders(),
    addCorrelationId: () => tracker.trackPerformance(), // Alias for compatibility
    requestTimeout: (timeout: number) => (req: any, res: any, next: any) => {
      req.setTimeout(timeout);
      next();
    },
    getStats: () => tracker.getPerformanceStats(),
    getActiveRequests: () => tracker.getActiveRequests(),
    resetStats: () => tracker.resetStats(),
  };
}

export default PerformanceTrackingMiddleware;