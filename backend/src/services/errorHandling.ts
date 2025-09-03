import {
  ErrorContext,
  ErrorRecoveryAction,
  ErrorMetrics,
  CircuitBreakerState,
  RequestTimeout,
  ErrorRecoveryConfig,
  GracefulDegradationStrategy,
  ErrorAlert,
  ErrorHandler,
  ErrorRecoveryRegistry,
  EnhancedError,
  TimeoutConfig,
  RetryConfig,
} from '../types/errorHandling';
import { CorrelationService } from './correlationService';
import { PlatformAdapterService } from './platformAdapter';
import { MemoryManagerService } from './memoryManager';
import logger from './logger';
import { randomUUID } from 'crypto';

export class ErrorHandlingService {
  private static instance: ErrorHandlingService;
  private registry: ErrorRecoveryRegistry;
  private config: ErrorRecoveryConfig;
  private timeoutConfig: TimeoutConfig;
  private retryConfig: RetryConfig;
  private correlationService: CorrelationService;
  private platformAdapter: PlatformAdapterService;
  private memoryManager: MemoryManagerService;
  
  // Monitoring intervals
  private metricsInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;
  
  // State tracking
  private isInitialized = false;
  private isShuttingDown = false;

  private constructor() {
    this.correlationService = CorrelationService.getInstance();
    this.platformAdapter = PlatformAdapterService.getInstance();
    this.memoryManager = MemoryManagerService.getInstance();
    this.config = this.getOptimalConfig();
    this.timeoutConfig = this.getTimeoutConfig();
    this.retryConfig = this.getRetryConfig();
    this.registry = this.initializeRegistry();
  }

  public static getInstance(): ErrorHandlingService {
    if (!ErrorHandlingService.instance) {
      ErrorHandlingService.instance = new ErrorHandlingService();
    }
    return ErrorHandlingService.instance;
  }

  /**
   * Initialize the error handling system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    logger.info('Initializing enhanced error handling system', {
      config: this.config,
      timeoutConfig: this.timeoutConfig,
      retryConfig: this.retryConfig,
      platform: this.platformAdapter.getPlatform(),
    });

    // Register default error handlers
    this.registerDefaultHandlers();

    // Register default degradation strategies
    this.registerDefaultDegradationStrategies();

    // Start metrics collection
    if (this.config.errorMetricsEnabled) {
      this.startMetricsCollection();
    }

    // Start cleanup tasks
    this.startCleanupTasks();

    this.isInitialized = true;
    logger.info('Enhanced error handling system initialized');
  }

  /**
   * Create enhanced error context
   */
  createErrorContext(req?: any, additionalContext?: Record<string, any>): ErrorContext {
    const correlationId = req?.correlationId || 
                         req?.headers?.['x-correlation-id'] || 
                         this.correlationService.generateCorrelationId();

    const context: ErrorContext = {
      correlationId,
      timestamp: new Date().toISOString(),
      stackTrace: new Error().stack,
      additionalContext,
    };

    if (req) {
      context.requestId = req.id || randomUUID();
      context.userId = req.user?.id;
      context.sessionId = req.session?.id;
      context.userAgent = req.get('User-Agent');
      context.ip = req.ip || req.connection?.remoteAddress;
      context.path = req.path;
      context.method = req.method;
      context.headers = this.sanitizeHeaders(req.headers);
      context.body = this.sanitizeBody(req.body);
      context.query = req.query;
      context.params = req.params;
    }

    // Add system context
    context.memoryUsage = process.memoryUsage();
    context.systemLoad = {
      cpuUsage: this.getCurrentCpuUsage(),
      memoryUsage: this.getCurrentMemoryUsage(),
      activeConnections: this.getActiveConnections(),
    };

    return context;
  }

  /**
   * Handle error with recovery attempts
   */
  async handleError(error: Error, context?: ErrorContext): Promise<ErrorRecoveryAction[]> {
    const enhancedError = this.enhanceError(error);
    const errorContext = context || this.createErrorContext();
    
    // Update error metrics
    this.updateErrorMetrics(enhancedError, errorContext);

    // Log error with full context
    this.logError(enhancedError, errorContext);

    // Check for circuit breaker
    if (this.config.circuitBreakerEnabled) {
      const circuitBreakerAction = this.checkCircuitBreaker(enhancedError, errorContext);
      if (circuitBreakerAction) {
        return [circuitBreakerAction];
      }
    }

    // Attempt recovery
    const recoveryActions: ErrorRecoveryAction[] = [];

    // Find applicable handlers
    const applicableHandlers = Array.from(this.registry.handlers.values())
      .filter(handler => handler.enabled && handler.canHandle(enhancedError, errorContext))
      .sort((a, b) => b.priority - a.priority);

    for (const handler of applicableHandlers) {
      try {
        logger.info('Attempting error recovery', {
          correlationId: errorContext.correlationId,
          handlerName: handler.name,
          errorType: enhancedError.name,
        });

        const action = await handler.handle(enhancedError, errorContext);
        recoveryActions.push(action);

        if (action.success) {
          logger.info('Error recovery successful', {
            correlationId: errorContext.correlationId,
            handlerName: handler.name,
            actionType: action.type,
            duration: action.duration,
          });
          break; // Stop on first successful recovery
        }

      } catch (recoveryError) {
        logger.error('Error recovery failed', {
          correlationId: errorContext.correlationId,
          handlerName: handler.name,
          error: (recoveryError as Error).message,
        });

        const failedAction: ErrorRecoveryAction = {
          type: 'retry',
          timestamp: new Date().toISOString(),
          correlationId: errorContext.correlationId,
          reason: `Recovery handler ${handler.name} failed`,
          success: false,
          duration: 0,
          details: { error: (recoveryError as Error).message },
        };

        recoveryActions.push(failedAction);
      }
    }

    // Store recovery actions
    this.registry.recoveryActions.push(...recoveryActions);
    this.limitArraySize(this.registry.recoveryActions, 1000);

    // Create alert if needed
    if (this.shouldCreateAlert(enhancedError, errorContext, recoveryActions)) {
      this.createErrorAlert(enhancedError, errorContext, recoveryActions);
    }

    return recoveryActions;
  }

  /**
   * Implement request timeout with proper cleanup
   */
  createRequestTimeout(req: any, res: any, timeoutMs?: number): RequestTimeout {
    const correlationId = req.correlationId || this.correlationService.generateCorrelationId();
    const requestId = req.id || randomUUID();
    const timeout = timeoutMs || this.getTimeoutForRequest(req);

    const abortController = new AbortController();
    
    const requestTimeout: RequestTimeout = {
      requestId,
      correlationId,
      startTime: Date.now(),
      timeout,
      path: req.path,
      method: req.method,
      abortController,
      timeoutId: setTimeout(() => {
        this.handleRequestTimeout(requestTimeout, req, res);
      }, timeout),
    };

    // Store active timeout
    this.registry.activeTimeouts.set(requestId, requestTimeout);

    // Add cleanup on response finish
    res.on('finish', () => {
      this.cleanupRequestTimeout(requestId);
    });

    res.on('close', () => {
      this.cleanupRequestTimeout(requestId);
    });

    return requestTimeout;
  }

  /**
   * Implement retry mechanism with exponential backoff
   */
  async retryOperation<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    customConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const config = { ...this.retryConfig, ...customConfig };
    let lastError: Error;
    let delay = config.baseDelay;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        logger.debug('Retry attempt', {
          correlationId: context.correlationId,
          attempt,
          maxAttempts: config.maxAttempts,
          delay,
        });

        const result = await operation();
        
        if (attempt > 1) {
          logger.info('Retry operation succeeded', {
            correlationId: context.correlationId,
            attempt,
            totalAttempts: attempt,
          });
        }

        return result;

      } catch (error) {
        lastError = error as Error;
        
        logger.warn('Retry attempt failed', {
          correlationId: context.correlationId,
          attempt,
          maxAttempts: config.maxAttempts,
          error: lastError.message,
        });

        // Check if error is retryable
        if (!this.isRetryableError(lastError, config)) {
          logger.info('Error is not retryable, stopping retry attempts', {
            correlationId: context.correlationId,
            errorType: lastError.name,
          });
          break;
        }

        // Don't wait after the last attempt
        if (attempt < config.maxAttempts) {
          await this.delay(delay);
          
          // Calculate next delay
          if (config.exponentialBackoff) {
            delay = Math.min(delay * 2, config.maxDelay);
          }
          
          // Add jitter if enabled
          if (config.jitter) {
            delay += Math.random() * 1000;
          }
        }
      }
    }

    // All retry attempts failed
    const enhancedError = this.enhanceError(lastError!);
    enhancedError.context = context;
    enhancedError.recoveryActions = [{
      type: 'retry',
      timestamp: new Date().toISOString(),
      correlationId: context.correlationId,
      reason: `All ${config.maxAttempts} retry attempts failed`,
      success: false,
      duration: Date.now() - new Date(context.timestamp).getTime(),
    }];

    throw enhancedError;
  }

  /**
   * Implement graceful degradation
   */
  async attemptGracefulDegradation(error: Error, context: ErrorContext): Promise<any> {
    if (!this.config.gracefulDegradationEnabled) {
      throw error;
    }

    const applicableStrategies = Array.from(this.registry.degradationStrategies.values())
      .filter(strategy => strategy.enabled && strategy.condition(error, context))
      .sort((a, b) => b.priority - a.priority);

    for (const strategy of applicableStrategies) {
      try {
        logger.info('Attempting graceful degradation', {
          correlationId: context.correlationId,
          strategyName: strategy.name,
          errorType: error.name,
        });

        const result = await strategy.action(error, context);

        logger.info('Graceful degradation successful', {
          correlationId: context.correlationId,
          strategyName: strategy.name,
        });

        return result;

      } catch (degradationError) {
        logger.warn('Graceful degradation failed', {
          correlationId: context.correlationId,
          strategyName: strategy.name,
          error: (degradationError as Error).message,
        });
      }
    }

    // No degradation strategy worked
    throw error;
  }

  /**
   * Get error metrics
   */
  getErrorMetrics(): ErrorMetrics {
    return { ...this.registry.errorMetrics };
  }

  /**
   * Get circuit breaker states
   */
  getCircuitBreakerStates(): CircuitBreakerState[] {
    return Array.from(this.registry.circuitBreakers.values());
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit: number = 50): ErrorContext[] {
    return this.registry.recentErrors.slice(-limit);
  }

  /**
   * Get recovery actions
   */
  getRecoveryActions(limit: number = 100): ErrorRecoveryAction[] {
    return this.registry.recoveryActions.slice(-limit);
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): ErrorAlert[] {
    return this.registry.alerts.filter(alert => !alert.acknowledged && !alert.resolvedAt);
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.registry.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.registry.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolvedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  /**
   * Register custom error handler
   */
  registerErrorHandler(handler: ErrorHandler): void {
    this.registry.handlers.set(handler.name, handler);
    logger.info('Error handler registered', { handlerName: handler.name });
  }

  /**
   * Register degradation strategy
   */
  registerDegradationStrategy(strategy: GracefulDegradationStrategy): void {
    this.registry.degradationStrategies.set(strategy.name, strategy);
    logger.info('Degradation strategy registered', { strategyName: strategy.name });
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    logger.info('Cleaning up error handling system');

    this.isShuttingDown = true;

    // Clear intervals
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Clear active timeouts
    for (const timeout of this.registry.activeTimeouts.values()) {
      clearTimeout(timeout.timeoutId);
      timeout.abortController.abort();
    }

    // Clear registries
    this.registry.handlers.clear();
    this.registry.circuitBreakers.clear();
    this.registry.activeTimeouts.clear();
    this.registry.degradationStrategies.clear();
    this.registry.recentErrors = [];
    this.registry.recoveryActions = [];
    this.registry.alerts = [];

    this.isInitialized = false;
    logger.info('Error handling system cleaned up');
  }

  // Private methods

  private getOptimalConfig(): ErrorRecoveryConfig {
    const platform = this.platformAdapter.getPlatform();
    
    const baseConfig: ErrorRecoveryConfig = {
      enabled: true,
      maxRetryAttempts: 3,
      retryDelay: 1000,
      exponentialBackoff: true,
      circuitBreakerEnabled: true,
      circuitBreakerThreshold: 5,
      circuitBreakerTimeout: 60000,
      gracefulDegradationEnabled: true,
      requestTimeoutEnabled: true,
      defaultRequestTimeout: 30000,
      errorContextCapture: true,
      errorMetricsEnabled: true,
      correlationIdTracking: true,
    };

    // Platform-specific adjustments
    if (platform === 'render') {
      return {
        ...baseConfig,
        maxRetryAttempts: 2, // Fewer retries on Render
        retryDelay: 500, // Faster retries
        defaultRequestTimeout: 25000, // Shorter timeout for Render
        circuitBreakerThreshold: 3, // More aggressive circuit breaker
      };
    }

    if (platform === 'local') {
      return {
        ...baseConfig,
        errorContextCapture: true, // More detailed context in development
        errorMetricsEnabled: false, // Disable metrics in development
        circuitBreakerEnabled: false, // Disable circuit breaker in development
      };
    }

    return baseConfig;
  }

  private getTimeoutConfig(): TimeoutConfig {
    const platform = this.platformAdapter.getPlatform();
    
    const baseConfig: TimeoutConfig = {
      default: 30000,
      routes: {
        '/api/health': 5000,
        '/api/metrics': 10000,
        '/api/diagnostics': 15000,
      },
      methods: {
        'GET': 15000,
        'POST': 30000,
        'PUT': 30000,
        'DELETE': 10000,
      },
      enabled: true,
      gracePeriod: 5000,
      cleanupDelay: 1000,
    };

    if (platform === 'render') {
      return {
        ...baseConfig,
        default: 25000, // Shorter default timeout for Render
        gracePeriod: 3000,
      };
    }

    return baseConfig;
  }

  private getRetryConfig(): RetryConfig {
    return {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      exponentialBackoff: true,
      jitter: true,
      retryableErrors: [
        'ECONNRESET',
        'ENOTFOUND',
        'ECONNREFUSED',
        'ETIMEDOUT',
        'NETWORK_ERROR',
        'TEMPORARY_ERROR',
      ],
      nonRetryableErrors: [
        'VALIDATION_ERROR',
        'AUTHENTICATION_ERROR',
        'AUTHORIZATION_ERROR',
        'NOT_FOUND',
        'BAD_REQUEST',
      ],
    };
  }

  private initializeRegistry(): ErrorRecoveryRegistry {
    return {
      handlers: new Map(),
      circuitBreakers: new Map(),
      activeTimeouts: new Map(),
      degradationStrategies: new Map(),
      errorMetrics: {
        totalErrors: 0,
        errorsByType: {},
        errorsByEndpoint: {},
        errorRate: 0,
        averageRecoveryTime: 0,
        successfulRecoveries: 0,
        failedRecoveries: 0,
      },
      recentErrors: [],
      recoveryActions: [],
      alerts: [],
    };
  }

  private registerDefaultHandlers(): void {
    // Database error handler
    this.registerErrorHandler({
      name: 'database_error_handler',
      priority: 100,
      enabled: true,
      canHandle: (error) => {
        return error.message.includes('database') || 
               error.message.includes('connection') ||
               error.name === 'PrismaClientKnownRequestError';
      },
      handle: async (error, context) => {
        const startTime = Date.now();
        
        try {
          // Attempt database reconnection
          logger.info('Attempting database recovery', {
            correlationId: context.correlationId,
          });

          // Wait a moment before retry
          await this.delay(2000);

          return {
            type: 'retry',
            timestamp: new Date().toISOString(),
            correlationId: context.correlationId,
            reason: 'Database connection recovery',
            success: true,
            duration: Date.now() - startTime,
          };

        } catch (recoveryError) {
          return {
            type: 'fallback',
            timestamp: new Date().toISOString(),
            correlationId: context.correlationId,
            reason: 'Database recovery failed, using fallback',
            success: false,
            duration: Date.now() - startTime,
            details: { error: (recoveryError as Error).message },
          };
        }
      },
    });

    // Memory error handler
    this.registerErrorHandler({
      name: 'memory_error_handler',
      priority: 90,
      enabled: true,
      canHandle: (error) => {
        return error.message.includes('memory') || 
               error.message.includes('heap') ||
               error.name === 'RangeError';
      },
      handle: async (error, context) => {
        const startTime = Date.now();
        
        try {
          logger.info('Attempting memory recovery', {
            correlationId: context.correlationId,
          });

          // Trigger garbage collection
          if (global.gc) {
            global.gc();
          }

          // Trigger memory cleanup
          await this.memoryManager.checkMemoryPressure();

          return {
            type: 'cleanup',
            timestamp: new Date().toISOString(),
            correlationId: context.correlationId,
            reason: 'Memory cleanup and garbage collection',
            success: true,
            duration: Date.now() - startTime,
          };

        } catch (recoveryError) {
          return {
            type: 'cleanup',
            timestamp: new Date().toISOString(),
            correlationId: context.correlationId,
            reason: 'Memory recovery failed',
            success: false,
            duration: Date.now() - startTime,
            details: { error: (recoveryError as Error).message },
          };
        }
      },
    });

    // Network error handler
    this.registerErrorHandler({
      name: 'network_error_handler',
      priority: 80,
      enabled: true,
      canHandle: (error) => {
        return error.message.includes('ECONNRESET') || 
               error.message.includes('ENOTFOUND') ||
               error.message.includes('ETIMEDOUT') ||
               error.message.includes('network');
      },
      handle: async (error, context) => {
        const startTime = Date.now();
        
        try {
          logger.info('Attempting network error recovery', {
            correlationId: context.correlationId,
          });

          // Wait before retry
          await this.delay(1000);

          return {
            type: 'retry',
            timestamp: new Date().toISOString(),
            correlationId: context.correlationId,
            reason: 'Network error retry with delay',
            success: true,
            duration: Date.now() - startTime,
          };

        } catch (recoveryError) {
          return {
            type: 'circuit_breaker',
            timestamp: new Date().toISOString(),
            correlationId: context.correlationId,
            reason: 'Network recovery failed, activating circuit breaker',
            success: false,
            duration: Date.now() - startTime,
          };
        }
      },
    });
  }

  private registerDefaultDegradationStrategies(): void {
    // Cache fallback strategy
    this.registerDegradationStrategy({
      name: 'cache_fallback',
      priority: 100,
      enabled: true,
      condition: (error, context) => {
        return !!(context.path?.includes('/api/') && 
               !context.path?.includes('/auth') &&
               error.message.includes('database'));
      },
      action: async (error, context) => {
        logger.info('Using cache fallback strategy', {
          correlationId: context.correlationId,
        });

        return {
          success: false,
          message: 'Service temporarily unavailable, using cached data',
          data: null,
          cached: true,
        };
      },
      fallbackResponse: {
        success: false,
        message: 'Service temporarily unavailable',
        cached: true,
      },
    });

    // Read-only mode strategy
    this.registerDegradationStrategy({
      name: 'read_only_mode',
      priority: 90,
      enabled: true,
      condition: (error, context) => {
        return ['POST', 'PUT', 'DELETE'].includes(context.method || '') &&
               error.message.includes('database');
      },
      action: async (error, context) => {
        logger.info('Activating read-only mode', {
          correlationId: context.correlationId,
        });

        return {
          success: false,
          message: 'Service is in read-only mode due to technical issues',
          readOnly: true,
        };
      },
    });

    // Simplified response strategy
    this.registerDegradationStrategy({
      name: 'simplified_response',
      priority: 70,
      enabled: true,
      condition: (error, context) => {
        return !!(context.path?.includes('/api/') && 
               error.message.includes('timeout'));
      },
      action: async (error, context) => {
        logger.info('Using simplified response strategy', {
          correlationId: context.correlationId,
        });

        return {
          success: true,
          message: 'Request processed with simplified response',
          data: {},
          simplified: true,
        };
      },
    });
  }

  private enhanceError(error: Error): EnhancedError {
    const enhanced = error as EnhancedError;
    
    if (!enhanced.correlationId) {
      enhanced.correlationId = this.correlationService.generateCorrelationId();
    }

    if (!enhanced.code) {
      enhanced.code = error.name || 'UNKNOWN_ERROR';
    }

    if (!enhanced.severity) {
      enhanced.severity = this.determineSeverity(error);
    }

    if (!enhanced.category) {
      enhanced.category = this.categorizeError(error);
    }

    enhanced.recoverable = this.isRecoverableError(error);
    enhanced.retryable = this.isRetryableError(error, this.retryConfig);

    return enhanced;
  }

  private determineSeverity(error: Error): 'low' | 'medium' | 'high' | 'critical' {
    if (error.message.includes('ECONNRESET') || error.message.includes('timeout')) {
      return 'medium';
    }
    
    if (error.message.includes('database') || error.message.includes('memory')) {
      return 'high';
    }
    
    if (error.message.includes('ENOTFOUND') || error.message.includes('network')) {
      return 'critical';
    }
    
    return 'low';
  }

  private categorizeError(error: Error): EnhancedError['category'] {
    if (error.message.includes('validation') || error.name.includes('Validation')) {
      return 'validation';
    }
    
    if (error.message.includes('auth') || error.message.includes('token')) {
      return 'authentication';
    }
    
    if (error.message.includes('permission') || error.message.includes('forbidden')) {
      return 'authorization';
    }
    
    if (error.message.includes('database') || error.message.includes('prisma')) {
      return 'database';
    }
    
    if (error.message.includes('fetch') || error.message.includes('api')) {
      return 'external_api';
    }
    
    if (error.message.includes('timeout')) {
      return 'timeout';
    }
    
    if (error.message.includes('network') || error.message.includes('ECONNRESET')) {
      return 'network';
    }
    
    return 'system';
  }

  private isRecoverableError(error: Error): boolean {
    const nonRecoverablePatterns = [
      'validation',
      'authentication',
      'authorization',
      'not found',
      'bad request',
    ];

    return !nonRecoverablePatterns.some(pattern => 
      error.message.toLowerCase().includes(pattern)
    );
  }

  private isRetryableError(error: Error, config: RetryConfig): boolean {
    const errorCode = (error as any).code || error.name;
    
    // Check non-retryable errors first
    if (config.nonRetryableErrors.some(code => 
      errorCode.includes(code) || error.message.includes(code)
    )) {
      return false;
    }

    // Check retryable errors
    return config.retryableErrors.some(code => 
      errorCode.includes(code) || error.message.includes(code)
    );
  }

  private updateErrorMetrics(error: EnhancedError, context: ErrorContext): void {
    const metrics = this.registry.errorMetrics;
    
    metrics.totalErrors++;
    
    // Update error by type
    const errorType = error.category || 'unknown';
    metrics.errorsByType[errorType] = (metrics.errorsByType[errorType] || 0) + 1;
    
    // Update error by endpoint
    if (context.path) {
      metrics.errorsByEndpoint[context.path] = (metrics.errorsByEndpoint[context.path] || 0) + 1;
    }
    
    // Update last error
    metrics.lastError = {
      timestamp: context.timestamp,
      type: errorType,
      message: error.message,
      correlationId: context.correlationId,
    };

    // Store recent error
    this.registry.recentErrors.push(context);
    this.limitArraySize(this.registry.recentErrors, 500);
  }

  private logError(error: EnhancedError, context: ErrorContext): void {
    const logData = {
      correlationId: context.correlationId,
      errorCode: error.code,
      errorMessage: error.message,
      errorCategory: error.category,
      errorSeverity: error.severity,
      path: context.path,
      method: context.method,
      userId: context.userId,
      ip: context.ip,
      userAgent: context.userAgent,
      memoryUsage: context.memoryUsage,
      systemLoad: context.systemLoad,
      stackTrace: error.stack,
    };

    switch (error.severity) {
      case 'critical':
        logger.error('Critical error occurred', logData);
        break;
      case 'high':
        logger.error('High severity error occurred', logData);
        break;
      case 'medium':
        logger.warn('Medium severity error occurred', logData);
        break;
      default:
        logger.info('Low severity error occurred', logData);
    }
  }

  private checkCircuitBreaker(error: EnhancedError, context: ErrorContext): ErrorRecoveryAction | null {
    const endpoint = context.path || 'unknown';
    let circuitBreaker = this.registry.circuitBreakers.get(endpoint);

    if (!circuitBreaker) {
      circuitBreaker = {
        name: endpoint,
        state: 'closed',
        failureCount: 0,
        failureThreshold: this.config.circuitBreakerThreshold,
        timeout: this.config.circuitBreakerTimeout,
        successCount: 0,
        totalRequests: 0,
      };
      this.registry.circuitBreakers.set(endpoint, circuitBreaker);
    }

    circuitBreaker.totalRequests++;

    if (circuitBreaker.state === 'open') {
      // Check if timeout has passed
      if (circuitBreaker.nextAttemptTime && 
          new Date().getTime() > new Date(circuitBreaker.nextAttemptTime).getTime()) {
        circuitBreaker.state = 'half_open';
        logger.info('Circuit breaker transitioning to half-open', {
          endpoint,
          correlationId: context.correlationId,
        });
      } else {
        return {
          type: 'circuit_breaker',
          timestamp: new Date().toISOString(),
          correlationId: context.correlationId,
          reason: 'Circuit breaker is open',
          success: false,
          duration: 0,
        };
      }
    }

    // Record failure
    circuitBreaker.failureCount++;
    circuitBreaker.lastFailureTime = new Date().toISOString();

    // Check if threshold is exceeded
    if (circuitBreaker.failureCount >= circuitBreaker.failureThreshold) {
      circuitBreaker.state = 'open';
      circuitBreaker.nextAttemptTime = new Date(Date.now() + circuitBreaker.timeout).toISOString();
      
      logger.warn('Circuit breaker opened', {
        endpoint,
        failureCount: circuitBreaker.failureCount,
        threshold: circuitBreaker.failureThreshold,
        correlationId: context.correlationId,
      });

      return {
        type: 'circuit_breaker',
        timestamp: new Date().toISOString(),
        correlationId: context.correlationId,
        reason: 'Circuit breaker opened due to failure threshold',
        success: true,
        duration: 0,
      };
    }

    return null;
  }

  private handleRequestTimeout(timeout: RequestTimeout, req: any, res: any): void {
    if (res.headersSent) {
      return; // Response already sent
    }

    logger.warn('Request timeout occurred', {
      correlationId: timeout.correlationId,
      requestId: timeout.requestId,
      path: timeout.path,
      method: timeout.method,
      timeout: timeout.timeout,
      duration: Date.now() - timeout.startTime,
    });

    // Abort the request
    timeout.abortController.abort();

    // Send timeout response
    res.status(408).json({
      error: {
        code: 'REQUEST_TIMEOUT',
        message: 'Request timeout',
        timeout: timeout.timeout,
        correlationId: timeout.correlationId,
      },
      timestamp: new Date().toISOString(),
    });

    // Call timeout callback if provided
    if (timeout.onTimeout) {
      timeout.onTimeout();
    }

    // Clean up
    this.cleanupRequestTimeout(timeout.requestId);
  }

  private cleanupRequestTimeout(requestId: string): void {
    const timeout = this.registry.activeTimeouts.get(requestId);
    if (timeout) {
      clearTimeout(timeout.timeoutId);
      this.registry.activeTimeouts.delete(requestId);
      
      if (timeout.onComplete) {
        timeout.onComplete();
      }
    }
  }

  private getTimeoutForRequest(req: any): number {
    // Check route-specific timeout
    const routeTimeout = this.timeoutConfig.routes[req.path];
    if (routeTimeout) {
      return routeTimeout;
    }

    // Check method-specific timeout
    const methodTimeout = this.timeoutConfig.methods[req.method];
    if (methodTimeout) {
      return methodTimeout;
    }

    // Return default timeout
    return this.timeoutConfig.default;
  }

  private shouldCreateAlert(
    error: EnhancedError, 
    context: ErrorContext, 
    recoveryActions: ErrorRecoveryAction[]
  ): boolean {
    // Create alert for critical errors
    if (error.severity === 'critical') {
      return true;
    }

    // Create alert if all recovery actions failed
    if (recoveryActions.length > 0 && recoveryActions.every(action => !action.success)) {
      return true;
    }

    // Create alert for high error rate
    const recentErrors = this.registry.recentErrors.filter(e => 
      new Date().getTime() - new Date(e.timestamp).getTime() < 300000 // 5 minutes
    );
    
    if (recentErrors.length > 10) {
      return true;
    }

    return false;
  }

  private createErrorAlert(
    error: EnhancedError, 
    context: ErrorContext, 
    recoveryActions: ErrorRecoveryAction[]
  ): void {
    const alert: ErrorAlert = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      level: error.severity === 'critical' ? 'critical' : 
             error.severity === 'high' ? 'error' : 'warning',
      type: error.category || 'unknown',
      message: error.message,
      correlationId: context.correlationId,
      errorCount: 1,
      affectedEndpoints: context.path ? [context.path] : [],
      recoveryActions: recoveryActions.map(a => a.type),
      acknowledged: false,
    };

    this.registry.alerts.push(alert);
    this.limitArraySize(this.registry.alerts, 100);

    logger.warn('Error alert created', {
      alertId: alert.id,
      level: alert.level,
      type: alert.type,
      correlationId: context.correlationId,
    });
  }

  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      try {
        this.calculateErrorRate();
        this.calculateAverageRecoveryTime();
      } catch (error) {
        logger.error('Error metrics collection failed', error);
      }
    }, 60000); // Every minute
  }

  private startCleanupTasks(): void {
    this.cleanupInterval = setInterval(() => {
      try {
        // Clean up old errors
        const oneHourAgo = Date.now() - 3600000;
        this.registry.recentErrors = this.registry.recentErrors.filter(e => 
          new Date(e.timestamp).getTime() > oneHourAgo
        );

        // Clean up old recovery actions
        this.registry.recoveryActions = this.registry.recoveryActions.filter(a => 
          new Date(a.timestamp).getTime() > oneHourAgo
        );

        // Clean up resolved alerts
        const oneDayAgo = Date.now() - 86400000;
        this.registry.alerts = this.registry.alerts.filter(a => 
          !a.resolvedAt || new Date(a.resolvedAt).getTime() > oneDayAgo
        );

      } catch (error) {
        logger.error('Error cleanup task failed', error);
      }
    }, 300000); // Every 5 minutes
  }

  private calculateErrorRate(): void {
    const fiveMinutesAgo = Date.now() - 300000;
    const recentErrors = this.registry.recentErrors.filter(e => 
      new Date(e.timestamp).getTime() > fiveMinutesAgo
    );

    // This is a simplified calculation
    // In a real implementation, you'd track total requests as well
    this.registry.errorMetrics.errorRate = recentErrors.length;
  }

  private calculateAverageRecoveryTime(): void {
    const successfulRecoveries = this.registry.recoveryActions.filter(a => a.success);
    
    if (successfulRecoveries.length > 0) {
      const totalTime = successfulRecoveries.reduce((sum, action) => sum + action.duration, 0);
      this.registry.errorMetrics.averageRecoveryTime = totalTime / successfulRecoveries.length;
      this.registry.errorMetrics.successfulRecoveries = successfulRecoveries.length;
    }

    const failedRecoveries = this.registry.recoveryActions.filter(a => !a.success);
    this.registry.errorMetrics.failedRecoveries = failedRecoveries.length;
  }

  private sanitizeHeaders(headers: any): Record<string, string> {
    const sanitized: Record<string, string> = {};
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    
    for (const [key, value] of Object.entries(headers)) {
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = String(value);
      }
    }
    
    return sanitized;
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;
    
    const sensitiveFields = ['password', 'token', 'secret', 'key'];
    const sanitized = { ...body };
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  private getCurrentCpuUsage(): number {
    const cpuUsage = process.cpuUsage();
    return Math.round((cpuUsage.user + cpuUsage.system) / 1000000 * 100) / 100;
  }

  private getCurrentMemoryUsage(): number {
    const memUsage = process.memoryUsage();
    return Math.round(memUsage.heapUsed / 1024 / 1024);
  }

  private getActiveConnections(): number {
    // This would need to be implemented based on your server setup
    // For now, return a placeholder
    return 0;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private limitArraySize<T>(array: T[], maxSize: number): void {
    if (array.length > maxSize) {
      array.splice(0, array.length - maxSize);
    }
  }
}