import { StartupOptimizer } from './startupOptimizer';
import logger from './logger';

interface LazyService {
  name: string;
  loader: () => Promise<any>;
  instance?: any;
  loading?: Promise<any>;
  dependencies: string[];
  timeout: number;
}

export class LazyLoader {
  private static instance: LazyLoader;
  private services = new Map<string, LazyService>();
  private startupOptimizer: StartupOptimizer;

  private constructor() {
    this.startupOptimizer = StartupOptimizer.getInstance();
    this.registerLazyServices();
  }

  public static getInstance(): LazyLoader {
    if (!LazyLoader.instance) {
      LazyLoader.instance = new LazyLoader();
    }
    return LazyLoader.instance;
  }

  /**
   * Register a lazy-loaded service
   */
  registerLazyService(
    name: string,
    loader: () => Promise<any>,
    dependencies: string[] = [],
    timeout: number = 10000
  ): void {
    this.services.set(name, {
      name,
      loader,
      dependencies,
      timeout,
    });

    logger.debug('Lazy service registered', { name, dependencies });
  }

  /**
   * Get a lazy-loaded service, initializing it if necessary
   */
  async getService<T = any>(name: string): Promise<T> {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Lazy service '${name}' not found`);
    }

    // Return cached instance if available
    if (service.instance) {
      return service.instance;
    }

    // Return existing loading promise if already loading
    if (service.loading) {
      return service.loading;
    }

    // Start loading the service
    logger.info('Loading lazy service', { name });
    
    service.loading = this.loadService(service);
    
    try {
      service.instance = await service.loading;
      delete service.loading;
      
      logger.info('Lazy service loaded successfully', { name });
      return service.instance;
    } catch (error) {
      delete service.loading;
      logger.error('Failed to load lazy service', { name, error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Check if a service is loaded
   */
  isServiceLoaded(name: string): boolean {
    const service = this.services.get(name);
    return service ? !!service.instance : false;
  }

  /**
   * Preload specific services
   */
  async preloadServices(serviceNames: string[]): Promise<void> {
    logger.info('Preloading lazy services', { services: serviceNames });

    const loadPromises = serviceNames.map(async (name) => {
      try {
        await this.getService(name);
      } catch (error) {
        logger.warn('Failed to preload service', { name, error: (error as Error).message });
      }
    });

    await Promise.allSettled(loadPromises);
  }

  /**
   * Get loading status of all services
   */
  getServiceStatus(): Record<string, 'not_loaded' | 'loading' | 'loaded' | 'error'> {
    const status: Record<string, 'not_loaded' | 'loading' | 'loaded' | 'error'> = {};
    
    for (const [name, service] of this.services) {
      if (service.instance) {
        status[name] = 'loaded';
      } else if (service.loading) {
        status[name] = 'loading';
      } else {
        status[name] = 'not_loaded';
      }
    }
    
    return status;
  }

  // Private methods

  private async loadService(service: LazyService): Promise<any> {
    // Check dependencies
    for (const dependency of service.dependencies) {
      if (!this.startupOptimizer.isServiceInitialized(dependency)) {
        throw new Error(`Service '${service.name}' depends on '${dependency}' which is not initialized`);
      }
    }

    // Load with timeout
    try {
      const result = await Promise.race([
        service.loader(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Service loading timeout')), service.timeout)
        ),
      ]);

      return result;
    } catch (error) {
      logger.error('Service loading failed', {
        name: service.name,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  private registerLazyServices(): void {
    // Scheduler services
    this.registerLazyService(
      'schedulers',
      async () => {
        const { SchedulingService } = await import('./schedulingService');
        const { NotificationScheduler } = await import('./notificationScheduler');
        const { AIReprocessingService } = await import('./aiReprocessingService');
        
        const schedulingService = SchedulingService.getInstance();
        const notificationScheduler = NotificationScheduler.getInstance();
        const aiReprocessingService = AIReprocessingService.getInstance();
        
        return {
          schedulingService,
          notificationScheduler,
          aiReprocessingService,
        };
      },
      ['database', 'memory-manager'],
      15000
    );

    // Email service
    this.registerLazyService(
      'email-service',
      async () => {
        const { WelcomeEmailService } = await import('./welcomeEmailService');
        return WelcomeEmailService;
      },
      [],
      10000
    );

    // Analytics services
    this.registerLazyService(
      'analytics',
      async () => {
        // Import analytics services when needed
        return {
          // Analytics services would be imported here
        };
      },
      ['database'],
      10000
    );

    // Performance metrics service
    this.registerLazyService(
      'performance-metrics',
      async () => {
        const { PerformanceMetricsService } = await import('./performanceMetrics');
        return PerformanceMetricsService.getInstance();
      },
      [],
      5000
    );

    // Diagnostics service
    this.registerLazyService(
      'diagnostics',
      async () => {
        const { DiagnosticsService } = await import('./diagnosticsService');
        const diagnostics = DiagnosticsService.getInstance();
        await diagnostics.initialize();
        return diagnostics;
      },
      ['memory-manager'],
      10000
    );

    // Error handling service
    this.registerLazyService(
      'error-handling',
      async () => {
        const { ErrorHandlingService } = await import('./errorHandler');
        const errorHandler = ErrorHandlingService.getInstance();
        await errorHandler.initialize();
        return errorHandler;
      },
      [],
      10000
    );

    // Scheduler resilience service
    this.registerLazyService(
      'scheduler-resilience',
      async () => {
        const { SchedulerResilienceService } = await import('./schedulerResilience');
        const schedulerResilience = SchedulerResilienceService.getInstance();
        await schedulerResilience.initialize();
        return schedulerResilience;
      },
      ['schedulers'],
      10000
    );
  }
}

/**
 * Utility function to get a lazy service
 */
export async function getLazyService<T = any>(name: string): Promise<T> {
  const lazyLoader = LazyLoader.getInstance();
  return lazyLoader.getService<T>(name);
}

/**
 * Utility function to check if a service is loaded
 */
export function isServiceLoaded(name: string): boolean {
  const lazyLoader = LazyLoader.getInstance();
  return lazyLoader.isServiceLoaded(name);
}

/**
 * Middleware to ensure a service is loaded before handling requests
 */
export function requireService(serviceName: string) {
  return async (req: any, res: any, next: any) => {
    try {
      await getLazyService(serviceName);
      next();
    } catch (error) {
      logger.error('Failed to load required service', {
        service: serviceName,
        path: req.path,
        error: (error as Error).message,
      });
      
      res.status(503).json({
        error: 'Service temporarily unavailable',
        service: serviceName,
        message: 'The required service is not available at this time',
      });
    }
  };
}