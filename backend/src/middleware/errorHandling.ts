import { Request, Response, NextFunction } from 'express';
import { ErrorHandlingService } from '../services/errorHandling';
import { CorrelationService } from '../services/correlationService';
import { EnhancedError, ErrorContext } from '../types/errorHandling';
import logger from '../services/logger';

export interface RequestWithErrorHandling extends Request {
  errorContext?: ErrorContext;
  timeout?: any;
  correlationId?: string;
}

export class ErrorHandlingMiddleware {
  private errorHandling: ErrorHandlingService;
  private correlationService: CorrelationService;

  constructor() {
    this.errorHandling = ErrorHandlingService.getInstance();
    this.correlationService = CorrelationService.getInstance();
  }

  /**
   * Middleware to inject correlation ID and error context
   */
  injectErrorContext() {
    return (req: RequestWithErrorHandling, res: Response, next: NextFunction) => {
      try {
        // Generate or extract correlation ID
        const correlationId = req.headers['x-correlation-id'] as string || 
                             this.correlationService.generateCorrelationId();
        
        req.correlationId = correlationId;
        res.setHeader('X-Correlation-ID', correlationId);

        // Create error context
        req.errorContext = this.errorHandling.createErrorContext(req);

        // Add correlation ID to logger context
        logger.defaultMeta = { ...logger.defaultMeta, correlationId };

      } catch (error) {
        logger.error('Error context injection failed', error);
      }

      next();
    };
  }

  /**
   * Middleware to implement request timeouts
   */
  implementRequestTimeout() {
    return (req: RequestWithErrorHandling, res: Response, next: NextFunction) => {
      try {
        // Create request timeout
        req.timeout = this.errorHandling.createRequestTimeout(req, res);

        // Add abort signal to request for cancellation support
        (req as any).abortSignal = req.timeout.abortController.signal;

      } catch (error) {
        logger.error('Request timeout setup failed', error);
      }

      next();
    };
  }

  /**
   * Middleware to track request performance and errors
   */
  trackRequestMetrics() {
    return (req: RequestWithErrorHandling, res: Response, next: NextFunction) => {
      const startTime = Date.now();

      // Override res.end to capture completion metrics
      const originalEnd = res.end.bind(res);
      res.end = function(this: Response, ...args: any[]): any {
        try {
          const duration = Date.now() - startTime;
          const correlationId = req.correlationId || 'unknown';

          // Log request completion
          logger.info('Request completed', {
            correlationId,
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration,
            userAgent: req.get('User-Agent'),
            ip: req.ip,
          });

          // Log slow requests
          if (duration > 5000) {
            logger.warn('Slow request detected', {
              correlationId,
              method: req.method,
              path: req.path,
              duration,
              statusCode: res.statusCode,
            });
          }

        } catch (error) {
          logger.error('Request metrics tracking failed', {
            correlationId: req.correlationId,
            error: (error as Error).message,
          });
        }

        return originalEnd(...args);
      } as any;

      next();
    };
  }

  /**
   * Global error handler middleware
   */
  globalErrorHandler() {
    return async (error: Error, req: RequestWithErrorHandling, res: Response, next: NextFunction) => {
      try {
        const correlationId = req.correlationId || 'unknown';
        const errorContext = req.errorContext || this.errorHandling.createErrorContext(req);

        logger.error('Global error handler triggered', {
          correlationId,
          error: error.message,
          stack: error.stack,
          path: req.path,
          method: req.method,
        });

        // Attempt error recovery
        const recoveryActions = await this.errorHandling.handleError(error, errorContext);

        // Check if recovery was successful
        const successfulRecovery = recoveryActions.some(action => action.success);

        if (successfulRecovery) {
          logger.info('Error recovery successful', {
            correlationId,
            recoveryActions: recoveryActions.map(a => a.type),
          });

          // If recovery was successful, try graceful degradation
          try {
            const degradedResponse = await this.errorHandling.attemptGracefulDegradation(error, errorContext);
            
            return res.status(200).json({
              success: true,
              message: 'Request processed with degraded functionality',
              data: degradedResponse,
              degraded: true,
              correlationId,
              recoveryActions: recoveryActions.map(a => a.type),
            });

          } catch (degradationError) {
            // Degradation failed, continue to error response
          }
        }

        // Send error response
        const enhancedError = error as EnhancedError;
        const statusCode = enhancedError.statusCode || this.getStatusCodeFromError(error);

        const errorResponse = {
          error: {
            code: enhancedError.code || error.name || 'INTERNAL_ERROR',
            message: this.getSafeErrorMessage(error),
            correlationId,
            timestamp: new Date().toISOString(),
            recoverable: enhancedError.recoverable,
            retryable: enhancedError.retryable,
          },
          recoveryActions: recoveryActions.map(action => ({
            type: action.type,
            success: action.success,
            reason: action.reason,
          })),
        };

        // Add additional context in development
        if (process.env.NODE_ENV === 'development') {
          (errorResponse as any).debug = {
            stack: error.stack,
            context: errorContext,
          };
        }

        res.status(statusCode).json(errorResponse);

      } catch (handlerError) {
        logger.error('Global error handler failed', {
          correlationId: req.correlationId,
          originalError: error.message,
          handlerError: (handlerError as Error).message,
        });

        // Fallback error response
        res.status(500).json({
          error: {
            code: 'ERROR_HANDLER_FAILED',
            message: 'An unexpected error occurred',
            correlationId: req.correlationId || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
      }
    };
  }

  /**
   * Async error wrapper for route handlers
   */
  asyncErrorHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Circuit breaker middleware
   */
  circuitBreakerMiddleware() {
    return (req: RequestWithErrorHandling, res: Response, next: NextFunction) => {
      try {
        const circuitBreakers = this.errorHandling.getCircuitBreakerStates();
        const pathCircuitBreaker = circuitBreakers.find(cb => cb.name === req.path);

        if (pathCircuitBreaker && pathCircuitBreaker.state === 'open') {
          logger.warn('Circuit breaker is open, rejecting request', {
            correlationId: req.correlationId,
            path: req.path,
            circuitBreakerState: pathCircuitBreaker.state,
          });

          return res.status(503).json({
            error: {
              code: 'CIRCUIT_BREAKER_OPEN',
              message: 'Service temporarily unavailable due to repeated failures',
              correlationId: req.correlationId,
              retryAfter: Math.ceil(pathCircuitBreaker.timeout / 1000),
            },
            timestamp: new Date().toISOString(),
          });
        }

      } catch (error) {
        logger.error('Circuit breaker middleware error', error);
      }

      next();
    };
  }

  /**
   * Error metrics endpoint
   */
  errorMetricsEndpoint() {
    return async (req: RequestWithErrorHandling, res: Response) => {
      try {
        const metrics = this.errorHandling.getErrorMetrics();
        const circuitBreakers = this.errorHandling.getCircuitBreakerStates();
        const recentErrors = this.errorHandling.getRecentErrors(20);
        const recoveryActions = this.errorHandling.getRecoveryActions(50);

        res.json({
          metrics,
          circuitBreakers,
          recentErrors: recentErrors.map(error => ({
            timestamp: error.timestamp,
            correlationId: error.correlationId,
            path: error.path,
            method: error.method,
            ip: error.ip,
          })),
          recoveryActions: recoveryActions.map(action => ({
            type: action.type,
            timestamp: action.timestamp,
            success: action.success,
            reason: action.reason,
            duration: action.duration,
          })),
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId,
        });

      } catch (error) {
        logger.error('Error metrics endpoint failed', error);
        res.status(500).json({
          error: 'Failed to retrieve error metrics',
          timestamp: new Date().toISOString(),
        });
      }
    };
  }

  /**
   * Error alerts endpoint
   */
  errorAlertsEndpoint() {
    return async (req: RequestWithErrorHandling, res: Response) => {
      try {
        const alerts = this.errorHandling.getActiveAlerts();

        res.json({
          alerts,
          totalAlerts: alerts.length,
          criticalAlerts: alerts.filter(a => a.level === 'critical').length,
          errorAlerts: alerts.filter(a => a.level === 'error').length,
          warningAlerts: alerts.filter(a => a.level === 'warning').length,
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId,
        });

      } catch (error) {
        logger.error('Error alerts endpoint failed', error);
        res.status(500).json({
          error: 'Failed to retrieve error alerts',
          timestamp: new Date().toISOString(),
        });
      }
    };
  }

  /**
   * Acknowledge alert endpoint
   */
  acknowledgeAlertEndpoint() {
    return async (req: RequestWithErrorHandling, res: Response) => {
      try {
        const alertId = req.params.alertId;
        
        if (!alertId) {
          return res.status(400).json({
            error: 'Alert ID is required',
            timestamp: new Date().toISOString(),
          });
        }

        const success = this.errorHandling.acknowledgeAlert(alertId);

        if (success) {
          logger.info('Alert acknowledged', {
            alertId,
            correlationId: req.correlationId,
            userAgent: req.get('User-Agent'),
            ip: req.ip,
          });

          res.json({
            success: true,
            message: 'Alert acknowledged successfully',
            alertId,
            timestamp: new Date().toISOString(),
            correlationId: req.correlationId,
          });
        } else {
          res.status(404).json({
            success: false,
            error: 'Alert not found',
            alertId,
            timestamp: new Date().toISOString(),
          });
        }

      } catch (error) {
        logger.error('Acknowledge alert endpoint failed', error);
        res.status(500).json({
          error: 'Failed to acknowledge alert',
          timestamp: new Date().toISOString(),
        });
      }
    };
  }

  /**
   * Resolve alert endpoint
   */
  resolveAlertEndpoint() {
    return async (req: RequestWithErrorHandling, res: Response) => {
      try {
        const alertId = req.params.alertId;
        
        if (!alertId) {
          return res.status(400).json({
            error: 'Alert ID is required',
            timestamp: new Date().toISOString(),
          });
        }

        const success = this.errorHandling.resolveAlert(alertId);

        if (success) {
          logger.info('Alert resolved', {
            alertId,
            correlationId: req.correlationId,
            userAgent: req.get('User-Agent'),
            ip: req.ip,
          });

          res.json({
            success: true,
            message: 'Alert resolved successfully',
            alertId,
            timestamp: new Date().toISOString(),
            correlationId: req.correlationId,
          });
        } else {
          res.status(404).json({
            success: false,
            error: 'Alert not found',
            alertId,
            timestamp: new Date().toISOString(),
          });
        }

      } catch (error) {
        logger.error('Resolve alert endpoint failed', error);
        res.status(500).json({
          error: 'Failed to resolve alert',
          timestamp: new Date().toISOString(),
        });
      }
    };
  }

  /**
   * Test error endpoint for development
   */
  testErrorEndpoint() {
    return async (req: RequestWithErrorHandling, res: Response) => {
      try {
        const errorType = req.params.errorType || 'generic';
        
        logger.info('Test error triggered', {
          errorType,
          correlationId: req.correlationId,
        });

        switch (errorType) {
          case 'database':
            throw new Error('Test database connection error');
          
          case 'memory':
            throw new Error('Test memory allocation error');
          
          case 'network':
            throw new Error('Test network ECONNRESET error');
          
          case 'timeout':
            await new Promise(resolve => setTimeout(resolve, 35000)); // Longer than timeout
            break;
          
          case 'validation':
            const error = new Error('Test validation error') as EnhancedError;
            error.statusCode = 400;
            error.category = 'validation';
            throw error;
          
          default:
            throw new Error('Test generic error');
        }

        res.json({
          success: true,
          message: 'Test completed without error',
          correlationId: req.correlationId,
        });

      } catch (error) {
        // Let the global error handler handle it
        throw error;
      }
    };
  }

  // Private helper methods

  private getStatusCodeFromError(error: Error): number {
    const enhancedError = error as EnhancedError;
    
    if (enhancedError.statusCode) {
      return enhancedError.statusCode;
    }

    // Map error types to status codes
    if (error.message.includes('validation') || error.message.includes('invalid')) {
      return 400;
    }
    
    if (error.message.includes('unauthorized') || error.message.includes('authentication')) {
      return 401;
    }
    
    if (error.message.includes('forbidden') || error.message.includes('permission')) {
      return 403;
    }
    
    if (error.message.includes('not found')) {
      return 404;
    }
    
    if (error.message.includes('timeout')) {
      return 408;
    }
    
    if (error.message.includes('conflict')) {
      return 409;
    }
    
    if (error.message.includes('rate limit')) {
      return 429;
    }

    // Default to 500 for server errors
    return 500;
  }

  private getSafeErrorMessage(error: Error): string {
    // In production, sanitize error messages to avoid exposing sensitive information
    if (process.env.NODE_ENV === 'production') {
      const enhancedError = error as EnhancedError;
      
      switch (enhancedError.category) {
        case 'validation':
          return 'Invalid input provided';
        case 'authentication':
          return 'Authentication failed';
        case 'authorization':
          return 'Access denied';
        case 'database':
          return 'Database operation failed';
        case 'network':
          return 'Network error occurred';
        case 'timeout':
          return 'Request timeout';
        default:
          return 'An error occurred while processing your request';
      }
    }

    // In development, return the actual error message
    return error.message;
  }
}

// Export singleton instance
export const errorHandlingMiddleware = new ErrorHandlingMiddleware();