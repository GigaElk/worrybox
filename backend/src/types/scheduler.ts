// Scheduler resilience and management types

export interface SchedulerConfig {
  name: string;
  enabled: boolean;
  cronExpression?: string;
  interval?: number; // milliseconds
  maxRetries: number;
  retryDelay: number; // milliseconds
  timeout: number; // milliseconds
  memoryThreshold: number; // MB
  errorThreshold: number; // max errors before restart
  restartDelay: number; // milliseconds
  priority: number; // for staggered startup
  dependencies: string[]; // other schedulers this depends on
  healthCheckInterval: number; // milliseconds
}

export interface SchedulerHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'stopped' | 'starting' | 'stopping';
  lastHealthCheck: string;
  consecutiveFailures: number;
  memoryUsage: number; // MB
  cpuUsage: number; // percentage
  errorRate: number; // percentage
  averageExecutionTime: number; // milliseconds
  lastExecution: {
    timestamp: string;
    duration: number;
    success: boolean;
    error?: string;
  } | null;
  uptime: number; // seconds
  restartCount: number;
  nextScheduledRun?: string;
}

export interface SchedulerRecoveryAction {
  type: 'restart' | 'stop' | 'reset_errors' | 'memory_cleanup' | 'dependency_check';
  timestamp: string;
  schedulerName: string;
  reason: string;
  success: boolean;
  duration: number; // milliseconds
  details?: any;
}

export interface SchedulerDependency {
  name: string;
  required: boolean;
  timeout: number; // milliseconds to wait for dependency
  retryCount: number;
}

export interface SchedulerExecutionContext {
  schedulerName: string;
  executionId: string;
  startTime: number;
  timeout: number;
  retryCount: number;
  maxRetries: number;
  correlationId: string;
  memoryBefore: number;
  abortController: AbortController;
}

export interface SchedulerMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  minExecutionTime: number;
  maxExecutionTime: number;
  totalMemoryUsage: number;
  peakMemoryUsage: number;
  errorRate: number;
  uptime: number;
  lastRestart?: string;
  restartCount: number;
}

export interface SchedulerStartupPlan {
  phase: number;
  schedulers: string[];
  delay: number; // milliseconds between phases
  timeout: number; // milliseconds to wait for phase completion
}

export interface SchedulerShutdownPlan {
  phase: number;
  schedulers: string[];
  timeout: number; // milliseconds to wait for graceful shutdown
  forceKill: boolean; // whether to force kill if timeout exceeded
}

export interface SchedulerResilienceConfig {
  enabled: boolean;
  healthCheckInterval: number; // milliseconds
  recoveryEnabled: boolean;
  maxRestartAttempts: number;
  restartCooldown: number; // milliseconds
  memoryThreshold: number; // MB
  errorThreshold: number; // max consecutive errors
  dependencyTimeout: number; // milliseconds
  staggeredStartup: boolean;
  gracefulShutdown: boolean;
  shutdownTimeout: number; // milliseconds
}

export interface SchedulerEvent {
  type: 'start' | 'stop' | 'execute' | 'error' | 'restart' | 'health_check' | 'dependency_wait';
  timestamp: string;
  schedulerName: string;
  executionId?: string;
  correlationId?: string;
  data?: any;
  error?: string;
  duration?: number;
}

export interface SchedulerRegistry {
  schedulers: Map<string, SchedulerConfig>;
  health: Map<string, SchedulerHealth>;
  metrics: Map<string, SchedulerMetrics>;
  activeExecutions: Map<string, SchedulerExecutionContext>;
  recoveryActions: SchedulerRecoveryAction[];
  events: SchedulerEvent[];
}

export interface SchedulerExecutor {
  name: string;
  execute: (context: SchedulerExecutionContext) => Promise<void>;
  healthCheck?: () => Promise<boolean>;
  cleanup?: () => Promise<void>;
  onStart?: () => Promise<void>;
  onStop?: () => Promise<void>;
}

export interface SchedulerManager {
  register(config: SchedulerConfig, executor: SchedulerExecutor): Promise<void>;
  start(schedulerName: string): Promise<void>;
  stop(schedulerName: string): Promise<void>;
  restart(schedulerName: string): Promise<void>;
  startAll(): Promise<void>;
  stopAll(): Promise<void>;
  getHealth(schedulerName: string): SchedulerHealth | null;
  getAllHealth(): SchedulerHealth[];
  getMetrics(schedulerName: string): SchedulerMetrics | null;
  getAllMetrics(): SchedulerMetrics[];
  isHealthy(schedulerName: string): boolean;
  performHealthCheck(schedulerName: string): Promise<SchedulerHealth>;
  performRecovery(schedulerName: string): Promise<SchedulerRecoveryAction[]>;
}