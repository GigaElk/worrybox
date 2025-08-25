import { PlatformAdapterService } from './platformAdapter';
import { MemoryManagerService } from './memoryManager';
import { DatabaseConnection } from '../utils/databaseConnection';
import logger from './logger';

interface HealthCheck {
  name: string;
  description: string;
  critical: boolean;
  timeout: number;
  check: () => Promise<HealthCheckResult>;
}

interface HealthCheckResult {
  success: boolean;
  message: string;
  duration: number;
  metadata?: Record<string, any>;
}

interface StartupHealthReport {
  overall: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
  timestamp: string;
  duration: number;
  checks: Array<{
    name: string;
    status: 'pass' | 'warn' | 'fail';
    message: string;
    duration: number;
    critical: boolean;
    metadata?: Record<string, any>;
  }>;
  summary: {
    total: number;
    passed: number;
    warned: number;
    failed: number;
    critical: number;
  };
  recommendations: string[];
}

export class StartupHealthValidator {
  private static instance: StartupHealthValidator;
  private platformAdapter: PlatformAdapterService;
  private memoryManager: MemoryManagerService;
  private healthChecks: HealthCheck[] = [];

  private constructor() {
    this.platformAdapter = PlatformAdapterService.getInstance();
    this.memoryManager = MemoryManagerService.getInstance();
    this.registerHealthChecks();
  }

  public static getInstance(): StartupHealthValidator {
    if (!StartupHealthValidator.instance) {
      StartupHealthValidator.instance = new StartupHealthValidator();
    }
    return StartupHealthValidator.instance;
  }

  /**
   * Validate startup health
   */
  async validateStartupHealth(): Promise<StartupHealthReport> {
    const startTime = Date.now();
    
    logger.info('Starting startup health validation');

    const results: StartupHealthReport['checks'] = [];
    let criticalFailures = 0;
    let totalFailures = 0;
    let warnings = 0;

    // Run all health checks
    for (const healthCheck of this.healthChecks) {
      const checkStartTime = Date.now();
      
      try {
        logger.debug('Running health check', { name: healthCheck.name });
        
        const result = await Promise.race([
          healthCheck.check(),
          new Promise<HealthCheckResult>((_, reject) =>
            setTimeout(() => reject(new Error('Health check timeout')), healthCheck.timeout)
          ),
        ]);

        const duration = Date.now() - checkStartTime;
        
        if (result.success) {
          results.push({
            name: healthCheck.name,
            status: 'pass',
            message: result.message,
            duration,
            critical: healthCheck.critical,
            metadata: result.metadata,
          });
        } else {
          const status = healthCheck.critical ? 'fail' : 'warn';
          
          results.push({
            name: healthCheck.name,
            status,
            message: result.message,
            duration,
            critical: healthCheck.critical,
            metadata: result.metadata,
          });

          if (healthCheck.critical) {
            criticalFailures++;
            totalFailures++;
          } else {
            warnings++;
          }
        }

      } catch (error) {
        const duration = Date.now() - checkStartTime;
        const status = healthCheck.critical ? 'fail' : 'warn';
        
        results.push({
          name: healthCheck.name,
          status,
          message: (error as Error).message,
          duration,
          critical: healthCheck.critical,
        });

        if (healthCheck.critical) {
          criticalFailures++;
          totalFailures++;
        } else {
          warnings++;
        }

        logger.error('Health check failed', {
          name: healthCheck.name,
          error: (error as Error).message,
          duration,
        });
      }
    }

    // Determine overall health status
    let overall: StartupHealthReport['overall'] = 'healthy';
    if (criticalFailures > 0) {
      overall = 'critical';
    } else if (totalFailures > 0) {
      overall = 'unhealthy';
    } else if (warnings > 0) {
      overall = 'degraded';
    }

    const totalDuration = Date.now() - startTime;
    const passed = results.filter(r => r.status === 'pass').length;

    const report: StartupHealthReport = {
      overall,
      timestamp: new Date().toISOString(),
      duration: totalDuration,
      checks: results,
      summary: {
        total: results.length,
        passed,
        warned: warnings,
        failed: totalFailures,
        critical: criticalFailures,
      },
      recommendations: this.generateRecommendations(results),
    };

    logger.info('Startup health validation completed', {
      overall,
      duration: totalDuration,
      passed,
      warnings,
      failures: totalFailures,
      critical: criticalFailures,
    });

    return report;
  }

  /**
   * Register a custom health check
   */
  registerHealthCheck(healthCheck: HealthCheck): void {
    this.healthChecks.push(healthCheck);
    logger.debug('Health check registered', {
      name: healthCheck.name,
      critical: healthCheck.critical,
    });
  }

  /**
   * Get all registered health checks
   */
  getHealthChecks(): HealthCheck[] {
    return [...this.healthChecks];
  }

  // Private methods

  private registerHealthChecks(): void {
    // Database connectivity check
    this.registerHealthCheck({
      name: 'database-connectivity',
      description: 'Verify database connection is working',
      critical: true,
      timeout: 10000,
      check: async () => {
        const startTime = Date.now();
        
        try {
          const isHealthy = await DatabaseConnection.isHealthy();
          const duration = Date.now() - startTime;
          
          if (isHealthy) {
            return {
              success: true,
              message: 'Database connection is healthy',
              duration,
              metadata: {
                responseTime: duration,
              },
            };
          } else {
            return {
              success: false,
              message: 'Database connection is unhealthy',
              duration,
            };
          }
        } catch (error) {
          return {
            success: false,
            message: `Database connection failed: ${(error as Error).message}`,
            duration: Date.now() - startTime,
          };
        }
      },
    });

    // Memory usage check
    this.registerHealthCheck({
      name: 'memory-usage',
      description: 'Verify memory usage is within acceptable limits',
      critical: false,
      timeout: 5000,
      check: async () => {
        const startTime = Date.now();
        
        try {
          const memoryUsage = process.memoryUsage();
          const memoryStats = await this.memoryManager.getMemoryStats();
          const platform = this.platformAdapter.getPlatform();
          const config = this.platformAdapter.getOptimalConfig();
          
          const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
          const memoryLimit = config.maxMemoryMB;
          const usagePercentage = (heapUsedMB / memoryLimit) * 100;
          
          const duration = Date.now() - startTime;
          
          if (usagePercentage > 90) {
            return {
              success: false,
              message: `Memory usage is critical: ${heapUsedMB}MB (${usagePercentage.toFixed(1)}%)`,
              duration,
              metadata: {
                heapUsedMB,
                memoryLimit,
                usagePercentage,
                platform,
              },
            };
          } else if (usagePercentage > 75) {
            return {
              success: false,
              message: `Memory usage is high: ${heapUsedMB}MB (${usagePercentage.toFixed(1)}%)`,
              duration,
              metadata: {
                heapUsedMB,
                memoryLimit,
                usagePercentage,
                platform,
              },
            };
          } else {
            return {
              success: true,
              message: `Memory usage is normal: ${heapUsedMB}MB (${usagePercentage.toFixed(1)}%)`,
              duration,
              metadata: {
                heapUsedMB,
                memoryLimit,
                usagePercentage,
                platform,
              },
            };
          }
        } catch (error) {
          return {
            success: false,
            message: `Memory check failed: ${(error as Error).message}`,
            duration: Date.now() - startTime,
          };
        }
      },
    });

    // Platform configuration check
    this.registerHealthCheck({
      name: 'platform-configuration',
      description: 'Verify platform configuration is optimal',
      critical: false,
      timeout: 3000,
      check: async () => {
        const startTime = Date.now();
        
        try {
          const platform = this.platformAdapter.getPlatform();
          const config = this.platformAdapter.getOptimalConfig();
          const limits = this.platformAdapter.monitorResourceLimits();
          
          const issues: string[] = [];
          
          // Check memory limits
          if (limits.memory.percentage > 80) {
            issues.push(`Memory usage is ${limits.memory.percentage}%`);
          }
          
          // Check if running on unknown platform
          if (platform === 'unknown') {
            issues.push('Platform detection failed');
          }
          
          // Check environment variables
          const requiredEnvVars = ['DATABASE_URL', 'NODE_ENV'];
          for (const envVar of requiredEnvVars) {
            if (!process.env[envVar]) {
              issues.push(`Missing environment variable: ${envVar}`);
            }
          }
          
          const duration = Date.now() - startTime;
          
          if (issues.length > 0) {
            return {
              success: false,
              message: `Platform configuration issues: ${issues.join(', ')}`,
              duration,
              metadata: {
                platform,
                config,
                limits,
                issues,
              },
            };
          } else {
            return {
              success: true,
              message: `Platform configuration is optimal for ${platform}`,
              duration,
              metadata: {
                platform,
                config,
                limits,
              },
            };
          }
        } catch (error) {
          return {
            success: false,
            message: `Platform configuration check failed: ${(error as Error).message}`,
            duration: Date.now() - startTime,
          };
        }
      },
    });

    // Environment readiness check
    this.registerHealthCheck({
      name: 'environment-readiness',
      description: 'Verify environment is ready for operation',
      critical: true,
      timeout: 5000,
      check: async () => {
        const startTime = Date.now();
        
        try {
          const issues: string[] = [];
          
          // Check Node.js version
          const nodeVersion = process.version;
          const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
          if (majorVersion < 16) {
            issues.push(`Node.js version ${nodeVersion} is too old (minimum: 16)`);
          }
          
          // Check required directories
          const fs = await import('fs/promises');
          const requiredDirs = ['logs'];
          
          for (const dir of requiredDirs) {
            try {
              await fs.access(dir);
            } catch {
              issues.push(`Required directory missing: ${dir}`);
            }
          }
          
          // Check disk space (if possible)
          try {
            const stats = await fs.stat('.');
            // Basic check - if we can stat the current directory, we have some disk access
          } catch (error) {
            issues.push('Disk access check failed');
          }
          
          const duration = Date.now() - startTime;
          
          if (issues.length > 0) {
            return {
              success: false,
              message: `Environment readiness issues: ${issues.join(', ')}`,
              duration,
              metadata: {
                nodeVersion,
                issues,
              },
            };
          } else {
            return {
              success: true,
              message: 'Environment is ready for operation',
              duration,
              metadata: {
                nodeVersion,
              },
            };
          }
        } catch (error) {
          return {
            success: false,
            message: `Environment readiness check failed: ${(error as Error).message}`,
            duration: Date.now() - startTime,
          };
        }
      },
    });

    // Service dependencies check
    this.registerHealthCheck({
      name: 'service-dependencies',
      description: 'Verify all critical service dependencies are available',
      critical: true,
      timeout: 10000,
      check: async () => {
        const startTime = Date.now();
        
        try {
          const dependencies: Array<{ name: string; check: () => Promise<boolean> }> = [
            {
              name: 'crypto',
              check: async () => {
                const crypto = await import('crypto');
                crypto.randomUUID();
                return true;
              },
            },
            {
              name: 'fs',
              check: async () => {
                const fs = await import('fs/promises');
                await fs.access('.');
                return true;
              },
            },
            {
              name: 'os',
              check: async () => {
                const os = await import('os');
                os.platform();
                return true;
              },
            },
          ];
          
          const results = await Promise.allSettled(
            dependencies.map(async (dep) => {
              try {
                await dep.check();
                return { name: dep.name, available: true };
              } catch {
                return { name: dep.name, available: false };
              }
            })
          );
          
          const unavailable = results
            .filter(result => result.status === 'fulfilled' && !result.value.available)
            .map(result => result.status === 'fulfilled' ? result.value.name : 'unknown');
          
          const duration = Date.now() - startTime;
          
          if (unavailable.length > 0) {
            return {
              success: false,
              message: `Unavailable dependencies: ${unavailable.join(', ')}`,
              duration,
              metadata: {
                unavailable,
              },
            };
          } else {
            return {
              success: true,
              message: 'All service dependencies are available',
              duration,
            };
          }
        } catch (error) {
          return {
            success: false,
            message: `Service dependencies check failed: ${(error as Error).message}`,
            duration: Date.now() - startTime,
          };
        }
      },
    });
  }

  private generateRecommendations(results: StartupHealthReport['checks']): string[] {
    const recommendations: string[] = [];
    
    // Check for critical failures
    const criticalFailures = results.filter(r => r.status === 'fail' && r.critical);
    if (criticalFailures.length > 0) {
      recommendations.push('Address critical health check failures immediately');
      recommendations.push('Consider restarting the application after fixing critical issues');
    }
    
    // Check for memory issues
    const memoryCheck = results.find(r => r.name === 'memory-usage');
    if (memoryCheck && memoryCheck.status !== 'pass') {
      recommendations.push('Monitor memory usage closely and consider optimization');
      recommendations.push('Enable garbage collection monitoring');
    }
    
    // Check for database issues
    const dbCheck = results.find(r => r.name === 'database-connectivity');
    if (dbCheck && dbCheck.status !== 'pass') {
      recommendations.push('Verify database connection configuration');
      recommendations.push('Check database server status and network connectivity');
    }
    
    // Check for platform issues
    const platformCheck = results.find(r => r.name === 'platform-configuration');
    if (platformCheck && platformCheck.status !== 'pass') {
      recommendations.push('Review platform configuration and environment variables');
      recommendations.push('Ensure all required dependencies are installed');
    }
    
    // General recommendations
    if (results.some(r => r.status !== 'pass')) {
      recommendations.push('Review application logs for detailed error information');
      recommendations.push('Consider implementing additional monitoring and alerting');
    }
    
    return recommendations;
  }
}