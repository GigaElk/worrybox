import { DatabaseConnection } from '../utils/databaseConnection';
import { EnhancedHealthStatus, HealthCheckResult, MemoryMetrics, DatabasePoolMetrics, SystemLoadMetrics } from '../types/monitoring';
import { CorrelationService } from './correlationService';
import { PerformanceMetricsService } from './performanceMetrics';
import { SchedulerMonitorService } from './schedulerMonitor';
import { MemoryManagerService } from './memoryManager';
import logger from './logger';
import os from 'os';

// Keep the old interface for backward compatibility
export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: HealthCheckResult;
    memory: HealthCheckResult;
    disk?: HealthCheckResult;
  };
}

export class HealthCheckService {
  private static instance: HealthCheckService;
  private correlationService: CorrelationService;
  private performanceService: PerformanceMetricsService;
  private schedulerMonitor: SchedulerMonitorService;
  private memoryManager: MemoryManagerService;
  private gcStats = { count: 0, totalDuration: 0 };
  private lastGcCheck = Date.now();

  private constructor() {
    this.correlationService = CorrelationService.getInstance();
    this.performanceService = PerformanceMetricsService.getInstance();
    this.schedulerMonitor = SchedulerMonitorService.getInstance();
    this.memoryManager = MemoryManagerService.getInstance();
    
    // Monitor garbage collection if available
    this.setupGCMonitoring();
  }

  public static getInstance(): HealthCheckService {
    if (!HealthCheckService.instance) {
      HealthCheckService.instance = new HealthCheckService();
    }
    return HealthCheckService.instance;
  }

  async performHealthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    try {
      const [databaseCheck, memoryCheck] = await Promise.all([
        this.checkDatabase(),
        this.checkMemory(),
      ]);

      const allChecks = { database: databaseCheck, memory: memoryCheck };
      const overallStatus = this.determineOverallStatus(allChecks);

      const healthStatus: HealthStatus = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        checks: allChecks,
      };

      logger.debug('Health check completed', { 
        status: overallStatus, 
        duration: Date.now() - startTime 
      });

      return healthStatus;
    } catch (error) {
      logger.error('Health check failed', error);
      
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        checks: {
          database: { status: 'fail', message: 'Health check error' },
          memory: { status: 'fail', message: 'Health check error' },
        },
      };
    }
  }

  /**
   * Enhanced health check with detailed metrics
   */
  async performEnhancedHealthCheck(): Promise<EnhancedHealthStatus> {
    const startTime = Date.now();
    const correlationId = this.correlationService.generateHealthCheckCorrelationId();
    
    try {
      // Run all health checks in parallel
      const [databaseCheck, memoryCheck, schedulersCheck, performanceCheck] = await Promise.all([
        this.checkDatabase(),
        this.checkEnhancedMemory(),
        this.checkSchedulers(),
        this.checkPerformance(),
      ]);

      const allChecks = { 
        database: databaseCheck, 
        memory: memoryCheck,
        schedulers: schedulersCheck,
        performance: performanceCheck,
      };
      
      const overallStatus = this.determineOverallStatus(allChecks);

      // Collect detailed metrics
      const metrics = {
        memoryUsage: this.getMemoryMetrics(),
        databasePool: await this.getDatabasePoolMetrics(),
        requestMetrics: this.performanceService.getRequestMetrics(),
        systemLoad: this.getSystemLoadMetrics(),
      };

      const healthStatus: EnhancedHealthStatus = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        platform: this.detectPlatform(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        correlationId,
        checks: allChecks,
        metrics,
      };

      const duration = Date.now() - startTime;
      
      logger.info('Enhanced health check completed', { 
        correlationId,
        status: overallStatus, 
        duration,
        memoryUsage: metrics.memoryUsage.usagePercent,
        databaseConnections: metrics.databasePool.activeConnections,
        activeRequests: metrics.requestMetrics.activeRequests,
      });

      // Log warnings for concerning metrics
      if (metrics.memoryUsage.usagePercent > 80) {
        logger.warn('High memory usage detected', {
          correlationId,
          memoryUsage: metrics.memoryUsage,
        });
      }

      if (metrics.requestMetrics.errorRate > 5) {
        logger.warn('High error rate detected', {
          correlationId,
          errorRate: metrics.requestMetrics.errorRate,
        });
      }

      return healthStatus;
    } catch (error) {
      logger.error('Enhanced health check failed', { correlationId, error });
      
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        platform: this.detectPlatform(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        correlationId,
        checks: {
          database: { status: 'fail', message: 'Health check error', lastChecked: new Date().toISOString() },
          memory: { status: 'fail', message: 'Health check error', lastChecked: new Date().toISOString() },
          schedulers: { status: 'fail', message: 'Health check error', lastChecked: new Date().toISOString() },
          performance: { status: 'fail', message: 'Health check error', lastChecked: new Date().toISOString() },
        },
        metrics: {
          memoryUsage: this.getMemoryMetrics(),
          databasePool: {
            activeConnections: 0,
            idleConnections: 0,
            totalConnections: 0,
            maxConnections: 10,
            averageQueryTime: 0,
            slowQueries: 0,
            connectionErrors: 1,
            lastConnectionTime: new Date().toISOString(),
          },
          requestMetrics: this.performanceService.getRequestMetrics(),
          systemLoad: this.getSystemLoadMetrics(),
        },
      };
    }
  }

  private async checkDatabase(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Simple database connectivity check
      const prisma = await DatabaseConnection.getInstance();
      await prisma.$queryRaw`SELECT 1`;
      
      const responseTime = Date.now() - startTime;
      
      if (responseTime > 2000) {
        return {
          status: 'warn',
          message: 'Database responding slowly',
          responseTime,
          lastChecked: new Date().toISOString(),
        };
      }
      
      return {
        status: 'pass',
        message: 'Database connection healthy',
        responseTime,
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Database health check failed', error);
      return {
        status: 'fail',
        message: 'Database connection failed',
        responseTime: Date.now() - startTime,
        lastChecked: new Date().toISOString(),
        details: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkMemory(): Promise<HealthCheckResult> {
    try {
      const memoryUsage = process.memoryUsage();
      const totalMemory = memoryUsage.heapTotal;
      const usedMemory = memoryUsage.heapUsed;
      const memoryUsagePercent = (usedMemory / totalMemory) * 100;

      const details = {
        heapUsed: Math.round(usedMemory / 1024 / 1024), // MB
        heapTotal: Math.round(totalMemory / 1024 / 1024), // MB
        usagePercent: Math.round(memoryUsagePercent),
      };

      if (memoryUsagePercent > 90) {
        return {
          status: 'fail',
          message: 'Memory usage critical',
          lastChecked: new Date().toISOString(),
          details,
        };
      }

      if (memoryUsagePercent > 80) {
        return {
          status: 'warn',
          message: 'Memory usage high',
          lastChecked: new Date().toISOString(),
          details,
        };
      }

      return {
        status: 'pass',
        message: 'Memory usage normal',
        lastChecked: new Date().toISOString(),
        details,
      };
    } catch (error) {
      logger.error('Memory health check failed', error);
      return {
        status: 'fail',
        message: 'Memory check failed',
        lastChecked: new Date().toISOString(),
        details: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkEnhancedMemory(): Promise<HealthCheckResult> {
    try {
      const memoryHealthMetrics = this.memoryManager.getHealthMetrics();
      const memoryMetrics = this.getMemoryMetrics();

      // Use memory manager's status determination
      const status = memoryHealthMetrics.status;
      
      if (status === 'emergency') {
        // Memory manager will handle emergency cleanup
        await this.memoryManager.checkMemoryPressure();
        
        return {
          status: 'fail',
          message: 'Memory usage critical - emergency cleanup triggered',
          lastChecked: new Date().toISOString(),
          details: {
            ...memoryMetrics,
            memoryManagerStatus: status,
            trend: memoryHealthMetrics.trend,
            leakDetection: memoryHealthMetrics.leakDetection,
            recentAlerts: memoryHealthMetrics.recentAlerts.length,
          },
        };
      }

      if (status === 'critical') {
        return {
          status: 'fail',
          message: 'Memory usage critical',
          lastChecked: new Date().toISOString(),
          details: {
            ...memoryMetrics,
            memoryManagerStatus: status,
            trend: memoryHealthMetrics.trend,
            recommendations: memoryHealthMetrics.recommendations,
          },
        };
      }

      if (status === 'warning') {
        return {
          status: 'warn',
          message: 'Memory usage high',
          lastChecked: new Date().toISOString(),
          details: {
            ...memoryMetrics,
            memoryManagerStatus: status,
            trend: memoryHealthMetrics.trend,
          },
        };
      }

      if (memoryHealthMetrics.leakDetection.suspectedLeaks.length > 0) {
        const leak = memoryHealthMetrics.leakDetection.suspectedLeaks[0];
        return {
          status: 'warn',
          message: `Potential memory leak detected (${leak.confidence}% confidence)`,
          lastChecked: new Date().toISOString(),
          details: {
            ...memoryMetrics,
            memoryManagerStatus: status,
            leakDetection: memoryHealthMetrics.leakDetection,
            leakDetails: leak,
          },
        };
      }

      return {
        status: 'pass',
        message: 'Memory usage normal',
        lastChecked: new Date().toISOString(),
        details: {
          ...memoryMetrics,
          memoryManagerStatus: status,
          trend: memoryHealthMetrics.trend,
          gcStats: memoryHealthMetrics.gcStats,
        },
      };
    } catch (error) {
      logger.error('Enhanced memory health check failed', error);
      return {
        status: 'fail',
        message: 'Memory check failed',
        lastChecked: new Date().toISOString(),
        details: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkSchedulers(): Promise<HealthCheckResult> {
    try {
      const schedulerStatuses = this.schedulerMonitor.getAllSchedulerStatuses();
      const overallStatus = this.schedulerMonitor.getOverallStatus();
      const failedSchedulers = this.schedulerMonitor.getFailedSchedulers();
      const highMemorySchedulers = this.schedulerMonitor.getHighMemorySchedulers();

      const details = {
        totalSchedulers: schedulerStatuses.length,
        runningSchedulers: schedulerStatuses.filter(s => s.status === 'running').length,
        failedSchedulers: failedSchedulers.length,
        highMemorySchedulers: highMemorySchedulers.length,
        schedulers: schedulerStatuses,
      };

      if (overallStatus === 'fail') {
        return {
          status: 'fail',
          message: `${failedSchedulers.length} scheduler(s) failed`,
          lastChecked: new Date().toISOString(),
          details,
        };
      }

      if (overallStatus === 'warn') {
        return {
          status: 'warn',
          message: `${highMemorySchedulers.length} scheduler(s) using high memory`,
          lastChecked: new Date().toISOString(),
          details,
        };
      }

      return {
        status: 'pass',
        message: 'All schedulers healthy',
        lastChecked: new Date().toISOString(),
        details,
      };
    } catch (error) {
      logger.error('Scheduler health check failed', error);
      return {
        status: 'fail',
        message: 'Scheduler check failed',
        lastChecked: new Date().toISOString(),
        details: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkPerformance(): Promise<HealthCheckResult> {
    try {
      const requestMetrics = this.performanceService.getRequestMetrics();
      const slowestEndpoints = this.performanceService.getSlowestEndpoints(5);

      const details = {
        requestMetrics,
        slowestEndpoints,
      };

      if (requestMetrics.errorRate > 10) {
        return {
          status: 'fail',
          message: `High error rate: ${requestMetrics.errorRate}%`,
          lastChecked: new Date().toISOString(),
          details,
        };
      }

      if (requestMetrics.averageResponseTime > 5000 || requestMetrics.errorRate > 5) {
        return {
          status: 'warn',
          message: 'Performance degraded',
          lastChecked: new Date().toISOString(),
          details,
        };
      }

      return {
        status: 'pass',
        message: 'Performance normal',
        lastChecked: new Date().toISOString(),
        details,
      };
    } catch (error) {
      logger.error('Performance health check failed', error);
      return {
        status: 'fail',
        message: 'Performance check failed',
        lastChecked: new Date().toISOString(),
        details: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private determineOverallStatus(checks: Record<string, HealthCheckResult>): 'healthy' | 'unhealthy' | 'degraded' {
    const statuses = Object.values(checks).map(check => check.status);
    
    if (statuses.includes('fail')) {
      return 'unhealthy';
    }
    
    if (statuses.includes('warn')) {
      return 'degraded';
    }
    
    return 'healthy';
  }

  // Simple health check for Docker health check
  async isHealthy(): Promise<boolean> {
    try {
      const health = await this.performHealthCheck();
      return health.status !== 'unhealthy';
    } catch (error) {
      return false;
    }
  }

  /**
   * Get detailed memory metrics
   */
  private getMemoryMetrics(): MemoryMetrics {
    try {
      const memoryHealthMetrics = this.memoryManager.getHealthMetrics();
      const memoryUsage = process.memoryUsage();
      const usagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

      return {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
        external: Math.round(memoryUsage.external / 1024 / 1024), // MB
        rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
        usagePercent: Math.round(usagePercent * 100) / 100,
        gcCount: memoryHealthMetrics.gcStats.totalCollections,
        gcDuration: memoryHealthMetrics.gcStats.totalDuration,
        memoryLeakDetected: memoryHealthMetrics.leakDetection.suspectedLeaks.length > 0,
      };
    } catch (error) {
      // Fallback to basic metrics if memory manager is not available
      const memoryUsage = process.memoryUsage();
      const usagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
      
      return {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
        external: Math.round(memoryUsage.external / 1024 / 1024), // MB
        rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
        usagePercent: Math.round(usagePercent * 100) / 100,
        gcCount: this.gcStats.count,
        gcDuration: this.gcStats.totalDuration,
        memoryLeakDetected: this.detectMemoryLeak(memoryUsage.heapUsed),
      };
    }
  }

  /**
   * Get database pool metrics
   */
  private async getDatabasePoolMetrics(): Promise<DatabasePoolMetrics> {
    try {
      // This is a simplified implementation
      // In a real scenario, you'd get these from your connection pool
      const isHealthy = await DatabaseConnection.isHealthy();
      
      return {
        activeConnections: isHealthy ? 1 : 0,
        idleConnections: 0,
        totalConnections: isHealthy ? 1 : 0,
        maxConnections: 10,
        averageQueryTime: 0, // Would need to track this
        slowQueries: 0, // Would need to track this
        connectionErrors: isHealthy ? 0 : 1,
        lastConnectionTime: new Date().toISOString(),
      };
    } catch (error) {
      return {
        activeConnections: 0,
        idleConnections: 0,
        totalConnections: 0,
        maxConnections: 10,
        averageQueryTime: 0,
        slowQueries: 0,
        connectionErrors: 1,
        lastConnectionTime: new Date().toISOString(),
      };
    }
  }

  /**
   * Get system load metrics
   */
  private getSystemLoadMetrics(): SystemLoadMetrics {
    try {
      const loadAvg = os.loadavg();
      const cpus = os.cpus();
      const cpuUsage = this.calculateCPUUsage(cpus);

      return {
        cpuUsage: Math.round(cpuUsage * 100) / 100,
        loadAverage: loadAvg,
        networkConnections: 0, // Would need OS-specific implementation
        processCount: 1, // Current process
      };
    } catch (error) {
      return {
        cpuUsage: 0,
        loadAverage: [0, 0, 0],
        networkConnections: 0,
        processCount: 1,
      };
    }
  }

  /**
   * Detect platform (Render, local, etc.)
   */
  private detectPlatform(): 'render' | 'local' | 'other' {
    if (process.env.RENDER) {
      return 'render';
    }
    
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      return 'local';
    }
    
    return 'other';
  }

  /**
   * Simple memory leak detection
   */
  private detectMemoryLeak(currentHeapUsed: number): boolean {
    // This is a very basic implementation
    // In production, you'd want more sophisticated leak detection
    const heapUsedMB = currentHeapUsed / 1024 / 1024;
    
    // Consider it a potential leak if heap usage is consistently above 200MB
    // and growing over time (would need historical tracking for better detection)
    return heapUsedMB > 200;
  }

  /**
   * Calculate CPU usage (simplified)
   */
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
    
    return 100 - ~~(100 * idle / total);
  }

  /**
   * Setup garbage collection monitoring
   */
  private setupGCMonitoring(): void {
    // Only available if Node.js is started with --expose-gc flag
    if (global.gc) {
      const originalGC = global.gc;
      global.gc = () => {
        const start = Date.now();
        originalGC();
        const duration = Date.now() - start;
        
        this.gcStats.count++;
        this.gcStats.totalDuration += duration;
        
        logger.debug('Garbage collection completed', {
          duration,
          totalGCs: this.gcStats.count,
          averageDuration: Math.round(this.gcStats.totalDuration / this.gcStats.count),
        });
      };
    }
  }
}