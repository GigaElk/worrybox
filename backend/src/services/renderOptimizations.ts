import { PlatformAdapterService } from './platformAdapter';
import { PerformanceMetricsService } from './performanceMetrics';
import { HealthCheckService } from './healthCheck';
import logger from './logger';

export class RenderOptimizationService {
  private static instance: RenderOptimizationService;
  private platformAdapter: PlatformAdapterService;
  private performanceService: PerformanceMetricsService;
  private healthService: HealthCheckService;
  private memoryMonitorInterval?: NodeJS.Timeout;
  private keepAliveInterval?: NodeJS.Timeout;
  private lastActivityTime: number = Date.now();

  private constructor() {
    this.platformAdapter = PlatformAdapterService.getInstance();
    this.performanceService = PerformanceMetricsService.getInstance();
    this.healthService = HealthCheckService.getInstance();
  }

  public static getInstance(): RenderOptimizationService {
    if (!RenderOptimizationService.instance) {
      RenderOptimizationService.instance = new RenderOptimizationService();
    }
    return RenderOptimizationService.instance;
  }

  /**
   * Initialize Render.com specific optimizations
   */
  async initialize(): Promise<void> {
    if (!this.platformAdapter.isRender()) {
      logger.debug('Not running on Render.com, skipping Render optimizations');
      return;
    }

    logger.info('Initializing Render.com optimizations');

    try {
      // Apply cold start optimizations
      await this.applyColdStartOptimizations();

      // Setup memory monitoring
      this.setupMemoryMonitoring();

      // Setup keep-alive mechanism
      this.setupKeepAlive();

      // Optimize database connections
      this.optimizeDatabaseConnections();

      // Setup request optimization
      this.setupRequestOptimizations();

      logger.info('Render.com optimizations initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Render optimizations', error);
    }
  }

  /**
   * Apply cold start optimizations
   */
  private async applyColdStartOptimizations(): Promise<void> {
    if (!this.platformAdapter.shouldOptimizeForColdStart()) {
      return;
    }

    const startTime = Date.now();
    logger.info('Applying Render.com cold start optimizations');

    try {
      // Lazy load non-critical modules
      await this.lazyLoadModules();

      // Optimize initial memory allocation
      this.optimizeInitialMemory();

      // Defer heavy initialization tasks
      this.deferHeavyTasks();

      const duration = Date.now() - startTime;
      logger.info('Cold start optimizations completed', { duration });
    } catch (error) {
      logger.error('Cold start optimization failed', error);
    }
  }

  /**
   * Setup memory monitoring specific to Render's 512MB limit
   */
  private setupMemoryMonitoring(): void {
    const config = this.platformAdapter.getConfig();
    
    this.memoryMonitorInterval = setInterval(() => {
      const limits = this.platformAdapter.monitorResourceLimits();
      
      // Render-specific memory management
      if (limits.memory.percentage > 85) {
        logger.warn('Memory usage high on Render.com', {
          memoryUsage: limits.memory,
          recommendations: [
            'Consider triggering garbage collection',
            'Clear application caches',
            'Reduce connection pool size',
          ],
        });

        // Trigger proactive garbage collection
        this.triggerGarbageCollection();
      }

      if (limits.memory.critical) {
        logger.error('Critical memory usage on Render.com - taking emergency action', {
          memoryUsage: limits.memory,
        });

        // Emergency memory cleanup
        this.performEmergencyMemoryCleanup();
      }

    }, 60000); // Check every minute
  }

  /**
   * Setup keep-alive mechanism to prevent Render service from sleeping
   */
  private setupKeepAlive(): void {
    const renderConfig = this.platformAdapter.getRenderConfig();
    
    if (!renderConfig?.sleepAfterInactivity) {
      return;
    }

    // Internal keep-alive (self-ping)
    this.keepAliveInterval = setInterval(async () => {
      try {
        // Perform a lightweight health check to keep service active
        await this.healthService.isHealthy();
        
        logger.debug('Keep-alive ping completed', {
          lastActivity: new Date(this.lastActivityTime).toISOString(),
          uptime: process.uptime(),
        });
      } catch (error) {
        logger.error('Keep-alive ping failed', error);
      }
    }, 10 * 60 * 1000); // Every 10 minutes

    logger.info('Keep-alive mechanism initialized', {
      interval: '10 minutes',
      sleepDelay: renderConfig.sleepDelay,
    });
  }

  /**
   * Optimize database connections for Render
   */
  private optimizeDatabaseConnections(): void {
    const config = this.platformAdapter.getConfig();
    
    logger.info('Optimizing database connections for Render.com', {
      maxConnections: config.maxConnections,
      connectionPoolSize: config.connectionPoolSize,
    });

    // Database connection optimization would be implemented here
    // This might involve configuring Prisma connection pool settings
  }

  /**
   * Setup request-level optimizations
   */
  private setupRequestOptimizations(): void {
    const config = this.platformAdapter.getConfig();
    
    logger.info('Setting up request optimizations for Render.com', {
      requestTimeout: config.requestTimeout,
      healthCheckTimeout: config.healthCheckTimeout,
    });

    // Request optimization logic would be implemented here
  }

  /**
   * Update last activity time (called by middleware)
   */
  updateActivity(): void {
    this.lastActivityTime = Date.now();
  }

  /**
   * Get Render-specific metrics
   */
  getRenderMetrics(): {
    memoryUsage: number;
    memoryLimit: number;
    memoryPercentage: number;
    uptime: number;
    lastActivity: string;
    sleepRisk: boolean;
  } {
    const limits = this.platformAdapter.monitorResourceLimits();
    const config = this.platformAdapter.getConfig();
    const renderConfig = this.platformAdapter.getRenderConfig();
    
    const timeSinceActivity = Date.now() - this.lastActivityTime;
    const sleepThreshold = (renderConfig?.sleepDelay || 15) * 60 * 1000; // Convert to ms
    
    return {
      memoryUsage: limits.memory.used,
      memoryLimit: limits.memory.total,
      memoryPercentage: limits.memory.percentage,
      uptime: process.uptime(),
      lastActivity: new Date(this.lastActivityTime).toISOString(),
      sleepRisk: timeSinceActivity > (sleepThreshold * 0.8), // 80% of sleep threshold
    };
  }

  /**
   * Perform health check optimized for Render
   */
  async performRenderHealthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    renderMetrics: any;
    recommendations: string[];
  }> {
    const health = await this.healthService.performEnhancedHealthCheck();
    const renderMetrics = this.getRenderMetrics();
    const recommendations: string[] = [];

    // Render-specific recommendations
    if (renderMetrics.memoryPercentage > 80) {
      recommendations.push('Memory usage high - consider optimizing memory usage');
      recommendations.push('Trigger garbage collection to free memory');
    }

    if (renderMetrics.sleepRisk) {
      recommendations.push('Service at risk of sleeping - increase activity or setup external monitoring');
    }

    if (health.metrics.requestMetrics.errorRate > 5) {
      recommendations.push('High error rate detected - check application logs');
    }

    return {
      status: health.status,
      renderMetrics,
      recommendations,
    };
  }

  /**
   * Cleanup resources when shutting down
   */
  cleanup(): void {
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
    }

    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
    }

    logger.info('Render optimization service cleaned up');
  }

  // Private helper methods

  private async lazyLoadModules(): Promise<void> {
    // Defer loading of non-critical modules
    const deferredModules = [
      'nodemailer',
      '@google/generative-ai',
      'stripe',
    ];

    setTimeout(async () => {
      for (const moduleName of deferredModules) {
        try {
          await import(moduleName);
          logger.debug(`Lazy loaded module: ${moduleName}`);
        } catch (error) {
          logger.debug(`Module not available for lazy loading: ${moduleName}`);
        }
      }
    }, 2000); // Defer by 2 seconds
  }

  private optimizeInitialMemory(): void {
    // Set initial heap size if possible
    if (global.gc) {
      // Trigger initial garbage collection
      global.gc();
      logger.debug('Initial garbage collection triggered');
    }

    // Log initial memory state
    const memUsage = process.memoryUsage();
    logger.info('Initial memory state optimized', {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
    });
  }

  private deferHeavyTasks(): void {
    // Defer heavy initialization tasks
    setTimeout(() => {
      logger.debug('Initializing deferred heavy tasks');
      // Heavy tasks would be initialized here
    }, 5000);
  }

  private triggerGarbageCollection(): void {
    if (global.gc) {
      const beforeGC = process.memoryUsage();
      const startTime = Date.now();
      
      global.gc();
      
      const afterGC = process.memoryUsage();
      const duration = Date.now() - startTime;
      
      logger.info('Garbage collection completed', {
        duration,
        memoryBefore: Math.round(beforeGC.heapUsed / 1024 / 1024),
        memoryAfter: Math.round(afterGC.heapUsed / 1024 / 1024),
        memoryFreed: Math.round((beforeGC.heapUsed - afterGC.heapUsed) / 1024 / 1024),
      });
    } else {
      logger.warn('Garbage collection not available (start with --expose-gc flag)');
    }
  }

  private performEmergencyMemoryCleanup(): void {
    logger.warn('Performing emergency memory cleanup on Render.com');
    
    // Trigger garbage collection
    this.triggerGarbageCollection();
    
    // Clear performance metrics history to free memory
    this.performanceService.cleanup();
    
    // Log emergency cleanup
    const memUsage = process.memoryUsage();
    logger.warn('Emergency cleanup completed', {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
    });
  }
}