import { Request, Response, NextFunction } from 'express';
import { SchedulerResilienceService } from '../services/schedulerResilience';
import { CorrelationService } from '../services/correlationService';
import logger from '../services/logger';

export interface RequestWithScheduler extends Request {
  schedulerContext?: {
    correlationId: string;
    timestamp: string;
  };
}

export class SchedulerResilienceMiddleware {
  private schedulerResilience: SchedulerResilienceService;
  private correlationService: CorrelationService;

  constructor() {
    this.schedulerResilience = SchedulerResilienceService.getInstance();
    this.correlationService = CorrelationService.getInstance();
  }

  /**
   * Middleware to add scheduler status headers
   */
  addSchedulerHeaders() {
    return (req: RequestWithScheduler, res: Response, next: NextFunction) => {
      try {
        const allHealth = this.schedulerResilience.getAllHealth();
        const healthyCount = allHealth.filter(h => h.status === 'healthy').length;
        const totalCount = allHealth.length;
        const overallStatus = this.determineOverallSchedulerStatus(allHealth);

        // Add scheduler status headers
        res.setHeader('X-Scheduler-Status', overallStatus);
        res.setHeader('X-Scheduler-Health', `${healthyCount}/${totalCount}`);
        res.setHeader('X-Scheduler-Count', totalCount.toString());

        // Add warning headers if there are issues
        const unhealthySchedulers = allHealth.filter(h => h.status === 'unhealthy');
        if (unhealthySchedulers.length > 0) {
          res.setHeader('X-Scheduler-Warning', `${unhealthySchedulers.length} scheduler(s) unhealthy`);
        }

        const degradedSchedulers = allHealth.filter(h => h.status === 'degraded');
        if (degradedSchedulers.length > 0) {
          res.setHeader('X-Scheduler-Degraded', `${degradedSchedulers.length} scheduler(s) degraded`);
        }

      } catch (error) {
        logger.error('Scheduler headers middleware error', error);
      }

      next();
    };
  }

  /**
   * Middleware to monitor scheduler impact on requests
   */
  monitorSchedulerImpact() {
    return (req: RequestWithScheduler, res: Response, next: NextFunction) => {
      const correlationId = req.headers['x-correlation-id'] as string || 
                           this.correlationService.generateCorrelationId();

      req.schedulerContext = {
        correlationId,
        timestamp: new Date().toISOString(),
      };

      // Monitor for scheduler-related performance issues
      const startTime = Date.now();

      const schedulerService = this.schedulerResilience;
      const originalEnd = res.end.bind(res);
      res.end = function(this: Response, ...args: any[]): any {
        try {
          const duration = Date.now() - startTime;
          
          // Log slow requests that might be affected by scheduler activity
          if (duration > 5000) { // 5 seconds
            const allHealth = schedulerService.getAllHealth();
            const activeSchedulers = allHealth.filter(h => h.status === 'healthy').length;
            
            logger.warn('Slow request detected during scheduler activity', {
              correlationId,
              path: req.path,
              method: req.method,
              duration,
              activeSchedulers,
              schedulerStatus: allHealth.map(h => ({
                name: h.name,
                status: h.status,
                memoryUsage: h.memoryUsage,
              })),
            });
          }

        } catch (error) {
          logger.error('Scheduler impact monitoring error', {
            correlationId,
            error: (error as Error).message,
          });
        }

        return originalEnd(...args);
      } as any;

      next();
    };
  }

  /**
   * Middleware to handle scheduler-related service degradation
   */
  handleSchedulerDegradation() {
    return (req: RequestWithScheduler, res: Response, next: NextFunction) => {
      try {
        const allHealth = this.schedulerResilience.getAllHealth();
        const unhealthyCount = allHealth.filter(h => h.status === 'unhealthy').length;
        const totalCount = allHealth.length;

        // If more than 50% of schedulers are unhealthy, add delay to reduce load
        if (totalCount > 0 && (unhealthyCount / totalCount) > 0.5) {
          logger.warn('High scheduler failure rate detected, adding request delay', {
            unhealthyCount,
            totalCount,
            path: req.path,
            correlationId: req.schedulerContext?.correlationId,
          });

          // Add a small delay to reduce system load
          setTimeout(() => next(), 100);
          return;
        }

        // If critical schedulers are down, reject non-essential requests
        const criticalSchedulersDown = allHealth.filter(h => 
          h.status === 'unhealthy' && h.name.includes('critical')
        );

        if (criticalSchedulersDown.length > 0) {
          const essentialPaths = ['/health', '/api/health', '/api/scheduler', '/api/diagnostics'];
          
          if (!essentialPaths.some(path => req.path.startsWith(path))) {
            logger.warn('Request rejected due to critical scheduler failure', {
              path: req.path,
              method: req.method,
              criticalSchedulersDown: criticalSchedulersDown.map(s => s.name),
              correlationId: req.schedulerContext?.correlationId,
            });

            return res.status(503).json({
              error: {
                code: 'SCHEDULER_DEGRADATION',
                message: 'Service temporarily degraded due to scheduler issues',
                criticalSchedulersDown: criticalSchedulersDown.length,
                retryAfter: 30,
              },
              timestamp: new Date().toISOString(),
            });
          }
        }

      } catch (error) {
        logger.error('Scheduler degradation middleware error', error);
      }

      next();
    };
  }

  /**
   * Scheduler health endpoint
   */
  schedulerHealthEndpoint() {
    return async (req: RequestWithScheduler, res: Response) => {
      try {
        const allHealth = this.schedulerResilience.getAllHealth();
        const allMetrics = this.schedulerResilience.getAllMetrics();
        const overallStatus = this.determineOverallSchedulerStatus(allHealth);

        const healthSummary = {
          overallStatus,
          totalSchedulers: allHealth.length,
          healthySchedulers: allHealth.filter(h => h.status === 'healthy').length,
          degradedSchedulers: allHealth.filter(h => h.status === 'degraded').length,
          unhealthySchedulers: allHealth.filter(h => h.status === 'unhealthy').length,
          stoppedSchedulers: allHealth.filter(h => h.status === 'stopped').length,
        };

        const statusCode = overallStatus === 'healthy' ? 200 :
                          overallStatus === 'degraded' ? 200 : 503;

        res.status(statusCode).json({
          status: overallStatus,
          summary: healthSummary,
          schedulers: allHealth,
          metrics: allMetrics,
          timestamp: new Date().toISOString(),
          correlationId: req.schedulerContext?.correlationId,
        });

      } catch (error) {
        logger.error('Scheduler health endpoint error', error);
        res.status(500).json({
          error: 'Failed to retrieve scheduler health',
          timestamp: new Date().toISOString(),
        });
      }
    };
  }

  /**
   * Individual scheduler health endpoint
   */
  individualSchedulerHealthEndpoint() {
    return async (req: RequestWithScheduler, res: Response) => {
      try {
        const schedulerName = req.params.schedulerName;
        
        if (!schedulerName) {
          return res.status(400).json({
            error: 'Scheduler name is required',
            timestamp: new Date().toISOString(),
          });
        }

        const health = this.schedulerResilience.getHealth(schedulerName);
        const metrics = this.schedulerResilience.getMetrics(schedulerName);

        if (!health) {
          return res.status(404).json({
            error: `Scheduler ${schedulerName} not found`,
            timestamp: new Date().toISOString(),
          });
        }

        res.json({
          schedulerName,
          health,
          metrics,
          timestamp: new Date().toISOString(),
          correlationId: req.schedulerContext?.correlationId,
        });

      } catch (error) {
        logger.error('Individual scheduler health endpoint error', error);
        res.status(500).json({
          error: 'Failed to retrieve scheduler health',
          timestamp: new Date().toISOString(),
        });
      }
    };
  }

  /**
   * Start scheduler endpoint
   */
  startSchedulerEndpoint() {
    return async (req: RequestWithScheduler, res: Response) => {
      try {
        const schedulerName = req.params.schedulerName;
        
        if (!schedulerName) {
          return res.status(400).json({
            error: 'Scheduler name is required',
            timestamp: new Date().toISOString(),
          });
        }

        logger.info('Manual scheduler start requested', {
          schedulerName,
          correlationId: req.schedulerContext?.correlationId,
          userAgent: req.get('User-Agent'),
          ip: req.ip,
        });

        await this.schedulerResilience.start(schedulerName);

        res.json({
          success: true,
          message: `Scheduler ${schedulerName} started successfully`,
          schedulerName,
          timestamp: new Date().toISOString(),
          correlationId: req.schedulerContext?.correlationId,
        });

      } catch (error) {
        logger.error('Start scheduler endpoint error', {
          schedulerName: req.params.schedulerName,
          error: (error as Error).message,
        });

        res.status(500).json({
          success: false,
          error: (error as Error).message,
          schedulerName: req.params.schedulerName,
          timestamp: new Date().toISOString(),
        });
      }
    };
  }

  /**
   * Stop scheduler endpoint
   */
  stopSchedulerEndpoint() {
    return async (req: RequestWithScheduler, res: Response) => {
      try {
        const schedulerName = req.params.schedulerName;
        
        if (!schedulerName) {
          return res.status(400).json({
            error: 'Scheduler name is required',
            timestamp: new Date().toISOString(),
          });
        }

        logger.info('Manual scheduler stop requested', {
          schedulerName,
          correlationId: req.schedulerContext?.correlationId,
          userAgent: req.get('User-Agent'),
          ip: req.ip,
        });

        await this.schedulerResilience.stop(schedulerName);

        res.json({
          success: true,
          message: `Scheduler ${schedulerName} stopped successfully`,
          schedulerName,
          timestamp: new Date().toISOString(),
          correlationId: req.schedulerContext?.correlationId,
        });

      } catch (error) {
        logger.error('Stop scheduler endpoint error', {
          schedulerName: req.params.schedulerName,
          error: (error as Error).message,
        });

        res.status(500).json({
          success: false,
          error: (error as Error).message,
          schedulerName: req.params.schedulerName,
          timestamp: new Date().toISOString(),
        });
      }
    };
  }

  /**
   * Restart scheduler endpoint
   */
  restartSchedulerEndpoint() {
    return async (req: RequestWithScheduler, res: Response) => {
      try {
        const schedulerName = req.params.schedulerName;
        
        if (!schedulerName) {
          return res.status(400).json({
            error: 'Scheduler name is required',
            timestamp: new Date().toISOString(),
          });
        }

        logger.info('Manual scheduler restart requested', {
          schedulerName,
          correlationId: req.schedulerContext?.correlationId,
          userAgent: req.get('User-Agent'),
          ip: req.ip,
        });

        await this.schedulerResilience.restart(schedulerName);

        const health = this.schedulerResilience.getHealth(schedulerName);

        res.json({
          success: true,
          message: `Scheduler ${schedulerName} restarted successfully`,
          schedulerName,
          health,
          timestamp: new Date().toISOString(),
          correlationId: req.schedulerContext?.correlationId,
        });

      } catch (error) {
        logger.error('Restart scheduler endpoint error', {
          schedulerName: req.params.schedulerName,
          error: (error as Error).message,
        });

        res.status(500).json({
          success: false,
          error: (error as Error).message,
          schedulerName: req.params.schedulerName,
          timestamp: new Date().toISOString(),
        });
      }
    };
  }

  /**
   * Perform scheduler recovery endpoint
   */
  performRecoveryEndpoint() {
    return async (req: RequestWithScheduler, res: Response) => {
      try {
        const schedulerName = req.params.schedulerName;
        
        if (!schedulerName) {
          return res.status(400).json({
            error: 'Scheduler name is required',
            timestamp: new Date().toISOString(),
          });
        }

        logger.info('Manual scheduler recovery requested', {
          schedulerName,
          correlationId: req.schedulerContext?.correlationId,
          userAgent: req.get('User-Agent'),
          ip: req.ip,
        });

        const actions = await this.schedulerResilience.performRecovery(schedulerName);
        const health = this.schedulerResilience.getHealth(schedulerName);

        res.json({
          success: actions.some(a => a.success),
          message: `Recovery performed for scheduler ${schedulerName}`,
          schedulerName,
          actions,
          health,
          timestamp: new Date().toISOString(),
          correlationId: req.schedulerContext?.correlationId,
        });

      } catch (error) {
        logger.error('Scheduler recovery endpoint error', {
          schedulerName: req.params.schedulerName,
          error: (error as Error).message,
        });

        res.status(500).json({
          success: false,
          error: (error as Error).message,
          schedulerName: req.params.schedulerName,
          timestamp: new Date().toISOString(),
        });
      }
    };
  }

  /**
   * Start all schedulers endpoint
   */
  startAllSchedulersEndpoint() {
    return async (req: RequestWithScheduler, res: Response) => {
      try {
        logger.info('Manual start all schedulers requested', {
          correlationId: req.schedulerContext?.correlationId,
          userAgent: req.get('User-Agent'),
          ip: req.ip,
        });

        await this.schedulerResilience.startAll();

        const allHealth = this.schedulerResilience.getAllHealth();
        const healthyCount = allHealth.filter(h => h.status === 'healthy').length;

        res.json({
          success: true,
          message: 'All schedulers start initiated',
          totalSchedulers: allHealth.length,
          healthySchedulers: healthyCount,
          schedulers: allHealth,
          timestamp: new Date().toISOString(),
          correlationId: req.schedulerContext?.correlationId,
        });

      } catch (error) {
        logger.error('Start all schedulers endpoint error', error);

        res.status(500).json({
          success: false,
          error: (error as Error).message,
          timestamp: new Date().toISOString(),
        });
      }
    };
  }

  /**
   * Stop all schedulers endpoint
   */
  stopAllSchedulersEndpoint() {
    return async (req: RequestWithScheduler, res: Response) => {
      try {
        logger.info('Manual stop all schedulers requested', {
          correlationId: req.schedulerContext?.correlationId,
          userAgent: req.get('User-Agent'),
          ip: req.ip,
        });

        await this.schedulerResilience.stopAll();

        const allHealth = this.schedulerResilience.getAllHealth();
        const stoppedCount = allHealth.filter(h => h.status === 'stopped').length;

        res.json({
          success: true,
          message: 'All schedulers stop initiated',
          totalSchedulers: allHealth.length,
          stoppedSchedulers: stoppedCount,
          schedulers: allHealth,
          timestamp: new Date().toISOString(),
          correlationId: req.schedulerContext?.correlationId,
        });

      } catch (error) {
        logger.error('Stop all schedulers endpoint error', error);

        res.status(500).json({
          success: false,
          error: (error as Error).message,
          timestamp: new Date().toISOString(),
        });
      }
    };
  }

  // Private helper methods

  private determineOverallSchedulerStatus(allHealth: any[]): 'healthy' | 'degraded' | 'unhealthy' {
    if (allHealth.length === 0) {
      return 'healthy'; // No schedulers is considered healthy
    }

    const unhealthyCount = allHealth.filter(h => h.status === 'unhealthy').length;
    const degradedCount = allHealth.filter(h => h.status === 'degraded').length;
    const totalCount = allHealth.length;

    // If more than 50% are unhealthy, overall status is unhealthy
    if (unhealthyCount / totalCount > 0.5) {
      return 'unhealthy';
    }

    // If any are unhealthy or degraded, overall status is degraded
    if (unhealthyCount > 0 || degradedCount > 0) {
      return 'degraded';
    }

    return 'healthy';
  }
}

// Export singleton instance
export const schedulerResilienceMiddleware = new SchedulerResilienceMiddleware();