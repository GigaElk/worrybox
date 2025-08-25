import { PlatformAdapterService } from './platformAdapter';
import { MemoryManagerService } from './memoryManager';
import { DatabaseConnection } from '../utils/databaseConnection';
import logger from './logger';

interface StartupConfig {
  enableLazyLoading: boolean;
  enableSequentialInit: boolean;
  enableHealthValidation: boolean;
  enableResourceOptimization: boolean;
  maxStartupTime: number; // milliseconds
  healthCheckTimeout: number; // milliseconds
  criticalServices: string[];
  nonCriticalServices: string[];
}

interface ServiceDefinition {
  name: string;
  priority: number; // Lower number = higher priority
  critical: boolean;
  dependencies: string[];
  initFunction: () => Promise<void>;
  healthCheck?: () => Promise<boolean>;
  timeout: number; // milliseconds
  retryCount: number;
  lazy: boolean;
}

interface StartupMetrics {
  startTime: number;
  endTime?: number;
  totalDuration?: number;
  servicesInitialized: string[];
  servicesFailed: string[];
  servicesSkipped: string[];
  memoryUsage: {
    initial: NodeJS.MemoryUsage;
    final?: NodeJS.MemoryUsage;
    peak?: NodeJS.MemoryUsage;
  };
  healthCheckResults: Record<string, boolean>;
  warnings: string[];
  errors: string[];
}

export class StartupOptimizer {
  private static instance: StartupOptimizer;
  private config: StartupConfig;
  private platformAdapter: PlatformAdapterService;
  private memoryManager: MemoryManagerService;
  
  // Service registry
  private services = new Map<string, ServiceDefinition>();
  private initializedServices = new Set<string>();
  private failedServices = new Set<string>();
  
  // Startup tracking
  private metrics: StartupMetrics;
  private isOptimized = false;
  
  // Lazy loading
  private lazyServices = new Map<string, ServiceDefinition>();
  private lazyInitPromises = new Map<string, Promise<void>>();

  private constructor() {
    this.platformAdapter = PlatformAdapterService.getInstance();
    this.memoryManager = MemoryManagerService.getInstance();
    this.config = this.getOptimalConfig();
    this.metrics = this.initializeMetrics();
    
    this.registerCoreServices();
  }

  public static getInstance(): StartupOptimizer {
    if (!StartupOptimizer.instance) {
      StartupOptimizer.instance = new StartupOptimizer();
    }
    return StartupOptimizer.instance;
  }

  /**
   * Optimize application startup process
   */
  async optimizeStartup(): Promise<StartupMetrics> {
    if (this.isOptimized) {
      return this.metrics;
    }

    logger.info('Starting application startup optimization', {
      platform: this.platformAdapter.getPlatform(),
      config: this.config,
    });

    this.metrics.startTime = Date.now();
    this.metrics.memoryUsage.initial = process.memoryUsage();

    try {
      // Phase 1: Initialize critical services sequentially
      await this.initializeCriticalServices();
      
      // Phase 2: Initialize non-critical services (parallel or lazy)
      await this.initializeNonCriticalServices();
      
      // Phase 3: Validate startup health
      if (this.config.enableHealthValidation) {
        await this.validateStartupHealth();
      }
      
      // Phase 4: Optimize resource usage
      if (this.config.enableResourceOptimization) {
        await this.optimizeResourceUsage();
      }

      this.metrics.endTime = Date.now();
      this.metrics.totalDuration = this.metrics.endTime - this.metrics.startTime;
      this.metrics.memoryUsage.final = process.memoryUsage();
      
      this.isOptimized = true;
      
      logger.info('Application startup optimization completed', {
        duration: this.metrics.totalDuration,
        servicesInitialized: this.metrics.servicesInitialized.length,
        servicesFailed: this.metrics.servicesFailed.length,
        memoryUsed: Math.round(this.metrics.memoryUsage.final.heapUsed / 1024 / 1024),
        warnings: this.metrics.warnings.length,
        errors: this.metrics.errors.length,
      });

    } catch (error) {
      this.metrics.errors.push((error as Error).message);
      logger.error('Startup optimization failed', error);
      throw error;
    }

    return this.metrics;
  }

  /**
   * Register a service for startup management
   */
  registerService(service: ServiceDefinition): void {
    this.services.set(service.name, service);
    
    if (service.lazy && this.config.enableLazyLoading) {
      this.lazyServices.set(service.name, service);
    }
    
    logger.debug('Service registered for startup', {
      name: service.name,
      priority: service.priority,
      critical: service.critical,
      lazy: service.lazy,
    });
  }

  /**
   * Initialize a lazy service on demand
   */
  async initializeLazyService(serviceName: string): Promise<void> {
    if (this.initializedServices.has(serviceName)) {
      return; // Already initialized
    }

    if (this.lazyInitPromises.has(serviceName)) {
      return this.lazyInitPromises.get(serviceName)!; // Already initializing
    }

    const service = this.lazyServices.get(serviceName);
    if (!service) {
      throw new Error(`Lazy service '${serviceName}' not found`);
    }

    logger.info('Initializing lazy service', { serviceName });

    const initPromise = this.initializeService(service);
    this.lazyInitPromises.set(serviceName, initPromise);

    try {
      await initPromise;
      this.lazyInitPromises.delete(serviceName);
    } catch (error) {
      this.lazyInitPromises.delete(serviceName);
      throw error;
    }
  }

  /**
   * Check if a service is initialized
   */
  isServiceInitialized(serviceName: string): boolean {
    return this.initializedServices.has(serviceName);
  }

  /**
   * Get startup metrics
   */
  getStartupMetrics(): StartupMetrics {
    return { ...this.metrics };
  }

  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (this.metrics.totalDuration && this.metrics.totalDuration > this.config.maxStartupTime) {
      recommendations.push(`Startup time (${this.metrics.totalDuration}ms) exceeds target (${this.config.maxStartupTime}ms)`);
    }
    
    if (this.metrics.servicesFailed.length > 0) {
      recommendations.push(`${this.metrics.servicesFailed.length} services failed to initialize`);
    }
    
    const memoryIncrease = this.metrics.memoryUsage.final && this.metrics.memoryUsage.initial
      ? this.metrics.memoryUsage.final.heapUsed - this.metrics.memoryUsage.initial.heapUsed
      : 0;
    
    if (memoryIncrease > 100 * 1024 * 1024) { // 100MB
      recommendations.push(`High memory usage during startup: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
    }
    
    if (this.metrics.warnings.length > 0) {
      recommendations.push(`${this.metrics.warnings.length} warnings during startup`);
    }
    
    return recommendations;
  }

  // Private methods

  private getOptimalConfig(): StartupConfig {
    const platform = this.platformAdapter.getPlatform();
    
    const baseConfig: StartupConfig = {
      enableLazyLoading: true,
      enableSequentialInit: true,
      enableHealthValidation: true,
      enableResourceOptimization: true,
      maxStartupTime: 30000, // 30 seconds
      healthCheckTimeout: 5000, // 5 seconds
      criticalServices: [
        'database',
        'logger',
        'platform-adapter',
        'memory-manager',
      ],
      nonCriticalServices: [
        'scheduler',
        'email-service',
        'analytics',
        'monitoring',
      ],
    };

    // Platform-specific optimizations
    if (platform === 'render') {
      return {
        ...baseConfig,
        maxStartupTime: 20000, // Faster startup on Render
        enableLazyLoading: true, // More aggressive lazy loading
        criticalServices: [
          'database',
          'logger',
          'platform-adapter',
          'memory-manager',
          'health-check',
        ],
      };
    }

    if (platform === 'local') {
      return {
        ...baseConfig,
        maxStartupTime: 10000, // Faster startup in development
        enableHealthValidation: false, // Skip health validation in dev
      };
    }

    return baseConfig;
  }

  private initializeMetrics(): StartupMetrics {
    return {
      startTime: 0,
      servicesInitialized: [],
      servicesFailed: [],
      servicesSkipped: [],
      memoryUsage: {
        initial: process.memoryUsage(),
      },
      healthCheckResults: {},
      warnings: [],
      errors: [],
    };
  }

  private registerCoreServices(): void {
    // Database service
    this.registerService({
      name: 'database',
      priority: 1,
      critical: true,
      dependencies: [],
      initFunction: async () => {
        await DatabaseConnection.initialize();
      },
      healthCheck: async () => {
        return await DatabaseConnection.isHealthy();
      },
      timeout: 10000,
      retryCount: 3,
      lazy: false,
    });

    // Memory manager service
    this.registerService({
      name: 'memory-manager',
      priority: 2,
      critical: true,
      dependencies: [],
      initFunction: async () => {
        this.memoryManager.startMonitoring();
      },
      healthCheck: async () => {
        const stats = await this.memoryManager.getMemoryStats();
        return stats.status !== 'critical';
      },
      timeout: 5000,
      retryCount: 2,
      lazy: false,
    });

    // Platform adapter service
    this.registerService({
      name: 'platform-adapter',
      priority: 3,
      critical: true,
      dependencies: [],
      initFunction: async () => {
        // Platform adapter is already initialized
        await Promise.resolve();
      },
      healthCheck: async () => {
        return this.platformAdapter.getPlatform() !== 'unknown';
      },
      timeout: 1000,
      retryCount: 1,
      lazy: false,
    });

    // Health check service
    this.registerService({
      name: 'health-check',
      priority: 4,
      critical: false,
      dependencies: ['database', 'memory-manager'],
      initFunction: async () => {
        const { HealthCheckService } = await import('./healthCheck');
        const healthCheck = HealthCheckService.getInstance();
        await healthCheck.initialize();
      },
      healthCheck: async () => {
        const { HealthCheckService } = await import('./healthCheck');
        const healthCheck = HealthCheckService.getInstance();
        return await healthCheck.isHealthy();
      },
      timeout: 5000,
      retryCount: 2,
      lazy: false,
    });

    // Scheduler services (lazy loaded)
    this.registerService({
      name: 'schedulers',
      priority: 10,
      critical: false,
      dependencies: ['database', 'memory-manager'],
      initFunction: async () => {
        // Schedulers will be initialized when needed
        await Promise.resolve();
      },
      timeout: 10000,
      retryCount: 2,
      lazy: true,
    });

    // Email service (lazy loaded)
    this.registerService({
      name: 'email-service',
      priority: 15,
      critical: false,
      dependencies: [],
      initFunction: async () => {
        // Email service will be initialized when needed
        await Promise.resolve();
      },
      timeout: 5000,
      retryCount: 1,
      lazy: true,
    });

    // Analytics service (lazy loaded)
    this.registerService({
      name: 'analytics',
      priority: 20,
      critical: false,
      dependencies: ['database'],
      initFunction: async () => {
        // Analytics will be initialized when needed
        await Promise.resolve();
      },
      timeout: 5000,
      retryCount: 1,
      lazy: true,
    });
  }

  private async initializeCriticalServices(): Promise<void> {
    logger.info('Initializing critical services');

    const criticalServices = Array.from(this.services.values())
      .filter(service => service.critical && !service.lazy)
      .sort((a, b) => a.priority - b.priority);

    for (const service of criticalServices) {
      try {
        await this.initializeService(service);
      } catch (error) {
        logger.error(`Critical service initialization failed: ${service.name}`, error);
        throw new Error(`Critical service '${service.name}' failed to initialize: ${(error as Error).message}`);
      }
    }
  }

  private async initializeNonCriticalServices(): Promise<void> {
    logger.info('Initializing non-critical services');

    const nonCriticalServices = Array.from(this.services.values())
      .filter(service => !service.critical && !service.lazy)
      .sort((a, b) => a.priority - b.priority);

    // Initialize non-critical services in parallel (with concurrency limit)
    const concurrencyLimit = 3;
    const chunks = this.chunkArray(nonCriticalServices, concurrencyLimit);

    for (const chunk of chunks) {
      const promises = chunk.map(async (service) => {
        try {
          await this.initializeService(service);
        } catch (error) {
          logger.warn(`Non-critical service initialization failed: ${service.name}`, error);
          this.metrics.warnings.push(`Service '${service.name}' failed: ${(error as Error).message}`);
        }
      });

      await Promise.allSettled(promises);
    }
  }

  private async initializeService(service: ServiceDefinition): Promise<void> {
    const startTime = Date.now();
    
    logger.debug('Initializing service', {
      name: service.name,
      priority: service.priority,
      critical: service.critical,
    });

    // Check dependencies
    for (const dependency of service.dependencies) {
      if (!this.initializedServices.has(dependency)) {
        throw new Error(`Service '${service.name}' depends on '${dependency}' which is not initialized`);
      }
    }

    // Initialize with timeout and retries
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= service.retryCount + 1; attempt++) {
      try {
        await Promise.race([
          service.initFunction(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Service initialization timeout')), service.timeout)
          ),
        ]);

        // Service initialized successfully
        this.initializedServices.add(service.name);
        this.metrics.servicesInitialized.push(service.name);
        
        const duration = Date.now() - startTime;
        logger.info('Service initialized successfully', {
          name: service.name,
          duration,
          attempt,
        });
        
        return;

      } catch (error) {
        lastError = error as Error;
        
        if (attempt <= service.retryCount) {
          logger.warn(`Service initialization attempt ${attempt} failed, retrying`, {
            name: service.name,
            error: lastError.message,
          });
          
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
        }
      }
    }

    // All attempts failed
    this.failedServices.add(service.name);
    this.metrics.servicesFailed.push(service.name);
    
    const duration = Date.now() - startTime;
    logger.error('Service initialization failed after all attempts', {
      name: service.name,
      duration,
      attempts: service.retryCount + 1,
      error: lastError?.message,
    });

    throw lastError || new Error(`Service '${service.name}' initialization failed`);
  }

  private async validateStartupHealth(): Promise<void> {
    logger.info('Validating startup health');

    const healthChecks = Array.from(this.services.values())
      .filter(service => service.healthCheck && this.initializedServices.has(service.name));

    const healthPromises = healthChecks.map(async (service) => {
      try {
        const isHealthy = await Promise.race([
          service.healthCheck!(),
          new Promise<boolean>((_, reject) => 
            setTimeout(() => reject(new Error('Health check timeout')), this.config.healthCheckTimeout)
          ),
        ]);

        this.metrics.healthCheckResults[service.name] = isHealthy;
        
        if (!isHealthy) {
          this.metrics.warnings.push(`Service '${service.name}' health check failed`);
        }

        return { service: service.name, healthy: isHealthy };
      } catch (error) {
        this.metrics.healthCheckResults[service.name] = false;
        this.metrics.warnings.push(`Service '${service.name}' health check error: ${(error as Error).message}`);
        return { service: service.name, healthy: false };
      }
    });

    const results = await Promise.allSettled(healthPromises);
    const healthyServices = results
      .filter(result => result.status === 'fulfilled' && result.value.healthy)
      .length;

    logger.info('Startup health validation completed', {
      totalServices: healthChecks.length,
      healthyServices,
      unhealthyServices: healthChecks.length - healthyServices,
    });
  }

  private async optimizeResourceUsage(): Promise<void> {
    logger.info('Optimizing resource usage');

    // Track peak memory usage
    const currentMemory = process.memoryUsage();
    if (!this.metrics.memoryUsage.peak || currentMemory.heapUsed > this.metrics.memoryUsage.peak.heapUsed) {
      this.metrics.memoryUsage.peak = currentMemory;
    }

    // Trigger garbage collection if memory usage is high
    const memoryUsageMB = Math.round(currentMemory.heapUsed / 1024 / 1024);
    const memoryLimit = this.platformAdapter.getOptimalConfig().maxMemoryMB;
    
    if (memoryUsageMB > memoryLimit * 0.7) { // 70% of limit
      logger.info('High memory usage detected, triggering garbage collection', {
        memoryUsageMB,
        memoryLimit,
        percentage: Math.round((memoryUsageMB / memoryLimit) * 100),
      });

      if (global.gc) {
        global.gc();
        
        const afterGC = process.memoryUsage();
        const freedMB = Math.round((currentMemory.heapUsed - afterGC.heapUsed) / 1024 / 1024);
        
        logger.info('Garbage collection completed', {
          freedMB,
          newMemoryUsageMB: Math.round(afterGC.heapUsed / 1024 / 1024),
        });
      }
    }

    // Optimize database connections
    try {
      await this.optimizeDatabaseConnections();
    } catch (error) {
      this.metrics.warnings.push(`Database optimization failed: ${(error as Error).message}`);
    }
  }

  private async optimizeDatabaseConnections(): Promise<void> {
    logger.debug('Optimizing database connections');

    // Get current database metrics
    const dbMetrics = DatabaseConnection.getHealthMetrics();
    if (!dbMetrics) {
      return;
    }

    // Check connection pool utilization
    const utilization = dbMetrics.poolMetrics.activeConnections / dbMetrics.poolMetrics.totalConnections;
    
    if (utilization < 0.3) { // Less than 30% utilization
      logger.info('Low database connection utilization detected', {
        utilization: Math.round(utilization * 100),
        activeConnections: dbMetrics.poolMetrics.activeConnections,
        totalConnections: dbMetrics.poolMetrics.totalConnections,
      });
      
      // Could implement connection pool resizing here
    }

    // Check for connection leaks
    if (dbMetrics.poolMetrics.queuedRequests > 10) {
      this.metrics.warnings.push(`High number of queued database requests: ${dbMetrics.poolMetrics.queuedRequests}`);
    }
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}