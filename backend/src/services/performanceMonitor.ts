import { EnhancedLogger } from './enhancedLogger';
import { CorrelationService } from './correlationService';

interface PerformanceTimer {
  name: string;
  startTime: number;
  startCpuUsage: NodeJS.CpuUsage;
  startMemoryUsage: NodeJS.MemoryUsage;
  correlationId: string;
  metadata?: Record<string, any>;
}

interface PerformanceMetric {
  name: string;
  duration: number;
  cpuUsed: number;
  memoryDelta: number;
  timestamp: string;
  correlationId: string;
  success: boolean;
  metadata?: Record<string, any>;
}

interface PerformanceThresholds {
  slow: number;
  verySlow: number;
  critical: number;
  memoryWarning: number; // MB
  memoryCritical: number; // MB
}

interface PerformanceStats {
  totalOperations: number;
  averageDuration: number;
  slowOperations: number;
  verySlowOperations: number;
  criticalOperations: number;
  memoryWarnings: number;
  memoryCritical: number;
  recentMetrics: PerformanceMetric[];
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private logger: EnhancedLogger;
  private correlationService: CorrelationService;
  
  // Active timers
  private activeTimers = new Map<string, PerformanceTimer>();
  
  // Performance tracking
  private stats: PerformanceStats = {
    totalOperations: 0,
    averageDuration: 0,
    slowOperations: 0,
    verySlowOperations: 0,
    criticalOperations: 0,
    memoryWarnings: 0,
    memoryCritical: 0,
    recentMetrics: [],
  };
  
  // Configuration
  private thresholds: PerformanceThresholds = {
    slow: 1000, // 1 second
    verySlow: 5000, // 5 seconds
    critical: 10000, // 10 seconds
    memoryWarning: 50, // 50MB increase
    memoryCritical: 100, // 100MB increase
  };
  
  private config = {
    enablePerformanceLogging: true,
    enableMemoryTracking: true,
    enableCpuTracking: true,
    maxRecentMetrics: 1000,
    logSlowOperations: true,
    logMemoryWarnings: true,
  };

  private constructor() {
    this.logger = EnhancedLogger.getInstance();
    this.correlationService = CorrelationService.getInstance();
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start timing an operation
   */
  startTimer(name: string, correlationId?: string, metadata?: Record<string, any>): string {
    const timerId = correlationId || this.correlationService.generateCorrelationId();
    
    const timer: PerformanceTimer = {
      name,
      startTime: Date.now(),
      startCpuUsage: process.cpuUsage(),
      startMemoryUsage: process.memoryUsage(),
      correlationId: timerId,
      metadata,
    };
    
    this.activeTimers.set(timerId, timer);
    
    this.logger.debug(`Performance timer started: ${name}`, {
      correlationId: timerId,
      operation: name,
      category: 'performance_start',
      ...metadata,
    });
    
    return timerId;
  }

  /**
   * End timing an operation and log performance metrics
   */
  endTimer(timerId: string, success: boolean = true, metadata?: Record<string, any>): PerformanceMetric | null {
    const timer = this.activeTimers.get(timerId);
    if (!timer) {
      this.logger.warn('Performance timer not found', {
        timerId,
        category: 'performance_error',
      });
      return null;
    }

    const endTime = Date.now();
    const endCpuUsage = process.cpuUsage(timer.startCpuUsage);
    const endMemoryUsage = process.memoryUsage();

    const duration = endTime - timer.startTime;
    const cpuUsed = (endCpuUsage.user + endCpuUsage.system) / 1000; // Convert to milliseconds
    const memoryDelta = Math.round((endMemoryUsage.heapUsed - timer.startMemoryUsage.heapUsed) / 1024 / 1024); // MB

    const metric: PerformanceMetric = {
      name: timer.name,
      duration,
      cpuUsed,
      memoryDelta,
      timestamp: new Date().toISOString(),
      correlationId: timer.correlationId,
      success,
      metadata: { ...timer.metadata, ...metadata },
    };

    // Remove timer from active timers
    this.activeTimers.delete(timerId);

    // Update statistics
    this.updateStats(metric);

    // Log performance metric
    this.logPerformanceMetric(metric);

    // Store recent metric
    this.storeRecentMetric(metric);

    return metric;
  }

  /**
   * Time an async operation
   */
  async timeOperation<T>(
    name: string,
    operation: () => Promise<T>,
    correlationId?: string,
    metadata?: Record<string, any>
  ): Promise<T> {
    const timerId = this.startTimer(name, correlationId, metadata);
    
    try {
      const result = await operation();
      this.endTimer(timerId, true);
      return result;
    } catch (error) {
      this.endTimer(timerId, false, { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Time a synchronous operation
   */
  timeSync<T>(
    name: string,
    operation: () => T,
    correlationId?: string,
    metadata?: Record<string, any>
  ): T {
    const timerId = this.startTimer(name, correlationId, metadata);
    
    try {
      const result = operation();
      this.endTimer(timerId, true);
      return result;
    } catch (error) {
      this.endTimer(timerId, false, { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Log a custom performance metric
   */
  logCustomMetric(
    name: string,
    duration: number,
    success: boolean = true,
    correlationId?: string,
    metadata?: Record<string, any>
  ): void {
    const metric: PerformanceMetric = {
      name,
      duration,
      cpuUsed: 0,
      memoryDelta: 0,
      timestamp: new Date().toISOString(),
      correlationId: correlationId || this.correlationService.generateCorrelationId(),
      success,
      metadata,
    };

    this.updateStats(metric);
    this.logPerformanceMetric(metric);
    this.storeRecentMetric(metric);
  }

  /**
   * Get performance statistics
   */
  getStats(): PerformanceStats {
    return { ...this.stats };
  }

  /**
   * Get active timers (for debugging)
   */
  getActiveTimers(): Array<{ id: string; name: string; duration: number }> {
    const now = Date.now();
    return Array.from(this.activeTimers.entries()).map(([id, timer]) => ({
      id,
      name: timer.name,
      duration: now - timer.startTime,
    }));
  }

  /**
   * Update performance thresholds
   */
  updateThresholds(thresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<typeof this.config>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalOperations: 0,
      averageDuration: 0,
      slowOperations: 0,
      verySlowOperations: 0,
      criticalOperations: 0,
      memoryWarnings: 0,
      memoryCritical: 0,
      recentMetrics: [],
    };
  }

  /**
   * Get slow operations from recent metrics
   */
  getSlowOperations(limit: number = 10): PerformanceMetric[] {
    return this.stats.recentMetrics
      .filter(metric => metric.duration > this.thresholds.slow)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  /**
   * Get memory-intensive operations from recent metrics
   */
  getMemoryIntensiveOperations(limit: number = 10): PerformanceMetric[] {
    return this.stats.recentMetrics
      .filter(metric => metric.memoryDelta > this.thresholds.memoryWarning)
      .sort((a, b) => b.memoryDelta - a.memoryDelta)
      .slice(0, limit);
  }

  // Private methods

  private updateStats(metric: PerformanceMetric): void {
    this.stats.totalOperations++;
    
    // Update average duration
    const totalDuration = this.stats.averageDuration * (this.stats.totalOperations - 1) + metric.duration;
    this.stats.averageDuration = totalDuration / this.stats.totalOperations;
    
    // Update threshold counters
    if (metric.duration > this.thresholds.critical) {
      this.stats.criticalOperations++;
    } else if (metric.duration > this.thresholds.verySlow) {
      this.stats.verySlowOperations++;
    } else if (metric.duration > this.thresholds.slow) {
      this.stats.slowOperations++;
    }
    
    // Update memory counters
    if (metric.memoryDelta > this.thresholds.memoryCritical) {
      this.stats.memoryCritical++;
    } else if (metric.memoryDelta > this.thresholds.memoryWarning) {
      this.stats.memoryWarnings++;
    }
  }

  private logPerformanceMetric(metric: PerformanceMetric): void {
    if (!this.config.enablePerformanceLogging) return;

    // Determine log level based on performance
    let level: 'info' | 'warn' | 'error' = 'info';
    const issues: string[] = [];
    
    if (metric.duration > this.thresholds.critical) {
      level = 'error';
      issues.push(`critical duration (${metric.duration}ms)`);
    } else if (metric.duration > this.thresholds.verySlow) {
      level = 'warn';
      issues.push(`very slow duration (${metric.duration}ms)`);
    } else if (metric.duration > this.thresholds.slow && this.config.logSlowOperations) {
      level = 'warn';
      issues.push(`slow duration (${metric.duration}ms)`);
    }
    
    if (metric.memoryDelta > this.thresholds.memoryCritical) {
      level = 'error';
      issues.push(`critical memory usage (${metric.memoryDelta}MB)`);
    } else if (metric.memoryDelta > this.thresholds.memoryWarning && this.config.logMemoryWarnings) {
      if (level === 'info') level = 'warn';
      issues.push(`high memory usage (${metric.memoryDelta}MB)`);
    }

    // Log the performance metric
    this.logger.logPerformance({
      operation: metric.name,
      duration: metric.duration,
      success: metric.success,
      correlationId: metric.correlationId,
      metadata: {
        cpuUsed: metric.cpuUsed,
        memoryDelta: metric.memoryDelta,
        issues: issues.length > 0 ? issues : undefined,
        ...metric.metadata,
      },
    });

    // Log additional context for problematic operations
    if (issues.length > 0) {
      const message = `Performance issue detected in ${metric.name}: ${issues.join(', ')}`;
      
      if (level === 'error') {
        this.logger.error(message, {
          correlationId: metric.correlationId,
          operation: metric.name,
          duration: metric.duration,
          memoryDelta: metric.memoryDelta,
          cpuUsed: metric.cpuUsed,
          category: 'performance_issue',
          severity: 'high',
        });
      } else if (level === 'warn') {
        this.logger.warn(message, {
          correlationId: metric.correlationId,
          operation: metric.name,
          duration: metric.duration,
          memoryDelta: metric.memoryDelta,
          cpuUsed: metric.cpuUsed,
          category: 'performance_warning',
        });
      }
    }
  }

  private storeRecentMetric(metric: PerformanceMetric): void {
    this.stats.recentMetrics.push(metric);
    
    // Keep only recent metrics
    if (this.stats.recentMetrics.length > this.config.maxRecentMetrics) {
      this.stats.recentMetrics = this.stats.recentMetrics.slice(-this.config.maxRecentMetrics);
    }
  }
}

/**
 * Decorator for timing method execution
 */
export function timed(name?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const operationName = name || `${target.constructor.name}.${propertyKey}`;
    
    descriptor.value = async function (...args: any[]) {
      const monitor = PerformanceMonitor.getInstance();
      return monitor.timeOperation(operationName, () => originalMethod.apply(this, args));
    };
    
    return descriptor;
  };
}

/**
 * Utility function to time operations
 */
export async function timeOperation<T>(
  name: string,
  operation: () => Promise<T>,
  correlationId?: string
): Promise<T> {
  const monitor = PerformanceMonitor.getInstance();
  return monitor.timeOperation(name, operation, correlationId);
}

export default PerformanceMonitor;