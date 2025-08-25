import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
// const rateLimit = require('express-rate-limit'); // Temporarily disabled
import morgan from 'morgan';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import logger, { morganStream } from './services/logger';
import { HealthCheckService } from './services/healthCheck';

// Load environment variables
dotenv.config();

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'https://worrybox.gigaelk.com',
    'http://localhost:3000',
    'http://localhost:5173', // Vite dev server
  ],
  credentials: true,
}));

// Rate limiting - temporarily disabled due to dependency issues
console.log('🔓 Rate limiting disabled for now');

// Enhanced comprehensive logging middleware
const comprehensiveLogging = createComprehensiveLogging();
app.use(comprehensiveLogging.comprehensiveLogging);
app.use(comprehensiveLogging.slowOperationDetection);
app.use(comprehensiveLogging.memoryMonitoring);

// HTTP request logging (fallback)
app.use(morgan('combined', { stream: morganStream }));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Import performance tracking middleware
import { performanceTracking } from './middleware/performanceTracking';
import { platformOptimization } from './middleware/platformOptimization';
import { databaseRecoveryMiddleware } from './middleware/databaseRecovery';
import { memoryMonitoring } from './middleware/memoryMonitoring';
import { schedulerResilienceMiddleware } from './middleware/schedulerResilience';
import { errorHandlingMiddleware } from './middleware/errorHandling';
import { SchedulerMonitorService } from './services/schedulerMonitor';
import { SchedulerResilienceService } from './services/schedulerResilience';
import { ErrorHandlingService } from './services/errorHandling';
import { DiagnosticsService } from './services/diagnosticsService';
import { StartupOptimizer } from './services/startupOptimizer';
import { LazyLoader } from './services/lazyLoader';
import { StartupHealthValidator } from './services/startupHealthValidator';
import { EnhancedLogger } from './services/enhancedLogger';
import { PerformanceMonitor } from './services/performanceMonitor';
import { LoggingConfigManager } from './services/loggingConfig';
import { createComprehensiveLogging } from './middleware/comprehensiveLogging';
import { gracefulShutdown } from './services/gracefulShutdown';
import { PlatformAdapterService } from './services/platformAdapter';
import { RenderOptimizationService } from './services/renderOptimizations';
import { MemoryManagerService } from './services/memoryManager';
import { DatabaseConnection } from './utils/databaseConnection';

// Initialize platform adapter and optimizations
const platformAdapter = PlatformAdapterService.getInstance();
const renderOptimization = RenderOptimizationService.getInstance();
const memoryManager = MemoryManagerService.getInstance();
const schedulerResilience = SchedulerResilienceService.getInstance();
const errorHandling = ErrorHandlingService.getInstance();
const diagnostics = DiagnosticsService.getInstance();
const startupOptimizer = StartupOptimizer.getInstance();
const lazyLoader = LazyLoader.getInstance();
const startupHealthValidator = StartupHealthValidator.getInstance();
const enhancedLogger = EnhancedLogger.getInstance();
const performanceMonitor = PerformanceMonitor.getInstance();
const loggingConfigManager = LoggingConfigManager.getInstance();

// Add platform optimization middleware
app.use(platformOptimization.addPlatformInfo());
app.use(platformOptimization.trackActivity());
app.use(platformOptimization.applyRequestOptimizations());
app.use(platformOptimization.monitorMemoryUsage());
app.use(platformOptimization.addHealthHeaders());

// Add performance tracking middleware
app.use(performanceTracking.addCorrelationId());
app.use(performanceTracking.trackPerformance());

// Use platform-specific timeout instead of hardcoded value
const config = platformAdapter.getConfig();
app.use(performanceTracking.requestTimeout(config.requestTimeout));

// Add database recovery middleware
app.use(databaseRecoveryMiddleware.injectDatabaseConnection());
app.use(databaseRecoveryMiddleware.trackDatabaseMetrics());

// Add memory monitoring middleware
app.use(memoryMonitoring.addMemoryHeaders());
app.use(memoryMonitoring.monitorRequestMemory());
app.use(memoryMonitoring.handleMemoryPressure());
app.use(memoryMonitoring.proactiveMemoryManagement());

// Add error handling middleware
app.use(errorHandlingMiddleware.injectErrorContext());
app.use(errorHandlingMiddleware.implementRequestTimeout());
app.use(errorHandlingMiddleware.trackRequestMetrics());
app.use(errorHandlingMiddleware.circuitBreakerMiddleware());

// Add scheduler resilience middleware
app.use(schedulerResilienceMiddleware.addSchedulerHeaders());
app.use(schedulerResilienceMiddleware.monitorSchedulerImpact());
app.use(schedulerResilienceMiddleware.handleSchedulerDegradation());

// Health check endpoints
const healthCheckService = HealthCheckService.getInstance();
const schedulerMonitor = SchedulerMonitorService.getInstance();

// Enhanced health check for monitoring
app.get('/api/health', async (req, res) => {
  try {
    const healthStatus = await healthCheckService.performEnhancedHealthCheck();
    const statusCode = healthStatus.status === 'healthy' ? 200 : 
                      healthStatus.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    logger.error('Health check endpoint error', error);
    res.status(503).json({
      status: 'unhealthy',
      message: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Legacy health check for backward compatibility
app.get('/api/health/legacy', async (req, res) => {
  try {
    const healthStatus = await healthCheckService.performHealthCheck();
    const statusCode = healthStatus.status === 'healthy' ? 200 : 
                      healthStatus.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    logger.error('Legacy health check endpoint error', error);
    res.status(503).json({
      status: 'unhealthy',
      message: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Simple health check for Docker/load balancer
app.get('/health', async (req, res) => {
  const isHealthy = await healthCheckService.isHealthy();
  res.status(isHealthy ? 200 : 503).send(isHealthy ? 'OK' : 'UNHEALTHY');
});

// Database wake-up endpoint
app.get('/api/wake', async (req, res) => {
  try {
    // Simple database query to wake up the connection
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    await prisma.$queryRaw`SELECT 1`;
    await prisma.$disconnect();
    
    res.json({
      status: 'awake',
      message: 'Database connection established',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Database wake-up failed', error);
    res.status(503).json({
      status: 'sleeping',
      message: 'Database connection failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Performance metrics endpoint
app.get('/api/metrics', async (req, res) => {
  try {
    const performanceService = PerformanceMetricsService.getInstance();
    const requestMetrics = performanceService.getRequestMetrics();
    const slowestEndpoints = performanceService.getSlowestEndpoints(10);
    const memoryTrend = performanceService.getMemoryTrend(30);

    res.json({
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      requestMetrics,
      slowestEndpoints,
      memoryTrend,
      platform: process.env.RENDER ? 'render' : 'other',
    });
  } catch (error) {
    logger.error('Metrics endpoint error', error);
    res.status(500).json({
      error: 'Failed to retrieve metrics',
      timestamp: new Date().toISOString()
    });
  }
});

// Diagnostics endpoint for troubleshooting
app.get('/api/diagnostics', async (req, res) => {
  try {
    const healthStatus = await healthCheckService.performEnhancedHealthCheck();
    const performanceService = PerformanceMetricsService.getInstance();
    
    const diagnostics = {
      timestamp: new Date().toISOString(),
      correlationId: healthStatus.correlationId,
      system: {
        platform: healthStatus.platform,
        nodeVersion: process.version,
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
      },
      performance: {
        slowestEndpoints: performanceService.getSlowestEndpoints(5),
        memoryTrend: performanceService.getMemoryTrend(15),
        errorRate: performanceService.getRequestMetrics().errorRate,
        averageResponseTime: performanceService.getRequestMetrics().averageResponseTime,
      },
      health: healthStatus,
      recommendations: generateRecommendations(healthStatus),
    };

    res.json(diagnostics);
  } catch (error) {
    logger.error('Diagnostics endpoint error', error);
    res.status(500).json({
      error: 'Failed to generate diagnostics',
      timestamp: new Date().toISOString()
    });
  }
});

// Platform information endpoint
app.get('/api/platform', (req, res) => {
  try {
    const platform = platformAdapter.getPlatform();
    const config = platformAdapter.getConfig();
    const features = platformAdapter.getPlatformFeatures();
    const limits = platformAdapter.monitorResourceLimits();
    const recommendations = platformAdapter.getOptimizationRecommendations();

    res.json({
      platform,
      config,
      features,
      limits,
      recommendations,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Platform endpoint error', error);
    res.status(500).json({
      error: 'Failed to retrieve platform information',
      timestamp: new Date().toISOString()
    });
  }
});

// Render-specific health check endpoint
app.get('/api/health/render', async (req, res) => {
  try {
    if (!platformAdapter.isRender()) {
      return res.status(404).json({
        error: 'Not running on Render.com',
        platform: platformAdapter.getPlatform(),
      });
    }

    const renderHealth = await renderOptimization.performRenderHealthCheck();
    const statusCode = renderHealth.status === 'healthy' ? 200 : 
                      renderHealth.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json(renderHealth);
  } catch (error) {
    logger.error('Render health check endpoint error', error);
    res.status(503).json({
      status: 'unhealthy',
      message: 'Render health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Platform optimization trigger endpoint
app.post('/api/platform/optimize', async (req, res) => {
  try {
    const platform = platformAdapter.getPlatform();
    
    if (platform === 'render') {
      // Trigger Render-specific optimizations
      await renderOptimization.initialize();
      
      res.json({
        message: 'Render.com optimizations applied',
        platform,
        timestamp: new Date().toISOString(),
      });
    } else {
      res.json({
        message: 'No platform-specific optimizations available',
        platform,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    logger.error('Platform optimization endpoint error', error);
    res.status(500).json({
      error: 'Failed to apply platform optimizations',
      timestamp: new Date().toISOString()
    });
  }
});

// Database health endpoint
app.get('/api/database/health', databaseRecoveryMiddleware.healthEndpoint());

// Database recovery endpoint
app.post('/api/database/recover', databaseRecoveryMiddleware.recoveryEndpoint());

// Database metrics endpoint
app.get('/api/database/metrics', async (req, res) => {
  try {
    const metrics = DatabaseConnection.getHealthMetrics();
    
    if (!metrics) {
      return res.status(503).json({
        error: 'Database metrics unavailable',
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      ...metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Database metrics endpoint error', error);
    res.status(500).json({
      error: 'Failed to retrieve database metrics',
      timestamp: new Date().toISOString()
    });
  }
});

// Memory management endpoints
app.get('/api/memory/health', memoryMonitoring.memoryHealthEndpoint());
app.get('/api/memory/metrics', memoryMonitoring.memoryMetricsEndpoint());
app.get('/api/memory/leak-detection', memoryMonitoring.memoryLeakEndpoint());
app.post('/api/memory/gc', memoryMonitoring.forceGcEndpoint());
app.post('/api/memory/emergency-cleanup', memoryMonitoring.emergencyCleanupEndpoint());

// Scheduler resilience endpoints
app.get('/api/scheduler/health', schedulerResilienceMiddleware.schedulerHealthEndpoint());
app.get('/api/scheduler/:schedulerName/health', schedulerResilienceMiddleware.individualSchedulerHealthEndpoint());
app.post('/api/scheduler/:schedulerName/start', schedulerResilienceMiddleware.startSchedulerEndpoint());
app.post('/api/scheduler/:schedulerName/stop', schedulerResilienceMiddleware.stopSchedulerEndpoint());
app.post('/api/scheduler/:schedulerName/restart', schedulerResilienceMiddleware.restartSchedulerEndpoint());
app.post('/api/scheduler/:schedulerName/recover', schedulerResilienceMiddleware.performRecoveryEndpoint());
app.post('/api/scheduler/start-all', schedulerResilienceMiddleware.startAllSchedulersEndpoint());
app.post('/api/scheduler/stop-all', schedulerResilienceMiddleware.stopAllSchedulersEndpoint());

// Error handling endpoints
app.get('/api/errors/metrics', errorHandlingMiddleware.errorMetricsEndpoint());
app.get('/api/errors/alerts', errorHandlingMiddleware.errorAlertsEndpoint());
app.post('/api/errors/alerts/:alertId/acknowledge', errorHandlingMiddleware.acknowledgeAlertEndpoint());
app.post('/api/errors/alerts/:alertId/resolve', errorHandlingMiddleware.resolveAlertEndpoint());

// Development error testing endpoints
if (process.env.NODE_ENV === 'development') {
  app.get('/api/test/error/:errorType?', errorHandlingMiddleware.testErrorEndpoint());
  
  // Add monitoring test endpoints
  const monitoringTestRoutes = require('./routes/monitoringTest').default;
  app.use('/api/test', monitoringTestRoutes);
}

// Helper function to generate recommendations
function generateRecommendations(health: any): string[] {
  const recommendations: string[] = [];
  
  if (health.metrics.memoryUsage.usagePercent > 80) {
    recommendations.push('Consider restarting the service to free memory');
    recommendations.push('Monitor for memory leaks in application code');
  }
  
  if (health.metrics.requestMetrics.errorRate > 5) {
    recommendations.push('Investigate high error rate in application logs');
    recommendations.push('Check database connectivity and external service health');
  }
  
  if (health.metrics.requestMetrics.averageResponseTime > 2000) {
    recommendations.push('Optimize slow database queries');
    recommendations.push('Consider adding caching for frequently accessed data');
  }
  
  const failedSchedulers = health.checks.schedulers.details?.failedSchedulers || 0;
  if (failedSchedulers > 0) {
    recommendations.push('Restart failed schedulers');
    recommendations.push('Check scheduler error logs for root cause');
  }
  
  if (health.platform === 'render' && health.metrics.memoryUsage.heapUsed > 400) {
    recommendations.push('Memory usage approaching Render.com limits - consider optimization');
  }
  
  return recommendations;
}

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import postRoutes from './routes/posts';
import followRoutes from './routes/follows';
import likeRoutes from './routes/likes';
import commentRoutes from './routes/comments';
import schedulingRoutes from './routes/scheduling';
import moderationRoutes from './routes/moderation';
import worryAnalysisRoutes from './routes/worryAnalysis';
import subscriptionRoutes from './routes/subscriptions';
import analyticsRoutes from './routes/analytics';
import demographicAnalyticsRoutes from './routes/demographicAnalytics';
import worryResolutionRoutes from './routes/worryResolution';
// import guidedExercisesRoutes from './routes/guidedExercises';
// import mentalHealthResourcesRoutes from './routes/mentalHealthResources';
import notificationsRoutes from './routes/notifications';
import languagesRoutes from './routes/languages';
import dashboardRoutes from './routes/dashboard';
import statusRoutes from './routes/status';
import wellnessRoutes from './routes/wellness';
import adminRoutes from './routes/admin';
import monitoringRoutes from './routes/monitoring';
import { SchedulingService } from './services/schedulingService';
import { NotificationScheduler } from './services/notificationScheduler';
import { AIReprocessingService } from './services/aiReprocessingService';
import { PerformanceMetricsService } from './services/performanceMetrics';

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/follows', followRoutes);
app.use('/api/likes', likeRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/scheduling', schedulingRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/analysis', worryAnalysisRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/demographics', demographicAnalyticsRoutes);
app.use('/api/resolutions', worryResolutionRoutes);
app.use('/api/wellness', wellnessRoutes);
// app.use('/api/resources', mentalHealthResourcesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/languages', languagesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/monitoring', monitoringRoutes);

// Catch-all for undefined routes
app.use('/api', (req, res) => {
  res.status(404).json({ 
    error: { 
      code: 'NOT_FOUND', 
      message: 'API endpoint not found' 
    } 
  });
});

// Memory error handler
app.use(memoryMonitoringMiddleware.handleMemoryErrors());

// Database error handler
app.use(databaseRecoveryMiddleware.handleDatabaseErrors());

// Platform-specific error handler
app.use(platformOptimization.handlePlatformErrors());

// Enhanced error logging middleware
app.use(comprehensiveLogging.errorLogging);

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Handle JSON parsing errors specifically
  if (err instanceof SyntaxError && err.message.includes('JSON')) {
    enhancedLogger.error('JSON parsing error', err, {
      path: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      correlationId: (req as any).loggingContext?.correlationId,
    });
    
    return res.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'Invalid JSON format in request body'
      },
      timestamp: new Date().toISOString(),
      path: req.path
    });
  }

  // Enhanced global error handler with recovery
  return errorHandlingMiddleware.globalErrorHandler()(err, req, res, next);
});

const server = app.listen(PORT, async () => {
  const overallStartTime = Date.now();
  
  enhancedLogger.info('🚀 Worrybox API server starting up with comprehensive logging and optimization', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    platform: platformAdapter.getPlatform(),
    nodeVersion: process.version,
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    loggingConfig: {
      logLevel: loggingConfigManager.getConfiguration().logLevel,
      structuredLogging: loggingConfigManager.getConfiguration().enableStructuredLogging,
      performanceLogging: loggingConfigManager.getConfiguration().enablePerformanceLogging,
    },
  });

  try {
    // Phase 1: Optimize startup process
    logger.info('Phase 1: Optimizing startup process');
    const startupMetrics = await startupOptimizer.optimizeStartup();
    
    logger.info('Startup optimization completed', {
      duration: startupMetrics.totalDuration,
      servicesInitialized: startupMetrics.servicesInitialized.length,
      servicesFailed: startupMetrics.servicesFailed.length,
      memoryUsed: startupMetrics.memoryUsage.final ? 
        Math.round(startupMetrics.memoryUsage.final.heapUsed / 1024 / 1024) : 0,
    });

    // Phase 2: Validate startup health
    logger.info('Phase 2: Validating startup health');
    const healthReport = await startupHealthValidator.validateStartupHealth();
    
    if (healthReport.overall === 'critical') {
      logger.error('Critical startup health issues detected', {
        overall: healthReport.overall,
        criticalFailures: healthReport.summary.critical,
        recommendations: healthReport.recommendations,
      });
      
      // Don't exit, but log the critical issues
      logger.warn('Continuing startup despite critical issues - monitor closely');
    } else {
      logger.info('Startup health validation completed', {
        overall: healthReport.overall,
        passed: healthReport.summary.passed,
        total: healthReport.summary.total,
        duration: healthReport.duration,
      });
    }

    // Phase 3: Initialize lazy-loaded services (non-blocking)
    logger.info('Phase 3: Setting up lazy-loaded services');
    
    // Preload critical lazy services in the background
    setImmediate(async () => {
      try {
        await lazyLoader.preloadServices(['diagnostics', 'error-handling']);
        logger.info('Critical lazy services preloaded');
      } catch (error) {
        logger.warn('Failed to preload some lazy services', error);
      }
    });

    // Phase 4: Apply platform-specific optimizations
    logger.info('Phase 4: Applying platform-specific optimizations');
    const platform = platformAdapter.getPlatform();
    const config = platformAdapter.getOptimalConfig();
    
    if (platformAdapter.shouldOptimizeForColdStart()) {
      logger.info('Applying cold start optimizations', { platform });
      await platformAdapter.handleColdStart();
    }

    if (platform === 'render') {
      logger.info('Initializing Render.com optimizations');
      await renderOptimization.initialize();
    }
  
    // Phase 5: Initialize schedulers (lazy-loaded)
    logger.info('Phase 5: Initializing schedulers (lazy-loaded)');
    
    // Register schedulers for monitoring
    schedulerMonitor.registerScheduler('PostScheduler');
    schedulerMonitor.registerScheduler('NotificationScheduler');
    schedulerMonitor.registerScheduler('AIReprocessingScheduler');

    // Start schedulers using lazy loading
    setImmediate(async () => {
      try {
        const schedulers = await lazyLoader.getService('schedulers');
        
        // Start the post scheduler
        try {
          schedulerMonitor.onSchedulerStart('PostScheduler');
          schedulers.schedulingService.startScheduler();
          schedulerMonitor.onSchedulerRun('PostScheduler', true);
          logger.info('📅 Post scheduler started (lazy-loaded)');
        } catch (error) {
          schedulerMonitor.onSchedulerError('PostScheduler', error as Error);
          logger.error('Failed to start post scheduler', error);
        }
        
        // Start the notification scheduler
        try {
          schedulerMonitor.onSchedulerStart('NotificationScheduler');
          schedulers.notificationScheduler.startScheduler();
          schedulerMonitor.onSchedulerRun('NotificationScheduler', true);
          logger.info('🔔 Notification scheduler started (lazy-loaded)');
        } catch (error) {
          schedulerMonitor.onSchedulerError('NotificationScheduler', error as Error);
          logger.error('Failed to start notification scheduler', error);
        }
        
        // Start the AI reprocessing scheduler
        try {
          schedulerMonitor.onSchedulerStart('AIReprocessingScheduler');
          schedulers.aiReprocessingService.startScheduler();
          schedulerMonitor.onSchedulerRun('AIReprocessingScheduler', true);
          logger.info('🤖 AI reprocessing scheduler started (lazy-loaded)');
        } catch (error) {
          schedulerMonitor.onSchedulerError('AIReprocessingScheduler', error as Error);
          logger.error('Failed to start AI reprocessing scheduler', error);
        }
      } catch (error) {
        logger.error('Failed to initialize schedulers', error);
      }
    });

    // Phase 6: Initialize background services (lazy-loaded)
    logger.info('Phase 6: Initializing background services');
    
    // Send welcome emails to users who haven't received them (lazy-loaded)
    setTimeout(async () => {
      try {
        const emailService = await lazyLoader.getService('email-service');
        await emailService.sendMissingWelcomeEmails();
        logger.info('Welcome email service initialized and executed');
      } catch (error) {
        logger.error('Failed to send missing welcome emails:', error);
      }
    }, 10000); // 10 second delay to let everything initialize

    // Log successful startup
    const overallStartupDuration = Date.now() - overallStartTime;
    const finalMemoryUsage = process.memoryUsage();
    const limits = platformAdapter.monitorResourceLimits();
    const optimizationRecommendations = startupOptimizer.getOptimizationRecommendations();
    
    logger.info('✅ Worrybox API server startup completed with optimization', {
      overallStartupDuration,
      startupOptimization: {
        duration: startupMetrics.totalDuration,
        servicesInitialized: startupMetrics.servicesInitialized.length,
        servicesFailed: startupMetrics.servicesFailed.length,
        warnings: startupMetrics.warnings.length,
      },
      healthValidation: {
        overall: healthReport.overall,
        passed: healthReport.summary.passed,
        total: healthReport.summary.total,
      },
      platform,
      platformOptimizations: config.enableOptimizations,
      coldStartOptimized: platformAdapter.shouldOptimizeForColdStart(),
      finalMemoryUsage: {
        heapUsed: Math.round(finalMemoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(finalMemoryUsage.heapTotal / 1024 / 1024),
        memoryPercentage: limits.memory.percentage,
      },
      lazyServices: Object.keys(lazyLoader.getServiceStatus()),
      optimizationRecommendations,
      middlewareEnabled: ['cors', 'helmet', 'morgan', 'performanceTracking', 'platformOptimization', 'errorHandling', 'databaseRecovery', 'memoryMonitoring', 'schedulerResilience'],
      healthEndpoints: ['/health', '/api/health', '/api/health/render', '/api/metrics', '/api/diagnostics', '/api/platform', '/api/database/health', '/api/memory/health', '/api/scheduler/health', '/api/errors/metrics', '/api/monitoring/health', '/api/monitoring/metrics', '/api/monitoring/diagnostics', '/api/monitoring/performance', '/api/monitoring/status'],
    });

    // Perform final health check
    try {
      const initialHealth = await healthCheckService.performEnhancedHealthCheck();
      const dbMetrics = DatabaseConnection.getHealthMetrics();
      const memoryHealth = memoryManager.getMemoryHealthReport();
      
      logger.info('📊 Final health check completed', {
        status: initialHealth.status,
        memoryUsage: initialHealth.metrics.memoryUsage.usagePercent,
        memoryStatus: memoryHealth.status,
        memoryTrend: memoryHealth.trend.trend,
        databaseStatus: initialHealth.checks.database.status,
        databaseRecovery: {
          connectionStatus: dbMetrics?.connectionStatus,
          poolHealth: dbMetrics?.poolMetrics.poolHealth,
          queuedOperations: dbMetrics?.poolMetrics.queuedRequests,
        },
        platform: initialHealth.platform,
      });
    } catch (error) {
      logger.error('Final health check failed', error);
    }

  } catch (startupError) {
    logger.error('Startup optimization failed', startupError);
    // Continue with basic startup
    logger.warn('Falling back to basic startup mode');
  }

  // Initialize graceful shutdown system (replaces old process.exit calls)
  gracefulShutdown.initialize(server);
  
  logger.info('🎯 Worrybox API server ready and running', {
    port: PORT,
    platform,
    uptime: process.uptime(),
    memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    monitoringEndpoints: [
      '/api/monitoring/health',
      '/api/monitoring/metrics',
      '/api/monitoring/diagnostics',
      '/api/monitoring/performance',
      '/api/monitoring/alerts',
      '/api/monitoring/memory',
      '/api/monitoring/schedulers',
      '/api/monitoring/errors',
      '/api/monitoring/platform',
      '/api/monitoring/status',
    ],
  });
});
