import { MemoryManagerService } from '../services/memoryManager';

// Mock global.gc
global.gc = jest.fn();

describe('Memory Manager Service', () => {
  let memoryManager: MemoryManagerService;

  beforeEach(() => {
    memoryManager = MemoryManagerService.getInstance();
    jest.clearAllMocks();
  });

  afterEach(() => {
    memoryManager.stopMonitoring();
    memoryManager.cleanup();
  });

  describe('Initialization', () => {
    it('should create singleton instance', () => {
      const instance1 = MemoryManagerService.getInstance();
      const instance2 = MemoryManagerService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Memory Monitoring', () => {
    it('should start and stop monitoring', () => {
      expect(() => memoryManager.startMonitoring()).not.toThrow();
      expect(() => memoryManager.stopMonitoring()).not.toThrow();
    });

    it('should not start monitoring twice', () => {
      memoryManager.startMonitoring();
      expect(() => memoryManager.startMonitoring()).not.toThrow();
      memoryManager.stopMonitoring();
    });

    it('should get current memory usage', () => {
      const usage = memoryManager.getCurrentMemoryUsage();
      
      expect(usage).toHaveProperty('rss');
      expect(usage).toHaveProperty('heapTotal');
      expect(usage).toHaveProperty('heapUsed');
      expect(usage).toHaveProperty('external');
      expect(usage).toHaveProperty('usagePercentage');
      expect(usage).toHaveProperty('timestamp');
      
      expect(typeof usage.rss).toBe('number');
      expect(typeof usage.heapTotal).toBe('number');
      expect(typeof usage.heapUsed).toBe('number');
      expect(typeof usage.usagePercentage).toBe('number');
      expect(usage.rss).toBeGreaterThan(0);
      expect(usage.heapTotal).toBeGreaterThan(0);
      expect(usage.heapUsed).toBeGreaterThan(0);
    });
  });

  describe('Garbage Collection', () => {
    it('should trigger garbage collection when available', async () => {
      const memoryFreed = await memoryManager.triggerGarbageCollection('test');
      
      expect(global.gc).toHaveBeenCalled();
      expect(typeof memoryFreed).toBe('number');
    });

    it('should handle missing garbage collection gracefully', async () => {
      const originalGC = global.gc;
      delete (global as any).gc;
      
      const memoryFreed = await memoryManager.triggerGarbageCollection('test');
      
      expect(memoryFreed).toBe(0);
      
      // Restore
      global.gc = originalGC;
    });
  });

  describe('Memory Pressure Handling', () => {
    it('should handle low memory pressure', async () => {
      const event = await memoryManager.handleMemoryPressure('low');
      
      expect(event).toHaveProperty('timestamp');
      expect(event).toHaveProperty('level');
      expect(event).toHaveProperty('memoryUsage');
      expect(event).toHaveProperty('actionsPerformed');
      expect(event).toHaveProperty('memoryFreed');
      expect(event).toHaveProperty('duration');
      expect(event).toHaveProperty('success');
      
      expect(event.level).toBe('low');
      expect(Array.isArray(event.actionsPerformed)).toBe(true);
      expect(typeof event.memoryFreed).toBe('number');
      expect(typeof event.duration).toBe('number');
      expect(typeof event.success).toBe('boolean');
    });

    it('should handle critical memory pressure', async () => {
      const event = await memoryManager.handleMemoryPressure('critical');
      
      expect(event.level).toBe('critical');
      expect(event.actionsPerformed.length).toBeGreaterThan(0);
    });

    it('should perform emergency cleanup', async () => {
      const memoryFreed = await memoryManager.performEmergencyCleanup();
      
      expect(typeof memoryFreed).toBe('number');
      expect(memoryFreed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Memory Leak Detection', () => {
    it('should detect memory leaks', () => {
      const leak = memoryManager.detectMemoryLeaks();
      
      expect(leak).toHaveProperty('detected');
      expect(leak).toHaveProperty('confidence');
      expect(leak).toHaveProperty('growthRate');
      expect(leak).toHaveProperty('detectionTime');
      expect(leak).toHaveProperty('recommendations');
      
      expect(typeof leak.detected).toBe('boolean');
      expect(typeof leak.confidence).toBe('number');
      expect(typeof leak.growthRate).toBe('number');
      expect(Array.isArray(leak.recommendations)).toBe(true);
    });

    it('should return no leak for insufficient samples', () => {
      const leak = memoryManager.detectMemoryLeaks();
      
      expect(leak.detected).toBe(false);
      expect(leak.confidence).toBe(0);
    });
  });

  describe('Health Reporting', () => {
    it('should generate memory health report', () => {
      const report = memoryManager.getMemoryHealthReport();
      
      expect(report).toHaveProperty('status');
      expect(report).toHaveProperty('currentUsage');
      expect(report).toHaveProperty('trend');
      expect(report).toHaveProperty('gcStats');
      expect(report).toHaveProperty('leakDetection');
      expect(report).toHaveProperty('recentAlerts');
      expect(report).toHaveProperty('recentPressureEvents');
      expect(report).toHaveProperty('recommendations');
      
      expect(['healthy', 'warning', 'critical', 'emergency']).toContain(report.status);
      expect(Array.isArray(report.recommendations)).toBe(true);
      expect(Array.isArray(report.recentAlerts)).toBe(true);
      expect(Array.isArray(report.recentPressureEvents)).toBe(true);
    });

    it('should provide appropriate status based on memory usage', () => {
      const report = memoryManager.getMemoryHealthReport();
      
      // Status should be appropriate for current memory usage
      if (report.currentUsage.usagePercentage >= 95) {
        expect(report.status).toBe('emergency');
      } else if (report.currentUsage.usagePercentage >= 90) {
        expect(report.status).toBe('critical');
      } else if (report.currentUsage.usagePercentage >= 80) {
        expect(report.status).toBe('warning');
      } else {
        expect(report.status).toBe('healthy');
      }
    });
  });

  describe('Heap Snapshots', () => {
    it('should handle heap snapshot creation when disabled', async () => {
      // Heap snapshots are typically disabled in test environment
      await expect(memoryManager.createHeapSnapshot('test')).rejects.toThrow();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources', () => {
      memoryManager.startMonitoring();
      expect(() => memoryManager.cleanup()).not.toThrow();
    });

    it('should stop monitoring on cleanup', () => {
      memoryManager.startMonitoring();
      memoryManager.cleanup();
      
      // Should be able to start monitoring again after cleanup
      expect(() => memoryManager.startMonitoring()).not.toThrow();
      memoryManager.stopMonitoring();
    });
  });

  describe('Memory Trends', () => {
    it('should calculate memory trends with sufficient data', () => {
      // Start monitoring to collect some data
      memoryManager.startMonitoring();
      
      // Wait a bit for some data collection
      return new Promise(resolve => {
        setTimeout(() => {
          const report = memoryManager.getMemoryHealthReport();
          
          expect(report.trend).toHaveProperty('samples');
          expect(report.trend).toHaveProperty('trend');
          expect(report.trend).toHaveProperty('growthRate');
          expect(report.trend).toHaveProperty('leakSuspected');
          expect(report.trend).toHaveProperty('recommendations');
          
          expect(['increasing', 'decreasing', 'stable']).toContain(report.trend.trend);
          expect(typeof report.trend.growthRate).toBe('number');
          expect(typeof report.trend.leakSuspected).toBe('boolean');
          
          memoryManager.stopMonitoring();
          resolve(undefined);
        }, 100);
      });
    });
  });
});  })
;

  afterEach(async () => {
    await memoryManager.cleanup();
  });

  describe('initialization', () => {
    it('should initialize memory manager successfully', async () => {
      await expect(memoryManager.initialize()).resolves.not.toThrow();
    });

    it('should get health metrics', () => {
      const metrics = memoryManager.getHealthMetrics();
      
      expect(metrics).toHaveProperty('status');
      expect(metrics).toHaveProperty('currentUsage');
      expect(metrics).toHaveProperty('trend');
      expect(metrics).toHaveProperty('gcStats');
      expect(metrics).toHaveProperty('leakDetection');
      expect(metrics).toHaveProperty('recentAlerts');
      expect(metrics).toHaveProperty('optimizationActions');
      expect(metrics).toHaveProperty('recommendations');
    });
  });

  describe('garbage collection', () => {
    it('should force garbage collection successfully', async () => {
      const action = await memoryManager.forceGarbageCollection('test');
      
      expect(action).toHaveProperty('type', 'gc_trigger');
      expect(action).toHaveProperty('success', true);
      expect(action).toHaveProperty('memoryBefore');
      expect(action).toHaveProperty('memoryAfter');
      expect(action).toHaveProperty('duration');
      expect(global.gc).toHaveBeenCalled();
    });

    it('should handle garbage collection failure gracefully', async () => {
      // Mock gc to throw error
      (global.gc as jest.Mock).mockImplementation(() => {
        throw new Error('GC failed');
      });

      const action = await memoryManager.forceGarbageCollection('test');
      
      expect(action).toHaveProperty('success', false);
      expect(action).toHaveProperty('type', 'gc_trigger');
    });
  });

  describe('emergency cleanup', () => {
    it('should perform emergency cleanup', async () => {
      const actions = await memoryManager.performEmergencyCleanup();
      
      expect(Array.isArray(actions)).toBe(true);
      expect(actions.length).toBeGreaterThan(0);
      
      // Should include GC action
      const gcAction = actions.find(a => a.type === 'gc_trigger');
      expect(gcAction).toBeDefined();
    });
  });

  describe('memory pressure detection', () => {
    it('should check memory pressure without errors', async () => {
      await expect(memoryManager.checkMemoryPressure()).resolves.not.toThrow();
    });
  });

  describe('memory recommendations', () => {
    it('should provide memory recommendations', () => {
      const recommendations = memoryManager.getMemoryRecommendations();
      
      expect(Array.isArray(recommendations)).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources properly', async () => {
      await memoryManager.initialize();
      await expect(memoryManager.cleanup()).resolves.not.toThrow();
    });
  });
});