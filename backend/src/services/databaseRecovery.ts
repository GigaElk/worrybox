import { PrismaClient } from '@prisma/client';
import { 
  DatabaseConnectionConfig, 
  DatabaseRecoveryState, 
  QueuedOperation, 
  DatabaseHealthMetrics,
  DatabaseError,
  CircuitBreakerConfig,
  RetryConfig,
  DatabaseOperationContext
} from '../types/database';
import { CorrelationService } from './correlationService';
import { PlatformAdapterService } from './platformAdapter';
import logger from './logger';

export class DatabaseRecoveryService {
  private static instance: DatabaseRecoveryService;
  private prismaClient: PrismaClient | null = null;
  private config: DatabaseConnectionConfig;
  private recoveryState: DatabaseRecoveryState;
  private operationQueue: QueuedOperation[] = [];
  private recentErrors: DatabaseError[] = [];
  private correlationService: CorrelationService;
  private platformAdapter: PlatformAdapterService;
  private healthCheckInterval?: NodeJS.Timeout;
  private isInitialized = false;

  // Circuit breaker state
  private circuitBreakerConfig: CircuitBreakerConfig;
  private lastCircuitBreakerCheck = Date.now();

  // Performance tracking
  private queryTimes: number[] = [];
  private slowQueryThreshold = 2000; // 2 seconds
  private slowQueryCount = 0;
  private totalQueries = 0;

  private constructor() {
    this.correlationService = CorrelationService.getInstance();
    this.platformAdapter = PlatformAdapterService.getInstance();
    this.config = this.getOptimalConfig();
    this.circuitBreakerConfig = this.getCircuitBreakerConfig();
    this.recoveryState = this.initializeRecoveryState();
  }

  public static getInstance(): DatabaseRecoveryService {
    if (!DatabaseRecoveryService.instance) {
      DatabaseRecoveryService.instance = new DatabaseRecoveryService();
    }
    return DatabaseRecoveryService.instance;
  }

  /**
   * Initialize the database recovery service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    logger.info('Initializing database recovery service', {
      config: this.config,
      platform: this.platformAdapter.getPlatform(),
    });

    try {
      // Create initial connection
      await this.createConnection();
      
      // Start health monitoring
      this.startHealthMonitoring();
      
      // Process any queued operations
      this.processQueue();
      
      this.isInitialized = true;
      logger.info('Database recovery service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database recovery service', error);
      throw error;
    }
  }

  /**
   * Get database connection with automatic recovery
   */
  async getConnection(): Promise<PrismaClient> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Check circuit breaker
    if (this.recoveryState.circuitBreakerState === 'open') {
      if (Date.now() < new Date(this.recoveryState.nextRetryTime || 0).getTime()) {
        throw new Error('Database circuit breaker is open - connection unavailable');
      } else {
        // Transition to half-open
        this.recoveryState.circuitBreakerState = 'half-open';
        logger.info('Circuit breaker transitioning to half-open state');
      }
    }

    // Ensure connection is healthy
    if (!this.prismaClient || !(await this.testConnection())) {
      await this.recoverConnection();
    }

    if (!this.prismaClient) {
      throw new Error('Database connection unavailable');
    }

    return this.prismaClient;
  }

  /**
   * Execute database operation with automatic retry and queuing
   */
  async executeOperation<T>(
    operation: () => Promise<T>,
    context?: Partial<DatabaseOperationContext>
  ): Promise<T> {
    const operationContext: DatabaseOperationContext = {
      correlationId: context?.correlationId || this.correlationService.generateSystemCorrelationId('db'),
      operationType: context?.operationType || 'query',
      startTime: Date.now(),
      timeout: context?.timeout || this.config.queryTimeout,
      retryCount: context?.retryCount || 0,
      isQueued: false,
    };

    const startTime = Date.now();

    try {
      // Check if we should queue the operation
      if (this.shouldQueueOperation()) {
        return await this.queueOperation(operation, operationContext);
      }

      // Execute the operation
      const connection = await this.getConnection();
      const result = await this.executeWithTimeout(operation, operationContext.timeout);
      
      // Track performance
      const duration = Date.now() - startTime;
      this.trackQueryPerformance(duration, operationContext);
      
      // Update circuit breaker on success
      this.onOperationSuccess();
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Log the error
      this.recordError(error as Error, operationContext);
      
      // Handle failure
      await this.onOperationFailure(error as Error, operationContext);
      
      // Retry if appropriate
      if (this.shouldRetry(error as Error, operationContext)) {
        logger.warn('Retrying database operation', {
          correlationId: operationContext.correlationId,
          retryCount: operationContext.retryCount + 1,
          error: (error as Error).message,
        });
        
        await this.sleep(this.calculateRetryDelay(operationContext.retryCount));
        
        return this.executeOperation(operation, {
          ...operationContext,
          retryCount: operationContext.retryCount + 1,
        });
      }
      
      throw error;
    }
  }

  /**
   * Get database health metrics
   */
  getHealthMetrics(): DatabaseHealthMetrics {
    const connectionStatus = this.prismaClient ? 'connected' : 
                           this.recoveryState.isRecovering ? 'recovering' : 'disconnected';

    const averageQueryTime = this.queryTimes.length > 0 
      ? this.queryTimes.reduce((a, b) => a + b, 0) / this.queryTimes.length 
      : 0;

    const errorRate = this.totalQueries > 0 
      ? (this.recentErrors.length / this.totalQueries) * 100 
      : 0;

    const throughput = this.calculateThroughput();

    return {
      connectionStatus,
      poolMetrics: {
        activeConnections: this.prismaClient ? 1 : 0,
        idleConnections: 0,
        totalConnections: this.prismaClient ? 1 : 0,
        maxConnections: this.config.maxConnections,
        queuedRequests: this.operationQueue.length,
        averageQueryTime: Math.round(averageQueryTime),
        slowQueries: this.slowQueryCount,
        connectionErrors: this.recoveryState.failureCount,
        lastConnectionTime: this.recoveryState.lastSuccessfulConnection || new Date().toISOString(),
        poolHealth: this.determinePoolHealth(),
      },
      recoveryState: { ...this.recoveryState },
      recentErrors: [...this.recentErrors],
      performanceMetrics: {
        averageQueryTime: Math.round(averageQueryTime),
        slowQueryCount: this.slowQueryCount,
        errorRate: Math.round(errorRate * 100) / 100,
        throughput: Math.round(throughput * 100) / 100,
      },
    };
  }

  /**
   * Force connection recovery
   */
  async forceRecovery(): Promise<boolean> {
    logger.info('Forcing database connection recovery');
    
    try {
      await this.recoverConnection();
      return true;
    } catch (error) {
      logger.error('Forced recovery failed', error);
      return false;
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    logger.info('Cleaning up database recovery service');
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    // Process remaining queued operations with error
    this.operationQueue.forEach(op => {
      op.reject(new Error('Service shutting down'));
    });
    this.operationQueue = [];
    
    if (this.prismaClient) {
      await this.prismaClient.$disconnect();
      this.prismaClient = null;
    }
    
    this.isInitialized = false;
  }

  // Private methods

  private getOptimalConfig(): DatabaseConnectionConfig {
    const platformConfig = this.platformAdapter.getConfig();
    
    return {
      maxRetries: 3,
      baseRetryDelay: 1000, // 1 second
      maxRetryDelay: 16000, // 16 seconds
      connectionTimeout: 10000, // 10 seconds
      queryTimeout: 30000, // 30 seconds
      maxConnections: platformConfig.maxConnections || 5,
      idleTimeout: 300000, // 5 minutes
      healthCheckInterval: 60000, // 1 minute
      enableConnectionPooling: true,
      enableQueryQueue: true,
      enableCircuitBreaker: true,
    };
  }

  private getCircuitBreakerConfig(): CircuitBreakerConfig {
    return {
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minute
      halfOpenMaxCalls: 3,
      monitoringPeriod: 300000, // 5 minutes
    };
  }

  private initializeRecoveryState(): DatabaseRecoveryState {
    return {
      isRecovering: false,
      lastFailure: null,
      failureCount: 0,
      consecutiveFailures: 0,
      lastSuccessfulConnection: null,
      recoveryAttempts: 0,
      circuitBreakerState: 'closed',
      nextRetryTime: null,
    };
  }

  private async createConnection(): Promise<void> {
    logger.info('Creating database connection');
    
    try {
      this.prismaClient = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
        datasources: {
          db: {
            url: process.env.DATABASE_URL,
          },
        },
      });

      // Test the connection
      await this.testConnection();
      
      this.recoveryState.lastSuccessfulConnection = new Date().toISOString();
      this.recoveryState.consecutiveFailures = 0;
      this.recoveryState.isRecovering = false;
      
      logger.info('Database connection created successfully');
    } catch (error) {
      logger.error('Failed to create database connection', error);
      throw error;
    }
  }

  private async testConnection(): Promise<boolean> {
    if (!this.prismaClient) {
      return false;
    }

    try {
      await this.prismaClient.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.debug('Database connection test failed', error);
      return false;
    }
  }

  private async recoverConnection(): Promise<void> {
    if (this.recoveryState.isRecovering) {
      logger.debug('Recovery already in progress');
      return;
    }

    this.recoveryState.isRecovering = true;
    this.recoveryState.recoveryAttempts++;
    
    logger.info('Starting database connection recovery', {
      attempt: this.recoveryState.recoveryAttempts,
      consecutiveFailures: this.recoveryState.consecutiveFailures,
    });

    try {
      // Disconnect existing connection
      if (this.prismaClient) {
        await this.prismaClient.$disconnect();
        this.prismaClient = null;
      }

      // Wait before retry with exponential backoff
      const delay = this.calculateRetryDelay(this.recoveryState.recoveryAttempts - 1);
      await this.sleep(delay);

      // Create new connection
      await this.createConnection();
      
      // Reset failure counters on success
      this.recoveryState.failureCount = 0;
      this.recoveryState.consecutiveFailures = 0;
      this.recoveryState.circuitBreakerState = 'closed';
      
      logger.info('Database connection recovery successful');
    } catch (error) {
      this.recoveryState.consecutiveFailures++;
      this.recoveryState.failureCount++;
      this.recoveryState.lastFailure = new Date().toISOString();
      
      // Update circuit breaker
      if (this.recoveryState.consecutiveFailures >= this.circuitBreakerConfig.failureThreshold) {
        this.recoveryState.circuitBreakerState = 'open';
        this.recoveryState.nextRetryTime = new Date(
          Date.now() + this.circuitBreakerConfig.recoveryTimeout
        ).toISOString();
        
        logger.error('Circuit breaker opened due to consecutive failures', {
          consecutiveFailures: this.recoveryState.consecutiveFailures,
          nextRetryTime: this.recoveryState.nextRetryTime,
        });
      }
      
      logger.error('Database connection recovery failed', error);
      throw error;
    } finally {
      this.recoveryState.isRecovering = false;
    }
  }

  private shouldQueueOperation(): boolean {
    return this.config.enableQueryQueue && (
      this.recoveryState.isRecovering ||
      this.recoveryState.circuitBreakerState === 'open' ||
      this.operationQueue.length > 0
    );
  }

  private async queueOperation<T>(
    operation: () => Promise<T>,
    context: DatabaseOperationContext
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const queuedOp: QueuedOperation = {
        id: context.correlationId,
        operation,
        resolve,
        reject,
        timestamp: Date.now(),
        timeout: context.timeout,
        retryCount: 0,
        maxRetries: this.config.maxRetries,
        correlationId: context.correlationId,
      };

      this.operationQueue.push(queuedOp);
      
      logger.debug('Operation queued', {
        correlationId: context.correlationId,
        queueLength: this.operationQueue.length,
      });

      // Set timeout for queued operation
      setTimeout(() => {
        const index = this.operationQueue.findIndex(op => op.id === queuedOp.id);
        if (index !== -1) {
          this.operationQueue.splice(index, 1);
          reject(new Error('Queued operation timeout'));
        }
      }, context.timeout);
    });
  }

  private async processQueue(): Promise<void> {
    if (this.operationQueue.length === 0 || this.recoveryState.isRecovering) {
      return;
    }

    const operation = this.operationQueue.shift();
    if (!operation) {
      return;
    }

    try {
      const result = await operation.operation();
      operation.resolve(result);
    } catch (error) {
      if (operation.retryCount < operation.maxRetries) {
        operation.retryCount++;
        this.operationQueue.unshift(operation); // Put back at front
      } else {
        operation.reject(error);
      }
    }

    // Process next operation
    setImmediate(() => this.processQueue());
  }

  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Operation timeout')), timeout);
      }),
    ]);
  }

  private shouldRetry(error: Error, context: DatabaseOperationContext): boolean {
    if (context.retryCount >= this.config.maxRetries) {
      return false;
    }

    // Don't retry certain types of errors
    const nonRetryableErrors = ['UNIQUE_CONSTRAINT', 'FOREIGN_KEY_CONSTRAINT'];
    if (nonRetryableErrors.some(code => error.message.includes(code))) {
      return false;
    }

    return true;
  }

  private calculateRetryDelay(retryCount: number): number {
    const baseDelay = this.config.baseRetryDelay;
    const maxDelay = this.config.maxRetryDelay;
    
    // Exponential backoff with jitter
    const exponentialDelay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
    const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
    
    return Math.floor(exponentialDelay + jitter);
  }

  private trackQueryPerformance(duration: number, context: DatabaseOperationContext): void {
    this.totalQueries++;
    this.queryTimes.push(duration);
    
    // Keep only last 100 query times
    if (this.queryTimes.length > 100) {
      this.queryTimes.shift();
    }

    // Track slow queries
    if (duration > this.slowQueryThreshold) {
      this.slowQueryCount++;
      
      logger.warn('Slow database query detected', {
        correlationId: context.correlationId,
        duration,
        operationType: context.operationType,
      });
    }
  }

  private recordError(error: Error, context: DatabaseOperationContext): void {
    const dbError: DatabaseError = {
      timestamp: new Date().toISOString(),
      error: error.message,
      code: (error as any).code,
      correlationId: context.correlationId,
    };

    this.recentErrors.push(dbError);
    
    // Keep only last 50 errors
    if (this.recentErrors.length > 50) {
      this.recentErrors.shift();
    }
  }

  private onOperationSuccess(): void {
    if (this.recoveryState.circuitBreakerState === 'half-open') {
      this.recoveryState.circuitBreakerState = 'closed';
      logger.info('Circuit breaker closed after successful operation');
    }
  }

  private async onOperationFailure(error: Error, context: DatabaseOperationContext): Promise<void> {
    this.recoveryState.failureCount++;
    
    // Check if we need to trigger recovery
    if (error.message.includes('connection') || error.message.includes('timeout')) {
      logger.warn('Database connection issue detected, triggering recovery', {
        correlationId: context.correlationId,
        error: error.message,
      });
      
      // Don't await recovery to avoid blocking
      this.recoverConnection().catch(recoveryError => {
        logger.error('Recovery failed after operation failure', recoveryError);
      });
    }
  }

  private calculateThroughput(): number {
    // Calculate queries per second over the last minute
    const oneMinuteAgo = Date.now() - 60000;
    const recentQueries = this.queryTimes.length; // Simplified calculation
    return recentQueries / 60; // queries per second
  }

  private determinePoolHealth(): 'healthy' | 'degraded' | 'unhealthy' {
    if (this.recoveryState.circuitBreakerState === 'open') {
      return 'unhealthy';
    }
    
    if (this.recoveryState.consecutiveFailures > 0 || this.operationQueue.length > 10) {
      return 'degraded';
    }
    
    return 'healthy';
  }

  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        const isHealthy = await this.testConnection();
        
        if (!isHealthy && !this.recoveryState.isRecovering) {
          logger.warn('Health check failed, triggering recovery');
          this.recoverConnection().catch(error => {
            logger.error('Health check recovery failed', error);
          });
        }
        
        // Process queued operations
        this.processQueue();
        
      } catch (error) {
        logger.error('Health monitoring error', error);
      }
    }, this.config.healthCheckInterval);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}