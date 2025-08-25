import { SchedulerResilienceService } from '../services/schedulerResilience';
import { SchedulerConfig, SchedulerExecutor, SchedulerExecutionContext } from '../types/scheduler';
import logger from '../services/logger';

/**
 * Utility for testing scheduler resilience features
 */
export class SchedulerTestingUtil {
  private static instance: SchedulerTestingUtil;
  private schedulerResilience: SchedulerResilienceService;

  private constructor() {
    this.schedulerResilience = SchedulerResilienceService.getInstance();
  }

  public static getInstance(): SchedulerTestingUtil {
    if (!SchedulerTestingUtil.instance) {
      SchedulerTestingUtil.instance = new SchedulerTestingUtil();
    }
    return SchedulerTestingUtil.instance;
  }

  /**
   * Create a test scheduler that can simulate various scenarios
   */
  createTestScheduler(name: string, options: {
    failureRate?: number; // 0-1, probability of failure
    executionTime?: number; // milliseconds
    memoryLeak?: boolean; // simulate memory leak
    crashAfter?: number; // crash after N executions
    dependsOn?: string[]; // dependencies
  } = {}): { config: SchedulerConfig; executor: SchedulerExecutor } {
    
    const config: SchedulerConfig = {
      name,
      enabled: true,
      interval: 5000, // 5 seconds
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 10000,
      memoryThreshold: 50,
      errorThreshold: 3,
      restartDelay: 2000,
      priority: 1,
      dependencies: options.dependsOn || [],
      healthCheckInterval: 10000,
    };

    let executionCount = 0;
    let memoryLeakArray: number[] = [];

    const executor: SchedulerExecutor = {
      name,
      execute: async (context: SchedulerExecutionContext) => {
        executionCount++;

        logger.info('Test scheduler executing', {
          schedulerName: name,
          executionId: context.executionId,
          executionCount,
        });

        // Simulate memory leak
        if (options.memoryLeak) {
          // Add 1MB of data each execution
          const leakData = new Array(1024 * 1024 / 8).fill(Math.random());
          memoryLeakArray.push(...leakData);
        }

        // Simulate execution time
        if (options.executionTime) {
          await new Promise(resolve => setTimeout(resolve, options.executionTime));
        }

        // Simulate crash after N executions
        if (options.crashAfter && executionCount >= options.crashAfter) {
          throw new Error(`Test scheduler crashed after ${executionCount} executions`);
        }

        // Simulate random failures
        if (options.failureRate && Math.random() < options.failureRate) {
          throw new Error(`Test scheduler random failure (execution ${executionCount})`);
        }

        logger.info('Test scheduler execution completed', {
          schedulerName: name,
          executionId: context.executionId,
          executionCount,
        });
      },

      healthCheck: async () => {
        // Simulate health check failure if crashed
        if (options.crashAfter && executionCount >= options.crashAfter) {
          return false;
        }
        return true;
      },

      cleanup: async () => {
        // Clear memory leak array
        memoryLeakArray = [];
        logger.info('Test scheduler cleanup performed', { schedulerName: name });
      },

      onStart: async () => {
        logger.info('Test scheduler starting', { schedulerName: name });
      },

      onStop: async () => {
        logger.info('Test scheduler stopping', { schedulerName: name });
        // Clear memory leak array on stop
        memoryLeakArray = [];
      },
    };

    return { config, executor };
  }

  /**
   * Register multiple test schedulers for comprehensive testing
   */
  async registerTestSchedulers(): Promise<void> {
    logger.info('Registering test schedulers for resilience testing');

    // Healthy scheduler
    const healthy = this.createTestScheduler('test-healthy', {
      executionTime: 1000,
    });
    await this.schedulerResilience.register(healthy.config, healthy.executor);

    // Occasionally failing scheduler
    const flaky = this.createTestScheduler('test-flaky', {
      failureRate: 0.3, // 30% failure rate
      executionTime: 2000,
    });
    await this.schedulerResilience.register(flaky.config, flaky.executor);

    // Memory leak scheduler
    const memoryLeak = this.createTestScheduler('test-memory-leak', {
      memoryLeak: true,
      executionTime: 500,
    });
    await this.schedulerResilience.register(memoryLeak.config, memoryLeak.executor);

    // Crashing scheduler
    const crashing = this.createTestScheduler('test-crashing', {
      crashAfter: 5,
      executionTime: 1500,
    });
    await this.schedulerResilience.register(crashing.config, crashing.executor);

    // High priority scheduler
    const highPriority = this.createTestScheduler('test-high-priority', {
      executionTime: 800,
    });
    highPriority.config.priority = 10;
    await this.schedulerResilience.register(highPriority.config, highPriority.executor);

    // Dependent scheduler
    const dependent = this.createTestScheduler('test-dependent', {
      dependsOn: ['test-healthy'],
      executionTime: 1200,
    });
    await this.schedulerResilience.register(dependent.config, dependent.executor);

    logger.info('Test schedulers registered successfully');
  }

  /**
   * Test scheduler startup resilience
   */
  async testStartupResilience(): Promise<void> {
    logger.info('🧪 Testing scheduler startup resilience');

    try {
      // Test staggered startup
      await this.schedulerResilience.startAll();
      
      // Wait for startup to complete
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Check health of all schedulers
      const allHealth = this.schedulerResilience.getAllHealth();
      const healthyCount = allHealth.filter(h => h.status === 'healthy').length;

      logger.info('Startup resilience test results', {
        totalSchedulers: allHealth.length,
        healthySchedulers: healthyCount,
        schedulers: allHealth.map(h => ({
          name: h.name,
          status: h.status,
        })),
      });

    } catch (error) {
      logger.error('Startup resilience test failed', error);
      throw error;
    }
  }

  /**
   * Test scheduler failure and recovery
   */
  async testFailureRecovery(): Promise<void> {
    logger.info('🧪 Testing scheduler failure and recovery');

    try {
      // Wait for some executions to occur
      await new Promise(resolve => setTimeout(resolve, 15000));

      // Check for failed schedulers
      const allHealth = this.schedulerResilience.getAllHealth();
      const failedSchedulers = allHealth.filter(h => h.status === 'unhealthy');

      logger.info('Failure detection results', {
        totalSchedulers: allHealth.length,
        failedSchedulers: failedSchedulers.length,
        failed: failedSchedulers.map(h => h.name),
      });

      // Test recovery for failed schedulers
      for (const failed of failedSchedulers) {
        logger.info(`Testing recovery for ${failed.name}`);
        
        try {
          const actions = await this.schedulerResilience.performRecovery(failed.name);
          logger.info(`Recovery actions for ${failed.name}`, {
            actions: actions.map(a => ({
              type: a.type,
              success: a.success,
              reason: a.reason,
            })),
          });
        } catch (error) {
          logger.error(`Recovery failed for ${failed.name}`, error);
        }
      }

    } catch (error) {
      logger.error('Failure recovery test failed', error);
      throw error;
    }
  }

  /**
   * Test memory management and cleanup
   */
  async testMemoryManagement(): Promise<void> {
    logger.info('🧪 Testing scheduler memory management');

    try {
      // Wait for memory leak scheduler to consume memory
      await new Promise(resolve => setTimeout(resolve, 20000));

      // Check memory usage
      const allHealth = this.schedulerResilience.getAllHealth();
      const highMemorySchedulers = allHealth.filter(h => h.memoryUsage > 30);

      logger.info('Memory management test results', {
        highMemorySchedulers: highMemorySchedulers.length,
        schedulers: allHealth.map(h => ({
          name: h.name,
          memoryUsage: h.memoryUsage,
          status: h.status,
        })),
      });

      // Test memory cleanup for high memory schedulers
      for (const scheduler of highMemorySchedulers) {
        logger.info(`Testing memory cleanup for ${scheduler.name}`);
        
        try {
          const actions = await this.schedulerResilience.performRecovery(scheduler.name);
          const memoryCleanupAction = actions.find(a => a.type === 'memory_cleanup');
          
          if (memoryCleanupAction) {
            logger.info(`Memory cleanup performed for ${scheduler.name}`, {
              success: memoryCleanupAction.success,
              duration: memoryCleanupAction.duration,
            });
          }
        } catch (error) {
          logger.error(`Memory cleanup failed for ${scheduler.name}`, error);
        }
      }

    } catch (error) {
      logger.error('Memory management test failed', error);
      throw error;
    }
  }

  /**
   * Test graceful shutdown
   */
  async testGracefulShutdown(): Promise<void> {
    logger.info('🧪 Testing scheduler graceful shutdown');

    try {
      // Stop all schedulers gracefully
      await this.schedulerResilience.stopAll();

      // Check that all schedulers are stopped
      const allHealth = this.schedulerResilience.getAllHealth();
      const stoppedCount = allHealth.filter(h => h.status === 'stopped').length;

      logger.info('Graceful shutdown test results', {
        totalSchedulers: allHealth.length,
        stoppedSchedulers: stoppedCount,
        schedulers: allHealth.map(h => ({
          name: h.name,
          status: h.status,
        })),
      });

      if (stoppedCount === allHealth.length) {
        logger.info('✅ All schedulers stopped gracefully');
      } else {
        logger.warn('⚠️ Some schedulers did not stop gracefully');
      }

    } catch (error) {
      logger.error('Graceful shutdown test failed', error);
      throw error;
    }
  }

  /**
   * Run comprehensive scheduler resilience test suite
   */
  async runComprehensiveTest(): Promise<void> {
    logger.info('🧪 Running comprehensive scheduler resilience test suite');

    try {
      // Initialize scheduler resilience system
      await this.schedulerResilience.initialize();

      // Register test schedulers
      await this.registerTestSchedulers();

      // Test 1: Startup resilience
      await this.testStartupResilience();

      // Test 2: Failure and recovery
      await this.testFailureRecovery();

      // Test 3: Memory management
      await this.testMemoryManagement();

      // Test 4: Graceful shutdown
      await this.testGracefulShutdown();

      logger.info('✅ Comprehensive scheduler resilience test completed successfully');

    } catch (error) {
      logger.error('❌ Comprehensive scheduler resilience test failed', error);
      throw error;
    } finally {
      // Cleanup
      await this.schedulerResilience.cleanup();
    }
  }

  /**
   * Generate scheduler resilience report
   */
  generateResilienceReport(): object {
    const allHealth = this.schedulerResilience.getAllHealth();
    const allMetrics = this.schedulerResilience.getAllMetrics();

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalSchedulers: allHealth.length,
        healthySchedulers: allHealth.filter(h => h.status === 'healthy').length,
        degradedSchedulers: allHealth.filter(h => h.status === 'degraded').length,
        unhealthySchedulers: allHealth.filter(h => h.status === 'unhealthy').length,
        stoppedSchedulers: allHealth.filter(h => h.status === 'stopped').length,
      },
      health: allHealth,
      metrics: allMetrics,
      overallStatus: this.determineOverallStatus(allHealth),
      recommendations: this.generateRecommendations(allHealth, allMetrics),
    };

    return report;
  }

  /**
   * Simulate scheduler stress test
   */
  async simulateStressTest(durationMs: number = 60000): Promise<void> {
    logger.info('🧪 Starting scheduler stress test', { durationMs });

    const startTime = Date.now();
    const monitoringInterval = setInterval(() => {
      const allHealth = this.schedulerResilience.getAllHealth();
      const allMetrics = this.schedulerResilience.getAllMetrics();

      logger.info('Stress test status', {
        elapsed: Date.now() - startTime,
        healthySchedulers: allHealth.filter(h => h.status === 'healthy').length,
        totalExecutions: allMetrics.reduce((sum, m) => sum + m.totalExecutions, 0),
        totalErrors: allMetrics.reduce((sum, m) => sum + m.failedExecutions, 0),
        averageMemory: allHealth.reduce((sum, h) => sum + h.memoryUsage, 0) / allHealth.length,
      });
    }, 5000);

    try {
      // Wait for stress test duration
      await new Promise(resolve => setTimeout(resolve, durationMs));

      // Generate final report
      const report = this.generateResilienceReport();
      logger.info('Stress test completed', { report });

    } finally {
      clearInterval(monitoringInterval);
    }
  }

  // Private helper methods

  private determineOverallStatus(allHealth: any[]): 'healthy' | 'degraded' | 'unhealthy' {
    if (allHealth.length === 0) return 'healthy';

    const unhealthyCount = allHealth.filter(h => h.status === 'unhealthy').length;
    const degradedCount = allHealth.filter(h => h.status === 'degraded').length;
    const totalCount = allHealth.length;

    if (unhealthyCount / totalCount > 0.5) return 'unhealthy';
    if (unhealthyCount > 0 || degradedCount > 0) return 'degraded';
    return 'healthy';
  }

  private generateRecommendations(allHealth: any[], allMetrics: any[]): string[] {
    const recommendations: string[] = [];

    const unhealthySchedulers = allHealth.filter(h => h.status === 'unhealthy');
    if (unhealthySchedulers.length > 0) {
      recommendations.push(`${unhealthySchedulers.length} scheduler(s) are unhealthy and need attention`);
    }

    const highMemorySchedulers = allHealth.filter(h => h.memoryUsage > 50);
    if (highMemorySchedulers.length > 0) {
      recommendations.push(`${highMemorySchedulers.length} scheduler(s) have high memory usage`);
    }

    const highErrorRateSchedulers = allMetrics.filter(m => m.errorRate > 20);
    if (highErrorRateSchedulers.length > 0) {
      recommendations.push(`${highErrorRateSchedulers.length} scheduler(s) have high error rates`);
    }

    const frequentRestartSchedulers = allHealth.filter(h => h.restartCount > 3);
    if (frequentRestartSchedulers.length > 0) {
      recommendations.push(`${frequentRestartSchedulers.length} scheduler(s) are restarting frequently`);
    }

    if (recommendations.length === 0) {
      recommendations.push('All schedulers are operating normally');
    }

    return recommendations;
  }
}

// Export singleton instance
export const schedulerTestingUtil = SchedulerTestingUtil.getInstance();