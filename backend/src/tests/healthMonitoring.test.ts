import { HealthCheckService } from '../services/healthCheck';
import { CorrelationService } from '../services/correlationService';
import { PerformanceMetricsService } from '../services/performanceMetrics';
import { SchedulerMonitorService } from '../services/schedulerMonitor';

describe('Enhanced Health Monitoring', () => {
  let healthCheckService: HealthCheckService;
  let correlationService: CorrelationService;
  let performanceService: PerformanceMetricsService;
  let schedulerMonitor: SchedulerMonitorService;

  beforeEach(() => {
    healthCheckService = HealthCheckService.getInstance();
    correlationService = CorrelationService.getInstance();
    performanceService = PerformanceMetricsService.getInstance();
    schedulerMonitor = SchedulerMonitorService.getInstance();
  });

  describe('CorrelationService', () => {
    it('should generate valid correlation IDs', () => {
      const id = correlationService.generateCorrelationId();
      expect(id).toMatch(/^req_[a-f0-9]{16}$/);
      expect(correlationService.isValidCorrelationId(id)).toBe(true);
    });

    it('should generate system correlation IDs', () => {
      const id = correlationService.generateSystemCorrelationId('test');
      expect(id).toMatch(/^sys_test_[a-z0-9]+$/);
      expect(correlationService.isValidCorrelationId(id)).toBe(true);
    });

    it('should extract existing correlation ID from headers', () => {
      const existingId = 'req_1234567890abcdef';
      const headers = { 'x-correlation-id': existingId };
      const id = correlationService.getOrCreateCorrelationId(headers);
      expect(id).toBe(existingId);
    });
  });

  describe('PerformanceMetricsService', () => {
    it('should record performance metrics', () => {
      const metric = {
        endpoint: '/api/test',
        method: 'GET',
        responseTime: 150,
        statusCode: 200,
        memoryDelta: 5,
        databaseQueries: 1,
        timestamp: new Date().toISOString(),
        correlationId: 'req_test123456789abc',
      };

      expect(() => performanceService.recordMetric(metric)).not.toThrow();
    });

    it('should track active requests', () => {
      const initialMetrics = performanceService.getRequestMetrics();
      const initialActive = initialMetrics.activeRequests;

      performanceService.startRequest();
      const afterStart = performanceService.getRequestMetrics();
      expect(afterStart.activeRequests).toBe(initialActive + 1);

      performanceService.endRequest();
      const afterEnd = performanceService.getRequestMetrics();
      expect(afterEnd.activeRequests).toBe(initialActive);
    });

    it('should return request metrics', () => {
      const metrics = performanceService.getRequestMetrics();
      expect(metrics).toHaveProperty('totalRequests');
      expect(metrics).toHaveProperty('requestsPerMinute');
      expect(metrics).toHaveProperty('averageResponseTime');
      expect(metrics).toHaveProperty('slowRequests');
      expect(metrics).toHaveProperty('errorRate');
      expect(metrics).toHaveProperty('activeRequests');
      expect(metrics).toHaveProperty('lastRequestTime');
    });
  });

  describe('SchedulerMonitorService', () => {
    it('should register schedulers', () => {
      schedulerMonitor.registerScheduler('TestScheduler');
      const status = schedulerMonitor.getSchedulerStatus('TestScheduler');
      
      expect(status).not.toBeNull();
      expect(status?.name).toBe('TestScheduler');
      expect(status?.status).toBe('stopped');
    });

    it('should track scheduler lifecycle', () => {
      schedulerMonitor.registerScheduler('LifecycleTest');
      
      schedulerMonitor.onSchedulerStart('LifecycleTest');
      let status = schedulerMonitor.getSchedulerStatus('LifecycleTest');
      expect(status?.status).toBe('running');

      schedulerMonitor.onSchedulerRun('LifecycleTest', true);
      status = schedulerMonitor.getSchedulerStatus('LifecycleTest');
      expect(status?.runCount).toBe(1);

      schedulerMonitor.onSchedulerStop('LifecycleTest');
      status = schedulerMonitor.getSchedulerStatus('LifecycleTest');
      expect(status?.status).toBe('stopped');
    });

    it('should track scheduler errors', () => {
      schedulerMonitor.registerScheduler('ErrorTest');
      
      const error = new Error('Test error');
      schedulerMonitor.onSchedulerError('ErrorTest', error);
      
      const status = schedulerMonitor.getSchedulerStatus('ErrorTest');
      expect(status?.status).toBe('error');
      expect(status?.errorCount).toBe(1);
    });

    it('should identify failed schedulers', () => {
      schedulerMonitor.registerScheduler('FailedTest');
      schedulerMonitor.onSchedulerError('FailedTest', new Error('Test'));
      
      expect(schedulerMonitor.hasFailedSchedulers()).toBe(true);
      const failed = schedulerMonitor.getFailedSchedulers();
      expect(failed.length).toBeGreaterThan(0);
      expect(failed[0].name).toBe('FailedTest');
    });
  });

  describe('HealthCheckService', () => {
    it('should perform basic health check', async () => {
      const health = await healthCheckService.performHealthCheck();
      
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('timestamp');
      expect(health).toHaveProperty('uptime');
      expect(health).toHaveProperty('checks');
      expect(health.checks).toHaveProperty('database');
      expect(health.checks).toHaveProperty('memory');
    });

    it('should perform enhanced health check', async () => {
      const health = await healthCheckService.performEnhancedHealthCheck();
      
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('correlationId');
      expect(health).toHaveProperty('platform');
      expect(health).toHaveProperty('metrics');
      expect(health.checks).toHaveProperty('schedulers');
      expect(health.checks).toHaveProperty('performance');
      expect(health.metrics).toHaveProperty('memoryUsage');
      expect(health.metrics).toHaveProperty('requestMetrics');
    });

    it('should return simple health status', async () => {
      const isHealthy = await healthCheckService.isHealthy();
      expect(typeof isHealthy).toBe('boolean');
    });
  });
});