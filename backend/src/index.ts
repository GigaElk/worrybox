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

// HTTP request logging
app.use(morgan('combined', { stream: morganStream }));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoints
const healthCheckService = HealthCheckService.getInstance();

// Detailed health check for monitoring
app.get('/api/health', async (req, res) => {
  try {
    const healthStatus = await healthCheckService.performHealthCheck();
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
import { SchedulingService } from './services/schedulingService';
import { NotificationScheduler } from './services/notificationScheduler';
import { AIReprocessingService } from './services/aiReprocessingService';

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

// Catch-all for undefined routes
app.use('/api', (req, res) => {
  res.status(404).json({ 
    error: { 
      code: 'NOT_FOUND', 
      message: 'API endpoint not found' 
    } 
  });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Handle JSON parsing errors specifically
  if (err instanceof SyntaxError && err.message.includes('JSON')) {
    logger.error('JSON parsing error', {
      error: err.message,
      path: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
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

  // Handle all other errors
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  res.status(err.status || 500).json({
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'Something went wrong',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    },
    timestamp: new Date().toISOString(),
    path: req.path
  });
});

app.listen(PORT, () => {
  logger.info(`🚀 Worrybox API server running on port ${PORT}`);
  logger.info(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Start the post scheduler
  const scheduler = SchedulingService.getInstance();
  scheduler.startScheduler();
  logger.info('📅 Post scheduler started');
  
  // Start the notification scheduler
  const notificationScheduler = NotificationScheduler.getInstance();
  notificationScheduler.startScheduler();
  logger.info('🔔 Notification scheduler started');
  
  // Start the AI reprocessing scheduler
  const aiReprocessingService = AIReprocessingService.getInstance();
  aiReprocessingService.startScheduler();
  logger.info('🤖 AI reprocessing scheduler started');
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});