import { MemoryManagerService } from '../services/memoryManager';
import logger from '../services/logger';

/**
 * Development utility for monitoring memory usage
 */
export class MemoryMonitorUtil {
  private static instance: MemoryMonitorUtil;
  private memoryManager: MemoryManagerService;
  private monitoringInterval?: NodeJS.Timeout;

  private constructor() {
    this.memoryManager = MemoryManagerService.getInstance();
  }

  public static getInstance(): MemoryMonitorUtil {
    if (!MemoryMonitorUtil.instance) {
      MemoryMonitorUtil.instance = new MemoryMonitorUtil();
    }
    return MemoryMonitorUtil.instance;
  }

  /**
   * Start continuous memory monitoring for development
   */
  startDevelopmentMonitoring(intervalMs: number = 10000): void {
    if (process.env.NODE_ENV === 'production') {
      logger.warn('Development memory monitoring should not be used in production');
      return;
    }

    logger.info('Starting development memory monitoring', { intervalMs });

    this.monitoringInterval = setInterval(() => {
      this.logMemoryStatus();
    }, intervalMs);
  }

  /**
   * Stop development monitoring
   */
  stopDevelopmentMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
      logger.info('Stopped development memory monitoring');
    }
  }

  /**
   * Log current memory status
   */
  logMemoryStatus(): void {
    try {
      const metrics = this.memoryManager.getHealthMetrics();
      const memUsage = process.memoryUsage();

      logger.info('📊 Memory Status', {
        status: metrics.status,
        usage: `${metrics.currentUsage.usagePercentage}%`,
        heap: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB / ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
        external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
        trend: metrics.trend.isIncreasing ? '📈 Increasing' : '📊 Stable',
        growthRate: `${metrics.trend.growthRate}MB/min`,
        gcStats: {
          collections: metrics.gcStats.totalCollections,
          efficiency: `${Math.round(metrics.gcStats.efficiency)}%`,
          avgDuration: `${Math.round(metrics.gcStats.averageDuration)}ms`,
        },
        alerts: metrics.recentAlerts.length,
        leakSuspected: metrics.leakDetection.suspectedLeaks.length > 0,
      });

      // Log warnings for concerning trends
      if (metrics.status !== 'healthy') {
        logger.warn(`⚠️  Memory status: ${metrics.status.toUpperCase()}`, {
          recommendations: metrics.recommendations,
        });
      }

      if (metrics.trend.leakSuspected) {
        logger.warn('🚨 Potential memory leak detected!', {
          confidence: `${metrics.leakDetection.confidenceLevel}%`,
          growthRate: `${metrics.trend.growthRate}MB/min`,
        });
      }

    } catch (error) {
      logger.error('Failed to log memory status', error);
    }
  }

  /**
   * Simulate memory pressure for testing
   */
  async simulateMemoryPressure(sizeMB: number = 100): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Memory pressure simulation should not be used in production');
    }

    logger.warn(`🧪 Simulating memory pressure: ${sizeMB}MB`);

    // Create large arrays to consume memory
    const arrays: number[][] = [];
    const arraySize = Math.floor((sizeMB * 1024 * 1024) / 8); // 8 bytes per number

    try {
      for (let i = 0; i < 10; i++) {
        arrays.push(new Array(Math.floor(arraySize / 10)).fill(Math.random()));
        
        // Log memory usage during simulation
        const memUsage = process.memoryUsage();
        logger.info(`Memory simulation step ${i + 1}/10`, {
          heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        });

        // Small delay to allow monitoring
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      logger.warn('Memory pressure simulation complete - arrays will be garbage collected');
      
      // Force garbage collection to clean up
      await this.memoryManager.forceGarbageCollection('memory_simulation_cleanup');

    } catch (error) {
      logger.error('Memory simulation failed', error);
    }
  }

  /**
   * Generate memory report
   */
  generateMemoryReport(): object {
    const metrics = this.memoryManager.getHealthMetrics();
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      timestamp: new Date().toISOString(),
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      memory: {
        status: metrics.status,
        usage: memUsage,
        usagePercentage: metrics.currentUsage.usagePercentage,
        trend: metrics.trend,
        gcStats: metrics.gcStats,
        leakDetection: metrics.leakDetection,
        alerts: metrics.recentAlerts,
        recommendations: metrics.recommendations,
      },
      cpu: cpuUsage,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        platform: process.env.RENDER ? 'render' : 'local',
      },
    };
  }

  /**
   * Save memory report to file (development only)
   */
  async saveMemoryReport(filename?: string): Promise<string> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Memory report saving should not be used in production');
    }

    const report = this.generateMemoryReport();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFilename = filename || `memory-report-${timestamp}.json`;

    try {
      const fs = await import('fs/promises');
      await fs.writeFile(reportFilename, JSON.stringify(report, null, 2));
      logger.info(`Memory report saved to ${reportFilename}`);
      return reportFilename;
    } catch (error) {
      logger.error('Failed to save memory report', error);
      throw error;
    }
  }

  /**
   * Test memory management system
   */
  async testMemoryManagement(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Memory management testing should not be used in production');
    }

    logger.info('🧪 Testing memory management system');

    try {
      // Test 1: Basic health check
      logger.info('Test 1: Basic health check');
      const initialMetrics = this.memoryManager.getHealthMetrics();
      logger.info('Initial status:', { status: initialMetrics.status });

      // Test 2: Force garbage collection
      logger.info('Test 2: Force garbage collection');
      const gcAction = await this.memoryManager.forceGarbageCollection('test');
      logger.info('GC result:', { 
        success: gcAction.success, 
        memoryFreed: Math.round((gcAction.memoryBefore - gcAction.memoryAfter) / 1024 / 1024) 
      });

      // Test 3: Memory pressure simulation
      logger.info('Test 3: Memory pressure simulation');
      await this.simulateMemoryPressure(50);

      // Test 4: Check memory pressure response
      logger.info('Test 4: Check memory pressure response');
      await this.memoryManager.checkMemoryPressure();

      // Test 5: Final health check
      logger.info('Test 5: Final health check');
      const finalMetrics = this.memoryManager.getHealthMetrics();
      logger.info('Final status:', { status: finalMetrics.status });

      logger.info('✅ Memory management system test completed');

    } catch (error) {
      logger.error('❌ Memory management system test failed', error);
      throw error;
    }
  }
}

// Export singleton instance
export const memoryMonitorUtil = MemoryMonitorUtil.getInstance();