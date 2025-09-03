import { Request, Response, NextFunction } from 'express';
import { EnhancedLogger } from '../services/enhancedLogger';
import { PerformanceMonitor } from '../services/performanceMonitor';
import { CorrelationService } from '../services/correlationService';
import { randomUUID } from 'crypto';

interface RequestContext {
  requestId: string;
  correlationId: string;
  startTime: number;
  startMemory: NodeJS.MemoryUsage;
  startCpu: NodeJS.CpuUsage;
  performanceTimerId?: string;
}

interface LoggingConfig {
  enableRequestLogging: boolean;
  enableResponseLogging: boolean;
  enablePerformanceLogging: boolean;
  enableErrorLogging: boolean;
  enableSlowRequestLogging: boolean;
  slowRequestThreshold: number; // milliseconds
  enableMemoryLogging: boolean;
  memoryThreshold: number; // MB
  enableDetailedErrorContext: boolean;
  logRequestBody: boolean;
  logResponseBody: boolean;
  maxBodySize: number; // bytes
  sanitizeHeaders: boolean;
  excludePaths: string[];
}

export class ComprehensiveLoggingMiddleware {
  private static instance: ComprehensiveLoggingMiddleware;
  private logger: EnhancedLogger;
  private performanceMonitor: PerformanceMonitor;
  private correlationService: CorrelationService;
  
  private config: LoggingConfig = {
    enableRequestLogging: true,
    enableResponseLogging: true,
    enablePerformanceLogging: true,
    enableErrorLogging: true,
    enableSlowRequestLogging: true,
    slowRequestThreshold: 1000,
    enableMemoryLogging: true,
    memoryThreshold: 50,
    enableDetailedErrorContext: true,
    logRequestBody: false, // Disabled by default for security
    logResponseBody: false, // Disabled by default for performance
    maxBodySize: 1024 * 10, // 10KB
    sanitizeHeaders: true,
    excludePaths: ['/health', '/metrics', '/favicon.ico'],
  };

  private constructor() {
    this.logger = EnhancedLogger.getInstance();
    this.performanceMonitor = PerformanceMonitor.getInstance();
    this.correlationService = CorrelationService.getInstance();
  }

  public static getInstance(): ComprehensiveLoggingMiddleware {
    if (!ComprehensiveLoggingMiddleware.instance) {
      ComprehensiveLoggingMiddleware.instance = new ComprehensiveLoggingMiddleware();
    }
    return ComprehensiveLoggingMiddleware.instance;
  }

  /**
   * Main comprehensive logging middleware
   */
  public comprehensiveLogging() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Skip excluded paths
      if (this.config.excludePaths.some(path => req.path.startsWith(path))) {
        return next();
      }

      const requestId = randomUUID();
      const correlationId = this.correlationService.getOrCreateCorrelationId(req.headers);
      const startTime = Date.now();
      const startMemory = process.memoryUsage();
      const startCpu = process.cpuUsage();

      // Add context to request
      const context: RequestContext = {
        requestId,
        correlationId,
        startTime,
        startMemory,
        startCpu,
      };

      (req as any).loggingContext = context;

      // Add headers
      res.setHeader('X-Request-ID', requestId);
      res.setHeader('X-Correlation-ID', correlationId);

      // Start performance monitoring
      if (this.config.enablePerformanceLogging) {
        context.performanceTimerId = this.performanceMonitor.startTimer(
          `${req.method} ${this.normalizePath(req.path)}`,
          correlationId,
          {
            method: req.method,
            path: req.path,
            userAgent: req.get('User-Agent'),
            ip: this.getClientIP(req),
          }
        );
      }

      // Log request
      if (this.config.enableRequestLogging) {
        this.logRequest(req, context);
      }

      // Override res.end to capture response
      const originalEnd = res.end.bind(res);
      res.end = (...args: any[]): any => {
        this.logResponse(req, res, context);
        return originalEnd(...args);
      };

      // Handle errors
      res.on('error', (error) => {
        this.logError(error, req, res, context);
      });

      next();
    };
  }

  /**
   * Error logging middleware
   */
  public errorLogging() {
    return (error: Error, req: Request, res: Response, next: NextFunction) => {
      const context = (req as any).loggingContext as RequestContext;
      
      if (this.config.enableErrorLogging) {
        this.logError(error, req, res, context);
      }

      next(error);
    };
  }

  /**
   * Slow operation detection middleware
   */
  public slowOperationDetection() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.enableSlowRequestLogging) {
        return next();
      }

      const context = (req as any).loggingContext as RequestContext;
      if (!context) return next();

      // Check for slow operations periodically (only if enabled)
      let checkInterval: NodeJS.Timeout | null = null;
      if (this.config.enableSlowRequestLogging) {
        checkInterval = setInterval(() => {
          const duration = Date.now() - context.startTime;
          
          if (duration > this.config.slowRequestThreshold) {
            this.logger.warn('Slow request detected', {
              correlationId: context.correlationId,
              requestId: context.requestId,
              method: req.method,
              path: req.path,
              duration,
              category: 'slow_request',
              userAgent: req.get('User-Agent'),
              ip: this.getClientIP(req),
            });
          }
        }, this.config.slowRequestThreshold);
      }

      res.on('finish', () => {
        if (checkInterval) {
          clearInterval(checkInterval);
        }
      });

      next();
    };
  }

  private lastMemoryWarning: number = 0;
  private memoryWarningCooldown: number = 60000; // 1 minute cooldown
  private stableHighMemoryThreshold: number = 5; // 5 consecutive high memory readings
  private consecutiveHighMemoryCount: number = 0;

  /**
   * Memory usage monitoring middleware
   */
  public memoryMonitoring() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.enableMemoryLogging) {
        return next();
      }

      const context = (req as any).loggingContext as RequestContext;
      if (!context) return next();

      res.on('finish', () => {
        const endMemory = process.memoryUsage();
        const memoryDelta = Math.round((endMemory.heapUsed - context.startMemory.heapUsed) / 1024 / 1024);
        const currentMemoryMB = Math.round(endMemory.heapUsed / 1024 / 1024);
        const now = Date.now();

        if (memoryDelta > this.config.memoryThreshold) {
          // Check if memory usage is consistently high (stable high usage)
          if (currentMemoryMB > 100) { // High memory threshold
            this.consecutiveHighMemoryCount++;
          } else {
            this.consecutiveHighMemoryCount = 0;
          }

          // Reduce warning frequency for stable high usage (Requirement 6.5)
          const isStableHighMemory = this.consecutiveHighMemoryCount >= this.stableHighMemoryThreshold;
          const shouldLogWarning = !isStableHighMemory || (now - this.lastMemoryWarning) > this.memoryWarningCooldown;

          if (shouldLogWarning) {
            const logLevel = isStableHighMemory ? 'info' : 'warn';
            const message = isStableHighMemory 
              ? 'Stable high memory usage detected' 
              : 'High memory usage detected';

            this.logger[logLevel](message, {
              correlationId: context.correlationId,
              requestId: context.requestId,
              method: req.method,
              path: req.path,
              memoryDelta,
              memoryBefore: Math.round(context.startMemory.heapUsed / 1024 / 1024),
              memoryAfter: currentMemoryMB,
              consecutiveHighCount: this.consecutiveHighMemoryCount,
              isStableHigh: isStableHighMemory,
              category: isStableHighMemory ? 'stable_memory_usage' : 'memory_usage',
            });

            this.lastMemoryWarning = now;
          }
        } else {
          // Reset consecutive count if memory usage is normal
          this.consecutiveHighMemoryCount = 0;
        }
      });

      next();
    };
  }

  /**
   * Update logging configuration
   */
  public updateConfig(updates: Partial<LoggingConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Get current configuration
   */
  public getConfig(): LoggingConfig {
    return { ...this.config };
  }

  // Private methods

  private logRequest(req: Request, context: RequestContext): void {
    // Ensure correlation ID consistency (Requirement 6.6)
    this.correlationService.setCorrelationId(context.correlationId);

    const requestData: any = {
      correlationId: context.correlationId,
      requestId: context.requestId,
      method: req.method,
      path: req.path,
      query: req.query,
      headers: this.config.sanitizeHeaders ? this.sanitizeHeaders(req.headers) : req.headers,
      userAgent: req.get('User-Agent'),
      ip: this.getClientIP(req),
      contentLength: req.get('Content-Length'),
      category: 'request',
      timestamp: new Date().toISOString(),
    };

    // Add request body if enabled and within size limit
    if (this.config.logRequestBody && req.body) {
      const bodySize = JSON.stringify(req.body).length;
      if (bodySize <= this.config.maxBodySize) {
        requestData.body = req.body;
      } else {
        requestData.bodyTruncated = true;
        requestData.bodySize = bodySize;
      }
    }

    this.logger.info('Request received', requestData);
  }

  private logResponse(req: Request, res: Response, context: RequestContext): void {
    const endTime = Date.now();
    const duration = endTime - context.startTime;
    const endMemory = process.memoryUsage();
    const endCpu = process.cpuUsage(context.startCpu);

    const responseData: any = {
      correlationId: context.correlationId,
      requestId: context.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      contentLength: res.get('Content-Length'),
      cpuUsed: Math.round((endCpu.user + endCpu.system) / 1000), // milliseconds
      memoryDelta: Math.round((endMemory.heapUsed - context.startMemory.heapUsed) / 1024 / 1024), // MB
      category: 'response',
    };

    // End performance monitoring
    if (context.performanceTimerId) {
      this.performanceMonitor.endTimer(
        context.performanceTimerId,
        res.statusCode < 400,
        {
          statusCode: res.statusCode,
          contentLength: res.get('Content-Length'),
        }
      );
    }

    // Improved log level determination based on requirements
    let level: 'info' | 'warn' | 'error' = 'info';
    
    if (res.statusCode >= 500) {
      level = 'error';
    } else if (res.statusCode === 404) {
      // Log 404s at INFO level instead of WARN to reduce noise (Requirement 6.1)
      level = 'info';
      responseData.category = 'not_found';
    } else if (res.statusCode >= 400) {
      level = 'warn';
    } else if (duration > this.config.slowRequestThreshold) {
      level = 'warn';
      responseData.category = 'slow_response';
    }

    // Avoid duplicate log entries for successful requests (Requirement 6.2)
    if (res.statusCode < 400 && duration <= this.config.slowRequestThreshold) {
      // Only log successful requests at debug level to reduce noise
      this.logger.debug('Request completed successfully', responseData);
    } else {
      this.logger[level]('Request completed', responseData);
    }
  }

  private logError(error: Error, req: Request, res: Response, context?: RequestContext): void {
    if (!this.config.enableErrorLogging) return;

    // Ensure correlation ID consistency across all error log entries (Requirement 6.6)
    if (context?.correlationId) {
      this.correlationService.setCorrelationId(context.correlationId);
    }

    const errorContext = {
      correlationId: context?.correlationId,
      requestId: context?.requestId,
      method: req.method,
      path: req.path,
      userAgent: req.get('User-Agent'),
      ip: this.getClientIP(req),
      statusCode: res.statusCode,
      duration: context ? Date.now() - context.startTime : undefined,
      timestamp: new Date().toISOString(),
    };

    if (this.config.enableDetailedErrorContext) {
      // Add detailed system state
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      this.logger.logError({
        error,
        context: errorContext,
        severity: res.statusCode >= 500 ? 'high' : 'medium',
        category: 'system',
        recoverable: res.statusCode < 500,
        userImpact: true,
      });

      // Log system state with consistent correlation ID
      this.logger.logSystemState('Error occurred - system state', {
        correlationId: context?.correlationId,
        memoryUsage,
        cpuUsage,
        uptime: process.uptime(),
        errorRate: this.calculateErrorRate(),
        timestamp: new Date().toISOString(),
      });
    } else {
      this.logger.error('Request error', error, errorContext);
    }
  }

  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    
    // Remove sensitive headers
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-api-key',
      'x-auth-token',
      'x-access-token',
    ];
    
    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });
    
    return sanitized;
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

  private normalizePath(path: string): string {
    // Replace dynamic segments with placeholders for better grouping
    return path
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-f0-9-]{36}/g, '/:uuid')
      .replace(/\/[a-f0-9]{24}/g, '/:objectId');
  }

  private calculateErrorRate(): number {
    const metrics = this.logger.getMetrics();
    return metrics.errorRate;
  }
}

/**
 * Factory function to create comprehensive logging middleware
 */
export function createComprehensiveLogging(config?: Partial<LoggingConfig>) {
  const middleware = ComprehensiveLoggingMiddleware.getInstance();
  
  if (config) {
    middleware.updateConfig(config);
  }
  
  return {
    comprehensiveLogging: middleware.comprehensiveLogging(),
    errorLogging: middleware.errorLogging(),
    slowOperationDetection: middleware.slowOperationDetection(),
    memoryMonitoring: middleware.memoryMonitoring(),
    updateConfig: (updates: Partial<LoggingConfig>) => middleware.updateConfig(updates),
    getConfig: () => middleware.getConfig(),
  };
}

export default ComprehensiveLoggingMiddleware;