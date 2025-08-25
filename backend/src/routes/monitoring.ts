import { Router, Request, Response } from 'express';
import { DiagnosticsService } from '../services/diagnosticsService';
import { HealthCheckService } from '../services/healthCheck';
import { PlatformAdapterService } from '../services/platformAdapter';
import { MemoryManagerService } from '../services/memoryManager';
import { SchedulerManagerService } from '../services/schedulerManager';
import { ErrorHandlingService } from '../services/errorHandler';
import { 
  requireMonitoringAccess, 
  requireAdminAccess, 
  requireDiagnosticAccess 
} from '../middleware/monitoringAuth';
import logger from '../services/logger';
import { randomUUID } from 'crypto';

const router = Router();

// Initialize services
const diagnostics = DiagnosticsService.getInstance();
const healthCheck = HealthCheckService.getInstance();
const platformAdapter = PlatformAdapterService.getInstance();
const memoryManager = MemoryManagerService.getInstance();
const schedulerManager = SchedulerManagerService.getInstance();
const errorHandler = ErrorHandlingService.getInstance();

/**
 * Middleware to track request metrics
 */
const trackRequestMetrics = (req: Request, res: Response, next: Function) => {
  const startTime = Date.now();
  const requestId = randomUUID();
  
  // Add request ID to headers
  res.setHeader('X-Request-ID', requestId);
  
  // Track request completion
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    diagnostics.trackRequest(req, res, responseTime);
    
    logger.info('Request completed', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
    });
  });
  
  next();
};

// Apply request tracking to all monitoring routes
router.use(trackRequestMetrics);

/**
 * GET /monitoring/health
 * Basic health check endpoint (public)
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const health = await healthCheck.getDetailedHealth();
    
    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json({
      status: health.status,
      timestamp: health.timestamp,
      uptime: Math.floor(process.uptime()),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      platform: platformAdapter.getPlatform(),
      checks: health.checks,
    });
  } catch (error) {
    logger.error('Health check endpoint error', error);
    res.status(500).json({
      status: 'fail',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    });
  }
});

/**
 * GET /monitoring/metrics
 * Comprehensive system metrics endpoint (requires monitoring access)
 */
router.get('/metrics', requireMonitoringAccess(), async (req: Request, res: Response) => {
  try {
    const format = req.query.format as string || 'json';
    const timeframe = req.query.timeframe as string || '1h';
    
    if (format === 'prometheus') {
      const metrics = await diagnostics.collectSystemMetrics();
      const prometheusMetrics = await diagnostics.exportMetrics('prometheus');
      
      res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      res.send(prometheusMetrics);
    } else if (format === 'csv') {
      const metrics = await diagnostics.collectSystemMetrics();
      const csvMetrics = await diagnostics.exportMetrics('csv');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=metrics.csv');
      res.send(csvMetrics);
    } else {
      const [systemMetrics, performanceMetrics] = await Promise.all([
        diagnostics.collectSystemMetrics(),
        diagnostics.getPerformanceMetrics(timeframe),
      ]);
      
      res.json({
        timestamp: new Date().toISOString(),
        timeframe,
        system: systemMetrics,
        performance: performanceMetrics,
      });
    }
  } catch (error) {
    logger.error('Metrics endpoint error', error);
    res.status(500).json({
      error: 'Failed to collect metrics',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /monitoring/diagnostics
 * Comprehensive diagnostic information for troubleshooting (requires admin access)
 */
router.get('/diagnostics', requireDiagnosticAccess(), async (req: Request, res: Response) => {
  try {
    const includeEnv = req.query.includeEnv === 'true';
    const includeLogs = req.query.includeLogs === 'true';
    
    const diagnosticInfo = await diagnostics.collectDiagnostics();
    
    // Sanitize environment variables if not explicitly requested
    if (!includeEnv && diagnosticInfo.system.process.env) {
      const sanitizedEnv: Record<string, string> = {};
      Object.keys(diagnosticInfo.system.process.env).forEach(key => {
        if (key.startsWith('NODE_') || key === 'PORT' || key === 'NODE_ENV') {
          sanitizedEnv[key] = diagnosticInfo.system.process.env[key];
        } else {
          sanitizedEnv[key] = '[REDACTED]';
        }
      });
      diagnosticInfo.system.process.env = sanitizedEnv;
    }
    
    res.json({
      ...diagnosticInfo,
      metadata: {
        includeEnv,
        includeLogs,
        generatedAt: new Date().toISOString(),
        platform: platformAdapter.getPlatform(),
      },
    });
  } catch (error) {
    logger.error('Diagnostics endpoint error', error);
    res.status(500).json({
      error: 'Failed to collect diagnostics',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /monitoring/performance
 * Performance metrics and analysis
 */
router.get('/performance', async (req: Request, res: Response) => {
  try {
    const timeframe = req.query.timeframe as string || '1h';
    const includeEndpoints = req.query.includeEndpoints === 'true';
    
    const performanceMetrics = await diagnostics.getPerformanceMetrics(timeframe);
    const systemMetrics = await diagnostics.collectSystemMetrics();
    
    const response: any = {
      timestamp: new Date().toISOString(),
      timeframe,
      performance: performanceMetrics,
      summary: {
        averageResponseTime: performanceMetrics.averageResponseTime,
        throughput: performanceMetrics.throughput,
        errorRate: performanceMetrics.errorRate,
        availability: performanceMetrics.availability,
        apdex: performanceMetrics.apdex,
      },
      bottlenecks: performanceMetrics.bottlenecks,
    };
    
    if (includeEndpoints) {
      response.endpoints = systemMetrics.api.endpoints;
    }
    
    res.json(response);
  } catch (error) {
    logger.error('Performance endpoint error', error);
    res.status(500).json({
      error: 'Failed to collect performance metrics',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /monitoring/alerts
 * Current monitoring alerts
 */
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const severity = req.query.severity as string;
    const acknowledged = req.query.acknowledged as string;
    
    let alerts = await diagnostics.getAlerts(severity);
    
    if (acknowledged !== undefined) {
      const isAcknowledged = acknowledged === 'true';
      alerts = alerts.filter(alert => alert.acknowledged === isAcknowledged);
    }
    
    res.json({
      timestamp: new Date().toISOString(),
      total: alerts.length,
      alerts,
      summary: {
        critical: alerts.filter(a => a.severity === 'critical').length,
        error: alerts.filter(a => a.severity === 'error').length,
        warning: alerts.filter(a => a.severity === 'warning').length,
        info: alerts.filter(a => a.severity === 'info').length,
        acknowledged: alerts.filter(a => a.acknowledged).length,
        unacknowledged: alerts.filter(a => !a.acknowledged).length,
      },
    });
  } catch (error) {
    logger.error('Alerts endpoint error', error);
    res.status(500).json({
      error: 'Failed to get alerts',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /monitoring/alerts/:id/acknowledge
 * Acknowledge a specific alert
 */
router.post('/alerts/:id/acknowledge', async (req: Request, res: Response) => {
  try {
    const alertId = req.params.id;
    const alerts = await diagnostics.getAlerts();
    const alert = alerts.find(a => a.id === alertId);
    
    if (!alert) {
      return res.status(404).json({
        error: 'Alert not found',
        alertId,
      });
    }
    
    if (alert.acknowledged) {
      return res.status(400).json({
        error: 'Alert already acknowledged',
        alertId,
      });
    }
    
    alert.acknowledged = true;
    
    logger.info('Alert acknowledged', {
      alertId,
      title: alert.title,
      severity: alert.severity,
    });
    
    res.json({
      success: true,
      alertId,
      acknowledgedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Alert acknowledgment error', error);
    res.status(500).json({
      error: 'Failed to acknowledge alert',
    });
  }
});

/**
 * GET /monitoring/memory
 * Detailed memory metrics and analysis
 */
router.get('/memory', async (req: Request, res: Response) => {
  try {
    const includeLeaks = req.query.includeLeaks === 'true';
    const includeGC = req.query.includeGC === 'true';
    
    const memoryStats = await memoryManager.getMemoryStats();
    const systemMetrics = await diagnostics.collectSystemMetrics();
    
    const response: any = {
      timestamp: new Date().toISOString(),
      memory: systemMetrics.memory,
      recommendations: [],
    };
    
    // Add recommendations based on memory usage
    if (systemMetrics.memory.memoryPressure === 'high') {
      response.recommendations.push('Consider reducing memory usage or increasing memory limits');
    }
    
    if (systemMetrics.memory.memoryPressure === 'critical') {
      response.recommendations.push('Immediate action required - memory usage is critical');
      response.recommendations.push('Consider restarting the application or clearing caches');
    }
    
    if (includeLeaks && memoryStats.leaks) {
      response.leaks = memoryStats.leaks;
    }
    
    if (includeGC && systemMetrics.memory.gcStats) {
      response.garbageCollection = systemMetrics.memory.gcStats;
    }
    
    res.json(response);
  } catch (error) {
    logger.error('Memory endpoint error', error);
    res.status(500).json({
      error: 'Failed to collect memory metrics',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /monitoring/schedulers
 * Scheduler status and metrics
 */
router.get('/schedulers', async (req: Request, res: Response) => {
  try {
    const includeHistory = req.query.includeHistory === 'true';
    
    const schedulerStats = await schedulerManager.getSchedulerStats();
    const systemMetrics = await diagnostics.collectSystemMetrics();
    
    const response: any = {
      timestamp: new Date().toISOString(),
      schedulers: systemMetrics.scheduler,
      summary: {
        total: schedulerStats.schedulers.length,
        running: schedulerStats.schedulers.filter(s => s.status === 'running').length,
        stopped: schedulerStats.schedulers.filter(s => s.status === 'stopped').length,
        error: schedulerStats.schedulers.filter(s => s.status === 'error').length,
      },
    };
    
    if (includeHistory) {
      response.history = schedulerStats.history || [];
    }
    
    res.json(response);
  } catch (error) {
    logger.error('Schedulers endpoint error', error);
    res.status(500).json({
      error: 'Failed to collect scheduler metrics',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /monitoring/errors
 * Error metrics and recent errors
 */
router.get('/errors', async (req: Request, res: Response) => {
  try {
    const timeframe = req.query.timeframe as string || '1h';
    const includeDetails = req.query.includeDetails === 'true';
    
    const errorMetrics = errorHandler.getErrorMetrics();
    const errorHealth = errorHandler.getErrorHealth();
    
    const response: any = {
      timestamp: new Date().toISOString(),
      timeframe,
      metrics: errorMetrics,
      health: errorHealth,
      summary: {
        total: errorMetrics.totalErrors,
        rate: errorMetrics.errorRate,
        userImpact: errorMetrics.userImpact.impactPercentage,
      },
    };
    
    if (includeDetails) {
      // Add recent error details if available
      response.recentErrors = []; // Would be populated from error handler
      response.patterns = []; // Would be populated from error handler
    }
    
    res.json(response);
  } catch (error) {
    logger.error('Errors endpoint error', error);
    res.status(500).json({
      error: 'Failed to collect error metrics',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /monitoring/platform
 * Platform-specific information and limits
 */
router.get('/platform', async (req: Request, res: Response) => {
  try {
    const systemMetrics = await diagnostics.collectSystemMetrics();
    const config = platformAdapter.getOptimalConfig();
    
    res.json({
      timestamp: new Date().toISOString(),
      platform: systemMetrics.platform,
      configuration: config,
      recommendations: [
        'Monitor memory usage closely on Render.com due to 512MB limit',
        'Implement efficient connection pooling for database connections',
        'Use lazy loading for non-critical services to reduce startup time',
      ],
    });
  } catch (error) {
    logger.error('Platform endpoint error', error);
    res.status(500).json({
      error: 'Failed to collect platform information',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /monitoring/gc
 * Trigger garbage collection (for debugging purposes)
 */
router.post('/gc', async (req: Request, res: Response) => {
  try {
    const beforeMemory = process.memoryUsage();
    
    // Trigger garbage collection if available
    if (global.gc) {
      global.gc();
      
      const afterMemory = process.memoryUsage();
      const freed = beforeMemory.heapUsed - afterMemory.heapUsed;
      
      logger.info('Manual garbage collection triggered', {
        beforeHeapUsed: Math.round(beforeMemory.heapUsed / 1024 / 1024),
        afterHeapUsed: Math.round(afterMemory.heapUsed / 1024 / 1024),
        freedMB: Math.round(freed / 1024 / 1024),
      });
      
      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        before: {
          heapUsed: Math.round(beforeMemory.heapUsed / 1024 / 1024),
          heapTotal: Math.round(beforeMemory.heapTotal / 1024 / 1024),
        },
        after: {
          heapUsed: Math.round(afterMemory.heapUsed / 1024 / 1024),
          heapTotal: Math.round(afterMemory.heapTotal / 1024 / 1024),
        },
        freed: Math.round(freed / 1024 / 1024),
      });
    } else {
      res.status(400).json({
        error: 'Garbage collection not available',
        message: 'Start Node.js with --expose-gc flag to enable manual GC',
      });
    }
  } catch (error) {
    logger.error('Manual GC error', error);
    res.status(500).json({
      error: 'Failed to trigger garbage collection',
    });
  }
});

/**
 * GET /monitoring/startup
 * Startup optimization metrics and health
 */
router.get('/startup', async (req: Request, res: Response) => {
  try {
    const { StartupOptimizer } = await import('../services/startupOptimizer');
    const { StartupHealthValidator } = await import('../services/startupHealthValidator');
    const { LazyLoader } = await import('../services/lazyLoader');
    
    const startupOptimizer = StartupOptimizer.getInstance();
    const startupHealthValidator = StartupHealthValidator.getInstance();
    const lazyLoader = LazyLoader.getInstance();
    
    const startupMetrics = startupOptimizer.getStartupMetrics();
    const optimizationRecommendations = startupOptimizer.getOptimizationRecommendations();
    const lazyServiceStatus = lazyLoader.getServiceStatus();
    
    // Perform a quick health validation
    const healthReport = await startupHealthValidator.validateStartupHealth();
    
    res.json({
      timestamp: new Date().toISOString(),
      startup: {
        metrics: startupMetrics,
        recommendations: optimizationRecommendations,
        healthReport: {
          overall: healthReport.overall,
          summary: healthReport.summary,
          duration: healthReport.duration,
        },
      },
      lazyServices: lazyServiceStatus,
      uptime: Math.floor(process.uptime()),
    });
  } catch (error) {
    logger.error('Startup endpoint error', error);
    res.status(500).json({
      error: 'Failed to collect startup information',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /monitoring/startup/validate
 * Trigger startup health validation
 */
router.post('/startup/validate', async (req: Request, res: Response) => {
  try {
    const { StartupHealthValidator } = await import('../services/startupHealthValidator');
    const startupHealthValidator = StartupHealthValidator.getInstance();
    
    logger.info('Manual startup health validation triggered');
    const healthReport = await startupHealthValidator.validateStartupHealth();
    
    res.json({
      timestamp: new Date().toISOString(),
      healthReport,
      message: 'Startup health validation completed',
    });
  } catch (error) {
    logger.error('Startup validation endpoint error', error);
    res.status(500).json({
      error: 'Failed to validate startup health',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /monitoring/lazy/:serviceName/load
 * Load a specific lazy service
 */
router.post('/lazy/:serviceName/load', async (req: Request, res: Response) => {
  try {
    const serviceName = req.params.serviceName;
    const { LazyLoader } = await import('../services/lazyLoader');
    const lazyLoader = LazyLoader.getInstance();
    
    logger.info('Manual lazy service loading triggered', { serviceName });
    
    const startTime = Date.now();
    await lazyLoader.getService(serviceName);
    const duration = Date.now() - startTime;
    
    res.json({
      success: true,
      serviceName,
      duration,
      timestamp: new Date().toISOString(),
      message: `Service '${serviceName}' loaded successfully`,
    });
  } catch (error) {
    logger.error('Lazy service loading error', {
      serviceName: req.params.serviceName,
      error: (error as Error).message,
    });
    
    res.status(500).json({
      success: false,
      serviceName: req.params.serviceName,
      error: (error as Error).message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /monitoring/lazy
 * Get status of all lazy services
 */
router.get('/lazy', async (req: Request, res: Response) => {
  try {
    const { LazyLoader } = await import('../services/lazyLoader');
    const lazyLoader = LazyLoader.getInstance();
    
    const serviceStatus = lazyLoader.getServiceStatus();
    
    res.json({
      timestamp: new Date().toISOString(),
      services: serviceStatus,
      summary: {
        total: Object.keys(serviceStatus).length,
        loaded: Object.values(serviceStatus).filter(status => status === 'loaded').length,
        loading: Object.values(serviceStatus).filter(status => status === 'loading').length,
        notLoaded: Object.values(serviceStatus).filter(status => status === 'not_loaded').length,
      },
    });
  } catch (error) {
    logger.error('Lazy services endpoint error', error);
    res.status(500).json({
      error: 'Failed to get lazy service status',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /monitoring/logs
 * Logging metrics and configuration
 */
router.get('/logs', async (req: Request, res: Response) => {
  try {
    const { EnhancedLogger } = await import('../services/enhancedLogger');
    const { PerformanceMonitor } = await import('../services/performanceMonitor');
    const { LoggingConfigManager } = await import('../services/loggingConfig');
    
    const enhancedLogger = EnhancedLogger.getInstance();
    const performanceMonitor = PerformanceMonitor.getInstance();
    const configManager = LoggingConfigManager.getInstance();
    
    const logMetrics = enhancedLogger.getMetrics();
    const performanceStats = performanceMonitor.getStats();
    const config = configManager.getConfiguration();
    const recommendations = configManager.getRecommendations();
    
    res.json({
      timestamp: new Date().toISOString(),
      metrics: logMetrics,
      performance: {
        totalOperations: performanceStats.totalOperations,
        averageDuration: performanceStats.averageDuration,
        slowOperations: performanceStats.slowOperations,
        criticalOperations: performanceStats.criticalOperations,
      },
      configuration: {
        logLevel: config.logLevel,
        enableStructuredLogging: config.enableStructuredLogging,
        enablePerformanceLogging: config.enablePerformanceLogging,
        enableErrorContextLogging: config.enableErrorContextLogging,
      },
      recommendations,
    });
  } catch (error) {
    logger.error('Logs endpoint error', error);
    res.status(500).json({
      error: 'Failed to collect logging information',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /monitoring/logs/level
 * Update log level (requires admin access)
 */
router.post('/logs/level', requireAdminAccess(), async (req: Request, res: Response) => {
  try {
    const { level } = req.body;
    
    if (!['error', 'warn', 'info', 'http', 'debug'].includes(level)) {
      return res.status(400).json({
        error: 'Invalid log level',
        validLevels: ['error', 'warn', 'info', 'http', 'debug'],
      });
    }
    
    const { LoggingConfigManager } = await import('../services/loggingConfig');
    const configManager = LoggingConfigManager.getInstance();
    
    const previousLevel = configManager.getConfiguration().logLevel;
    configManager.setLogLevel(level);
    
    logger.info('Log level updated via API', {
      previousLevel,
      newLevel: level,
      updatedBy: req.ip,
    });
    
    res.json({
      success: true,
      previousLevel,
      newLevel: level,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Log level update error', error);
    res.status(500).json({
      error: 'Failed to update log level',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /monitoring/logs/debug
 * Enable debug mode temporarily (requires admin access)
 */
router.post('/logs/debug', requireAdminAccess(), async (req: Request, res: Response) => {
  try {
    const { duration = 300000 } = req.body; // 5 minutes default
    
    if (duration > 3600000) { // Max 1 hour
      return res.status(400).json({
        error: 'Maximum debug duration is 1 hour (3600000ms)',
      });
    }
    
    const { LoggingConfigManager } = await import('../services/loggingConfig');
    const configManager = LoggingConfigManager.getInstance();
    
    configManager.enableDebugMode(duration);
    
    logger.info('Debug mode enabled via API', {
      duration,
      enabledBy: req.ip,
    });
    
    res.json({
      success: true,
      debugEnabled: true,
      duration,
      expiresAt: new Date(Date.now() + duration).toISOString(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Debug mode enable error', error);
    res.status(500).json({
      error: 'Failed to enable debug mode',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /monitoring/logs/performance
 * Performance logging metrics
 */
router.get('/logs/performance', async (req: Request, res: Response) => {
  try {
    const { PerformanceMonitor } = await import('../services/performanceMonitor');
    const performanceMonitor = PerformanceMonitor.getInstance();
    
    const stats = performanceMonitor.getStats();
    const slowOperations = performanceMonitor.getSlowOperations(10);
    const memoryIntensiveOperations = performanceMonitor.getMemoryIntensiveOperations(10);
    const activeTimers = performanceMonitor.getActiveTimers();
    
    res.json({
      timestamp: new Date().toISOString(),
      stats,
      slowOperations,
      memoryIntensiveOperations,
      activeTimers,
      summary: {
        totalOperations: stats.totalOperations,
        averageDuration: Math.round(stats.averageDuration),
        slowPercentage: stats.totalOperations > 0 ? 
          Math.round((stats.slowOperations / stats.totalOperations) * 100) : 0,
        criticalPercentage: stats.totalOperations > 0 ? 
          Math.round((stats.criticalOperations / stats.totalOperations) * 100) : 0,
      },
    });
  } catch (error) {
    logger.error('Performance logs endpoint error', error);
    res.status(500).json({
      error: 'Failed to collect performance logging information',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /monitoring/logs/errors
 * Recent error logs and patterns
 */
router.get('/logs/errors', async (req: Request, res: Response) => {
  try {
    const { EnhancedLogger } = await import('../services/enhancedLogger');
    const enhancedLogger = EnhancedLogger.getInstance();
    
    const metrics = enhancedLogger.getMetrics();
    
    res.json({
      timestamp: new Date().toISOString(),
      errorMetrics: {
        totalLogs: metrics.totalLogs,
        errorRate: metrics.errorRate,
        logsByLevel: metrics.logsByLevel,
      },
      recentErrors: metrics.recentErrors.slice(-20), // Last 20 errors
      summary: {
        totalErrors: metrics.logsByLevel.error || 0,
        errorRate: Math.round(metrics.errorRate * 100) / 100,
        recentErrorCount: metrics.recentErrors.length,
      },
    });
  } catch (error) {
    logger.error('Error logs endpoint error', error);
    res.status(500).json({
      error: 'Failed to collect error logging information',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /monitoring/logs/config
 * Current logging configuration
 */
router.get('/logs/config', async (req: Request, res: Response) => {
  try {
    const { LoggingConfigManager } = await import('../services/loggingConfig');
    const configManager = LoggingConfigManager.getInstance();
    
    const config = configManager.getConfiguration();
    const recommendations = configManager.getRecommendations();
    
    res.json({
      timestamp: new Date().toISOString(),
      configuration: config,
      recommendations,
      environment: process.env.NODE_ENV || 'development',
      platform: platformAdapter.getPlatform(),
    });
  } catch (error) {
    logger.error('Logging config endpoint error', error);
    res.status(500).json({
      error: 'Failed to get logging configuration',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * PUT /monitoring/logs/config
 * Update logging configuration
 */
router.put('/logs/config', async (req: Request, res: Response) => {
  try {
    const { LoggingConfigManager } = await import('../services/loggingConfig');
    const configManager = LoggingConfigManager.getInstance();
    
    const updates = req.body;
    const previousConfig = configManager.getConfiguration();
    
    configManager.updateConfiguration(updates);
    const newConfig = configManager.getConfiguration();
    
    logger.info('Logging configuration updated via API', {
      updates,
      updatedBy: req.ip,
      previousLogLevel: previousConfig.logLevel,
      newLogLevel: newConfig.logLevel,
    });
    
    res.json({
      success: true,
      previousConfiguration: previousConfig,
      newConfiguration: newConfig,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Logging config update error', error);
    res.status(500).json({
      error: 'Failed to update logging configuration',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /monitoring/status
 * Overall system status summary
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const [systemMetrics, performanceMetrics, alerts] = await Promise.all([
      diagnostics.collectSystemMetrics(),
      diagnostics.getPerformanceMetrics('5m'),
      diagnostics.getAlerts(),
    ]);
    
    const criticalAlerts = alerts.filter(a => a.severity === 'critical' && !a.acknowledged);
    const errorAlerts = alerts.filter(a => a.severity === 'error' && !a.acknowledged);
    
    let overallStatus = 'healthy';
    const issues: string[] = [];
    
    // Determine overall status
    if (criticalAlerts.length > 0) {
      overallStatus = 'critical';
      issues.push(`${criticalAlerts.length} critical alerts`);
    } else if (errorAlerts.length > 0 || systemMetrics.health.overall === 'unhealthy') {
      overallStatus = 'unhealthy';
      issues.push(`${errorAlerts.length} error alerts`);
    } else if (systemMetrics.health.overall === 'degraded' || performanceMetrics.errorRate > 5) {
      overallStatus = 'degraded';
      if (performanceMetrics.errorRate > 5) {
        issues.push(`High error rate: ${performanceMetrics.errorRate.toFixed(2)}%`);
      }
    }
    
    // Add memory pressure issues
    if (systemMetrics.memory.memoryPressure === 'critical') {
      overallStatus = 'critical';
      issues.push('Critical memory pressure');
    } else if (systemMetrics.memory.memoryPressure === 'high') {
      if (overallStatus === 'healthy') overallStatus = 'degraded';
      issues.push('High memory usage');
    }
    
    res.json({
      timestamp: new Date().toISOString(),
      status: overallStatus,
      uptime: Math.floor(process.uptime()),
      version: process.env.npm_package_version || '1.0.0',
      platform: systemMetrics.platform.platform,
      issues,
      summary: {
        memory: {
          used: systemMetrics.memory.heapUsed,
          total: systemMetrics.memory.heapTotal,
          pressure: systemMetrics.memory.memoryPressure,
        },
        performance: {
          responseTime: performanceMetrics.averageResponseTime,
          throughput: performanceMetrics.throughput,
          errorRate: performanceMetrics.errorRate,
          apdex: performanceMetrics.apdex,
        },
        alerts: {
          total: alerts.length,
          critical: criticalAlerts.length,
          error: errorAlerts.length,
          unacknowledged: alerts.filter(a => !a.acknowledged).length,
        },
        health: {
          overall: systemMetrics.health.overall,
          components: systemMetrics.health.components.length,
          failing: systemMetrics.health.components.filter(c => c.status !== 'healthy').length,
        },
      },
    });
  } catch (error) {
    logger.error('Status endpoint error', error);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Failed to determine system status',
    });
  }
});

export default router;