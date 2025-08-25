// Database recovery and connection management types

export interface DatabaseConnectionConfig {
  maxRetries: number;
  baseRetryDelay: number; // milliseconds
  maxRetryDelay: number; // milliseconds
  connectionTimeout: number; // milliseconds
  queryTimeout: number; // milliseconds
  maxConnections: number;
  idleTimeout: number; // milliseconds
  healthCheckInterval: number; // milliseconds
  enableConnectionPooling: boolean;
  enableQueryQueue: boolean;
  enableCircuitBreaker: boolean;
}

export interface ConnectionPoolMetrics {
  activeConnections: number;
  idleConnections: number;
  totalConnections: number;
  maxConnections: number;
  queuedRequests: number;
  averageQueryTime: number;
  slowQueries: number;
  connectionErrors: number;
  lastConnectionTime: string;
  poolHealth: 'healthy' | 'degraded' | 'unhealthy';
}

export interface DatabaseRecoveryState {
  isRecovering: boolean;
  lastFailure: string | null;
  failureCount: number;
  consecutiveFailures: number;
  lastSuccessfulConnection: string | null;
  recoveryAttempts: number;
  circuitBreakerState: 'closed' | 'open' | 'half-open';
  nextRetryTime: string | null;
}

export interface QueuedOperation {
  id: string;
  operation: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timestamp: number;
  timeout: number;
  retryCount: number;
  maxRetries: number;
  correlationId?: string;
}

export interface DatabaseHealthMetrics {
  connectionStatus: 'connected' | 'disconnected' | 'recovering';
  poolMetrics: ConnectionPoolMetrics;
  recoveryState: DatabaseRecoveryState;
  recentErrors: DatabaseError[];
  performanceMetrics: {
    averageQueryTime: number;
    slowQueryCount: number;
    errorRate: number;
    throughput: number; // queries per second
  };
}

export interface DatabaseError {
  timestamp: string;
  error: string;
  code?: string;
  query?: string;
  correlationId?: string;
  recoveryAction?: string;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number; // milliseconds
  halfOpenMaxCalls: number;
  monitoringPeriod: number; // milliseconds
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitterEnabled: boolean;
}

export interface DatabaseOperationContext {
  correlationId: string;
  operationType: 'query' | 'transaction' | 'health-check';
  startTime: number;
  timeout: number;
  retryCount: number;
  isQueued: boolean;
}