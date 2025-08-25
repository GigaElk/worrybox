// Enhanced monitoring types for reliability improvements

export interface EnhancedHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  platform: 'render' | 'local' | 'other';
  version: string;
  environment: string;
  correlationId: string;
  checks: {
    database: HealthCheckResult;
    memory: HealthCheckResult;
    schedulers: HealthCheckResult;
    performance: HealthCheckResult;
  };
  metrics: {
    memoryUsage: MemoryMetrics;
    databasePool: DatabasePoolMetrics;
    requestMetrics: RequestMetrics;
    systemLoad: SystemLoadMetrics;
  };
}

export interface HealthCheckResult {
  status: 'pass' | 'fail' | 'warn';
  message: string;
  responseTime?: number;
  details?: any;
  lastChecked: string;
}

export interface MemoryMetrics {
  heapUsed: number; // MB
  heapTotal: number; // MB
  external: number; // MB
  rss: number; // MB
  usagePercent: number;
  gcCount: number;
  gcDuration: number; // ms
  memoryLeakDetected: boolean;
}

export interface DatabasePoolMetrics {
  activeConnections: number;
  idleConnections: number;
  totalConnections: number;
  maxConnections: number;
  averageQueryTime: number; // ms
  slowQueries: number;
  connectionErrors: number;
  lastConnectionTime: string;
}

export interface RequestMetrics {
  totalRequests: number;
  requestsPerMinute: number;
  averageResponseTime: number; // ms
  slowRequests: number;
  errorRate: number; // percentage
  activeRequests: number;
  lastRequestTime: string;
}

export interface SystemLoadMetrics {
  cpuUsage: number; // percentage
  loadAverage: number[];
  diskUsage?: number; // percentage
  networkConnections: number;
  processCount: number;
}

export interface SchedulerStatus {
  name: string;
  status: 'running' | 'stopped' | 'error';
  lastRun: string;
  nextRun: string;
  runCount: number;
  errorCount: number;
  memoryUsage: number; // MB
  uptime: number; // seconds
}

export interface PerformanceMetric {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  memoryDelta: number;
  databaseQueries: number;
  timestamp: string;
  correlationId: string;
}

export interface ErrorContext {
  correlationId: string;
  timestamp: string;
  error: {
    message: string;
    stack: string;
    code?: string;
    name: string;
  };
  request?: {
    method: string;
    path: string;
    headers: Record<string, string>;
    ip: string;
    userAgent: string;
    body?: any;
  };
  system: {
    memoryUsage: MemoryMetrics;
    databaseStatus: boolean;
    activeConnections: number;
    uptime: number;
    platform: string;
  };
}

export interface DiagnosticsReport {
  timestamp: string;
  correlationId: string;
  system: {
    platform: string;
    nodeVersion: string;
    uptime: number;
    environment: string;
  };
  performance: {
    slowestEndpoints: PerformanceMetric[];
    memoryTrend: number[];
    errorRate: number;
    averageResponseTime: number;
  };
  health: EnhancedHealthStatus;
  recommendations: string[];
}