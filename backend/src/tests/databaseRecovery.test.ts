import { DatabaseRecoveryService } from '../services/databaseRecovery';
import { DatabaseConnection } from '../utils/databaseConnection';

// Mock PrismaClient
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
    $disconnect: jest.fn(),
  })),
}));

describe('Database Recovery Service', () => {
  let recoveryService: DatabaseRecoveryService;

  beforeEach(() => {
    recoveryService = DatabaseRecoveryService.getInstance();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await recoveryService.cleanup();
  });

  describe('Initialization', () => {
    it('should initialize without errors', async () => {
      await expect(recoveryService.initialize()).resolves.not.toThrow();
    });

    it('should not initialize twice', async () => {
      await recoveryService.initialize();
      await expect(recoveryService.initialize()).resolves.not.toThrow();
    });
  });

  describe('Connection Management', () => {
    beforeEach(async () => {
      await recoveryService.initialize();
    });

    it('should get database connection', async () => {
      const connection = await recoveryService.getConnection();
      expect(connection).toBeDefined();
    });

    it('should execute operations with recovery', async () => {
      const mockOperation = jest.fn().mockResolvedValue('test result');
      
      const result = await recoveryService.executeOperation(mockOperation);
      
      expect(result).toBe('test result');
      expect(mockOperation).toHaveBeenCalled();
    });

    it('should retry failed operations', async () => {
      let callCount = 0;
      const mockOperation = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          throw new Error('Connection failed');
        }
        return Promise.resolve('success');
      });

      const result = await recoveryService.executeOperation(mockOperation, {
        correlationId: 'test-correlation-id',
      });

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should queue operations when recovering', async () => {
      // Force recovery state
      const recoveryState = (recoveryService as any).recoveryState;
      recoveryState.isRecovering = true;

      const mockOperation = jest.fn().mockResolvedValue('queued result');
      
      // This should queue the operation
      const resultPromise = recoveryService.executeOperation(mockOperation);
      
      // Simulate recovery completion
      setTimeout(() => {
        recoveryState.isRecovering = false;
        (recoveryService as any).processQueue();
      }, 100);

      const result = await resultPromise;
      expect(result).toBe('queued result');
    });
  });

  describe('Health Metrics', () => {
    beforeEach(async () => {
      await recoveryService.initialize();
    });

    it('should return health metrics', () => {
      const metrics = recoveryService.getHealthMetrics();
      
      expect(metrics).toHaveProperty('connectionStatus');
      expect(metrics).toHaveProperty('poolMetrics');
      expect(metrics).toHaveProperty('recoveryState');
      expect(metrics).toHaveProperty('recentErrors');
      expect(metrics).toHaveProperty('performanceMetrics');
    });

    it('should track query performance', async () => {
      const slowOperation = () => new Promise(resolve => 
        setTimeout(() => resolve('slow result'), 100)
      );

      await recoveryService.executeOperation(slowOperation);
      
      const metrics = recoveryService.getHealthMetrics();
      expect(metrics.performanceMetrics.averageQueryTime).toBeGreaterThan(0);
    });

    it('should record errors', async () => {
      const failingOperation = () => Promise.reject(new Error('Test error'));

      try {
        await recoveryService.executeOperation(failingOperation);
      } catch (error) {
        // Expected to fail
      }

      const metrics = recoveryService.getHealthMetrics();
      expect(metrics.recentErrors.length).toBeGreaterThan(0);
      expect(metrics.recentErrors[0].error).toBe('Test error');
    });
  });

  describe('Circuit Breaker', () => {
    beforeEach(async () => {
      await recoveryService.initialize();
    });

    it('should open circuit breaker after consecutive failures', async () => {
      const failingOperation = () => Promise.reject(new Error('Connection failed'));

      // Trigger multiple failures
      for (let i = 0; i < 6; i++) {
        try {
          await recoveryService.executeOperation(failingOperation);
        } catch (error) {
          // Expected to fail
        }
      }

      const metrics = recoveryService.getHealthMetrics();
      expect(metrics.recoveryState.circuitBreakerState).toBe('open');
    });

    it('should reject operations when circuit breaker is open', async () => {
      // Force circuit breaker open
      const recoveryState = (recoveryService as any).recoveryState;
      recoveryState.circuitBreakerState = 'open';
      recoveryState.nextRetryTime = new Date(Date.now() + 60000).toISOString();

      const mockOperation = jest.fn().mockResolvedValue('test');

      await expect(recoveryService.getConnection()).rejects.toThrow('circuit breaker is open');
    });
  });

  describe('Force Recovery', () => {
    beforeEach(async () => {
      await recoveryService.initialize();
    });

    it('should force recovery', async () => {
      const result = await recoveryService.forceRecovery();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources', async () => {
      await recoveryService.initialize();
      await expect(recoveryService.cleanup()).resolves.not.toThrow();
    });

    it('should reject queued operations on cleanup', async () => {
      await recoveryService.initialize();
      
      // Force recovery state to queue operations
      const recoveryState = (recoveryService as any).recoveryState;
      recoveryState.isRecovering = true;

      const mockOperation = jest.fn().mockResolvedValue('test');
      const operationPromise = recoveryService.executeOperation(mockOperation);

      // Cleanup should reject queued operations
      await recoveryService.cleanup();

      await expect(operationPromise).rejects.toThrow('Service shutting down');
    });
  });
});

describe('Database Connection Wrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await DatabaseConnection.disconnect();
  });

  describe('Initialization', () => {
    it('should initialize database connection', async () => {
      await expect(DatabaseConnection.initialize()).resolves.not.toThrow();
    });
  });

  describe('Connection Management', () => {
    beforeEach(async () => {
      await DatabaseConnection.initialize();
    });

    it('should get database instance', async () => {
      const instance = await DatabaseConnection.getInstance();
      expect(instance).toBeDefined();
    });

    it('should execute operations', async () => {
      const mockOperation = jest.fn().mockResolvedValue('operation result');
      
      const result = await DatabaseConnection.executeOperation(mockOperation);
      
      expect(result).toBe('operation result');
      expect(mockOperation).toHaveBeenCalled();
    });

    it('should execute transactions', async () => {
      const mockTransaction = jest.fn().mockResolvedValue('transaction result');
      
      const result = await DatabaseConnection.executeTransaction(mockTransaction);
      
      expect(result).toBe('transaction result');
    });

    it('should check health', async () => {
      const isHealthy = await DatabaseConnection.isHealthy();
      expect(typeof isHealthy).toBe('boolean');
    });

    it('should get health metrics', () => {
      const metrics = DatabaseConnection.getHealthMetrics();
      expect(metrics).toBeDefined();
    });

    it('should force recovery', async () => {
      const result = await DatabaseConnection.forceRecovery();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Legacy Compatibility', () => {
    beforeEach(async () => {
      await DatabaseConnection.initialize();
    });

    it('should support ensureConnection method', async () => {
      const connection = await DatabaseConnection.ensureConnection();
      expect(connection).toBeDefined();
    });
  });

  describe('Cleanup', () => {
    it('should disconnect cleanly', async () => {
      await DatabaseConnection.initialize();
      await expect(DatabaseConnection.disconnect()).resolves.not.toThrow();
    });
  });
});