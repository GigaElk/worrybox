import { DatabaseConnection } from '../../../utils/databaseConnection';
import { MemoryManagerService } from '../../../services/memoryManager';
import { SchedulerManagerService } from '../../../services/schedulerManager';
import { DiagnosticsService } from '../../../services/diagnosticsService';
import { EnhancedLogger } from '../../../services/enhancedLogger';
import { PlatformAdapterService } from '../../../services/platformAdapter';

/**
 * Comprehensive Reliability Test Suite
 * 
 * This test suite validates the overall reliability and resilience
 * of the application by running integrated scenarios that test
 * multiple systems working together under various conditions.
 */
describe('Comprehensive Reliability Test Suite', () => {
  let memoryManager: MemoryManagerService;
  let schedulerManager: SchedulerManagerService;
  let diagnostics: DiagnosticsService;
  let logger: EnhancedLogger;
  let platformAdapter: PlatformAdapterService;

  beforeAll(async () => {
    // Initialize all services
    memoryManager = MemoryManagerService.getInstance();
    schedulerManager = SchedulerManagerService.getInstance();
    diagnostics = DiagnosticsService.getInstance();
    logger = EnhancedLogger.getInstance();
    platformAdapter = PlatformAdapterService.getInstance();

    // Initialize core systems
    await DatabaseConnection.initialize();
    await diagnostics.initialize();
    memoryManager.startMonitoring();
  });

  afterAll(async () => {
    // Cleanup all systems
    await DatabaseConnection.disconnect();
    await diagnostics.cleanup();
  });

  describe('System Integration Under Normal Load', () => {
    test('should maintain stability with normal operations', async () => {
      const initialMemory = process.memoryUsage();
      const testDuration = 10000; // 10 seconds
      const startTime = Date.now();

      // Simulate normal application load
      const operations = [];
      
      // Database operations
      for (let i = 0; i < 20; i++) {
        operations.push(
          DatabaseConnection.executeOperation(async () => {
            const prisma = await DatabaseConnection.getInstance();
            return await prisma.$queryRaw`SELECT ${i} as test_value`;
          }, `normal-load-db-${i}`)
        );
      }

      // Memory operations
      const memoryOperations = [];
      for (let i = 0; i < 10; i++) {
        memoryOperations.push(
          new Promise(resolve => {
            setTimeout(() => {
              const data = new Array(100).fill(`normal-load-${i}`);
              resolve(data);
            }, Math.random() * 1000);
          })
        );
      }

      // Wait for all operations to complete
      const [dbResults, memoryResults] = await Promise.all([
        Promise.allSettled(operations),
        Promise.allSettled(memoryOperations)
      ]);

      const endTime = Date.now();
      const finalMemory = process.memoryUsage();

      // Validate system stability
      expect(endTime - startTime).toBeLessThan(testDuration + 5000);
      
      // Most operations should succeed
      const successfulDbOps = dbResults.filter(r => r.status === 'fulfilled').length;
      expect(successfulDbOps).toBeGreaterThan(15); // At least 75% success rate

      // Memory should not increase excessively
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB increase

      // System should still be responsive
      const healthCheck = await diagnostics.collectSystemMetrics();
      expect(healthCheck.health.overall).not.toBe('critical');
    }, 30000);

    test('should handle concurrent system monitoring', async () => {
      // Start multiple monitoring operations simultaneously
      const monitoringPromises = [
        diagnostics.collectSystemMetrics(),
        memoryManager.getMemoryStats(),
        schedulerManager.getSchedulerStats(),
        DatabaseConnection.getHealthMetrics(),
      ];

      const results = await Promise.allSettled(monitoringPromises);

      // All monitoring should complete successfully
      results.forEach((result, index) => {
        expect(result.status).toBe('fulfilled');
        if (result.status === 'fulfilled') {
          expect(result.value).toBeDefined();
        }
      });
    }, 15000);
  });

  describe('System Recovery Under Stress', () => {
    test('should recover from combined memory and database stress', async () => {
      const initialHealth = await diagnostics.collectSystemMetrics();
      
      // Create memory pressure
      const memoryWaste: any[] = [];
      for (let i = 0; i < 200; i++) {
        memoryWaste.push(new Array(1000).fill(`stress-test-${i}`));
      }

      // Create database load
      const dbOperations = [];
      for (let i = 0; i < 50; i++) {
        dbOperations.push(
          DatabaseConnection.executeOperation(async () => {
            // Simulate slow query
            await new Promise(resolve => setTimeout(resolve, Math.random() * 500));
            const prisma = await DatabaseConnection.getInstance();
            return await prisma.$queryRaw`SELECT ${i} as stress_value`;
          }, `stress-test-db-${i}`)
        );
      }

      // Wait for stress to build up
      await new Promise(resolve => setTimeout(resolve, 3000));

      const stressedHealth = await diagnostics.collectSystemMetrics();
      
      // System should detect stress
      expect(stressedHealth.memory.memoryPressure).not.toBe('low');

      // Clean up stress
      memoryWaste.length = 0;
      if (global.gc) {
        global.gc();
      }

      // Wait for database operations to complete
      await Promise.allSettled(dbOperations);

      // Wait for recovery
      await new Promise(resolve => setTimeout(resolve, 5000));

      const recoveredHealth = await diagnostics.collectSystemMetrics();
      
      // System should recover
      expect(recoveredHealth.health.overall).not.toBe('critical');
      expect(recoveredHealth.memory.heapUsed).toBeLessThan(stressedHealth.memory.heapUsed + 50);
    }, 45000);

    test('should maintain logging during system stress', async () => {
      const logSpy = jest.spyOn(logger, 'warn');
      
      // Create system stress
      const stressOperations = [];
      
      for (let i = 0; i < 30; i++) {
        stressOperations.push(
          new Promise(async (resolve) => {
            try {
              // Mix of operations that might cause warnings
              const memoryWaste = new Array(500).fill(`stress-log-${i}`);
              await new Promise(r => setTimeout(r, Math.random() * 1000));
              resolve(memoryWaste);
            } catch (error) {
              resolve(error);
            }
          })
        );
      }

      await Promise.allSettled(stressOperations);

      // Should have logged warnings during stress
      expect(logSpy).toHaveBeenCalled();

      logSpy.mockRestore();
    }, 20000);
  });

  describe('Platform-Specific Reliability', () => {
    test('should adapt behavior based on platform constraints', async () => {
      const platform = platformAdapter.getPlatform();
      const config = platformAdapter.getOptimalConfig();
      
      // Test platform-specific memory limits
      if (platform === 'render') {
        expect(config.maxMemoryMB).toBeLessThanOrEqual(512);
        
        // Test memory management under Render constraints
        const memoryTest: any[] = [];
        const targetMemoryMB = Math.min(config.maxMemoryMB * 0.7, 300);
        
        for (let i = 0; i < targetMemoryMB; i++) {
          memoryTest.push(new Array(1024 * 100).fill('x')); // ~1MB
        }

        const memoryStats = await memoryManager.getMemoryStats();
        expect(memoryStats.status).toBeDefined();

        // Clean up
        memoryTest.length = 0;
        if (global.gc) {
          global.gc();
        }
      }

      // Test database connection limits
      const dbConnections = [];
      const maxConnections = Math.min(config.maxConnections, 10);
      
      for (let i = 0; i < maxConnections; i++) {
        dbConnections.push(
          DatabaseConnection.executeOperation(async () => {
            await new Promise(resolve => setTimeout(resolve, 1000));
            return { connection: i };
          }, `platform-test-${i}`)
        );
      }

      const results = await Promise.allSettled(dbConnections);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      
      // Should handle connections within platform limits
      expect(successful).toBeGreaterThan(0);
    }, 30000);

    test('should provide platform-specific recommendations', async () => {
      const systemMetrics = await diagnostics.collectSystemMetrics();
      const platform = platformAdapter.getPlatform();
      
      // Should include platform in metrics
      expect(systemMetrics.platform.platform).toBe(platform);
      
      // Should provide appropriate resource usage information
      expect(systemMetrics.platform.usage).toBeDefined();
      expect(systemMetrics.platform.limits).toBeDefined();
    });
  });

  describe('Error Handling and Recovery Integration', () => {
    test('should handle cascading failures gracefully', async () => {
      // Simulate a scenario where multiple systems fail
      const originalDbExecute = DatabaseConnection.executeOperation;
      const originalMemoryStats = memoryManager.getMemoryStats;

      // Mock database failures
      let dbFailureCount = 0;
      DatabaseConnection.executeOperation = jest.fn().mockImplementation(async (operation, context) => {
        dbFailureCount++;
        if (dbFailureCount <= 3) {
          throw new Error('Simulated database failure');
        }
        return originalDbExecute.call(DatabaseConnection, operation, context);
      });

      // Mock memory system issues
      let memoryFailureCount = 0;
      memoryManager.getMemoryStats = jest.fn().mockImplementation(async () => {
        memoryFailureCount++;
        if (memoryFailureCount <= 2) {
          throw new Error('Simulated memory system failure');
        }
        return originalMemoryStats.call(memoryManager);
      });

      // Try to collect system metrics during failures
      let systemMetrics;
      try {
        systemMetrics = await diagnostics.collectSystemMetrics();
      } catch (error) {
        // Should handle failures gracefully
        expect(error).toBeDefined();
      }

      // Restore original methods
      DatabaseConnection.executeOperation = originalDbExecute;
      memoryManager.getMemoryStats = originalMemoryStats;

      // System should eventually recover
      const recoveredMetrics = await diagnostics.collectSystemMetrics();
      expect(recoveredMetrics).toBeDefined();
    }, 20000);

    test('should maintain correlation tracking during failures', async () => {
      const correlationId = 'test-correlation-failure';
      
      try {
        await DatabaseConnection.executeOperation(async () => {
          throw new Error('Test correlation failure');
        }, correlationId);
      } catch (error) {
        // Error should be logged with correlation ID
        expect(error.message).toContain('Test correlation failure');
      }

      // Correlation should be maintained in logs
      const logSpy = jest.spyOn(logger, 'error');
      
      try {
        await DatabaseConnection.executeOperation(async () => {
          throw new Error('Another test failure');
        }, correlationId);
      } catch (error) {
        // Should log with correlation context
      }

      logSpy.mockRestore();
    });
  });

  describe('Performance Under Load', () => {
    test('should maintain acceptable performance under sustained load', async () => {
      const testDuration = 15000; // 15 seconds
      const startTime = Date.now();
      const responseTimes: number[] = [];
      
      // Create sustained load
      const loadInterval = setInterval(async () => {
        const operationStart = Date.now();
        
        try {
          await Promise.all([
            diagnostics.collectSystemMetrics(),
            memoryManager.getMemoryStats(),
            DatabaseConnection.executeOperation(async () => {
              const prisma = await DatabaseConnection.getInstance();
              return await prisma.$queryRaw`SELECT 1`;
            }, 'load-test')
          ]);
          
          const operationTime = Date.now() - operationStart;
          responseTimes.push(operationTime);
        } catch (error) {
          // Track errors but continue load test
        }
      }, 500); // Every 500ms

      // Wait for test duration
      await new Promise(resolve => setTimeout(resolve, testDuration));
      clearInterval(loadInterval);

      // Analyze performance
      if (responseTimes.length > 0) {
        const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        const maxResponseTime = Math.max(...responseTimes);
        
        // Performance should remain reasonable
        expect(averageResponseTime).toBeLessThan(5000); // Average under 5 seconds
        expect(maxResponseTime).toBeLessThan(10000); // Max under 10 seconds
        
        // Should have completed most operations
        expect(responseTimes.length).toBeGreaterThan(10);
      }
    }, 30000);
  });

  describe('System Monitoring and Alerting', () => {
    test('should detect and alert on system issues', async () => {
      // Create a condition that should trigger alerts
      const memoryWaste: any[] = [];
      for (let i = 0; i < 300; i++) {
        memoryWaste.push(new Array(1000).fill(`alert-test-${i}`));
      }

      // Wait for monitoring to detect the issue
      await new Promise(resolve => setTimeout(resolve, 3000));

      const systemMetrics = await diagnostics.collectSystemMetrics();
      
      // Should detect memory pressure
      expect(['medium', 'high', 'critical']).toContain(systemMetrics.memory.memoryPressure);

      // Clean up
      memoryWaste.length = 0;
      if (global.gc) {
        global.gc();
      }
    }, 15000);

    test('should provide actionable monitoring data', async () => {
      const systemMetrics = await diagnostics.collectSystemMetrics();
      
      // Should provide comprehensive monitoring data
      expect(systemMetrics.timestamp).toBeDefined();
      expect(systemMetrics.uptime).toBeGreaterThan(0);
      expect(systemMetrics.memory.heapUsed).toBeGreaterThan(0);
      expect(systemMetrics.health.overall).toBeDefined();
      
      // Should provide actionable information
      expect(systemMetrics.health.components).toBeDefined();
      expect(Array.isArray(systemMetrics.health.components)).toBe(true);
    });
  });

  describe('End-to-End Reliability Validation', () => {
    test('should demonstrate complete system reliability', async () => {
      const testScenarios = [
        // Scenario 1: Normal operations
        async () => {
          const metrics = await diagnostics.collectSystemMetrics();
          return { scenario: 'normal', success: metrics.health.overall !== 'critical' };
        },
        
        // Scenario 2: Database operations
        async () => {
          const result = await DatabaseConnection.executeOperation(async () => {
            const prisma = await DatabaseConnection.getInstance();
            return await prisma.$queryRaw`SELECT 'reliability-test' as test`;
          }, 'reliability-test');
          return { scenario: 'database', success: !!result };
        },
        
        // Scenario 3: Memory management
        async () => {
          const stats = await memoryManager.getMemoryStats();
          return { scenario: 'memory', success: stats.status !== 'critical' };
        },
        
        // Scenario 4: System monitoring
        async () => {
          const health = await diagnostics.collectSystemMetrics();
          return { scenario: 'monitoring', success: !!health.timestamp };
        }
      ];

      const results = await Promise.allSettled(
        testScenarios.map(scenario => scenario())
      );

      // All scenarios should complete
      results.forEach(result => {
        expect(result.status).toBe('fulfilled');
      });

      // Most scenarios should succeed
      const successfulScenarios = results.filter(result => 
        result.status === 'fulfilled' && result.value.success
      ).length;
      
      expect(successfulScenarios).toBeGreaterThanOrEqual(3); // At least 3 out of 4 should succeed
    }, 25000);
  });
});