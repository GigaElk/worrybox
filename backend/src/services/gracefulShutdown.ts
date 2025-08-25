import { ErrorHandlingService } from './errorHandling';
import { MemoryManagerService } from './memoryManager';
import { SchedulerResilienceService } from './schedulerResilience';
import { DatabaseConnection } from '../utils/databaseConnection';
import { PlatformAdapterService } from './platformAdapter';
import { RenderOptimizationService } from './renderOptimizations';
import logger from './logger';

export interface ShutdownConfig {
  gracefulTimeout: number; // milliseconds
  forceTimeout: number; // milliseconds
  enableGracefulShutdown: boolean;
  cleanupServices: boolean;
  waitForActiveRequests: boolean;
  maxActiveRequestWait: number; // milliseconds
}

export interface ShutdownPhase {
  name: string;
  priority: number;
  timeout: number; // milliseconds
  execute: () => Promise<void>;
  required: boolean;
}

export interface ShutdownMetrics {
  startTime: number;
  phases: {
    name: string;
    startTime: number;
    endTime?: number;
    duration?: number;
    success: boolean;
    error?: string;
  }[];
  totalDuration?: number;
  graceful: boolean;
  reason: string;
}

export class GracefulShutdownService {
  private static instance: GracefulShutdownService;
  private config: ShutdownConfig;
  private phases: ShutdownPhase[] = [];
  private isShuttingDown = false;
  private shutdownMetrics?: ShutdownMetrics;
  private activeRequests = new Set<string>();
  private server?: any;

  // Service instances
  private errorHandling: ErrorHandlingService;
  private memoryManager: MemoryManagerService;
  private schedulerResilience: SchedulerResilienceService;
  private platformAdapter: PlatformAdapterService;
  private renderOptimization: RenderOptimizationService;

  private constructor() {
    this.errorHandling = ErrorHandlingService.getInstance();
    this.memoryManager = MemoryManagerService.getInstance();
    this.schedulerResilience = SchedulerResilienceService.getInstance();
    this.platformAdapter = PlatformAdapterService.getInstance();
    this.renderOptimization = RenderOptimizationService.getInstance();
    this.config = this.getOptimalConfig();
  }

  public static getInstance(): GracefulShutdownService {
    if (!GracefulShutdownService.instance) {
      GracefulShutdownService.instance = new GracefulShutdownService();
    }
    return GracefulShutdownService.instance;
  }

  /**
   * Initialize graceful shutdown system
   */
  initialize(server?: any): void {
    this.server = server;
    this.setupShutdownPhases();
    this.setupSignalHandlers();
    
    logger.info('Graceful shutdown system initialized', {
      config: this.config,
      phases: this.phases.map(p => ({ name: p.name, priority: p.priority })),
    });
  }

  /**
   * Register a request for tracking
   */
  registerRequest(requestId: string): void {
    if (!this.isShuttingDown) {
      this.activeRequests.add(requestId);
    }
  }

  /**
   * Unregister a completed request
   */
  unregisterRequest(requestId: string): void {
    this.activeRequests.delete(requestId);
  }

  /**
   * Get current active request count
   */
  getActiveRequestCount(): number {
    return this.activeRequests.size;
  }

  /**
   * Check if system is shutting down
   */
  isShuttingDownStatus(): boolean {
    return this.isShuttingDown;
  }

  /**
   * Get shutdown metrics
   */
  getShutdownMetrics(): ShutdownMetrics | null {
    return this.shutdownMetrics ? { ...this.shutdownMetrics } : null;
  }

  /**
   * Initiate graceful shutdown
   */
  async initiateShutdown(reason: string = 'Manual shutdown', signal?: string): Promise<void> {
    if (this.isShuttingDown) {
      logger.warn('Shutdown already in progress');
      return;
    }

    this.isShuttingDown = true;
    const startTime = Date.now();

    this.shutdownMetrics = {
      startTime,
      phases: [],
      graceful: true,
      reason: `${reason}${signal ? ` (${signal})` : ''}`,
    };

    logger.info('🛑 Initiating graceful shutdown', {
      reason: this.shutdownMetrics.reason,
      activeRequests: this.activeRequests.size,
      config: this.config,
    });

    try {
      // Set overall timeout
      const shutdownTimeout = setTimeout(() => {
        logger.error('⏰ Graceful shutdown timeout exceeded, forcing exit');
        this.forceShutdown();
      }, this.config.gracefulTimeout);

      // Execute shutdown phases
      await this.executeShutdownPhases();

      // Clear timeout
      clearTimeout(shutdownTimeout);

      // Calculate final metrics
      this.shutdownMetrics.totalDuration = Date.now() - startTime;

      logger.info('✅ Graceful shutdown completed successfully', {
        duration: this.shutdownMetrics.totalDuration,
        phases: this.shutdownMetrics.phases.length,
      });

      // Exit gracefully
      process.exit(0);

    } catch (error) {
      this.shutdownMetrics.graceful = false;
      this.shutdownMetrics.totalDuration = Date.now() - startTime;

      logger.error('❌ Graceful shutdown failed', {
        error: (error as Error).message,
        duration: this.shutdownMetrics.totalDuration,
      });

      // Force shutdown after graceful failure
      this.forceShutdown();
    }
  }

  /**
   * Force immediate shutdown
   */
  private forceShutdown(): void {
    logger.warn('🔥 Forcing immediate shutdown');

    try {
      // Abort all active requests
      this.activeRequests.clear();

      // Close server immediately
      if (this.server) {
        this.server.close();
      }

    } catch (error) {
      logger.error('Error during force shutdown', error);
    } finally {
      process.exit(1);
    }
  }

  /**
   * Handle uncaught exceptions gracefully
   */
  handleUncaughtException(error: Error): void {
    logger.error('🚨 Uncaught Exception detected', {
      error: error.message,
      stack: error.stack,
    });

    // Create error context and attempt recovery
    const errorContext = this.errorHandling.createErrorContext();
    
    this.errorHandling.handleError(error, errorContext)
      .then(recoveryActions => {
        const successfulRecovery = recoveryActions.some(action => action.success);
        
        if (successfulRecovery) {
          logger.info('🔧 Uncaught exception recovered, continuing operation', {
            recoveryActions: recoveryActions.map(a => a.type),
          });
        } else {
          logger.error('💥 Uncaught exception recovery failed, initiating shutdown');
          this.initiateShutdown('Uncaught exception - recovery failed');
        }
      })
      .catch(recoveryError => {
        logger.error('💥 Uncaught exception recovery error, forcing shutdown', recoveryError);
        this.forceShutdown();
      });
  }

  /**
   * Handle unhandled promise rejections gracefully
   */
  handleUnhandledRejection(reason: any, promise: Promise<any>): void {
    logger.error('🚨 Unhandled Promise Rejection detected', {
      reason: reason?.message || reason,
      stack: reason?.stack,
    });

    // Create error from rejection
    const error = reason instanceof Error ? reason : new Error(String(reason));
    const errorContext = this.errorHandling.createErrorContext();

    this.errorHandling.handleError(error, errorContext)
      .then(recoveryActions => {
        const successfulRecovery = recoveryActions.some(action => action.success);
        
        if (successfulRecovery) {
          logger.info('🔧 Unhandled rejection recovered, continuing operation', {
            recoveryActions: recoveryActions.map(a => a.type),
          });
        } else {
          logger.error('💥 Unhandled rejection recovery failed, initiating shutdown');
          this.initiateShutdown('Unhandled rejection - recovery failed');
        }
      })
      .catch(recoveryError => {
        logger.error('💥 Unhandled rejection recovery error, forcing shutdown', recoveryError);
        this.forceShutdown();
      });
  }

  // Private methods

  private getOptimalConfig(): ShutdownConfig {
    const platform = this.platformAdapter.getPlatform();
    
    const baseConfig: ShutdownConfig = {
      gracefulTimeout: 30000, // 30 seconds
      forceTimeout: 5000, // 5 seconds
      enableGracefulShutdown: true,
      cleanupServices: true,
      waitForActiveRequests: true,
      maxActiveRequestWait: 10000, // 10 seconds
    };

    // Platform-specific adjustments
    if (platform === 'render') {
      return {
        ...baseConfig,
        gracefulTimeout: 25000, // Shorter timeout for Render
        maxActiveRequestWait: 5000, // Less time to wait for requests
      };
    }

    if (platform === 'local') {
      return {
        ...baseConfig,
        gracefulTimeout: 60000, // Longer timeout for development
        waitForActiveRequests: false, // Don't wait in development
      };
    }

    return baseConfig;
  }

  private setupShutdownPhases(): void {
    this.phases = [
      {
        name: 'Stop accepting new requests',
        priority: 100,
        timeout: 2000,
        required: true,
        execute: async () => {
          logger.info('🚫 Stopping new request acceptance');
          
          if (this.server) {
            // Stop accepting new connections
            this.server.close();
          }
        },
      },
      {
        name: 'Wait for active requests',
        priority: 90,
        timeout: this.config.maxActiveRequestWait,
        required: false,
        execute: async () => {
          if (!this.config.waitForActiveRequests) {
            return;
          }

          logger.info('⏳ Waiting for active requests to complete', {
            activeRequests: this.activeRequests.size,
          });

          const startTime = Date.now();
          const maxWait = this.config.maxActiveRequestWait;

          while (this.activeRequests.size > 0 && (Date.now() - startTime) < maxWait) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          if (this.activeRequests.size > 0) {
            logger.warn('⚠️ Some requests still active after timeout', {
              remainingRequests: this.activeRequests.size,
            });
          } else {
            logger.info('✅ All active requests completed');
          }
        },
      },
      {
        name: 'Stop schedulers',
        priority: 80,
        timeout: 10000,
        required: true,
        execute: async () => {
          logger.info('🔄 Stopping all schedulers');
          await this.schedulerResilience.stopAll();
          await this.schedulerResilience.cleanup();
        },
      },
      {
        name: 'Cleanup error handling',
        priority: 70,
        timeout: 5000,
        required: true,
        execute: async () => {
          logger.info('🔧 Cleaning up error handling system');
          await this.errorHandling.cleanup();
        },
      },
      {
        name: 'Cleanup memory management',
        priority: 60,
        timeout: 5000,
        required: true,
        execute: async () => {
          logger.info('🧠 Cleaning up memory management');
          await this.memoryManager.cleanup();
        },
      },
      {
        name: 'Close database connections',
        priority: 50,
        timeout: 10000,
        required: true,
        execute: async () => {
          logger.info('🗄️ Closing database connections');
          await DatabaseConnection.disconnect();
        },
      },
      {
        name: 'Platform-specific cleanup',
        priority: 40,
        timeout: 5000,
        required: false,
        execute: async () => {
          logger.info('🏗️ Performing platform-specific cleanup');
          
          if (this.platformAdapter.isRender()) {
            await this.renderOptimization.cleanup();
          }
        },
      },
      {
        name: 'Final cleanup',
        priority: 10,
        timeout: 2000,
        required: false,
        execute: async () => {
          logger.info('🧹 Performing final cleanup');
          
          // Clear any remaining timers or intervals
          // Force garbage collection if available
          if (global.gc) {
            global.gc();
          }
        },
      },
    ];

    // Sort phases by priority (highest first)
    this.phases.sort((a, b) => b.priority - a.priority);
  }

  private setupSignalHandlers(): void {
    // SIGTERM - Graceful shutdown request
    process.on('SIGTERM', () => {
      this.initiateShutdown('SIGTERM received', 'SIGTERM');
    });

    // SIGINT - Interrupt signal (Ctrl+C)
    process.on('SIGINT', () => {
      this.initiateShutdown('SIGINT received', 'SIGINT');
    });

    // SIGUSR2 - Used by nodemon for restart
    process.on('SIGUSR2', () => {
      this.initiateShutdown('SIGUSR2 received (restart)', 'SIGUSR2');
    });

    // Uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.handleUncaughtException(error);
    });

    // Unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.handleUnhandledRejection(reason, promise);
    });

    logger.info('Signal handlers registered for graceful shutdown');
  }

  private async executeShutdownPhases(): Promise<void> {
    logger.info('🔄 Executing shutdown phases', {
      totalPhases: this.phases.length,
    });

    for (const phase of this.phases) {
      const phaseStartTime = Date.now();
      
      const phaseMetric = {
        name: phase.name,
        startTime: phaseStartTime,
        success: false,
      };

      this.shutdownMetrics!.phases.push(phaseMetric);

      try {
        logger.info(`📋 Executing shutdown phase: ${phase.name}`);

        // Set phase timeout
        const phaseTimeout = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Phase '${phase.name}' timeout after ${phase.timeout}ms`));
          }, phase.timeout);
        });

        // Execute phase with timeout
        await Promise.race([
          phase.execute(),
          phaseTimeout,
        ]);

        phaseMetric.endTime = Date.now();
        phaseMetric.duration = phaseMetric.endTime - phaseStartTime;
        phaseMetric.success = true;

        logger.info(`✅ Shutdown phase completed: ${phase.name}`, {
          duration: phaseMetric.duration,
        });

      } catch (error) {
        phaseMetric.endTime = Date.now();
        phaseMetric.duration = phaseMetric.endTime - phaseStartTime;
        phaseMetric.error = (error as Error).message;

        logger.error(`❌ Shutdown phase failed: ${phase.name}`, {
          error: (error as Error).message,
          duration: phaseMetric.duration,
          required: phase.required,
        });

        // If this is a required phase and it failed, throw error
        if (phase.required) {
          throw new Error(`Required shutdown phase '${phase.name}' failed: ${(error as Error).message}`);
        }
      }
    }

    logger.info('✅ All shutdown phases completed');
  }
}

// Export singleton instance
export const gracefulShutdown = GracefulShutdownService.getInstance();