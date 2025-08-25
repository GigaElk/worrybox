import {
  SchedulerConfig,
  SchedulerHealth,
  SchedulerRecoveryAction,
  SchedulerExecutionContext,
  SchedulerMetrics,
  SchedulerStartupPlan,
  SchedulerShutdownPlan,
  SchedulerResilienceConfig,
  SchedulerEvent,
  SchedulerRegistry,
  SchedulerExecutor,
  SchedulerManager,
} from '../types/scheduler';
import { CorrelationService } from './correlationService';
import { PlatformAdapterService } from './platformAdapter';
import logger from './logger';
import { randomUUID } from 'crypto';
import * as cron from 'node-cron';
export 
class SchedulerResilienceService implements SchedulerManager {
  private static instance: SchedulerResilienceService;
  private registry: SchedulerRegistry;
  private config: SchedulerResilienceConfig;
  private correlationService: CorrelationService;
  private platformAdapter: PlatformAdapterService;
  
  // Monitoring and recovery
  private healthCheckInterval?: NodeJS.Timeout;
  private recoveryInterval?: NodeJS.Timeout;
  private cronJobs: Map<string, cron.ScheduledTask> = new Map();
  private intervalJobs: Map<string, NodeJS.Timeout> = new Map();
  
  // State management
  private isInitialized = false;
  private isShuttingDown = false;
  private startupInProgress = false;
  private shutdownInProgress = false;

  private constructor() {
    this.correlationService = CorrelationService.getInstance();
    this.platformAdapter = PlatformAdapterService.getInstance();
    this.config = this.getOptimalConfig();
    this.registry = this.initializeRegistry();
  }

  public static getInstance(): SchedulerResilienceService {
    if (!SchedulerResilienceService.instance) {
      SchedulerResilienceService.instance = new SchedulerResilienceService();
    }
    return SchedulerResilienceService.instance;
  }

  /**
   * Initialize the scheduler resilience system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    logger.info('Initializing scheduler resilience system', {
      config: this.config,
      platform: this.platformAdapter.getPlatform(),
    });

    // Start health monitoring if enabled
    if (this.config.healthCheckInterval > 0) {
      this.startHealthMonitoring();
    }

    // Start recovery monitoring if enabled
    if (this.config.recoveryEnabled) {
      this.startRecoveryMonitoring();
    }

    this.isInitialized = true;
    logger.info('Scheduler resilience system initialized');
  }

  /**
   * Register a scheduler with the resilience system
   */
  async register(config: SchedulerConfig, executor: SchedulerExecutor): Promise<void> {
    if (this.registry.schedulers.has(config.name)) {
      throw new Error(`Scheduler ${config.name} is already registered`);
    }

    // Validate configuration
    this.validateSchedulerConfig(config);

    // Register scheduler
    this.registry.schedulers.set(config.name, config);

    // Initialize health tracking
    const health: SchedulerHealth = {
      name: config.name,
      status: 'stopped',
      lastHealthCheck: new Date().toISOString(),
      consecutiveFailures: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      errorRate: 0,
      averageExecutionTime: 0,
      lastExecution: null,
      uptime: 0,
      restartCount: 0,
    };
    this.registry.health.set(config.name, health);

    // Initialize metrics
    const metrics: SchedulerMetrics = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      minExecutionTime: Infinity,
      maxExecutionTime: 0,
      totalMemoryUsage: 0,
      peakMemoryUsage: 0,
      errorRate: 0,
      uptime: 0,
      restartCount: 0,
    };
    this.registry.metrics.set(config.name, metrics);

    // Store executor reference
    (executor as any)._schedulerName = config.name;
    (this as any)[`_executor_${config.name}`] = executor;

    this.logEvent({
      type: 'start',
      timestamp: new Date().toISOString(),
      schedulerName: config.name,
      data: { registered: true },
    });

    logger.info('Scheduler registered', {
      schedulerName: config.name,
      config: {
        enabled: config.enabled,
        cronExpression: config.cronExpression,
        interval: config.interval,
        maxRetries: config.maxRetries,
        priority: config.priority,
      },
    });
  }

  /**
   * Start a specific scheduler
   */
  async start(schedulerName: string): Promise<void> {
    const config = this.registry.schedulers.get(schedulerName);
    const health = this.registry.health.get(schedulerName);
    
    if (!config || !health) {
      throw new Error(`Scheduler ${schedulerName} not found`);
    }

    if (!config.enabled) {
      logger.warn('Attempted to start disabled scheduler', { schedulerName });
      return;
    }

    if (health.status === 'starting' || health.status === 'healthy') {
      logger.warn('Scheduler already starting or running', { schedulerName });
      return;
    }

    logger.info('Starting scheduler', { schedulerName });

    try {
      // Update status
      health.status = 'starting';
      health.lastHealthCheck = new Date().toISOString();
      this.registry.health.set(schedulerName, health);

      // Check dependencies
      await this.checkDependencies(schedulerName);

      // Get executor
      const executor = this.getExecutor(schedulerName);

      // Call onStart hook if available
      if (executor.onStart) {
        await executor.onStart();
      }

      // Schedule the job
      await this.scheduleJob(schedulerName, config, executor);

      // Update status to healthy
      health.status = 'healthy';
      health.uptime = 0;
      this.registry.health.set(schedulerName, health);

      this.logEvent({
        type: 'start',
        timestamp: new Date().toISOString(),
        schedulerName,
        data: { success: true },
      });

      logger.info('Scheduler started successfully', { schedulerName });

    } catch (error) {
      health.status = 'unhealthy';
      health.consecutiveFailures++;
      this.registry.health.set(schedulerName, health);

      this.logEvent({
        type: 'error',
        timestamp: new Date().toISOString(),
        schedulerName,
        error: (error as Error).message,
      });

      logger.error('Failed to start scheduler', {
        schedulerName,
        error: (error as Error).message,
      });

      throw error;
    }
  }

  /**
   * Stop a specific scheduler
   */
  async stop(schedulerName: string): Promise<void> {
    const health = this.registry.health.get(schedulerName);
    
    if (!health) {
      throw new Error(`Scheduler ${schedulerName} not found`);
    }

    if (health.status === 'stopped' || health.status === 'stopping') {
      logger.warn('Scheduler already stopped or stopping', { schedulerName });
      return;
    }

    logger.info('Stopping scheduler', { schedulerName });

    try {
      // Update status
      health.status = 'stopping';
      this.registry.health.set(schedulerName, health);

      // Stop scheduled job
      await this.unscheduleJob(schedulerName);

      // Wait for active executions to complete
      await this.waitForActiveExecutions(schedulerName);

      // Call onStop hook if available
      const executor = this.getExecutor(schedulerName);
      if (executor.onStop) {
        await executor.onStop();
      }

      // Update status
      health.status = 'stopped';
      this.registry.health.set(schedulerName, health);

      this.logEvent({
        type: 'stop',
        timestamp: new Date().toISOString(),
        schedulerName,
        data: { success: true },
      });

      logger.info('Scheduler stopped successfully', { schedulerName });

    } catch (error) {
      logger.error('Failed to stop scheduler', {
        schedulerName,
        error: (error as Error).message,
      });

      throw error;
    }
  }

  /**
   * Restart a specific scheduler
   */
  async restart(schedulerName: string): Promise<void> {
    const health = this.registry.health.get(schedulerName);
    const metrics = this.registry.metrics.get(schedulerName);
    
    if (!health || !metrics) {
      throw new Error(`Scheduler ${schedulerName} not found`);
    }

    logger.info('Restarting scheduler', { schedulerName });

    const startTime = Date.now();

    try {
      // Stop the scheduler
      await this.stop(schedulerName);

      // Wait for restart delay
      const config = this.registry.schedulers.get(schedulerName);
      if (config && config.restartDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, config.restartDelay));
      }

      // Start the scheduler
      await this.start(schedulerName);

      // Update metrics
      metrics.restartCount++;
      metrics.lastRestart = new Date().toISOString();
      this.registry.metrics.set(schedulerName, metrics);

      // Update health
      health.restartCount++;
      this.registry.health.set(schedulerName, health);

      const action: SchedulerRecoveryAction = {
        type: 'restart',
        timestamp: new Date().toISOString(),
        schedulerName,
        reason: 'Manual restart',
        success: true,
        duration: Date.now() - startTime,
      };

      this.registry.recoveryActions.push(action);
      this.limitArraySize(this.registry.recoveryActions, 100);

      this.logEvent({
        type: 'restart',
        timestamp: new Date().toISOString(),
        schedulerName,
        data: { success: true, duration: action.duration },
      });

      logger.info('Scheduler restarted successfully', {
        schedulerName,
        duration: action.duration,
        restartCount: health.restartCount,
      });

    } catch (error) {
      const action: SchedulerRecoveryAction = {
        type: 'restart',
        timestamp: new Date().toISOString(),
        schedulerName,
        reason: 'Manual restart',
        success: false,
        duration: Date.now() - startTime,
        details: { error: (error as Error).message },
      };

      this.registry.recoveryActions.push(action);

      logger.error('Failed to restart scheduler', {
        schedulerName,
        error: (error as Error).message,
      });

      throw error;
    }
  }

  /**
   * Start all enabled schedulers with staggered startup
   */
  async startAll(): Promise<void> {
    if (this.startupInProgress) {
      logger.warn('Startup already in progress');
      return;
    }

    this.startupInProgress = true;

    try {
      logger.info('Starting all schedulers');

      if (this.config.staggeredStartup) {
        await this.performStaggeredStartup();
      } else {
        await this.performParallelStartup();
      }

      logger.info('All schedulers started');

    } finally {
      this.startupInProgress = false;
    }
  }

  /**
   * Stop all schedulers with graceful shutdown
   */
  async stopAll(): Promise<void> {
    if (this.shutdownInProgress) {
      logger.warn('Shutdown already in progress');
      return;
    }

    this.shutdownInProgress = true;
    this.isShuttingDown = true;

    try {
      logger.info('Stopping all schedulers');

      if (this.config.gracefulShutdown) {
        await this.performGracefulShutdown();
      } else {
        await this.performImmediateShutdown();
      }

      logger.info('All schedulers stopped');

    } finally {
      this.shutdownInProgress = false;
    }
  }

  /**
   * Get health status for a specific scheduler
   */
  getHealth(schedulerName: string): SchedulerHealth | null {
    const health = this.registry.health.get(schedulerName);
    if (health) {
      // Update uptime if running
      if (health.status === 'healthy') {
        health.uptime = this.calculateUptime(health.lastHealthCheck);
      }
    }
    return health || null;
  }

  /**
   * Get health status for all schedulers
   */
  getAllHealth(): SchedulerHealth[] {
    return Array.from(this.registry.health.values()).map(health => {
      if (health.status === 'healthy') {
        health.uptime = this.calculateUptime(health.lastHealthCheck);
      }
      return health;
    });
  }

  /**
   * Get metrics for a specific scheduler
   */
  getMetrics(schedulerName: string): SchedulerMetrics | null {
    return this.registry.metrics.get(schedulerName) || null;
  }

  /**
   * Get metrics for all schedulers
   */
  getAllMetrics(): SchedulerMetrics[] {
    return Array.from(this.registry.metrics.values());
  }

  /**
   * Check if a scheduler is healthy
   */
  isHealthy(schedulerName: string): boolean {
    const health = this.registry.health.get(schedulerName);
    return health ? health.status === 'healthy' : false;
  }

  /**
   * Perform health check for a specific scheduler
   */
  async performHealthCheck(schedulerName: string): Promise<SchedulerHealth> {
    const health = this.registry.health.get(schedulerName);
    const config = this.registry.schedulers.get(schedulerName);
    
    if (!health || !config) {
      throw new Error(`Scheduler ${schedulerName} not found`);
    }

    const startTime = Date.now();

    try {
      // Update basic health info
      health.lastHealthCheck = new Date().toISOString();
      health.memoryUsage = this.getCurrentMemoryUsage();
      health.cpuUsage = this.getCurrentCpuUsage();

      // Perform custom health check if available
      const executor = this.getExecutor(schedulerName);
      if (executor.healthCheck) {
        const isHealthy = await executor.healthCheck();
        
        if (!isHealthy) {
          health.consecutiveFailures++;
          if (health.status === 'healthy') {
            health.status = 'degraded';
          }
        } else {
          health.consecutiveFailures = 0;
          if (health.status === 'degraded') {
            health.status = 'healthy';
          }
        }
      }

      // Check error threshold
      if (health.consecutiveFailures >= config.errorThreshold) {
        health.status = 'unhealthy';
      }

      // Check memory threshold
      if (health.memoryUsage > config.memoryThreshold) {
        if (health.status === 'healthy') {
          health.status = 'degraded';
        }
      }

      this.registry.health.set(schedulerName, health);

      this.logEvent({
        type: 'health_check',
        timestamp: new Date().toISOString(),
        schedulerName,
        duration: Date.now() - startTime,
        data: {
          status: health.status,
          memoryUsage: health.memoryUsage,
          consecutiveFailures: health.consecutiveFailures,
        },
      });

      return health;

    } catch (error) {
      health.consecutiveFailures++;
      health.status = 'unhealthy';
      this.registry.health.set(schedulerName, health);

      logger.error('Health check failed', {
        schedulerName,
        error: (error as Error).message,
      });

      throw error;
    }
  }

  /**
   * Perform recovery actions for a scheduler
   */
  async performRecovery(schedulerName: string): Promise<SchedulerRecoveryAction[]> {
    const health = this.registry.health.get(schedulerName);
    const config = this.registry.schedulers.get(schedulerName);
    
    if (!health || !config) {
      throw new Error(`Scheduler ${schedulerName} not found`);
    }

    const actions: SchedulerRecoveryAction[] = [];

    logger.info('Performing recovery for scheduler', {
      schedulerName,
      status: health.status,
      consecutiveFailures: health.consecutiveFailures,
      memoryUsage: health.memoryUsage,
    });

    // Memory cleanup if memory usage is high
    if (health.memoryUsage > config.memoryThreshold) {
      const action = await this.performMemoryCleanup(schedulerName);
      actions.push(action);
    }

    // Reset errors if below threshold
    if (health.consecutiveFailures > 0 && health.consecutiveFailures < config.errorThreshold) {
      const action = await this.resetErrors(schedulerName);
      actions.push(action);
    }

    // Restart if unhealthy and within restart limits
    if (health.status === 'unhealthy' && health.restartCount < this.config.maxRestartAttempts) {
      const action = await this.performRestartRecovery(schedulerName);
      actions.push(action);
    }

    // Check dependencies if needed
    if (config.dependencies.length > 0) {
      const action = await this.checkDependenciesRecovery(schedulerName);
      actions.push(action);
    }

    return actions;
  }

  /**
   * Cleanup resources and stop monitoring
   */
  async cleanup(): Promise<void> {
    logger.info('Cleaning up scheduler resilience system');

    // Stop all schedulers
    await this.stopAll();

    // Stop monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    if (this.recoveryInterval) {
      clearInterval(this.recoveryInterval);
    }

    // Clear registries
    this.registry.schedulers.clear();
    this.registry.health.clear();
    this.registry.metrics.clear();
    this.registry.activeExecutions.clear();
    this.registry.recoveryActions = [];
    this.registry.events = [];

    this.isInitialized = false;
    logger.info('Scheduler resilience system cleaned up');
  }

  // Private methods

  private getOptimalConfig(): SchedulerResilienceConfig {
    const platform = this.platformAdapter.getPlatform();
    
    const baseConfig: SchedulerResilienceConfig = {
      enabled: true,
      healthCheckInterval: 30000, // 30 seconds
      recoveryEnabled: true,
      maxRestartAttempts: 3,
      restartCooldown: 60000, // 1 minute
      memoryThreshold: 100, // 100MB
      errorThreshold: 5,
      dependencyTimeout: 30000, // 30 seconds
      staggeredStartup: true,
      gracefulShutdown: true,
      shutdownTimeout: 30000, // 30 seconds
    };

    // Platform-specific adjustments
    if (platform === 'render') {
      return {
        ...baseConfig,
        healthCheckInterval: 15000, // More frequent on Render
        memoryThreshold: 50, // Lower threshold for Render's 512MB limit
        maxRestartAttempts: 2, // Fewer restarts on Render
        restartCooldown: 30000, // Faster restart on Render
      };
    }

    if (platform === 'local') {
      return {
        ...baseConfig,
        healthCheckInterval: 60000, // Less frequent in development
        recoveryEnabled: false, // Disable auto-recovery in development
        staggeredStartup: false, // Faster startup in development
      };
    }

    return baseConfig;
  }

  private initializeRegistry(): SchedulerRegistry {
    return {
      schedulers: new Map(),
      health: new Map(),
      metrics: new Map(),
      activeExecutions: new Map(),
      recoveryActions: [],
      events: [],
    };
  }

  private validateSchedulerConfig(config: SchedulerConfig): void {
    if (!config.name || config.name.trim() === '') {
      throw new Error('Scheduler name is required');
    }

    if (!config.cronExpression && !config.interval) {
      throw new Error('Either cronExpression or interval must be specified');
    }

    if (config.cronExpression && config.interval) {
      throw new Error('Cannot specify both cronExpression and interval');
    }

    if (config.interval && config.interval < 1000) {
      throw new Error('Interval must be at least 1000ms');
    }

    if (config.maxRetries < 0) {
      throw new Error('maxRetries cannot be negative');
    }

    if (config.timeout < 1000) {
      throw new Error('Timeout must be at least 1000ms');
    }
  }

  private getExecutor(schedulerName: string): SchedulerExecutor {
    const executor = (this as any)[`_executor_${schedulerName}`];
    if (!executor) {
      throw new Error(`Executor not found for scheduler ${schedulerName}`);
    }
    return executor;
  }

  private async scheduleJob(schedulerName: string, config: SchedulerConfig, executor: SchedulerExecutor): Promise<void> {
    if (config.cronExpression) {
      // Schedule with cron
      const task = cron.schedule(config.cronExpression, async () => {
        await this.executeScheduler(schedulerName, executor);
      }, {
        scheduled: false, // Don't start immediately
        timezone: 'UTC',
      });

      this.cronJobs.set(schedulerName, task);
      task.start();

    } else if (config.interval) {
      // Schedule with interval
      const intervalId = setInterval(async () => {
        await this.executeScheduler(schedulerName, executor);
      }, config.interval);

      this.intervalJobs.set(schedulerName, intervalId);
    }
  }

  private async unscheduleJob(schedulerName: string): Promise<void> {
    // Stop cron job
    const cronJob = this.cronJobs.get(schedulerName);
    if (cronJob) {
      cronJob.stop();
      cronJob.destroy();
      this.cronJobs.delete(schedulerName);
    }

    // Stop interval job
    const intervalJob = this.intervalJobs.get(schedulerName);
    if (intervalJob) {
      clearInterval(intervalJob);
      this.intervalJobs.delete(schedulerName);
    }
  }

  private async executeScheduler(schedulerName: string, executor: SchedulerExecutor): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    const config = this.registry.schedulers.get(schedulerName);
    const health = this.registry.health.get(schedulerName);
    const metrics = this.registry.metrics.get(schedulerName);

    if (!config || !health || !metrics) {
      return;
    }

    const executionId = randomUUID();
    const correlationId = this.correlationService.generateCorrelationId();
    const startTime = Date.now();
    const memoryBefore = this.getCurrentMemoryUsage();

    const context: SchedulerExecutionContext = {
      schedulerName,
      executionId,
      startTime,
      timeout: config.timeout,
      retryCount: 0,
      maxRetries: config.maxRetries,
      correlationId,
      memoryBefore,
      abortController: new AbortController(),
    };

    // Track active execution
    this.registry.activeExecutions.set(executionId, context);

    this.logEvent({
      type: 'execute',
      timestamp: new Date().toISOString(),
      schedulerName,
      executionId,
      correlationId,
    });

    try {
      // Set timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          context.abortController.abort();
          reject(new Error(`Scheduler execution timeout after ${config.timeout}ms`));
        }, config.timeout);
      });

      // Execute with timeout
      await Promise.race([
        executor.execute(context),
        timeoutPromise,
      ]);

      // Execution successful
      const duration = Date.now() - startTime;
      const memoryAfter = this.getCurrentMemoryUsage();
      const memoryUsed = memoryAfter - memoryBefore;

      // Update metrics
      metrics.totalExecutions++;
      metrics.successfulExecutions++;
      metrics.averageExecutionTime = (metrics.averageExecutionTime * (metrics.totalExecutions - 1) + duration) / metrics.totalExecutions;
      metrics.minExecutionTime = Math.min(metrics.minExecutionTime, duration);
      metrics.maxExecutionTime = Math.max(metrics.maxExecutionTime, duration);
      metrics.totalMemoryUsage += memoryUsed;
      metrics.peakMemoryUsage = Math.max(metrics.peakMemoryUsage, memoryAfter);
      metrics.errorRate = (metrics.failedExecutions / metrics.totalExecutions) * 100;

      // Update health
      health.lastExecution = {
        timestamp: new Date().toISOString(),
        duration,
        success: true,
      };
      health.averageExecutionTime = metrics.averageExecutionTime;
      health.memoryUsage = memoryAfter;
      health.consecutiveFailures = 0;

      if (health.status === 'degraded' && health.consecutiveFailures === 0) {
        health.status = 'healthy';
      }

      this.registry.metrics.set(schedulerName, metrics);
      this.registry.health.set(schedulerName, health);

      logger.debug('Scheduler execution completed', {
        schedulerName,
        executionId,
        correlationId,
        duration,
        memoryUsed,
      });

    } catch (error) {
      // Execution failed
      const duration = Date.now() - startTime;
      const errorMessage = (error as Error).message;

      // Update metrics
      metrics.totalExecutions++;
      metrics.failedExecutions++;
      metrics.errorRate = (metrics.failedExecutions / metrics.totalExecutions) * 100;

      // Update health
      health.lastExecution = {
        timestamp: new Date().toISOString(),
        duration,
        success: false,
        error: errorMessage,
      };
      health.consecutiveFailures++;

      if (health.consecutiveFailures >= config.errorThreshold) {
        health.status = 'unhealthy';
      } else if (health.status === 'healthy') {
        health.status = 'degraded';
      }

      this.registry.metrics.set(schedulerName, metrics);
      this.registry.health.set(schedulerName, health);

      this.logEvent({
        type: 'error',
        timestamp: new Date().toISOString(),
        schedulerName,
        executionId,
        correlationId,
        error: errorMessage,
        duration,
      });

      logger.error('Scheduler execution failed', {
        schedulerName,
        executionId,
        correlationId,
        error: errorMessage,
        duration,
        consecutiveFailures: health.consecutiveFailures,
      });

    } finally {
      // Remove from active executions
      this.registry.activeExecutions.delete(executionId);
    }
  }

  private async checkDependencies(schedulerName: string): Promise<void> {
    const config = this.registry.schedulers.get(schedulerName);
    if (!config || config.dependencies.length === 0) {
      return;
    }

    logger.debug('Checking scheduler dependencies', {
      schedulerName,
      dependencies: config.dependencies,
    });

    for (const dependencyName of config.dependencies) {
      const dependencyHealth = this.registry.health.get(dependencyName);
      
      if (!dependencyHealth || dependencyHealth.status !== 'healthy') {
        this.logEvent({
          type: 'dependency_wait',
          timestamp: new Date().toISOString(),
          schedulerName,
          data: { dependency: dependencyName, status: dependencyHealth?.status || 'not_found' },
        });

        throw new Error(`Dependency ${dependencyName} is not healthy (status: ${dependencyHealth?.status || 'not_found'})`);
      }
    }

    logger.debug('All dependencies are healthy', { schedulerName });
  }

  private async waitForActiveExecutions(schedulerName: string, timeoutMs: number = 30000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const activeExecutions = Array.from(this.registry.activeExecutions.values())
        .filter(exec => exec.schedulerName === schedulerName);
      
      if (activeExecutions.length === 0) {
        return;
      }

      logger.debug('Waiting for active executions to complete', {
        schedulerName,
        activeExecutions: activeExecutions.length,
      });

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    logger.warn('Timeout waiting for active executions', { schedulerName });
  }

  private async performStaggeredStartup(): Promise<void> {
    const schedulers = Array.from(this.registry.schedulers.entries())
      .filter(([_, config]) => config.enabled)
      .sort(([_, a], [__, b]) => b.priority - a.priority); // Higher priority first

    const phases = this.groupSchedulersByPriority(schedulers);

    for (const phase of phases) {
      logger.info('Starting scheduler phase', {
        phase: phase.phase,
        schedulers: phase.schedulers,
      });

      // Start all schedulers in this phase
      const startPromises = phase.schedulers.map(async (schedulerName) => {
        try {
          await this.start(schedulerName);
        } catch (error) {
          logger.error('Failed to start scheduler in phase', {
            schedulerName,
            phase: phase.phase,
            error: (error as Error).message,
          });
        }
      });

      await Promise.allSettled(startPromises);

      // Wait before next phase
      if (phase.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, phase.delay));
      }
    }
  }

  private async performParallelStartup(): Promise<void> {
    const schedulers = Array.from(this.registry.schedulers.entries())
      .filter(([_, config]) => config.enabled);

    const startPromises = schedulers.map(async ([schedulerName]) => {
      try {
        await this.start(schedulerName);
      } catch (error) {
        logger.error('Failed to start scheduler', {
          schedulerName,
          error: (error as Error).message,
        });
      }
    });

    await Promise.allSettled(startPromises);
  }

  private async performGracefulShutdown(): Promise<void> {
    const runningSchedulers = Array.from(this.registry.health.entries())
      .filter(([_, health]) => health.status === 'healthy' || health.status === 'degraded')
      .map(([name]) => name);

    const phases = this.groupSchedulersForShutdown(runningSchedulers);

    for (const phase of phases) {
      logger.info('Stopping scheduler phase', {
        phase: phase.phase,
        schedulers: phase.schedulers,
      });

      const stopPromises = phase.schedulers.map(async (schedulerName) => {
        try {
          await Promise.race([
            this.stop(schedulerName),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Shutdown timeout')), phase.timeout)
            ),
          ]);
        } catch (error) {
          logger.error('Failed to stop scheduler gracefully', {
            schedulerName,
            error: (error as Error).message,
          });

          if (phase.forceKill) {
            // Force stop
            await this.forceStop(schedulerName);
          }
        }
      });

      await Promise.allSettled(stopPromises);
    }
  }

  private async performImmediateShutdown(): Promise<void> {
    const runningSchedulers = Array.from(this.registry.health.entries())
      .filter(([_, health]) => health.status === 'healthy' || health.status === 'degraded')
      .map(([name]) => name);

    const stopPromises = runningSchedulers.map(async (schedulerName) => {
      try {
        await this.forceStop(schedulerName);
      } catch (error) {
        logger.error('Failed to force stop scheduler', {
          schedulerName,
          error: (error as Error).message,
        });
      }
    });

    await Promise.allSettled(stopPromises);
  }

  private async forceStop(schedulerName: string): Promise<void> {
    // Unschedule job immediately
    await this.unscheduleJob(schedulerName);

    // Abort active executions
    const activeExecutions = Array.from(this.registry.activeExecutions.values())
      .filter(exec => exec.schedulerName === schedulerName);

    for (const execution of activeExecutions) {
      execution.abortController.abort();
    }

    // Update health status
    const health = this.registry.health.get(schedulerName);
    if (health) {
      health.status = 'stopped';
      this.registry.health.set(schedulerName, health);
    }

    logger.info('Scheduler force stopped', { schedulerName });
  }

  private groupSchedulersByPriority(schedulers: [string, SchedulerConfig][]): SchedulerStartupPlan[] {
    const priorityGroups = new Map<number, string[]>();

    for (const [name, config] of schedulers) {
      const priority = config.priority || 0;
      if (!priorityGroups.has(priority)) {
        priorityGroups.set(priority, []);
      }
      priorityGroups.get(priority)!.push(name);
    }

    const phases: SchedulerStartupPlan[] = [];
    let phaseNumber = 1;

    // Sort by priority (highest first)
    const sortedPriorities = Array.from(priorityGroups.keys()).sort((a, b) => b - a);

    for (const priority of sortedPriorities) {
      const schedulers = priorityGroups.get(priority)!;
      phases.push({
        phase: phaseNumber++,
        schedulers,
        delay: 2000, // 2 second delay between phases
        timeout: 30000, // 30 second timeout per phase
      });
    }

    return phases;
  }

  private groupSchedulersForShutdown(schedulers: string[]): SchedulerShutdownPlan[] {
    // For shutdown, we reverse the priority order (lowest priority first)
    const configs = schedulers.map(name => ({
      name,
      config: this.registry.schedulers.get(name)!,
    })).sort((a, b) => (a.config.priority || 0) - (b.config.priority || 0));

    const phases: SchedulerShutdownPlan[] = [];
    let phaseNumber = 1;

    // Group by priority
    const priorityGroups = new Map<number, string[]>();
    for (const { name, config } of configs) {
      const priority = config.priority || 0;
      if (!priorityGroups.has(priority)) {
        priorityGroups.set(priority, []);
      }
      priorityGroups.get(priority)!.push(name);
    }

    for (const [priority, schedulerNames] of priorityGroups) {
      phases.push({
        phase: phaseNumber++,
        schedulers: schedulerNames,
        timeout: this.config.shutdownTimeout,
        forceKill: true,
      });
    }

    return phases;
  }

  private async performMemoryCleanup(schedulerName: string): Promise<SchedulerRecoveryAction> {
    const startTime = Date.now();

    try {
      // Get executor and call cleanup if available
      const executor = this.getExecutor(schedulerName);
      if (executor.cleanup) {
        await executor.cleanup();
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const action: SchedulerRecoveryAction = {
        type: 'memory_cleanup',
        timestamp: new Date().toISOString(),
        schedulerName,
        reason: 'High memory usage detected',
        success: true,
        duration: Date.now() - startTime,
      };

      logger.info('Memory cleanup performed', {
        schedulerName,
        duration: action.duration,
      });

      return action;

    } catch (error) {
      const action: SchedulerRecoveryAction = {
        type: 'memory_cleanup',
        timestamp: new Date().toISOString(),
        schedulerName,
        reason: 'High memory usage detected',
        success: false,
        duration: Date.now() - startTime,
        details: { error: (error as Error).message },
      };

      logger.error('Memory cleanup failed', {
        schedulerName,
        error: (error as Error).message,
      });

      return action;
    }
  }

  private async resetErrors(schedulerName: string): Promise<SchedulerRecoveryAction> {
    const startTime = Date.now();

    try {
      const health = this.registry.health.get(schedulerName);
      if (health) {
        health.consecutiveFailures = 0;
        if (health.status === 'degraded') {
          health.status = 'healthy';
        }
        this.registry.health.set(schedulerName, health);
      }

      const action: SchedulerRecoveryAction = {
        type: 'reset_errors',
        timestamp: new Date().toISOString(),
        schedulerName,
        reason: 'Error count reset for recovery',
        success: true,
        duration: Date.now() - startTime,
      };

      logger.info('Scheduler errors reset', { schedulerName });

      return action;

    } catch (error) {
      const action: SchedulerRecoveryAction = {
        type: 'reset_errors',
        timestamp: new Date().toISOString(),
        schedulerName,
        reason: 'Error count reset for recovery',
        success: false,
        duration: Date.now() - startTime,
        details: { error: (error as Error).message },
      };

      return action;
    }
  }

  private async performRestartRecovery(schedulerName: string): Promise<SchedulerRecoveryAction> {
    const startTime = Date.now();

    try {
      await this.restart(schedulerName);

      const action: SchedulerRecoveryAction = {
        type: 'restart',
        timestamp: new Date().toISOString(),
        schedulerName,
        reason: 'Automatic recovery restart',
        success: true,
        duration: Date.now() - startTime,
      };

      return action;

    } catch (error) {
      const action: SchedulerRecoveryAction = {
        type: 'restart',
        timestamp: new Date().toISOString(),
        schedulerName,
        reason: 'Automatic recovery restart',
        success: false,
        duration: Date.now() - startTime,
        details: { error: (error as Error).message },
      };

      return action;
    }
  }

  private async checkDependenciesRecovery(schedulerName: string): Promise<SchedulerRecoveryAction> {
    const startTime = Date.now();

    try {
      await this.checkDependencies(schedulerName);

      const action: SchedulerRecoveryAction = {
        type: 'dependency_check',
        timestamp: new Date().toISOString(),
        schedulerName,
        reason: 'Dependency health verification',
        success: true,
        duration: Date.now() - startTime,
      };

      return action;

    } catch (error) {
      const action: SchedulerRecoveryAction = {
        type: 'dependency_check',
        timestamp: new Date().toISOString(),
        schedulerName,
        reason: 'Dependency health verification',
        success: false,
        duration: Date.now() - startTime,
        details: { error: (error as Error).message },
      };

      return action;
    }
  }

  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        const schedulerNames = Array.from(this.registry.schedulers.keys());
        
        for (const schedulerName of schedulerNames) {
          const config = this.registry.schedulers.get(schedulerName);
          if (config && config.enabled) {
            await this.performHealthCheck(schedulerName);
          }
        }
      } catch (error) {
        logger.error('Health monitoring error', error);
      }
    }, this.config.healthCheckInterval);
  }

  private startRecoveryMonitoring(): void {
    this.recoveryInterval = setInterval(async () => {
      try {
        const unhealthySchedulers = Array.from(this.registry.health.entries())
          .filter(([_, health]) => health.status === 'unhealthy' || health.status === 'degraded')
          .map(([name]) => name);

        for (const schedulerName of unhealthySchedulers) {
          const health = this.registry.health.get(schedulerName);
          if (health && health.restartCount < this.config.maxRestartAttempts) {
            logger.info('Attempting automatic recovery', {
              schedulerName,
              status: health.status,
              restartCount: health.restartCount,
            });

            await this.performRecovery(schedulerName);
          }
        }
      } catch (error) {
        logger.error('Recovery monitoring error', error);
      }
    }, this.config.restartCooldown);
  }

  private getCurrentMemoryUsage(): number {
    const memUsage = process.memoryUsage();
    return Math.round(memUsage.heapUsed / 1024 / 1024); // MB
  }

  private getCurrentCpuUsage(): number {
    // Simplified CPU usage calculation
    const cpuUsage = process.cpuUsage();
    const totalUsage = cpuUsage.user + cpuUsage.system;
    return Math.round((totalUsage / 1000000) * 100) / 100; // Convert to percentage
  }

  private calculateUptime(startTime: string): number {
    const start = new Date(startTime).getTime();
    const now = Date.now();
    return Math.floor((now - start) / 1000); // seconds
  }

  private logEvent(event: SchedulerEvent): void {
    this.registry.events.push(event);
    this.limitArraySize(this.registry.events, 1000);
  }

  private limitArraySize<T>(array: T[], maxSize: number): void {
    if (array.length > maxSize) {
      array.splice(0, array.length - maxSize);
    }
  }
}