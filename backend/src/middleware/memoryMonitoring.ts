import { Request, Response, NextFunction } from 'express';
import { MemoryManagerService } from '../services/memoryManager';
import { CorrelationService } from '../services/correlationService';
import logger from '../services/logger';

export interface RequestWithMemory extends Request {
  memorySnapshot?: {
    start: any;
    end?: any;
    delta?: number;
  };
  correlationId?: string;
}

export class MemoryMonitoringMiddleware {
  private memoryManager: MemoryManagerService;
  private correlationService: CorrelationService;

  constructor() {
    this.memoryManager = MemoryManagerService.getInstance();
    this.correlationService = CorrelationService.getInstance();
  }

  /**
   * Middleware to track memory usage per request
   */
  trackMemoryUsage() {
    return (req: RequestWithMemory, res: Response, next: NextFunction) => {
      // Skip for health check endpoints to reduce noise
      if (req.path === '/health' || req.path === '/api/health') {
        return next();
      }

      // Capture initial memory state
      req.memorySnapshot = {
        start: this.memoryManager.getCurrentMemoryUsage(),
      };

      // Override res.end to capture final memory state
      const originalEnd = res.end;
      res.end = function(this: Response, ...args: any[]) {
        try {
          if (req.memorySnapshot) {
            req.memorySnapshot.end = memoryManager.getCurrentMemoryUsage();
            req.memorySnapshot.delta = req.memorySnapshot.end.heapUsed - req.memorySnapshot.start.heapUsed;

            // Add memory info to response headers
            res.setHeader('X-Memory-Start', `${req.memorySnapshot.start.heapUsed}MB`);
            res.setHeader('X-Memory-End', `${req.memorySnapshot.end.heapUsed}MB`);
            res.setHeader('X-Memory-Delta', `${req.memorySnapshot.delta}MB`);
            res.setHeader('X-Memory-Usage', `${req.memorySnapshot.end.usagePercentage}%`);

            // Log high memory usage requests
            if (Math.abs(req.memorySnapshot.delta) > 10) { // 10MB delta
              logger.warn('High memory delta request', {
                correlationId: req.correlationId,
                path: req.path,
                method: req.method,
                memoryDelta: req.memorySnapshot.delta,
                startMemory: req.memorySnapshot.start.heapUsed,
                endMemory: req.memorySnapshot.end.heapUsed,
                usagePercentage: req.memorySnapshot.end.usagePercentage,
              });
            }
          }
        } catch (error) {
          logger.error('Memory tracking error', {
            correlationId: req.correlationId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }

        return originalEnd.apply(this, args);
      };

      // Reference to memory manager for the closure
      const memoryManager = this.memoryManager;
      next();
    };
  }

  /**
   * Middleware to check memory pressure before processing requests
   */
  checkMemoryPressure() {
    return async (req: RequestWithMemory, res: Response, next: NextFunction) => {
      try {
        const currentUsage = this.memoryManager.getCurrentMemoryUsage();
        
        // If memory usage is critical, reject non-essential requests
        if (currentUsage.usagePercentage > 95) {
          // Allow only health checks and essential endpoints
          const essentialPaths = ['/health', '/api/health', '/api/metrics', '/api/memory'];
          
          if (!essentialPaths.some(path => req.path.startsWith(path))) {
            logger.warn('Request rejected due to critical memory usage', {
              correlationId: req.correlationId,
              path: req.path,
              memoryUsage: currentUsage.usagePercentage,
            });

            return res.status(503).json({
              error: {
                code: 'MEMORY_PRESSURE',
                message: 'Service temporarily unavailable due to high memory usage',
                memoryUsage: currentUsage.usagePercentage,
                correlationId: req.correlationId,
              },
              timestamp: new Date().toISOString(),
            });
          }
        }

        // Add memory warning headers for high usage
        if (currentUsage.usagePercentage > 80) {
          res.setHeader('X-Memory-Warning', 'High memory usage detected');
          res.setHeader('X-Memory-Usage-Percent', currentUsage.usagePercentage.toString());
        }

        next();
      } catch (error) {
        logger.error('Memory pressure check failed', error);
        next(); // Continue processing even if check fails
      }
    };
  }

  /**
   * Middleware to provide memory health endpoint
   */
  memoryHealthEndpoint() {
    return async (req: RequestWithMemory, res: Response) => {
      try {
        const healthReport = this.memoryManager.getMemoryHealthReport();
        
        const statusCode = healthReport.status === 'healthy' ? 200 :
                          healthReport.status === 'warning' ? 200 :
                          healthReport.status === 'critical' ? 503 : 503;

        res.status(statusCode).json({
          ...healthReport,
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId,
        });
      } catch (error) {
        logger.error('Memory health endpoint error', error);
        res.status(500).json({
          error: 'Failed to retrieve memory health information',
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId,
        });
      }
    };
  }

  /**
   * Middleware to provide memory metrics endpoint
   */
  memoryMetricsEndpoint() {
    return async (req: RequestWithMemory, res: Response) => {
      try {
        const currentUsage = this.memoryManager.getCurrentMemoryUsage();
        const healthReport = this.memoryManager.getMemoryHealthReport();

        res.json({
          current: currentUsage,
          trend: healthReport.trend,
          gcStats: healthReport.gcStats,
          leakDetection: healthReport.leakDetection,
          recentAlerts: healthReport.recentAlerts.slice(-5),
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId,
        });
      } catch (error) {
        logger.error('Memory metrics endpoint error', error);
        res.status(500).json({
          error: 'Failed to retrieve memory metrics',
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId,
        });
      }
    };
  }

  /**
   * Middleware to trigger garbage collection
   */
  triggerGCEndpoint() {
    return async (req: RequestWithMemory, res: Response) => {
      try {
        logger.info('Manual garbage collection triggered', {
          correlationId: req.correlationId,
          userAgent: req.get('User-Agent'),
          ip: req.ip,
        });

        const memoryFreed = await this.memoryManager.triggerGarbageCollection('manual-api');
        
        res.json({
          success: true,
          memoryFreed,
          message: `Garbage collection completed, ${memoryFreed}MB freed`,
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId,
        });
      } catch (error) {
        logger.error('Manual GC endpoint error', error);
        res.status(500).json({
          success: false,
          error: 'Failed to trigger garbage collection',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId,
        });
      }
    };
  }

  /**
   * Middleware to create heap snapshot
   */
  createHeapSnapshotEndpoint() {
    return async (req: RequestWithMemory, res: Response) => {
      try {
        logger.info('Manual heap snapshot requested', {
          correlationId: req.correlationId,
          userAgent: req.get('User-Agent'),
          ip: req.ip,
        });

        const snapshot = await this.memoryManager.createHeapSnapshot('manual-api', req.correlationId);
        
        res.json({
          success: true,
          snapshot: {
            filename: snapshot.filename,
            size: Math.round(snapshot.size / 1024 / 1024), // MB
            timestamp: snapshot.timestamp,
          },
          message: 'Heap snapshot created successfully',
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId,
        });
      } catch (error) {
        logger.error('Heap snapshot endpoint error', error);
        res.status(500).json({
          success: false,
          error: 'Failed to create heap snapshot',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId,
        });
      }
    };
  }

  /**
   * Middleware to perform emergency cleanup
   */
  emergencyCleanupEndpoint() {
    return async (req: RequestWithMemory, res: Response) => {
      try {
        logger.warn('Emergency memory cleanup triggered', {
          correlationId: req.correlationId,
          userAgent: req.get('User-Agent'),
          ip: req.ip,
        });

        const memoryFreed = await this.memoryManager.performEmergencyCleanup();
        
        res.json({
          success: true,
          memoryFreed,
          message: `Emergency cleanup completed, ${memoryFreed}MB freed`,
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId,
        });
      } catch (error) {
        logger.error('Emergency cleanup endpoint error', error);
        res.status(500).json({
          success: false,
          error: 'Failed to perform emergency cleanup',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId,
        });
      }
    };
  }

  /**
   * Middleware to handle memory-related errors
   */
  handleMemoryErrors() {
    return (error: any, req: RequestWithMemory, res: Response, next: NextFunction) => {
      // Check if it's a memory-related error
      if (this.isMemoryError(error)) {
        logger.error('Memory error in request', {
          correlationId: req.correlationId,
          error: error.message,
          path: req.path,
          method: req.method,
          memoryUsage: this.memoryManager.getCurrentMemoryUsage(),
        });

        // Trigger emergency cleanup for severe memory errors
        if (error.message?.includes('out of memory') || error.code === 'ENOMEM') {
          this.memoryManager.performEmergencyCleanup().catch(cleanupError => {
            logger.error('Emergency cleanup failed after memory error', cleanupError);
          });
        }

        return res.status(503).json({
          error: {
            code: 'MEMORY_ERROR',
            message: 'Service temporarily unavailable due to memory constraints',
            correlationId: req.correlationId,
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Not a memory error, pass to next error handler
      next(error);
    };
  }

  // Private helper methods

  private isMemoryError(error: any): boolean {
    if (!error) return false;

    const memoryErrorIndicators = [
      'out of memory',
      'memory',
      'heap',
      'ENOMEM',
      'allocation failed',
    ];

    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code?.toLowerCase() || '';

    return memoryErrorIndicators.some(indicator => 
      errorMessage.includes(indicator) || errorCode.includes(indicator)
    );
  }
}

/**
 * Factory function to create memory monitoring middleware
 */
export function createMemoryMonitoring() {
  const monitor = new MemoryMonitoringMiddleware();
  
  return {
    addMemoryHeaders: () => monitor.trackMemoryUsage(),
    monitorRequestMemory: () => monitor.trackMemoryUsage(),
    handleMemoryPressure: () => monitor.checkMemoryPressure(),
    proactiveMemoryManagement: () => monitor.checkMemoryPressure(),
    memoryHealthEndpoint: () => monitor.memoryHealthEndpoint(),
    memoryMetricsEndpoint: () => monitor.memoryMetricsEndpoint(),
    memoryLeakEndpoint: () => monitor.createHeapSnapshotEndpoint(),
    forceGcEndpoint: () => monitor.triggerGCEndpoint(),
    emergencyCleanupEndpoint: () => monitor.emergencyCleanupEndpoint(),
    handleMemoryErrors: () => monitor.handleMemoryErrors(),
  };
}

export default MemoryMonitoringMiddleware;

// Export singleton instance
export const memoryMonitoringMiddleware = new MemoryMonitoringMiddleware();