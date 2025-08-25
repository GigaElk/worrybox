import request from 'supertest';
import { HealthCheckService } from '../../../services/healthCheck';
import { DatabaseConnection } from '../../../utils/databaseConnection';
import { MemoryManagerService } from '../../../services/memoryManager';
import { SchedulerManagerService } from '../../../services/schedulerManager';
import { PlatformAdapterService } from '../../../services/platformAdapter';
import { DiagnosticsService } from '../../../services/diagnosticsService';
import { StartupHealthValidator } from '../../../services/startupHealthValidator';
import { EnhancedLogger } from '../../../services/enhancedLogger';
import express from 'express';

// Create a test app for health check endpoints
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Add health check routes
  app.get('/health', async (req, res) => {
    try {
      const healthCheck = HealthCheckService.getInstance();
      const isHealthy = await healthCheck.isHealthy();
      res.status(isHealthy ? 200 : 503).send(isHealthy ? 'OK' : 'UNHEALTHY');
    } catch (error) {
      res.status(503).send('ERROR');
    }
  });

  app.get('/api/health', async (req, res) => {
    try {
      const healthCheck = HealthCheckService.getInstance();
      const health = await healthCheck.performEnhancedHealthCheck();
      const statusCode = health.status === 'healthy' ? 200 : 
                        health.status === 'degraded' ? 200 : 503;
      res.status(statusCode).json(health);
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        message: 'Health check failed',
        timestamp: new Date().toISOString()
      });
    }
  });

  app.get('/api/monitoring/health', async (req, res) => {
    try {
      const diagnostics = DiagnosticsService.getInstance();
      const systemMetrics = await diagnostics.collectSystemMetrics();
      res.json({
        status: systemMetrics.health.overall,
        timestamp: systemMetrics.timestamp,
        uptime: systemMetrics.uptime,
        checks: systemMetrics.health.checks,
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Failed to collect health metrics',
        timestamp: new Date().toISOString()
      });
    }
  });

  return app;
};

describe('Health Check Validation Integration Tests', () => {
  let healthCheck: HealthCheckService;
  let memoryManager: MemoryManagerService;
  let schedulerManager: SchedulerManagerService;
  let platformAdapter: PlatformAdapterService;
  let diagnostics: DiagnosticsService;
  let startupValidator: StartupHealthValidator;
  let logger: EnhancedLogger;
  let testApp: express.Application;

  beforeAll(async () => {
    healthCheck = HealthCheckService.getInstance();
    memoryManager = MemoryManagerService.getInstance();
    schedulerManager = SchedulerManagerService.getInstance();
    platformAdapter = PlatformAdapterService.getInstance();
    diagnostics = DiagnosticsService.getInstance();
    startupValidator = StartupHealthValidator.getInstance();
    logger = EnhancedLogger.getInstance();
    testApp = createTestApp();

    // Initialize services
    await DatabaseConnection.initialize();
    await diagnostics.initialize();
    memoryManager.startMonitoring();
  });

  afterAll(async () => {
    await DatabaseConnection.disconnect();
    await diagnostics.cleanup();
  });

  describe('Basic Health Check Endpoints', () => {
    test('should respond to simple health check', async () => {
      const response = await request(testApp)
        .get('/health')
        .expect(res => {
          expect([200, 503]).toContain(res.status);
        });

      if (response.status === 200) {
        expect(response.text).toBe('OK');
      } else {
        expect(response.text).toBe('UNHEALTHY');
      }
    }, 15000);

    test('should provide detailed health information', async () => {
      const response = await request(testApp)
        .get('/api/health')
        .expect(res => {
          expect([200, 503]).toContain(res.status);
        });

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('checks');
      expect(response.body).toHaveProperty('correlationId');
      expect(response.body).toHaveProperty('platform');

      expect(['healthy', 'degraded', 'unhealthy']).toContain(response.body.status);
      expect(Array.isArray(response.body.checks)).toBe(true);
    }, 15000);

    test('should provide monitoring health metrics', async () => {
      const response = await request(testApp)
        .get('/api/monitoring/health')
        .expect(res => {
          expect([200, 500]).toContain(res.status);
        });

      if (response.status === 200) {
        expect(response.body).toHaveProperty('status');
        expect(response.body).toHaveProperty('timestamp');
        expect(response.body).toHaveProperty('uptime');
        expect(response.body).toHaveProperty('checks');

        expect(['healthy', 'degraded', 'unhealthy', 'critical']).toContain(response.body.status);
        expect(typeof response.body.uptime).toBe('number');
      }
    }, 15000);
  });

  describe('Component Health Validation', () => {
    test('should validate database health', async () => {
      const isHealthy = await DatabaseConnection.isHealthy();
      expect(typeof isHealthy).toBe('boolean');

      if (isHealthy) {
        const metrics = DatabaseConnection.getHealthMetrics();
        expect(metrics).toBeDefined();
        expect(metrics.connectionStatus).toBe('connected');
      }
    }, 10000);

    test('should validate memory health', async () => {
      const memoryStats = await memoryManager.getMemoryStats();
      
      expect(memoryStats).toHaveProperty('status');
      expect(memoryStats).toHaveProperty('heapUsed');
      expect(memoryStats).toHaveProperty('heapTotal');
      expect(memoryStats).toHaveProperty('trend');

      expect(['healthy', 'warning', 'critical']).toContain(memoryStats.status);
      expect(memoryStats.heapUsed).toBeGreaterThan(0);
      expect(memoryStats.heapTotal).toBeGreaterThan(memoryStats.heapUsed);
    });

    test('should validate scheduler health', async () => {
      const schedulerStats = await schedulerManager.getSchedulerStats();
      
      expect(schedulerStats).toHaveProperty('schedulers');
      expect(schedulerStats).toHaveProperty('totalJobs');
      expect(schedulerStats).toHaveProperty('activeJobs');

      expect(Array.isArray(schedulerStats.schedulers)).toBe(true);
      expect(schedulerStats.totalJobs).toBeGreaterThanOrEqual(0);
    });

    test('should validate platform configuration', async () => {
      const platform = platformAdapter.getPlatform();
      const config = platformAdapter.getOptimalConfig();
      const limits = platformAdapter.monitorResourceLimits();

      expect(platform).toBeDefined();
      expect(['render', 'local', 'unknown']).toContain(platform);
      
      expect(config).toHaveProperty('maxMemoryMB');
      expect(config).toHaveProperty('maxConnections');
      expect(config.maxMemoryMB).toBeGreaterThan(0);

      expect(limits).toHaveProperty('memory');
      expect(limits.memory).toHaveProperty('percentage');
    });
  });

  describe('Comprehensive Health Validation', () => {
    test('should perform enhanced health check', async () => {
      const healthResult = await healthCheck.performEnhancedHealthCheck();
      
      expect(healthResult).toHaveProperty('status');
      expect(healthResult).toHaveProperty('timestamp');
      expect(healthResult).toHaveProperty('checks');
      expect(healthResult).toHaveProperty('metrics');
      expect(healthResult).toHaveProperty('correlationId');

      expect(['healthy', 'degraded', 'unhealthy']).toContain(healthResult.status);
      expect(Array.isArray(healthResult.checks)).toBe(true);
      
      // Validate individual checks
      healthResult.checks.forEach(check => {
        expect(check).toHaveProperty('name');
        expect(check).toHaveProperty('status');
        expect(check).toHaveProperty('timestamp');
        expect(['pass', 'warn', 'fail']).toContain(check.status);
      });
    }, 20000);

    test('should validate startup health', async () => {
      const startupHealth = await startupValidator.validateStartupHealth();
      
      expect(startupHealth).toHaveProperty('overall');
      expect(startupHealth).toHaveProperty('timestamp');
      expect(startupHealth).toHaveProperty('duration');
      expect(startupHealth).toHaveProperty('checks');
      expect(startupHealth).toHaveProperty('summary');
      expect(startupHealth).toHaveProperty('recommendations');

      expect(['healthy', 'degraded', 'unhealthy', 'critical']).toContain(startupHealth.overall);
      expect(Array.isArray(startupHealth.checks)).toBe(true);
      expect(Array.isArray(startupHealth.recommendations)).toBe(true);
    }, 25000);

    test('should collect comprehensive system metrics', async () => {
      const systemMetrics = await diagnostics.collectSystemMetrics();
      
      expect(systemMetrics).toHaveProperty('timestamp');
      expect(systemMetrics).toHaveProperty('uptime');
      expect(systemMetrics).toHaveProperty('memory');
      expect(systemMetrics).toHaveProperty('cpu');
      expect(systemMetrics).toHaveProperty('database');
      expect(systemMetrics).toHaveProperty('scheduler');
      expect(systemMetrics).toHaveProperty('api');
      expect(systemMetrics).toHaveProperty('errors');
      expect(systemMetrics).toHaveProperty('health');
      expect(systemMetrics).toHaveProperty('platform');

      // Validate memory metrics
      expect(systemMetrics.memory.heapUsed).toBeGreaterThan(0);
      expect(systemMetrics.memory.heapTotal).toBeGreaterThan(0);
      expect(['low', 'medium', 'high', 'critical']).toContain(systemMetrics.memory.memoryPressure);

      // Validate health metrics
      expect(['healthy', 'degraded', 'unhealthy', 'critical']).toContain(systemMetrics.health.overall);
    }, 20000);
  });

  describe('Health Check Performance', () => {
    test('should complete health checks within reasonable time', async () => {
      const startTime = Date.now();
      
      await healthCheck.performEnhancedHealthCheck();
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    }, 15000);

    test('should handle concurrent health checks', async () => {
      const concurrentChecks = Array.from({ length: 5 }, () => 
        healthCheck.performEnhancedHealthCheck()
      );

      const results = await Promise.allSettled(concurrentChecks);
      
      // All checks should complete
      results.forEach(result => {
        expect(result.status).toBe('fulfilled');
      });

      // All results should be valid
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          expect(result.value).toHaveProperty('status');
          expect(result.value).toHaveProperty('checks');
        }
      });
    }, 20000);

    test('should cache health check results appropriately', async () => {
      const firstCheck = await healthCheck.performEnhancedHealthCheck();
      const firstTimestamp = new Date(firstCheck.timestamp).getTime();
      
      // Immediate second check should be fast (potentially cached)
      const secondCheckStart = Date.now();
      const secondCheck = await healthCheck.performEnhancedHealthCheck();
      const secondCheckDuration = Date.now() - secondCheckStart;
      
      expect(secondCheckDuration).toBeLessThan(5000); // Should be faster
      expect(secondCheck).toHaveProperty('status');
    }, 15000);
  });

  describe('Health Check Error Handling', () => {
    test('should handle database connection failures gracefully', async () => {
      // Temporarily disconnect database
      const originalConnection = await DatabaseConnection.getInstance();
      await originalConnection.$disconnect();

      const healthResult = await healthCheck.performEnhancedHealthCheck();
      
      // Should still return a result, but with degraded status
      expect(healthResult).toHaveProperty('status');
      expect(['degraded', 'unhealthy']).toContain(healthResult.status);

      // Reconnect for cleanup
      await DatabaseConnection.initialize();
    }, 20000);

    test('should handle service unavailability', async () => {
      // Mock a service failure
      const originalGetMemoryStats = memoryManager.getMemoryStats;
      memoryManager.getMemoryStats = jest.fn().mockRejectedValue(new Error('Service unavailable'));

      const healthResult = await healthCheck.performEnhancedHealthCheck();
      
      // Should handle the failure gracefully
      expect(healthResult).toHaveProperty('status');
      expect(healthResult.checks.some(check => check.status === 'fail')).toBe(true);

      // Restore original method
      memoryManager.getMemoryStats = originalGetMemoryStats;
    }, 15000);

    test('should provide meaningful error messages', async () => {
      const healthResult = await healthCheck.performEnhancedHealthCheck();
      
      healthResult.checks.forEach(check => {
        expect(check).toHaveProperty('name');
        expect(check.name).toBeTruthy();
        
        if (check.status === 'fail') {
          expect(check).toHaveProperty('output');
          expect(check.output).toBeTruthy();
        }
      });
    }, 10000);
  });

  describe('Health Check Integration', () => {
    test('should integrate with logging system', async () => {
      const logSpy = jest.spyOn(logger, 'info');
      
      await healthCheck.performEnhancedHealthCheck();
      
      // Should log health check activities
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('health'),
        expect.any(Object)
      );

      logSpy.mockRestore();
    }, 10000);

    test('should provide correlation ID tracking', async () => {
      const healthResult = await healthCheck.performEnhancedHealthCheck();
      
      expect(healthResult).toHaveProperty('correlationId');
      expect(healthResult.correlationId).toBeTruthy();
      expect(typeof healthResult.correlationId).toBe('string');
    });

    test('should integrate with platform adapter', async () => {
      const healthResult = await healthCheck.performEnhancedHealthCheck();
      
      expect(healthResult).toHaveProperty('platform');
      expect(healthResult.platform).toBeTruthy();
      
      const platform = platformAdapter.getPlatform();
      expect(healthResult.platform).toBe(platform);
    });
  });

  describe('Health Check Monitoring', () => {
    test('should track health check frequency', async () => {
      // Perform multiple health checks
      for (let i = 0; i < 3; i++) {
        await healthCheck.performEnhancedHealthCheck();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Health check service should track frequency
      const isHealthy = await healthCheck.isHealthy();
      expect(typeof isHealthy).toBe('boolean');
    }, 10000);

    test('should provide health trends', async () => {
      const healthResults = [];
      
      // Collect multiple health check results
      for (let i = 0; i < 3; i++) {
        const result = await healthCheck.performEnhancedHealthCheck();
        healthResults.push(result);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Should have consistent structure across checks
      healthResults.forEach(result => {
        expect(result).toHaveProperty('status');
        expect(result).toHaveProperty('timestamp');
        expect(result).toHaveProperty('checks');
      });
    }, 15000);
  });

  describe('End-to-End Health Validation', () => {
    test('should validate complete system health end-to-end', async () => {
      // Test the complete health check flow
      const response = await request(testApp)
        .get('/api/health')
        .expect(res => {
          expect([200, 503]).toContain(res.status);
        });

      // Validate response structure
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('checks');
      expect(response.body).toHaveProperty('metrics');

      // Validate all critical components are checked
      const checkNames = response.body.checks.map((check: any) => check.name);
      expect(checkNames).toContain('database');
      expect(checkNames).toContain('memory');
      
      // Validate metrics are present
      expect(response.body.metrics).toHaveProperty('memoryUsage');
      expect(response.body.metrics).toHaveProperty('requestMetrics');
    }, 25000);

    test('should handle system under load', async () => {
      // Create some system load
      const loadPromises = Array.from({ length: 10 }, () => 
        request(testApp).get('/api/health')
      );

      const results = await Promise.allSettled(loadPromises);
      
      // All requests should complete
      results.forEach(result => {
        expect(result.status).toBe('fulfilled');
      });

      // System should remain responsive
      const successfulResults = results.filter(r => r.status === 'fulfilled').length;
      expect(successfulResults).toBeGreaterThan(5); // At least half should succeed
    }, 30000);
  });
});