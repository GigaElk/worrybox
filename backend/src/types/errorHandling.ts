// Enhanced error handling and recovery types

export interface ErrorContext {
  correlationId: string;
  timestamp: string;
  requestId?: string;
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  ip?: string;
  path?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  query?: Record<string, any>;
  params?: Record<string, any>;
  memoryUsage?: NodeJS.MemoryUsage;
  systemLoad?: {
    cpuUsage: number;
    memoryUsage: number;
    activeConnections: number;
  };
  stackTrace?: string;
  additionalContext?: Record<string, any>;
}

export interface ErrorRecoveryAction {
  type: 'retry' | 'fallback' | 'circuit_breaker' | 'graceful_degradation' | 'restart_service' | 'cleanup';
  timestamp: string;
  correlationId: string;
  reason: string;
  success: boolean;
  duration: number; // milliseconds
  details?: any;
  nextAction?: ErrorRecoveryAction;
}

export interface ErrorMetrics {
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorsByEndpoint: Record<string, number>;
  errorRate: number; // percentage
  averageRecoveryTime: number; // milliseconds
  successfulRecoveries: number;
  failedRecoveries: number;
  lastError?: {
    timestamp: string;
    type: string;
    message: string;
    correlationId: string;
  };
}

export interface CircuitBreakerState {
  name: string;
  state: 'closed' | 'open' | 'half_open';
  failureCount: number;
  failureThreshold: number;
  timeout: number; // milliseconds
  lastFailureTime?: string;
  nextAttemptTime?: string;
  successCount: number;
  totalRequests: number;
}

export interface RequestTimeout {
  requestId: string;
  correlationId: string;
  startTime: number;
  timeout: number; // milliseconds
  path: string;
  method: string;
  abortController: AbortController;
  timeoutId: NodeJS.Timeout;
  onTimeout?: () => void;
  onComplete?: () => void;
}

export interface ErrorRecoveryConfig {
  enabled: boolean;
  maxRetryAttempts: number;
  retryDelay: number; // milliseconds
  exponentialBackoff: boolean;
  circuitBreakerEnabled: boolean;
  circuitBreakerThreshold: number;
  circuitBreakerTimeout: number; // milliseconds
  gracefulDegradationEnabled: boolean;
  requestTimeoutEnabled: boolean;
  defaultRequestTimeout: number; // milliseconds
  errorContextCapture: boolean;
  errorMetricsEnabled: boolean;
  correlationIdTracking: boolean;
}

export interface GracefulDegradationStrategy {
  name: string;
  condition: (error: Error, context: ErrorContext) => boolean;
  action: (error: Error, context: ErrorContext) => Promise<any>;
  fallbackResponse?: any;
  priority: number;
  enabled: boolean;
}

export interface ErrorAlert {
  id: string;
  timestamp: string;
  level: 'warning' | 'error' | 'critical';
  type: string;
  message: string;
  correlationId: string;
  errorCount: number;
  affectedEndpoints: string[];
  recoveryActions: string[];
  acknowledged: boolean;
  resolvedAt?: string;
}

export interface ErrorHandler {
  name: string;
  priority: number;
  canHandle: (error: Error, context: ErrorContext) => boolean;
  handle: (error: Error, context: ErrorContext) => Promise<ErrorRecoveryAction>;
  enabled: boolean;
}

export interface ErrorRecoveryRegistry {
  handlers: Map<string, ErrorHandler>;
  circuitBreakers: Map<string, CircuitBreakerState>;
  activeTimeouts: Map<string, RequestTimeout>;
  degradationStrategies: Map<string, GracefulDegradationStrategy>;
  errorMetrics: ErrorMetrics;
  recentErrors: ErrorContext[];
  recoveryActions: ErrorRecoveryAction[];
  alerts: ErrorAlert[];
}

export interface EnhancedError extends Error {
  code?: string;
  statusCode?: number;
  correlationId?: string;
  context?: ErrorContext;
  recoverable?: boolean;
  retryable?: boolean;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  category?: 'validation' | 'authentication' | 'authorization' | 'database' | 'external_api' | 'system' | 'network' | 'timeout';
  originalError?: Error;
  recoveryActions?: ErrorRecoveryAction[];
}

export interface ErrorHandlingMiddleware {
  captureContext: boolean;
  enableRecovery: boolean;
  enableCircuitBreaker: boolean;
  enableTimeout: boolean;
  enableCorrelationTracking: boolean;
  logErrors: boolean;
  sendAlerts: boolean;
}

export interface TimeoutConfig {
  default: number; // milliseconds
  routes: Record<string, number>; // route-specific timeouts
  methods: Record<string, number>; // method-specific timeouts
  enabled: boolean;
  gracePeriod: number; // milliseconds
  cleanupDelay: number; // milliseconds
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  exponentialBackoff: boolean;
  jitter: boolean;
  retryableErrors: string[]; // error codes/types that can be retried
  nonRetryableErrors: string[]; // error codes/types that should not be retried
}