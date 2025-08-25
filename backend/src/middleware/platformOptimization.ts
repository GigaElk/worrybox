import { Request, Response, NextFunction } from 'express';
import { PlatformAdapterService } from '../services/platformAdapter';
import { RenderOptimizationService } from '../services/renderOptimizations';
import logger from '../services/logger';

export interface RequestWithPlatform extends Request {
  platform?: string;
  platformConfig?: any;
}

export class PlatformOptimizationMiddleware {
  private platformAdapter: PlatformAdapterService;
  private renderOptimization: RenderOptimizationService;

  constructor() {
    this.platformAdapter = PlatformAdapterService.getInstance();
    this.renderOptimization = RenderOptimizationService.getInstance();
  }

  /**
   * Middleware to add platform information to requests
   */
  addPlatformInfo() {
    return (req: RequestWithPlatform, res: Response, next: NextFunction) => {
      req.platform = this.platformAdapter.getPlatform();
      req.platformConfig = this.platformAdapter.getConfig();
      
      // Add platform info to response headers for debugging
      res.setHeader('X-Platform', req.platform);
      
      next();
    };
  }

  /**
   * Middleware to track activity for keep-alive (Render.com specific)
   */
  trackActivity() {
    return (req: RequestWithPlatform, res: Response, next: NextFunction) => {
      // Update activity timestamp for Render keep-alive
      if (this.platformAdapter.isRender()) {
        this.renderOptimization.updateActivity();
      }
      
      next();
    };
  }

  /**
   * Middleware to apply platform-specific request optimizations
   */
  applyRequestOptimizations() {
    return (req: RequestWithPlatform, res: Response, next: NextFunction) => {
      const config = this.platformAdapter.getConfig();
      
      // Set platform-specific request timeout
      if (config.requestTimeout) {
        req.setTimeout(config.requestTimeout, () => {
          if (!res.headersSent) {
            logger.warn('Request timeout due to platform limits', {
              platform: this.platformAdapter.getPlatform(),
              timeout: config.requestTimeout,
              path: req.path,
              method: req.method,
            });
            
            res.status(408).json({
              error: {
                code: 'PLATFORM_REQUEST_TIMEOUT',
                message: `Request timeout (${config.requestTimeout}ms limit)`,
                platform: this.platformAdapter.getPlatform(),
              },
              timestamp: new Date().toISOString(),
            });
          }
        });
      }

      // Add platform-specific headers
      res.setHeader('X-Platform-Memory-Limit', `${config.memoryLimit}MB`);
      res.setHeader('X-Platform-Optimizations', config.enableOptimizations ? 'enabled' : 'disabled');
      
      next();
    };
  }

  /**
   * Middleware to monitor memory usage per request (Render.com specific)
   */
  monitorMemoryUsage() {
    return (req: RequestWithPlatform, res: Response, next: NextFunction) => {
      if (!this.platformAdapter.isRender()) {
        return next();
      }

      const startMemory = process.memoryUsage().heapUsed;
      const config = this.platformAdapter.getConfig();
      
      // Override res.end to check memory after request
      const originalEnd = res.end;
      res.end = function(this: Response, ...args: any[]) {
        const endMemory = process.memoryUsage().heapUsed;
        const memoryDelta = endMemory - startMemory;
        const currentMemoryMB = Math.round(endMemory / 1024 / 1024);
        const memoryPercentage = (currentMemoryMB / config.memoryLimit) * 100;

        // Log high memory usage requests
        if (memoryDelta > 10 * 1024 * 1024) { // 10MB delta
          logger.warn('High memory usage request on Render.com', {
            path: req.path,
            method: req.method,
            memoryDelta: Math.round(memoryDelta / 1024 / 1024),
            currentMemory: currentMemoryMB,
            memoryPercentage: Math.round(memoryPercentage * 100) / 100,
          });
        }

        // Add memory info to response headers for debugging
        res.setHeader('X-Memory-Usage', `${currentMemoryMB}MB`);
        res.setHeader('X-Memory-Percentage', `${Math.round(memoryPercentage)}%`);

        return originalEnd.apply(this, args);
      };

      next();
    };
  }

  /**
   * Middleware to handle platform-specific errors
   */
  handlePlatformErrors() {
    return (error: any, req: RequestWithPlatform, res: Response, next: NextFunction) => {
      const platform = this.platformAdapter.getPlatform();
      
      // Platform-specific error handling
      if (platform === 'render') {
        // Handle Render.com specific errors
        if (error.code === 'EMFILE' || error.code === 'ENFILE') {
          logger.error('File descriptor limit reached on Render.com', {
            error: error.message,
            platform,
            path: req.path,
          });
          
          return res.status(503).json({
            error: {
              code: 'RESOURCE_LIMIT_EXCEEDED',
              message: 'Service temporarily unavailable due to resource limits',
              platform,
            },
            timestamp: new Date().toISOString(),
          });
        }

        if (error.message?.includes('memory') || error.code === 'ENOMEM') {
          logger.error('Memory limit exceeded on Render.com', {
            error: error.message,
            platform,
            memoryUsage: process.memoryUsage(),
          });
          
          return res.status(503).json({
            error: {
              code: 'MEMORY_LIMIT_EXCEEDED',
              message: 'Service temporarily unavailable due to memory constraints',
              platform,
            },
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Add platform context to error
      error.platform = platform;
      error.platformConfig = this.platformAdapter.getConfig();
      
      next(error);
    };
  }

  /**
   * Middleware to add platform-specific health check headers
   */
  addHealthHeaders() {
    return (req: RequestWithPlatform, res: Response, next: NextFunction) => {
      // Add platform health info to all responses
      const limits = this.platformAdapter.monitorResourceLimits();
      
      res.setHeader('X-Platform-Health', limits.memory.critical ? 'critical' : 
                    limits.memory.approaching ? 'warning' : 'healthy');
      res.setHeader('X-Platform-Uptime', Math.round(process.uptime()));
      
      // Render-specific headers
      if (this.platformAdapter.isRender()) {
        const renderMetrics = this.renderOptimization.getRenderMetrics();
        res.setHeader('X-Render-Sleep-Risk', renderMetrics.sleepRisk ? 'true' : 'false');
        res.setHeader('X-Render-Memory-Percentage', `${Math.round(renderMetrics.memoryPercentage)}%`);
      }
      
      next();
    };
  }
}

// Export singleton instance
export const platformOptimization = new PlatformOptimizationMiddleware();