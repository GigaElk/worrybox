import { Request, Response, NextFunction } from 'express';
import { DatabaseConnection } from '../utils/databaseConnection';
import { CorrelationService } from '../services/correlationService';
import logger from '../services/logger';

export interface RequestWithDatabase extends Request {
  db?: any;
  dbMetrics?: any;
  correlationId?: string;
}

export class DatabaseRecoveryMiddleware {
  private correlationService: CorrelationService;

  constructor() {
    this.correlationService = CorrelationService.getInstance();
  }

  /**
   * Middleware to inject database connection with recovery
   */
  injectDatabaseConnection() {
    return async (req: RequestWithDatabase, res: Response, next: NextFunction) => {
      try {
        // Get correlation ID from request
        const correlationId = req.correlationId || 
                            this.correlationService.getOrCreateCorrelationId(req.headers);

        // Create database wrapper with recovery
        req.db = {
          // Raw connection access
          connection: async () => {
            return DatabaseConnection.getInstance();
          },

          // Execute query with recovery
          query: async (operation: () => Promise<any>) => {
            return DatabaseConnection.executeOperation(operation, correlationId);
          },

          // Execute transaction with recovery
          transaction: async (operation: (prisma: any) => Promise<any>) => {
            return DatabaseConnection.executeTransaction(operation, correlationId);
          },

          // Health check
          isHealthy: async () => {
            return DatabaseConnection.isHealthy();
          },

          // Get metrics
          getMetrics: () => {
            return DatabaseConnection.getHealthMetrics();
          },

          // Force recovery
          forceRecovery: async () => {
            return DatabaseConnection.forceRecovery();
          },
        };

        next();
      } catch (error) {
        logger.error('Database middleware error', {
          correlationId: req.correlationId,
          error: (error as Error).message,
          path: req.path,
        });

        res.status(503).json({
          error: {
            code: 'DATABASE_UNAVAILABLE',
            message: 'Database service temporarily unavailable',
            correlationId: req.correlationId,
          },
          timestamp: new Date().toISOString(),
        });
      }
    };
  }

  /**
   * Middleware to track database metrics per request
   */
  trackDatabaseMetrics() {
    return (req: RequestWithDatabase, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      let queryCount = 0;

      // Wrap database operations to count queries
      if (req.db) {
        const originalQuery = req.db.query;
        const originalTransaction = req.db.transaction;

        req.db.query = async (operation: () => Promise<any>) => {
          queryCount++;
          return originalQuery(operation);
        };

        req.db.transaction = async (operation: (prisma: any) => Promise<any>) => {
          queryCount++;
          return originalTransaction(operation);
        };
      }

      // Override res.end to capture metrics
      const originalEnd = res.end.bind(res);
      res.end = function(this: Response, ...args: any[]): any {
        const duration = Date.now() - startTime;
        
        // Get database metrics
        const dbMetrics = DatabaseConnection.getHealthMetrics();
        
        // Add database metrics to response headers
        if (dbMetrics) {
          res.setHeader('X-DB-Status', dbMetrics.connectionStatus);
          res.setHeader('X-DB-Pool-Health', dbMetrics.poolMetrics.poolHealth);
          res.setHeader('X-DB-Queries', queryCount.toString());
          res.setHeader('X-DB-Queue-Length', dbMetrics.poolMetrics.queuedRequests.toString());
        }

        // Log database usage for this request
        if (queryCount > 0 || duration > 1000) {
          logger.debug('Request database usage', {
            correlationId: req.correlationId,
            path: req.path,
            method: req.method,
            queryCount,
            duration,
            dbStatus: dbMetrics?.connectionStatus,
            queueLength: dbMetrics?.poolMetrics.queuedRequests,
          });
        }

        return originalEnd(...args);
      } as any;

      next();
    };
  }

  /**
   * Middleware to handle database errors gracefully
   */
  handleDatabaseErrors() {
    return (error: any, req: RequestWithDatabase, res: Response, next: NextFunction) => {
      // Check if it's a database-related error
      if (this.isDatabaseError(error)) {
        logger.error('Database error in request', {
          correlationId: req.correlationId,
          error: error.message,
          code: error.code,
          path: req.path,
          method: req.method,
        });

        // Try to trigger recovery
        DatabaseConnection.forceRecovery().catch(recoveryError => {
          logger.error('Failed to trigger database recovery', recoveryError);
        });

        // Return appropriate error response
        const statusCode = this.getErrorStatusCode(error);
        return res.status(statusCode).json({
          error: {
            code: 'DATABASE_ERROR',
            message: this.getSafeErrorMessage(error),
            correlationId: req.correlationId,
            retryable: this.isRetryableError(error),
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Not a database error, pass to next error handler
      next(error);
    };
  }

  /**
   * Middleware to provide database health endpoint
   */
  healthEndpoint() {
    return async (req: RequestWithDatabase, res: Response) => {
      try {
        const metrics = DatabaseConnection.getHealthMetrics();
        const isHealthy = await DatabaseConnection.isHealthy();

        const statusCode = isHealthy ? 200 : 503;
        
        res.status(statusCode).json({
          status: isHealthy ? 'healthy' : 'unhealthy',
          metrics,
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId,
        });
      } catch (error) {
        logger.error('Database health endpoint error', error);
        res.status(503).json({
          status: 'error',
          message: 'Failed to check database health',
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId,
        });
      }
    };
  }

  /**
   * Middleware to provide database recovery endpoint
   */
  recoveryEndpoint() {
    return async (req: RequestWithDatabase, res: Response) => {
      try {
        logger.info('Manual database recovery triggered', {
          correlationId: req.correlationId,
          userAgent: req.get('User-Agent'),
          ip: req.ip,
        });

        const success = await DatabaseConnection.forceRecovery();
        
        res.json({
          success,
          message: success ? 'Database recovery completed' : 'Database recovery failed',
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId,
        });
      } catch (error) {
        logger.error('Database recovery endpoint error', error);
        res.status(500).json({
          success: false,
          message: 'Failed to trigger database recovery',
          error: (error as Error).message,
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId,
        });
      }
    };
  }

  // Private helper methods

  private isDatabaseError(error: any): boolean {
    if (!error) return false;

    const dbErrorIndicators = [
      'connection',
      'database',
      'prisma',
      'query',
      'transaction',
      'timeout',
      'ECONNREFUSED',
      'ENOTFOUND',
      'ETIMEDOUT',
    ];

    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code?.toLowerCase() || '';

    return dbErrorIndicators.some(indicator => 
      errorMessage.includes(indicator) || errorCode.includes(indicator)
    );
  }

  private getErrorStatusCode(error: any): number {
    if (error.code === 'P2002') return 409; // Unique constraint violation
    if (error.code === 'P2025') return 404; // Record not found
    if (error.message?.includes('timeout')) return 408; // Request timeout
    if (error.message?.includes('connection')) return 503; // Service unavailable
    
    return 500; // Internal server error
  }

  private getSafeErrorMessage(error: any): string {
    // Don't expose sensitive database information in production
    if (process.env.NODE_ENV === 'production') {
      if (error.code === 'P2002') return 'Duplicate entry';
      if (error.code === 'P2025') return 'Record not found';
      if (error.message?.includes('timeout')) return 'Operation timeout';
      if (error.message?.includes('connection')) return 'Database temporarily unavailable';
      
      return 'Database operation failed';
    }

    return error.message || 'Unknown database error';
  }

  private isRetryableError(error: any): boolean {
    const retryableCodes = ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND'];
    const retryableMessages = ['connection', 'timeout', 'network'];

    const errorCode = error.code?.toUpperCase() || '';
    const errorMessage = error.message?.toLowerCase() || '';

    return retryableCodes.includes(errorCode) ||
           retryableMessages.some(msg => errorMessage.includes(msg));
  }
}

// Export singleton instance
export const databaseRecoveryMiddleware = new DatabaseRecoveryMiddleware();