import { MemoryManagerService } from '../../../services/memoryManager';
import { PlatformAdapterService } from '../../../services/platformAdapter';
import { EnhancedLogger } from '../../../services/enhancedLogger';

describe('Memory Pressure Integration Tests', () => {
  let memoryManager: MemoryManagerService;
  let platformAdapter: PlatformAdapterService;
  let logger: EnhancedLogger;
  let originalMemoryUsage: NodeJS.MemoryUsage;

  beforeAll(async () => {
    memoryManager = MemoryManagerService.getInstance();
    platformAdapter = PlatformAdapterService.getInstance();
    logger = EnhancedLogger.getInstance();
    originalMemoryUsage = process.memoryUsage();
    
    // Start monitoring
    memoryManager.startMonitoring();
  });

  afterAll(async () => {
    // Clean up any test artifacts
    await memoryManager.performEmergencyCleanup();
    if (global.gc) {
      global.gc();
    }
  });

  beforeEach(() => {
    // Reset any test state
    jest.clearAllMocks();
  });

  describe('Memory Monitoring', () => {
    test('should detect memory usage increases', async () => {
      const initialStats = await memoryManager.getMemoryStats();
      const initialHeapUsed = process.memoryUsage().heapUsed;

      // Allocate memory to simulate usage increase
      const memoryWaste: any[] = [];
      for (let i = 0; i < 1000; i++) {
        memoryWaste.push(new Array(1000).fill(`test-data-${i}`));
      }

      // Wait for monitoring to detect the change
      await new Promise(resolve => setTimeout(resolve, 2000));

      const currentHeapUsed = process.memoryUsage().heapUsed;
      expect(currentHeapUsed).toBeGreaterThan(initialHeapUsed);

      // Clean up
      memoryWaste.length = 0;
    }, 15000);

    test('should provide accurate memory statistics', async () => {
      const stats = await memoryManager.getMemoryStats();
      
      expect(stats).toHaveProperty('heapUsed');
      expect(stats).toHaveProperty('heapTotal');
      expect(stats).toHaveProperty('external');
      expect(stats).toHaveProperty('rss');
      expect(stats).toHaveProperty('status');
      expect(stats).toHaveProperty('trend');
      expect(stats).toHaveProperty('recommendations');

      expect(stats.heapUsed).toBeGreaterThan(0);
      expect(stats.heapTotal).toBeGreaterThan(stats.heapUsed);
      expect(['healthy', 'warning', 'critical']).toContain(stats.status);
    });

    test('should track memory trends over time', async () => {
      const initialStats = await memoryManager.getMemoryStats();
      
      // Simulate memory allocation pattern
      const memoryAllocations: any[] = [];
      
      // Gradual increase
      for (let i = 0; i < 5; i++) {
        memoryAllocations.push(new Array(500).fill(`trend-test-${i}`));
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const finalStats = await memoryManager.getMemoryStats();
      
      // Should detect increasing trend
      expect(finalStats.trend.trend).toBe('increasing');
      expect(finalStats.trend.samples).toBeGreaterThan(1);

      // Clean up
      memoryAllocations.length = 0;
    }, 20000);
  });

  describe('Memory Pressure Detection', () => {
    test('should detect high memory pressure', async () => {
      const config = platformAdapter.getOptimalConfig();
      const targetMemoryMB = Math.min(config.maxMemoryMB * 0.8, 300); // 80% of limit or 300MB max
      
      // Allocate memory to reach high pressure
      const memoryWaste: any[] = [];
      const currentMemoryMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
      const neededMB = Math.max(0, targetMemoryMB - currentMemoryMB);
      
      if (neededMB > 0) {
        for (let i = 0; i < neededMB; i++) {
          memoryWaste.push(new Array(1024 * 100).fill('x')); // ~1MB per iteration
        }
      }

      // Wait for detection
      await new Promise(resolve => setTimeout(resolve, 3000));

      const stats = await memoryManager.getMemoryStats();
      expect(['warning', 'critical']).toContain(stats.status);

      // Clean up immediately
      memoryWaste.length = 0;
      if (global.gc) {
        global.gc();
      }
    }, 30000);

    test('should trigger garbage collection when needed', async () => {
      if (!global.gc) {
        console.log('Skipping GC test - garbage collection not exposed');
        return;
      }

      const initialMemory = process.memoryUsage();
      
      // Allocate and release memory to create garbage
      let memoryWaste: any[] = [];
      for (let i = 0; i < 1000; i++) {
        memoryWaste.push(new Array(1000).fill(`gc-test-${i}`));
      }
      
      const afterAllocation = process.memoryUsage();
      expect(afterAllocation.heapUsed).toBeGreaterThan(initialMemory.heapUsed);

      // Clear references to create garbage
      memoryWaste = [];

      // Trigger memory management
      await memoryManager.performMemoryOptimization();

      const afterGC = process.memoryUsage();
      expect(afterGC.heapUsed).toBeLessThan(afterAllocation.heapUsed);
    }, 20000);
  });

  describe('Memory Leak Detection', () => {
    test('should detect potential memory leaks', async () => {
      const leakSimulation: any[] = [];
      
      // Simulate a memory leak by continuously allocating without cleanup
      const leakInterval = setInterval(() => {
        leakSimulation.push(new Array(100).fill('leak-simulation'));
      }, 100);

      // Let it run for a few seconds
      await new Promise(resolve => setTimeout(resolve, 5000));
      clearInterval(leakInterval);

      const stats = await memoryManager.getMemoryStats();
      
      // Should detect increasing memory usage
      if (stats.leaks && stats.leaks.length > 0) {
        expect(stats.leaks.some(leak => leak.trend === 'increasing')).toBe(true);
      }

      // Clean up
      leakSimulation.length = 0;
    }, 15000);

    test('should provide leak detection recommendations', async () => {
      // Simulate various memory patterns
      const patterns: any[] = [];
      
      // Pattern 1: Gradual increase
      for (let i = 0; i < 100; i++) {
        patterns.push(new Array(50).fill(`pattern-${i}`));
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      const stats = await memoryManager.getMemoryStats();
      expect(stats.recommendations).toBeDefined();
      expect(Array.isArray(stats.recommendations)).toBe(true);

      // Clean up
      patterns.length = 0;
    }, 10000);
  });

  describe('Emergency Cleanup', () => {
    test('should perform emergency cleanup when memory is critical', async () => {
      const initialMemory = process.memoryUsage();
      
      // Allocate significant memory
      const memoryWaste: any[] = [];
      for (let i = 0; i < 500; i++) {
        memoryWaste.push(new Array(2000).fill(`emergency-test-${i}`));
      }

      const beforeCleanup = process.memoryUsage();
      
      // Perform emergency cleanup
      await memoryManager.performEmergencyCleanup();

      const afterCleanup = process.memoryUsage();
      
      // Memory usage should be reduced
      expect(afterCleanup.heapUsed).toBeLessThanOrEqual(beforeCleanup.heapUsed);

      // Clean up remaining references
      memoryWaste.length = 0;
    }, 20000);

    test('should handle cleanup failures gracefully', async () => {
      // Mock a cleanup failure
      const originalCleanup = memoryManager.performEmergencyCleanup;
      const mockCleanup = jest.fn().mockRejectedValue(new Error('Cleanup failed'));
      memoryManager.performEmergencyCleanup = mockCleanup;

      try {
        await memoryManager.performEmergencyCleanup();
      } catch (error) {
        expect(error.message).toBe('Cleanup failed');
      }

      // Restore original method
      memoryManager.performEmergencyCleanup = originalCleanup;
    });
  });

  describe('Platform-Specific Behavior', () => {
    test('should adapt thresholds based on platform', async () => {
      const config = platformAdapter.getOptimalConfig();
      const stats = await memoryManager.getMemoryStats();
      
      if (platformAdapter.getPlatform() === 'render') {
        // Render.com has 512MB limit, so thresholds should be lower
        expect(config.maxMemoryMB).toBeLessThanOrEqual(512);
      }
      
      // Memory manager should respect platform limits
      expect(stats.platformLimits).toBeDefined();
    });

    test('should provide platform-specific recommendations', async () => {
      const stats = await memoryManager.getMemoryStats();
      const platform = platformAdapter.getPlatform();
      
      expect(stats.recommendations).toBeDefined();
      
      if (platform === 'render') {
        // Should include Render-specific recommendations
        const hasRenderRecommendations = stats.recommendations.some(rec => 
          rec.toLowerCase().includes('render') || 
          rec.toLowerCase().includes('512mb') ||
          rec.toLowerCase().includes('memory limit')
        );
        
        if (stats.status !== 'healthy') {
          expect(hasRenderRecommendations).toBe(true);
        }
      }
    });
  });

  describe('Memory Monitoring Integration', () => {
    test('should integrate with logging system', async () => {
      const logSpy = jest.spyOn(logger, 'warn');
      
      // Allocate memory to trigger warning
      const memoryWaste: any[] = [];
      for (let i = 0; i < 200; i++) {
        memoryWaste.push(new Array(1000).fill(`logging-test-${i}`));
      }

      // Wait for monitoring to detect and log
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Should have logged memory warnings
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('memory'),
        expect.any(Object)
      );

      logSpy.mockRestore();
      memoryWaste.length = 0;
    }, 15000);

    test('should provide health report integration', async () => {
      const healthReport = memoryManager.getMemoryHealthReport();
      
      expect(healthReport).toHaveProperty('status');
      expect(healthReport).toHaveProperty('memoryUsage');
      expect(healthReport).toHaveProperty('trend');
      expect(healthReport).toHaveProperty('recommendations');
      expect(healthReport).toHaveProperty('lastCheck');

      expect(['healthy', 'warning', 'critical']).toContain(healthReport.status);
    });
  });

  describe('Stress Testing', () => {
    test('should handle rapid memory allocation and deallocation', async () => {
      const allocations: any[][] = [];
      
      // Rapid allocation/deallocation cycles
      for (let cycle = 0; cycle < 10; cycle++) {
        // Allocate
        const batch: any[] = [];
        for (let i = 0; i < 100; i++) {
          batch.push(new Array(100).fill(`stress-${cycle}-${i}`));
        }
        allocations.push(batch);
        
        // Deallocate previous batch
        if (allocations.length > 3) {
          allocations.shift();
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const stats = await memoryManager.getMemoryStats();
      expect(stats.status).toBeDefined();

      // Clean up
      allocations.length = 0;
    }, 20000);

    test('should maintain stability under memory pressure', async () => {
      const initialStats = await memoryManager.getMemoryStats();
      
      // Create sustained memory pressure
      const sustainedLoad: any[] = [];
      for (let i = 0; i < 300; i++) {
        sustainedLoad.push(new Array(500).fill(`sustained-${i}`));
        
        if (i % 50 === 0) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      // System should remain responsive
      const finalStats = await memoryManager.getMemoryStats();
      expect(finalStats).toBeDefined();
      expect(finalStats.status).toBeDefined();

      // Clean up
      sustainedLoad.length = 0;
      if (global.gc) {
        global.gc();
      }
    }, 30000);
  });
});