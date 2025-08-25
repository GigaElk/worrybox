import { Platform, PlatformConfig, ResourceLimits, PlatformFeatures, ColdStartOptimization, RenderSpecificConfig } from '../types/platform';
import logger from './logger';
import os from 'os';

export class PlatformAdapterService {
  private static instance: PlatformAdapterService;
  private platform: Platform;
  private config: PlatformConfig;
  private renderConfig?: RenderSpecificConfig;
  private startupTime: number;
  private coldStartDetected: boolean = false;

  private constructor() {
    this.startupTime = Date.now();
    this.platform = this.detectPlatform();
    this.config = this.getOptimalConfiguration();
    
    if (this.platform === 'render') {
      this.renderConfig = this.getRenderSpecificConfig();
      this.detectColdStart();
    }

    logger.info('Platform adapter initialized', {
      platform: this.platform,
      memoryLimit: this.config.memoryLimit,
      coldStart: this.coldStartDetected,
      optimizations: this.config.enableOptimizations,
    });
  }

  public static getInstance(): PlatformAdapterService {
    if (!PlatformAdapterService.instance) {
      PlatformAdapterService.instance = new PlatformAdapterService();
    }
    return PlatformAdapterService.instance;
  }

  /**
   * Detect the current platform based on environment variables
   */
  detectPlatform(): Platform {
    // Render.com detection
    if (process.env.RENDER || process.env.RENDER_SERVICE_ID) {
      return 'render';
    }

    // Heroku detection
    if (process.env.DYNO || process.env.HEROKU_APP_NAME) {
      return 'heroku';
    }

    // Vercel detection
    if (process.env.VERCEL || process.env.VERCEL_ENV) {
      return 'vercel';
    }

    // AWS detection
    if (process.env.AWS_REGION || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.ECS_CONTAINER_METADATA_URI) {
      return 'aws';
    }

    // Azure detection
    if (process.env.WEBSITE_SITE_NAME || process.env.AZURE_FUNCTIONS_ENVIRONMENT) {
      return 'azure';
    }

    // Google Cloud Platform detection
    if (process.env.GOOGLE_CLOUD_PROJECT || process.env.GAE_APPLICATION) {
      return 'gcp';
    }

    // Local development detection
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      return 'local';
    }

    return 'other';
  }

  /**
   * Get optimal configuration for the detected platform
   */
  getOptimalConfiguration(): PlatformConfig {
    const baseConfig: PlatformConfig = {
      platform: this.platform,
      memoryLimit: 512, // Default 512MB
      maxConnections: 10,
      requestTimeout: 30000,
      healthCheckTimeout: 10000,
      gcThreshold: 80,
      connectionPoolSize: 5,
      enableOptimizations: true,
      coldStartOptimization: false,
      lazyLoading: false,
    };

    switch (this.platform) {
      case 'render':
        return {
          ...baseConfig,
          memoryLimit: 512, // Render free tier limit
          maxConnections: 5, // Conservative for free tier
          requestTimeout: 25000, // Slightly less than Render's 30s limit
          healthCheckTimeout: 8000, // Fast health checks for Render
          gcThreshold: 75, // More aggressive GC on Render
          connectionPoolSize: 3, // Smaller pool for memory efficiency
          coldStartOptimization: true,
          lazyLoading: true,
        };

      case 'heroku':
        return {
          ...baseConfig,
          memoryLimit: 512, // Heroku free tier
          maxConnections: 10,
          requestTimeout: 25000, // Heroku has 30s request timeout
          connectionPoolSize: 5,
          coldStartOptimization: true,
          lazyLoading: true,
        };

      case 'local':
        return {
          ...baseConfig,
          memoryLimit: 2048, // More generous for local dev
          maxConnections: 20,
          requestTimeout: 60000,
          healthCheckTimeout: 5000,
          gcThreshold: 90,
          connectionPoolSize: 10,
          enableOptimizations: false, // Disable optimizations for easier debugging
          coldStartOptimization: false,
          lazyLoading: false,
        };

      case 'aws':
      case 'azure':
      case 'gcp':
        return {
          ...baseConfig,
          memoryLimit: 1024, // More generous for cloud platforms
          maxConnections: 15,
          connectionPoolSize: 8,
          coldStartOptimization: true,
        };

      default:
        return baseConfig;
    }
  }

  /**
   * Get Render.com specific configuration
   */
  private getRenderSpecificConfig(): RenderSpecificConfig {
    return {
      serviceId: process.env.RENDER_SERVICE_ID,
      region: process.env.RENDER_REGION || 'oregon',
      plan: (process.env.RENDER_PLAN as any) || 'free',
      autoDeploy: process.env.RENDER_AUTO_DEPLOY === 'true',
      healthCheckPath: '/health',
      memoryLimit: 512, // MB
      cpuLimit: 0.1, // CPU units for free tier
      diskLimit: 1024, // MB
      maxRequestDuration: 30, // seconds
      sleepAfterInactivity: true,
      sleepDelay: 15, // minutes
    };
  }

  /**
   * Detect if this is a cold start
   */
  private detectColdStart(): void {
    const uptime = process.uptime();
    
    // Consider it a cold start if:
    // 1. Process uptime is very low (< 10 seconds)
    // 2. No previous state indicators
    // 3. Memory usage is at baseline
    
    if (uptime < 10) {
      this.coldStartDetected = true;
      logger.info('Cold start detected', {
        uptime,
        platform: this.platform,
        memoryUsage: process.memoryUsage(),
      });
    }
  }

  /**
   * Handle cold start optimization
   */
  async handleColdStart(): Promise<void> {
    if (!this.coldStartDetected || !this.config.coldStartOptimization) {
      return;
    }

    const startTime = Date.now();
    
    try {
      logger.info('Applying cold start optimizations', {
        platform: this.platform,
      });

      // Preload critical modules
      await this.preloadCriticalModules();

      // Initialize essential services only
      await this.initializeEssentialServices();

      // Defer non-critical initialization
      this.deferNonCriticalTasks();

      // Warm up critical endpoints
      if (this.platform === 'render') {
        this.scheduleWarmupRequests();
      }

      const duration = Date.now() - startTime;
      logger.info('Cold start optimization completed', {
        duration,
        platform: this.platform,
      });

    } catch (error) {
      logger.error('Cold start optimization failed', error);
    }
  }

  /**
   * Monitor resource limits and provide warnings
   */
  monitorResourceLimits(): ResourceLimits {
    const memoryUsage = process.memoryUsage();
    const memoryUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const memoryPercentage = (memoryUsedMB / this.config.memoryLimit) * 100;

    const cpus = os.cpus();
    const loadAvg = os.loadavg();

    const limits: ResourceLimits = {
      memory: {
        total: this.config.memoryLimit,
        available: this.config.memoryLimit - memoryUsedMB,
        used: memoryUsedMB,
        percentage: Math.round(memoryPercentage * 100) / 100,
        approaching: memoryPercentage > 80,
        critical: memoryPercentage > 95,
      },
      cpu: {
        cores: cpus.length,
        usage: this.calculateCPUUsage(cpus),
        loadAverage: loadAvg,
      },
      network: {
        connections: 0, // Would need to implement connection counting
        maxConnections: this.config.maxConnections,
      },
    };

    // Log warnings for resource limits
    if (limits.memory.approaching) {
      logger.warn('Memory usage approaching platform limits', {
        platform: this.platform,
        memoryUsage: limits.memory,
        recommendations: this.getMemoryOptimizationRecommendations(),
      });
    }

    if (limits.memory.critical) {
      logger.error('Memory usage critical - approaching platform limits', {
        platform: this.platform,
        memoryUsage: limits.memory,
      });

      // Trigger emergency cleanup for Render
      if (this.platform === 'render') {
        this.performEmergencyCleanup();
      }
    }

    return limits;
  }

  /**
   * Get platform-specific features
   */
  getPlatformFeatures(): PlatformFeatures {
    const baseFeatures: PlatformFeatures = {
      autoScaling: false,
      persistentStorage: false,
      loadBalancer: false,
      healthChecks: true,
      environmentVariables: true,
      customDomains: false,
      ssl: false,
      logging: true,
      metrics: false,
      alerts: false,
    };

    switch (this.platform) {
      case 'render':
        return {
          ...baseFeatures,
          autoScaling: true,
          loadBalancer: true,
          customDomains: true,
          ssl: true,
          logging: true,
          metrics: true,
        };

      case 'heroku':
        return {
          ...baseFeatures,
          autoScaling: true,
          persistentStorage: true,
          loadBalancer: true,
          customDomains: true,
          ssl: true,
          metrics: true,
          alerts: true,
        };

      case 'aws':
      case 'azure':
      case 'gcp':
        return {
          ...baseFeatures,
          autoScaling: true,
          persistentStorage: true,
          loadBalancer: true,
          customDomains: true,
          ssl: true,
          metrics: true,
          alerts: true,
        };

      default:
        return baseFeatures;
    }
  }

  /**
   * Get platform-specific recommendations
   */
  getOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.platform === 'render') {
      recommendations.push('Use connection pooling to manage database connections efficiently');
      recommendations.push('Implement lazy loading for non-critical services');
      recommendations.push('Monitor memory usage closely due to 512MB limit');
      recommendations.push('Use health checks to prevent service sleeping');
      recommendations.push('Optimize cold start performance');
    }

    if (this.platform === 'heroku') {
      recommendations.push('Use Heroku Postgres connection pooling');
      recommendations.push('Implement proper dyno sleeping management');
      recommendations.push('Use Heroku Redis for caching');
    }

    if (this.platform === 'local') {
      recommendations.push('Enable detailed logging for debugging');
      recommendations.push('Use hot reloading for development efficiency');
      recommendations.push('Consider using Docker for consistency');
    }

    return recommendations;
  }

  /**
   * Get current platform configuration
   */
  getConfig(): PlatformConfig {
    return { ...this.config };
  }

  /**
   * Get platform type
   */
  getPlatform(): Platform {
    return this.platform;
  }

  /**
   * Check if running on Render.com
   */
  isRender(): boolean {
    return this.platform === 'render';
  }

  /**
   * Check if cold start optimization should be applied
   */
  shouldOptimizeForColdStart(): boolean {
    return this.config.coldStartOptimization && this.coldStartDetected;
  }

  /**
   * Get Render-specific configuration
   */
  getRenderConfig(): RenderSpecificConfig | undefined {
    return this.renderConfig;
  }

  // Private helper methods

  private async preloadCriticalModules(): Promise<void> {
    const criticalModules = [
      '@prisma/client',
      'express',
      'cors',
      'helmet',
    ];

    for (const moduleName of criticalModules) {
      try {
        await import(moduleName);
      } catch (error) {
        logger.warn(`Failed to preload module: ${moduleName}`, error);
      }
    }
  }

  private async initializeEssentialServices(): Promise<void> {
    // Initialize only the most critical services during cold start
    // Database connection, health check service, etc.
    logger.debug('Initializing essential services for cold start');
  }

  private deferNonCriticalTasks(): void {
    // Defer tasks like email sending, analytics, etc.
    setTimeout(() => {
      logger.debug('Initializing deferred non-critical tasks');
    }, 5000);
  }

  private scheduleWarmupRequests(): void {
    if (this.platform !== 'render') return;

    // Schedule periodic requests to prevent Render service from sleeping
    const warmupInterval = 10 * 60 * 1000; // 10 minutes
    
    setInterval(() => {
      // Make a lightweight request to keep service warm
      // This would typically be done externally, but we can log the need
      logger.debug('Service warmup interval - consider external ping service');
    }, warmupInterval);
  }

  private calculateCPUUsage(cpus: os.CpuInfo[]): number {
    if (cpus.length === 0) return 0;
    
    let totalIdle = 0;
    let totalTick = 0;
    
    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof os.CpuInfo['times']];
      }
      totalIdle += cpu.times.idle;
    });
    
    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    
    return Math.round((100 - ~~(100 * idle / total)) * 100) / 100;
  }

  private getMemoryOptimizationRecommendations(): string[] {
    return [
      'Trigger garbage collection manually',
      'Clear unnecessary caches',
      'Reduce connection pool size',
      'Defer non-critical operations',
      'Consider restarting the service',
    ];
  }

  private performEmergencyCleanup(): void {
    logger.warn('Performing emergency cleanup due to critical memory usage');
    
    // Trigger garbage collection if available
    if (global.gc) {
      global.gc();
    }

    // Clear any application-level caches
    // This would be implemented based on your specific caching strategy
  }
}