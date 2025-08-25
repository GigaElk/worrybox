import winston from 'winston';
import path from 'path';
import { CorrelationService } from './correlationService';
import { PlatformAdapterService } from './platformAdapter';

interface LogContext {
  correlationId?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  endpoint?: string;
  method?: string;
  path?: string;
  ip?: string;
  userAgent?: string;
  duration?: number;
  memoryUsage?: number;
  cpuUsage?: number;
  errorCode?: string;
  stackTrace?: string;
  port?: number;
  operation?: string;
  timerId?: string;
  category?: string;
  logLevel?: string;
  newLevel?: string;
  originalLevel?: string;
  revertedLevel?: string;
  enableApiKeyAuth?: boolean;
  enableAdminRoleAuth?: boolean;
  hasApiKey?: boolean;
  user?: string;
  memoryDelta?: number;
  platform?: string;
  systemState?: any;
  metadata?: Record<string, any>;
  // Additional properties for reliability enhancements
  environment?: string;
  memoryBefore?: number;
  memoryAfter?: number;
  enableIPWhitelist?: boolean;
  hasAuth?: boolean;
  cpuUsed?: number;
  nodeVersion?: string;
  apiKeyCount?: number;
  severity?: string;
  frontendUrl?: string;
  allowedIPCount?: number;
  loggingConfig?: any;
}

interface PerformanceLogData {
  operation: string;
  duration: number;
  success: boolean;
  correlationId?: string;
  metadata?: Record<string, any>;
}

interface ErrorLogData {
  error: Error;
  context?: LogContext;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  category?: 'system' | 'business' | 'security' | 'performance';
  recoverable?: boolean;
  userImpact?: boolean;
}

interface SystemStateLogData {
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  uptime: number;
  timestamp?: string;
  activeConnections?: number;
  queuedOperations?: number;
  errorRate?: number;
  responseTime?: number;
}

interface LogMetrics {
  totalLogs: number;
  logsByLevel: Record<string, number>;
  errorRate: number;
  performanceIssues: number;
  slowOperations: number;
  recentErrors: Array<{
    timestamp: string;
    level: string;
    message: string;
    correlationId?: string;
  }>;
}

class EnhancedLoggerClass {
  private static instance: EnhancedLoggerClass;
  private logger: winston.Logger;
  private correlationService: CorrelationService;
  private platformAdapter: PlatformAdapterService;
  
  // Metrics tracking
  private metrics: LogMetrics = {
    totalLogs: 0,
    logsByLevel: {},
    errorRate: 0,
    performanceIssues: 0,
    slowOperations: 0,
    recentErrors: [],
  };
  
  // Performance tracking
  private performanceThresholds = {
    slow: 1000, // 1 second
    verySlow: 5000, // 5 seconds
    critical: 10000, // 10 seconds
  };
  
  // Configuration
  private config = {
    enableStructuredLogging: true,
    enablePerformanceLogging: true,
    enableErrorContextLogging: true,
    enableSystemStateLogging: true,
    logLevel: this.getOptimalLogLevel(),
    maxRecentErrors: 100,
    enableCorrelationTracking: true,
    enableMetricsCollection: true,
  };

  private constructor() {
    this.correlationService = CorrelationService.getInstance();
    this.platformAdapter = PlatformAdapterService.getInstance();
    this.logger = this.createEnhancedLogger();
    this.setupMetricsCollection();
  }

  public static getInstance(): EnhancedLoggerClass {
    if (!EnhancedLoggerClass.instance) {
      EnhancedLoggerClass.instance = new EnhancedLoggerClass();
    }
    return EnhancedLoggerClass.instance;
  }

  /**
   * Log with enhanced context and correlation tracking
   */
  info(message: string, context?: LogContext): void {
    this.logWithContext('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.logWithContext('warn', message, context);
  }

  error(message: string, errorOrContext?: Error | LogContext, context?: LogContext): void {
    if (errorOrContext instanceof Error) {
      this.logError({
        error: errorOrContext,
        context: context || {},
      });
    } else {
      this.logWithContext('error', message, errorOrContext);
    }
  }

  debug(message: string, context?: LogContext): void {
    this.logWithContext('debug', message, context);
  }

  http(message: string, context?: LogContext): void {
    this.logWithContext('http', message, context);
  }

  /**
   * Log performance metrics for operations
   */
  logPerformance(data: PerformanceLogData): void {
    if (!this.config.enablePerformanceLogging) return;

    const logData = {
      operation: data.operation,
      duration: data.duration,
      success: data.success,
      correlationId: data.correlationId || this.correlationService.generateCorrelationId(),
      timestamp: new Date().toISOString(),
      category: 'performance',
      ...data.metadata,
    };

    // Determine log level based on performance
    let level = 'info';
    if (data.duration > this.performanceThresholds.critical) {
      level = 'error';
      this.metrics.performanceIssues++;
    } else if (data.duration > this.performanceThresholds.verySlow) {
      level = 'warn';
      this.metrics.performanceIssues++;
    } else if (data.duration > this.performanceThresholds.slow) {
      level = 'warn';
      this.metrics.slowOperations++;
    }

    this.logger.log(level, `Performance: ${data.operation}`, logData);
    this.updateMetrics(level);
  }

  /**
   * Log detailed error information with context
   */
  logError(data: ErrorLogData): void {
    if (!this.config.enableErrorContextLogging) {
      this.logger.error(data.error.message);
      return;
    }

    const systemState = this.getSystemState();
    const correlationId = data.context?.correlationId || 
                         this.correlationService.generateCorrelationId();

    const errorData = {
      message: data.error.message,
      name: data.error.name,
      stack: data.error.stack,
      correlationId,
      timestamp: new Date().toISOString(),
      category: 'error',
      severity: data.severity || 'medium',
      errorCategory: data.category || 'system',
      recoverable: data.recoverable || false,
      userImpact: data.userImpact || false,
      context: data.context || {},
      systemState,
      platform: this.platformAdapter.getPlatform(),
    };

    this.logger.error('Error occurred', errorData);
    this.updateMetrics('error');
    this.trackRecentError(errorData);
  }

  /**
   * Log system state information
   */
  logSystemState(message: string, data?: Partial<SystemStateLogData>): void {
    if (!this.config.enableSystemStateLogging) return;

    const systemState = this.getSystemState();
    const logData = {
      ...systemState,
      ...data,
      timestamp: new Date().toISOString(),
      category: 'system_state',
      correlationId: this.correlationService.generateSystemCorrelationId('system_state'),
    };

    this.logger.info(message, logData);
    this.updateMetrics('info');
  }

  /**
   * Create a child logger with persistent context
   */
  createChildLogger(context: LogContext): ChildLogger {
    return new ChildLogger(this, context);
  }

  /**
   * Get logging metrics
   */
  getMetrics(): LogMetrics {
    return { ...this.metrics };
  }

  /**
   * Update log level configuration
   */
  setLogLevel(level: string): void {
    this.config.logLevel = level;
    this.logger.level = level;
  }

  /**
   * Get current log level
   */
  getLogLevel(): string {
    return this.config.logLevel;
  }

  /**
   * Enable or disable specific logging features
   */
  updateConfig(updates: Partial<typeof this.config>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Flush logs and cleanup
   */
  async flush(): Promise<void> {
    return new Promise((resolve) => {
      this.logger.on('finish', resolve);
      this.logger.end();
    });
  }

  // Private methods

  private logWithContext(level: string, message: string, context?: LogContext): void {
    const correlationId = context?.correlationId || 
                         this.correlationService.generateCorrelationId();

    const logData = {
      message,
      correlationId,
      timestamp: new Date().toISOString(),
      category: 'application',
      ...context,
    };

    // Add system information for error and warn levels
    if (level === 'error' || level === 'warn') {
      logData.systemState = this.getSystemState();
    }

    this.logger.log(level, message, logData);
    this.updateMetrics(level);
  }

  private getSystemState(): SystemStateLogData {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const uptime = process.uptime();

    return {
      memoryUsage,
      cpuUsage,
      uptime,
      timestamp: new Date().toISOString(),
    };
  }

  private updateMetrics(level: string): void {
    if (!this.config.enableMetricsCollection) return;

    this.metrics.totalLogs++;
    this.metrics.logsByLevel[level] = (this.metrics.logsByLevel[level] || 0) + 1;

    // Calculate error rate
    const totalErrors = this.metrics.logsByLevel.error || 0;
    this.metrics.errorRate = (totalErrors / this.metrics.totalLogs) * 100;
  }

  private trackRecentError(errorData: any): void {
    this.metrics.recentErrors.push({
      timestamp: errorData.timestamp,
      level: 'error',
      message: errorData.message,
      correlationId: errorData.correlationId,
    });

    // Keep only recent errors
    if (this.metrics.recentErrors.length > this.config.maxRecentErrors) {
      this.metrics.recentErrors = this.metrics.recentErrors.slice(-this.config.maxRecentErrors);
    }
  }

  private getOptimalLogLevel(): string {
    const env = process.env.NODE_ENV || 'development';
    const platform = this.platformAdapter?.getPlatform() || 'unknown';
    
    // Environment-based log levels
    if (env === 'development') return 'debug';
    if (env === 'test') return 'warn';
    
    // Platform-specific log levels
    if (platform === 'render') return 'info'; // Render.com production
    if (platform === 'local') return 'debug';
    
    // Default production level
    return 'warn';
  }

  private createEnhancedLogger(): winston.Logger {
    const platform = this.platformAdapter.getPlatform();
    
    // Define enhanced formats
    const structuredFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf((info) => {
        const { timestamp, level, message, ...meta } = info;
        return JSON.stringify({
          timestamp,
          level,
          message,
          ...meta,
        });
      })
    );

    const consoleFormat = winston.format.combine(
      winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
      winston.format.colorize({ all: true }),
      winston.format.printf((info) => {
        const { timestamp, level, message, correlationId, ...meta } = info;
        const correlation = correlationId ? `[${String(correlationId).slice(-8)}]` : '';
        const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} ${level}: ${correlation} ${message}${metaStr}`;
      })
    );

    // Define transports based on environment and platform
    const transports: winston.transport[] = [];

    // Console transport (always enabled in development)
    if (process.env.NODE_ENV === 'development') {
      transports.push(
        new winston.transports.Console({
          format: consoleFormat,
        })
      );
    } else {
      // Structured console output for production
      transports.push(
        new winston.transports.Console({
          format: structuredFormat,
        })
      );
    }

    // File transports (if not in serverless environment)
    if (platform !== 'render' || process.env.ENABLE_FILE_LOGGING === 'true') {
      // Ensure logs directory exists
      const fs = require('fs');
      const logsDir = path.join(process.cwd(), 'logs');
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      // All logs file
      transports.push(
        new winston.transports.File({
          filename: path.join(logsDir, 'application.log'),
          format: structuredFormat,
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 5,
        })
      );

      // Error logs file
      transports.push(
        new winston.transports.File({
          filename: path.join(logsDir, 'errors.log'),
          level: 'error',
          format: structuredFormat,
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 5,
        })
      );

      // Performance logs file
      transports.push(
        new winston.transports.File({
          filename: path.join(logsDir, 'performance.log'),
          format: winston.format.combine(
            structuredFormat,
            winston.format((info) => {
              return info.category === 'performance' ? info : false;
            })()
          ),
          maxsize: 5 * 1024 * 1024, // 5MB
          maxFiles: 3,
        })
      );
    }

    return winston.createLogger({
      level: this.config.logLevel,
      format: structuredFormat,
      transports,
      exitOnError: false,
      handleExceptions: true,
      handleRejections: true,
    });
  }

  private setupMetricsCollection(): void {
    if (!this.config.enableMetricsCollection) return;

    // Reset metrics periodically
    setInterval(() => {
      // Keep recent errors but reset counters
      const recentErrors = this.metrics.recentErrors;
      this.metrics = {
        totalLogs: 0,
        logsByLevel: {},
        errorRate: 0,
        performanceIssues: 0,
        slowOperations: 0,
        recentErrors,
      };
    }, 3600000); // Reset every hour
  }
}

/**
 * Child logger with persistent context
 */
class ChildLogger {
  constructor(
    private parent: EnhancedLoggerClass,
    private context: LogContext
  ) {}

  info(message: string, additionalContext?: LogContext): void {
    this.parent.info(message, { ...this.context, ...additionalContext });
  }

  warn(message: string, additionalContext?: LogContext): void {
    this.parent.warn(message, { ...this.context, ...additionalContext });
  }

  error(message: string, errorOrContext?: Error | LogContext, additionalContext?: LogContext): void {
    if (errorOrContext instanceof Error) {
      this.parent.error(message, errorOrContext, { ...this.context, ...additionalContext });
    } else {
      this.parent.error(message, { ...this.context, ...errorOrContext });
    }
  }

  debug(message: string, additionalContext?: LogContext): void {
    this.parent.debug(message, { ...this.context, ...additionalContext });
  }

  logPerformance(data: PerformanceLogData): void {
    this.parent.logPerformance({
      ...data,
      correlationId: data.correlationId || this.context.correlationId,
      metadata: { ...data.metadata, ...this.context },
    });
  }
}

// Create and export the enhanced logger instance
const enhancedLogger = EnhancedLoggerClass.getInstance();

// Export both the enhanced logger and a simplified interface for backward compatibility
export default enhancedLogger;
export { EnhancedLoggerClass as EnhancedLogger, ChildLogger };

// Create a stream for Morgan HTTP logging
export const morganStream = {
  write: (message: string) => {
    enhancedLogger.http(message.trim(), { category: 'http_request' });
  },
};