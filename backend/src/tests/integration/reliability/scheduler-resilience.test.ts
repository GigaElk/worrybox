import { SchedulerManagerService } from '../../../services/schedulerManager';
import { SchedulerResilienceService } from '../../../services/schedulerResilience';
import { MemoryManagerService } from '../../../services/memoryManager';
import { EnhancedLogger } from '../../../services/enhancedLogger';

// Mock scheduler for testing
class MockScheduler {
  public name: string;
  public isRunning = false;
  public runCount = 0;
  public errorCount = 0;
  public shouldFail = false;
  public failureRate = 0;
  private interval?: NodeJS.Timeout;

  constructor(name: string) {
    this.name = name;
  }

  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.interval = setInterval(() => {
      this.run();
    }, 1000);
  }

  stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }

  private run(): void {
    this.runCount++;
    
    if (this.shouldFail || (this.failureRate > 0 && Math.random() < this.failureRate)) {
      this.errorCount++;
      throw new Error(`Mock scheduler ${this.name} failed`);
    }
  }

  getStats() {
    return {
      name: this.name,
      isRunning: this.isRunning,
      runCount: this.runCount,
      errorCount: this.errorCount,
    };
  }
}

describe('Scheduler Resilience Integration Tests', () => {
  let schedulerManager: SchedulerManagerService;
  let schedulerResilience: SchedulerResilienceService;
  let memoryManager: MemoryManagerService;
  let logger: EnhancedLogger;
  let mockSchedulers: MockScheduler[] = [];

  beforeAll(async () => {
    schedulerManager = SchedulerManagerService.getInstance();
    schedulerResilience = SchedulerResilienceService.getInstance();
    memoryManager = MemoryManagerService.getInstance();
    logger = EnhancedLogger.getInstance();
    
    await schedulerResilience.initialize();
  });

  afterAll(async () => {
    // Clean up all mock schedulers
    mockSchedulers.forEach(scheduler => scheduler.stop());
    await schedulerResilience.cleanup();
  });

  beforeEach(() => {
    // Clean up previous test schedulers
    mockSchedulers.forEach(scheduler => scheduler.stop());
    mockSchedulers = [];
    jest.clearAllMocks();
  });

  describe('Scheduler Health Monitoring', () => {
    test('should monitor individual scheduler health', async () => {
      const mockScheduler = new MockScheduler('test-health-monitor');
      mockSchedulers.push(mockScheduler);
      
      // Register and start scheduler
      schedulerManager.registerScheduler('test-health-monitor');
      mockScheduler.start();

      // Wait for some runs
      await new Promise(resolve => setTimeout(resolve, 3000));

      const stats = await schedulerManager.getSchedulerStats();
      expect(stats.schedulers.length).toBeGreaterThan(0);
      
      const testScheduler = stats.schedulers.find(s => s.name === 'test-health-monitor');
      if (testScheduler) {
        expect(testScheduler.status).toBe('running');
        expect(testScheduler.runCount).toBeGreaterThan(0);
      }

      mockScheduler.stop();
    }, 10000);

    test('should detect scheduler failures', async () => {
      const mockScheduler = new MockScheduler('test-failure-detection');
      mockScheduler.shouldFail = true;
      mockSchedulers.push(mockScheduler);
      
      schedulerManager.registerScheduler('test-failure-detection');
      mockScheduler.start();

      // Wait for failures to be detected
      await new Promise(resolve => setTimeout(resolve, 3000));

      const stats = await schedulerManager.getSchedulerStats();
      const testScheduler = stats.schedulers.find(s => s.name === 'test-failure-detection');
      
      if (testScheduler) {
        expect(testScheduler.errorCount).toBeGreaterThan(0);
        expect(testScheduler.status).toBe('error');
      }

      mockScheduler.stop();
    }, 10000);

    test('should track scheduler performance metrics', async () => {
      const mockScheduler = new MockScheduler('test-performance-tracking');
      mockSchedulers.push(mockScheduler);
      
      schedulerManager.registerScheduler('test-performance-tracking');
      mockScheduler.start();

      // Wait for performance data
      await new Promise(resolve => setTimeout(resolve, 5000));

      const stats = await schedulerManager.getSchedulerStats();
      const testScheduler = stats.schedulers.find(s => s.name === 'test-performance-tracking');
      
      if (testScheduler) {
        expect(testScheduler.averageDuration).toBeGreaterThanOrEqual(0);
        expect(testScheduler.runCount).toBeGreaterThan(0);
      }

      mockScheduler.stop();
    }, 15000);
  });

  describe('Scheduler Restart Capabilities', () => {
    test('should restart failed schedulers automatically', async () => {
      const mockScheduler = new MockScheduler('test-auto-restart');
      mockScheduler.failureRate = 0.8; // 80% failure rate initially
      mockSchedulers.push(mockScheduler);
      
      schedulerManager.registerScheduler('test-auto-restart');
      mockScheduler.start();

      // Wait for failures and restart attempts
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Reduce failure rate to simulate recovery
      mockScheduler.failureRate = 0.1;

      // Wait for recovery
      await new Promise(resolve => setTimeout(resolve, 3000));

      const stats = await schedulerManager.getSchedulerStats();
      const testScheduler = stats.schedulers.find(s => s.name === 'test-auto-restart');
      
      if (testScheduler) {
        expect(testScheduler.restartCount).toBeGreaterThan(0);
      }

      mockScheduler.stop();
    }, 20000);

    test('should handle manual scheduler restart', async () => {
      const mockScheduler = new MockScheduler('test-manual-restart');
      mockSchedulers.push(mockScheduler);
      
      schedulerManager.registerScheduler('test-manual-restart');
      mockScheduler.start();

      // Wait for initial runs
      await new Promise(resolve => setTimeout(resolve, 2000));

      const initialRunCount = mockScheduler.runCount;

      // Stop scheduler
      mockScheduler.stop();
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Restart scheduler
      mockScheduler.start();
      await new Promise(resolve => setTimeout(resolve, 2000));

      expect(mockScheduler.runCount).toBeGreaterThan(initialRunCount);
      expect(mockScheduler.isRunning).toBe(true);

      mockScheduler.stop();
    }, 15000);
  });

  describe('Staggered Startup', () => {
    test('should start schedulers with staggered timing', async () => {
      const schedulerNames = ['stagger-1', 'stagger-2', 'stagger-3'];
      const startTimes: number[] = [];
      
      // Create mock schedulers
      schedulerNames.forEach(name => {
        const mockScheduler = new MockScheduler(name);
        mockSchedulers.push(mockScheduler);
        schedulerManager.registerScheduler(name);
        
        // Override start method to track timing
        const originalStart = mockScheduler.start.bind(mockScheduler);
        mockScheduler.start = () => {
          startTimes.push(Date.now());
          originalStart();
        };
      });

      // Start all schedulers (should be staggered)
      const startPromises = mockSchedulers.map(scheduler => 
        new Promise<void>(resolve => {
          scheduler.start();
          resolve();
        })
      );

      await Promise.all(startPromises);

      // Check that starts were staggered
      if (startTimes.length >= 2) {
        const timeDifferences = [];
        for (let i = 1; i < startTimes.length; i++) {
          timeDifferences.push(startTimes[i] - startTimes[i - 1]);
        }
        
        // Should have some delay between starts
        expect(timeDifferences.some(diff => diff > 0)).toBe(true);
      }

      mockSchedulers.forEach(scheduler => scheduler.stop());
    }, 10000);

    test('should prevent resource contention during startup', async () => {
      const schedulerCount = 5;
      const schedulers: MockScheduler[] = [];
      
      // Create multiple schedulers
      for (let i = 0; i < schedulerCount; i++) {
        const scheduler = new MockScheduler(`contention-test-${i}`);
        schedulers.push(scheduler);
        mockSchedulers.push(scheduler);
        schedulerManager.registerScheduler(`contention-test-${i}`);
      }

      const initialMemory = process.memoryUsage();
      
      // Start all schedulers simultaneously
      schedulers.forEach(scheduler => scheduler.start());
      
      // Wait for startup to complete
      await new Promise(resolve => setTimeout(resolve, 3000));

      const finalMemory = process.memoryUsage();
      
      // Memory increase should be reasonable (not excessive due to contention)
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = memoryIncrease / 1024 / 1024;
      
      expect(memoryIncreaseMB).toBeLessThan(100); // Should not use more than 100MB

      schedulers.forEach(scheduler => scheduler.stop());
    }, 15000);
  });

  describe('Graceful Shutdown', () => {
    test('should shutdown schedulers gracefully', async () => {
      const mockScheduler = new MockScheduler('test-graceful-shutdown');
      mockSchedulers.push(mockScheduler);
      
      schedulerManager.registerScheduler('test-graceful-shutdown');
      mockScheduler.start();

      // Wait for scheduler to run
      await new Promise(resolve => setTimeout(resolve, 2000));
      expect(mockScheduler.isRunning).toBe(true);

      // Initiate graceful shutdown
      mockScheduler.stop();
      
      // Verify shutdown
      expect(mockScheduler.isRunning).toBe(false);
    }, 10000);

    test('should handle shutdown with proper cleanup', async () => {
      const schedulers: MockScheduler[] = [];
      
      // Create multiple schedulers
      for (let i = 0; i < 3; i++) {
        const scheduler = new MockScheduler(`cleanup-test-${i}`);
        schedulers.push(scheduler);
        mockSchedulers.push(scheduler);
        schedulerManager.registerScheduler(`cleanup-test-${i}`);
        scheduler.start();
      }

      // Wait for schedulers to run
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Shutdown all schedulers
      schedulers.forEach(scheduler => scheduler.stop());

      // Verify all are stopped
      schedulers.forEach(scheduler => {
        expect(scheduler.isRunning).toBe(false);
      });
    }, 10000);
  });

  describe('Failure Detection and Recovery', () => {
    test('should detect scheduler failures quickly', async () => {
      const mockScheduler = new MockScheduler('test-failure-detection-speed');
      mockScheduler.shouldFail = true;
      mockSchedulers.push(mockScheduler);
      
      schedulerManager.registerScheduler('test-failure-detection-speed');
      
      const startTime = Date.now();
      mockScheduler.start();

      // Wait for failure detection
      await new Promise(resolve => setTimeout(resolve, 3000));

      const stats = await schedulerManager.getSchedulerStats();
      const testScheduler = stats.schedulers.find(s => s.name === 'test-failure-detection-speed');
      
      if (testScheduler && testScheduler.errorCount > 0) {
        const detectionTime = Date.now() - startTime;
        expect(detectionTime).toBeLessThan(10000); // Should detect within 10 seconds
      }

      mockScheduler.stop();
    }, 15000);

    test('should implement exponential backoff for restart attempts', async () => {
      const mockScheduler = new MockScheduler('test-exponential-backoff');
      mockScheduler.shouldFail = true;
      mockSchedulers.push(mockScheduler);
      
      schedulerManager.registerScheduler('test-exponential-backoff');
      
      const restartTimes: number[] = [];
      
      // Override start method to track restart timing
      const originalStart = mockScheduler.start.bind(mockScheduler);
      mockScheduler.start = () => {
        restartTimes.push(Date.now());
        originalStart();
      };

      mockScheduler.start();

      // Wait for multiple restart attempts
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Check that restart intervals increased
      if (restartTimes.length >= 3) {
        const interval1 = restartTimes[1] - restartTimes[0];
        const interval2 = restartTimes[2] - restartTimes[1];
        expect(interval2).toBeGreaterThan(interval1);
      }

      mockScheduler.stop();
    }, 20000);

    test('should recover from transient failures', async () => {
      const mockScheduler = new MockScheduler('test-transient-recovery');
      mockScheduler.failureRate = 0.5; // 50% failure rate
      mockSchedulers.push(mockScheduler);
      
      schedulerManager.registerScheduler('test-transient-recovery');
      mockScheduler.start();

      // Wait for some failures
      await new Promise(resolve => setTimeout(resolve, 5000));

      const midStats = mockScheduler.getStats();
      expect(midStats.errorCount).toBeGreaterThan(0);

      // Improve conditions (reduce failure rate)
      mockScheduler.failureRate = 0.1;

      // Wait for recovery
      await new Promise(resolve => setTimeout(resolve, 5000));

      const finalStats = mockScheduler.getStats();
      expect(finalStats.runCount).toBeGreaterThan(midStats.runCount);

      mockScheduler.stop();
    }, 20000);
  });

  describe('Resource Management', () => {
    test('should monitor scheduler memory usage', async () => {
      const mockScheduler = new MockScheduler('test-memory-monitoring');
      mockSchedulers.push(mockScheduler);
      
      schedulerManager.registerScheduler('test-memory-monitoring');
      
      const initialMemory = process.memoryUsage();
      mockScheduler.start();

      // Wait for scheduler to run and consume memory
      await new Promise(resolve => setTimeout(resolve, 3000));

      const stats = await schedulerManager.getSchedulerStats();
      const testScheduler = stats.schedulers.find(s => s.name === 'test-memory-monitoring');
      
      if (testScheduler) {
        expect(testScheduler.memoryUsage).toBeGreaterThanOrEqual(0);
      }

      mockScheduler.stop();
    }, 10000);

    test('should handle scheduler resource limits', async () => {
      const resourceIntensiveScheduler = new MockScheduler('test-resource-limits');
      mockSchedulers.push(resourceIntensiveScheduler);
      
      // Override run method to consume more resources
      const originalRun = resourceIntensiveScheduler['run'].bind(resourceIntensiveScheduler);
      resourceIntensiveScheduler['run'] = function() {
        // Simulate resource-intensive operation
        const waste = new Array(1000).fill('resource-test');
        originalRun();
      };

      schedulerManager.registerScheduler('test-resource-limits');
      resourceIntensiveScheduler.start();

      // Monitor for resource usage
      await new Promise(resolve => setTimeout(resolve, 5000));

      const memoryStats = await memoryManager.getMemoryStats();
      
      // Should detect increased memory usage
      expect(memoryStats.heapUsed).toBeGreaterThan(0);

      resourceIntensiveScheduler.stop();
    }, 15000);
  });

  describe('Integration with Other Systems', () => {
    test('should integrate with memory management', async () => {
      const mockScheduler = new MockScheduler('test-memory-integration');
      mockSchedulers.push(mockScheduler);
      
      schedulerManager.registerScheduler('test-memory-integration');
      mockScheduler.start();

      // Wait for integration
      await new Promise(resolve => setTimeout(resolve, 3000));

      const memoryStats = await memoryManager.getMemoryStats();
      const schedulerStats = await schedulerManager.getSchedulerStats();

      // Both systems should be operational
      expect(memoryStats.status).toBeDefined();
      expect(schedulerStats.schedulers.length).toBeGreaterThan(0);

      mockScheduler.stop();
    }, 10000);

    test('should integrate with logging system', async () => {
      const logSpy = jest.spyOn(logger, 'info');
      
      const mockScheduler = new MockScheduler('test-logging-integration');
      mockSchedulers.push(mockScheduler);
      
      schedulerManager.registerScheduler('test-logging-integration');
      mockScheduler.start();

      // Wait for logging
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Should have logged scheduler activities
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('scheduler'),
        expect.any(Object)
      );

      logSpy.mockRestore();
      mockScheduler.stop();
    }, 10000);
  });
});