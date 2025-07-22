import { PrismaClient } from '@prisma/client';
import logger from './logger';

const prisma = new PrismaClient();

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

export interface HealthCheckResult {
  status: 'pass' | 'fail' | 'warn';
  message: string;
  responseTime?: number;
  details?: any;
}

export class HealthCheckService {
  private static instance: HealthCheckService;

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

  private async checkDatabase(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Simple database connectivity check
      await prisma.$queryRaw`SELECT 1`;
      
      const responseTime = Date.now() - startTime;
      
      if (responseTime > 1000) {
        return {
          status: 'warn',
          message: 'Database responding slowly',
          responseTime,
        };
      }
      
      return {
        status: 'pass',
        message: 'Database connection healthy',
        responseTime,
      };
    } catch (error) {
      logger.error('Database health check failed', error);
      return {
        status: 'fail',
        message: 'Database connection failed',
        responseTime: Date.now() - startTime,
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
          details,
        };
      }

      if (memoryUsagePercent > 80) {
        return {
          status: 'warn',
          message: 'Memory usage high',
          details,
        };
      }

      return {
        status: 'pass',
        message: 'Memory usage normal',
        details,
      };
    } catch (error) {
      logger.error('Memory health check failed', error);
      return {
        status: 'fail',
        message: 'Memory check failed',
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
}