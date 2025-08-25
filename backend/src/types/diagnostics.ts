// Production diagnostics and monitoring types

export interface SystemMetrics {
  timestamp: string;
  uptime: number; // seconds
  memory: MemoryMetrics;
  cpu: CpuMetrics;
  database: DatabaseMetrics;
  scheduler: SchedulerMetrics;
  api: ApiMetrics;
  errors: ErrorMetrics;
  health: HealthMetrics;
  platform: PlatformMetrics;
}

export interface MemoryMetrics {
  heapUsed: number; // MB
  heapTotal: number; // MB
  external: number; // MB
  rss: number; // MB
  heapUsedPercentage: number;
  memoryLeaks: MemoryLeakInfo[];
  gcStats: GarbageCollectionStats;
  memoryPressure: 'low' | 'medium' | 'high' | 'critical';
}

export interface MemoryLeakInfo {
  type: string;
  count: number;
  size: number; // bytes
  trend: 'stable' | 'increasing' | 'decreasing';
  firstDetected: string;
  lastUpdated: string;
}

export interface GarbageCollectionStats {
  totalCollections: number;
  totalTime: number; // milliseconds
  averageTime: number; // milliseconds
  lastCollection: string;
  collections: {
    scavenge: number;
    markSweep: number;
    incrementalMarking: number;
  };
}

export interface CpuMetrics {
  usage: number; // percentage
  loadAverage: number[];
  userTime: number; // microseconds
  systemTime: number; // microseconds
  idleTime: number; // microseconds
  processes: ProcessMetrics[];
}

export interface ProcessMetrics {
  pid: number;
  name: string;
  cpuUsage: number; // percentage
  memoryUsage: number; // MB
  status: 'running' | 'sleeping' | 'stopped' | 'zombie';
  startTime: string;
}

export interface DatabaseMetrics {
  connectionPool: ConnectionPoolMetrics;
  queryPerformance: QueryPerformanceMetrics;
  transactions: TransactionMetrics;
  health: DatabaseHealthMetrics;
  slowQueries: SlowQueryInfo[];
}

export interface ConnectionPoolMetrics {
  total: number;
  active: number;
  idle: number;
  waiting: number;
  maxConnections: number;
  connectionUtilization: number; // percentage
  averageWaitTime: number; // milliseconds
  connectionErrors: number;
  connectionTimeouts: number;
}

export interface QueryPerformanceMetrics {
  totalQueries: number;
  averageQueryTime: number; // milliseconds
  slowQueryCount: number;
  failedQueries: number;
  queriesPerSecond: number;
  queryTypes: Record<string, number>;
}

export interface TransactionMetrics {
  totalTransactions: number;
  activeTransactions: number;
  committedTransactions: number;
  rolledBackTransactions: number;
  averageTransactionTime: number; // milliseconds
  deadlocks: number;
}

export interface DatabaseHealthMetrics {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'disconnected';
  lastHealthCheck: string;
  responseTime: number; // milliseconds
  errorRate: number; // percentage
  uptime: number; // seconds
}

export interface SlowQueryInfo {
  query: string;
  duration: number; // milliseconds
  timestamp: string;
  parameters?: any[];
  stackTrace?: string;
  frequency: number;
}

export interface SchedulerMetrics {
  schedulers: SchedulerInfo[];
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageJobDuration: number; // milliseconds
  jobQueue: JobQueueMetrics;
}

export interface SchedulerInfo {
  name: string;
  status: 'running' | 'stopped' | 'error' | 'restarting';
  lastRun: string;
  nextRun: string;
  runCount: number;
  errorCount: number;
  averageDuration: number; // milliseconds
  lastError?: string;
  memoryUsage: number; // MB
  cpuUsage: number; // percentage
}

export interface JobQueueMetrics {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  retrying: number;
  averageWaitTime: number; // milliseconds
  throughput: number; // jobs per minute
}

export interface ApiMetrics {
  requests: RequestMetrics;
  responses: ResponseMetrics;
  endpoints: EndpointMetrics[];
  performance: PerformanceMetrics;
  security: SecurityMetrics;
}

export interface RequestMetrics {
  total: number;
  perSecond: number;
  perMinute: number;
  perHour: number;
  byMethod: Record<string, number>;
  byStatusCode: Record<string, number>;
  averageSize: number; // bytes
}

export interface ResponseMetrics {
  averageTime: number; // milliseconds
  p50: number; // milliseconds
  p95: number; // milliseconds
  p99: number; // milliseconds
  slowRequests: number;
  timeouts: number;
  averageSize: number; // bytes
}

export interface EndpointMetrics {
  path: string;
  method: string;
  requestCount: number;
  averageResponseTime: number; // milliseconds
  errorRate: number; // percentage
  lastAccessed: string;
  slowestRequest: number; // milliseconds
  fastestRequest: number; // milliseconds
  throughput: number; // requests per minute
}

export interface PerformanceMetrics {
  averageResponseTime: number; // milliseconds
  throughput: number; // requests per second
  errorRate: number; // percentage
  availability: number; // percentage
  apdex: number; // Application Performance Index
  bottlenecks: BottleneckInfo[];
}

export interface BottleneckInfo {
  type: 'database' | 'memory' | 'cpu' | 'network' | 'external';
  description: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  frequency: number;
  averageDelay: number; // milliseconds
  recommendations: string[];
}

export interface SecurityMetrics {
  suspiciousRequests: number;
  blockedRequests: number;
  rateLimitHits: number;
  authenticationFailures: number;
  authorizationFailures: number;
  securityEvents: SecurityEvent[];
}

export interface SecurityEvent {
  type: 'suspicious_activity' | 'rate_limit' | 'auth_failure' | 'injection_attempt';
  timestamp: string;
  ip: string;
  userAgent?: string;
  endpoint?: string;
  details: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ErrorMetrics {
  total: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  byEndpoint: Record<string, number>;
  errorRate: number; // errors per minute
  recentErrors: ErrorSummary[];
  patterns: ErrorPattern[];
}

export interface ErrorSummary {
  id: string;
  message: string;
  type: string;
  severity: string;
  timestamp: string;
  endpoint?: string;
  userId?: string;
  count: number;
}

export interface ErrorPattern {
  pattern: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  trend: 'increasing' | 'decreasing' | 'stable';
  impact: 'low' | 'medium' | 'high' | 'critical';
}

export interface HealthMetrics {
  overall: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
  components: ComponentHealth[];
  checks: HealthCheck[];
  lastFullCheck: string;
  uptime: number; // seconds
  availability: number; // percentage over last 24h
}

export interface ComponentHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
  lastCheck: string;
  responseTime: number; // milliseconds
  errorRate: number; // percentage
  message?: string;
  dependencies: string[];
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  duration: number; // milliseconds
  timestamp: string;
  output?: string;
  details?: Record<string, any>;
}

export interface PlatformMetrics {
  platform: string;
  environment: string;
  version: string;
  nodeVersion: string;
  region?: string;
  instanceId?: string;
  containerInfo?: ContainerInfo;
  limits: ResourceLimits;
  usage: ResourceUsage;
}

export interface ContainerInfo {
  id: string;
  image: string;
  created: string;
  status: string;
  ports: string[];
  environment: Record<string, string>;
}

export interface ResourceLimits {
  memory: number; // MB
  cpu: number; // cores
  storage: number; // GB
  connections: number;
  bandwidth: number; // Mbps
}

export interface ResourceUsage {
  memory: number; // MB
  memoryPercentage: number;
  cpu: number; // percentage
  storage: number; // GB
  storagePercentage: number;
  connections: number;
  connectionsPercentage: number;
  bandwidth: number; // Mbps
}

export interface DiagnosticInfo {
  timestamp: string;
  requestId: string;
  system: SystemDiagnostics;
  application: ApplicationDiagnostics;
  environment: EnvironmentDiagnostics;
  troubleshooting: TroubleshootingInfo;
}

export interface SystemDiagnostics {
  os: {
    platform: string;
    release: string;
    arch: string;
    hostname: string;
    uptime: number;
  };
  process: {
    pid: number;
    ppid: number;
    uid: number;
    gid: number;
    cwd: string;
    execPath: string;
    argv: string[];
    env: Record<string, string>;
  };
  memory: {
    total: number;
    free: number;
    used: number;
    cached: number;
    buffers: number;
    swapTotal: number;
    swapFree: number;
  };
  cpu: {
    model: string;
    cores: number;
    speed: number;
    usage: number[];
    loadAverage: number[];
  };
  network: {
    interfaces: NetworkInterface[];
    connections: NetworkConnection[];
  };
  storage: {
    disks: DiskInfo[];
    totalSpace: number;
    freeSpace: number;
    usedSpace: number;
  };
}

export interface NetworkInterface {
  name: string;
  address: string;
  netmask: string;
  family: string;
  mac: string;
  internal: boolean;
  cidr: string;
}

export interface NetworkConnection {
  protocol: string;
  localAddress: string;
  localPort: number;
  remoteAddress: string;
  remotePort: number;
  state: string;
}

export interface DiskInfo {
  filesystem: string;
  size: number;
  used: number;
  available: number;
  usePercentage: number;
  mountPoint: string;
}

export interface ApplicationDiagnostics {
  version: string;
  startTime: string;
  uptime: number;
  nodeVersion: string;
  dependencies: DependencyInfo[];
  configuration: ConfigurationInfo;
  features: FeatureInfo[];
  services: ServiceInfo[];
}

export interface DependencyInfo {
  name: string;
  version: string;
  type: 'production' | 'development';
  vulnerabilities?: VulnerabilityInfo[];
}

export interface VulnerabilityInfo {
  severity: 'low' | 'moderate' | 'high' | 'critical';
  title: string;
  overview: string;
  recommendation: string;
}

export interface ConfigurationInfo {
  environment: string;
  port: number;
  database: {
    host: string;
    port: number;
    database: string;
    ssl: boolean;
    poolSize: number;
  };
  redis?: {
    host: string;
    port: number;
    database: number;
  };
  logging: {
    level: string;
    format: string;
  };
  security: {
    cors: boolean;
    helmet: boolean;
    rateLimit: boolean;
  };
}

export interface FeatureInfo {
  name: string;
  enabled: boolean;
  version?: string;
  configuration?: Record<string, any>;
  dependencies: string[];
  status: 'active' | 'inactive' | 'error';
}

export interface ServiceInfo {
  name: string;
  status: 'running' | 'stopped' | 'error' | 'starting' | 'stopping';
  startTime?: string;
  restartCount: number;
  lastRestart?: string;
  healthCheck?: {
    status: 'healthy' | 'unhealthy';
    lastCheck: string;
    message?: string;
  };
  metrics?: {
    requestCount: number;
    errorCount: number;
    averageResponseTime: number;
  };
}

export interface EnvironmentDiagnostics {
  platform: string;
  region?: string;
  zone?: string;
  instanceType?: string;
  containerRuntime?: string;
  orchestrator?: string;
  cloudProvider?: string;
  networking: {
    publicIp?: string;
    privateIp?: string;
    dns: string[];
    routes: RouteInfo[];
  };
  security: {
    firewalls: FirewallRule[];
    certificates: CertificateInfo[];
  };
}

export interface RouteInfo {
  destination: string;
  gateway: string;
  interface: string;
  metric: number;
}

export interface FirewallRule {
  direction: 'inbound' | 'outbound';
  protocol: string;
  port: string;
  source: string;
  action: 'allow' | 'deny';
}

export interface CertificateInfo {
  subject: string;
  issuer: string;
  validFrom: string;
  validTo: string;
  fingerprint: string;
  expired: boolean;
}

export interface TroubleshootingInfo {
  commonIssues: IssueInfo[];
  recommendations: RecommendationInfo[];
  diagnosticCommands: DiagnosticCommand[];
  logAnalysis: LogAnalysis;
  performanceAnalysis: PerformanceAnalysis;
}

export interface IssueInfo {
  category: 'performance' | 'memory' | 'database' | 'network' | 'security' | 'configuration';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  symptoms: string[];
  possibleCauses: string[];
  solutions: string[];
  preventionMeasures: string[];
}

export interface RecommendationInfo {
  type: 'optimization' | 'security' | 'monitoring' | 'maintenance';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  implementation: string[];
  expectedBenefit: string;
  effort: 'low' | 'medium' | 'high';
}

export interface DiagnosticCommand {
  name: string;
  description: string;
  command: string;
  category: 'system' | 'network' | 'database' | 'application';
  safe: boolean;
  requiresElevation: boolean;
}

export interface LogAnalysis {
  errorPatterns: LogPattern[];
  warningPatterns: LogPattern[];
  performanceIssues: LogPattern[];
  securityEvents: LogPattern[];
  recentEntries: LogEntry[];
}

export interface LogPattern {
  pattern: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  severity: 'info' | 'warn' | 'error' | 'critical';
  category: string;
  examples: string[];
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  source: string;
  metadata?: Record<string, any>;
}

export interface PerformanceAnalysis {
  bottlenecks: PerformanceBottleneck[];
  trends: PerformanceTrend[];
  recommendations: PerformanceRecommendation[];
  benchmarks: BenchmarkResult[];
}

export interface PerformanceBottleneck {
  component: string;
  type: 'cpu' | 'memory' | 'io' | 'network' | 'database';
  severity: 'low' | 'medium' | 'high' | 'critical';
  impact: string;
  metrics: Record<string, number>;
  recommendations: string[];
}

export interface PerformanceTrend {
  metric: string;
  trend: 'improving' | 'stable' | 'degrading';
  changePercentage: number;
  timeframe: string;
  significance: 'low' | 'medium' | 'high';
}

export interface PerformanceRecommendation {
  area: string;
  recommendation: string;
  expectedImprovement: string;
  implementation: string[];
  priority: 'low' | 'medium' | 'high';
}

export interface BenchmarkResult {
  name: string;
  value: number;
  unit: string;
  baseline: number;
  percentageChange: number;
  status: 'better' | 'same' | 'worse';
}

export interface MonitoringAlert {
  id: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  category: 'performance' | 'availability' | 'security' | 'resource';
  title: string;
  description: string;
  metric: string;
  threshold: number;
  currentValue: number;
  duration: number; // milliseconds
  acknowledged: boolean;
  resolvedAt?: string;
  actions: AlertAction[];
}

export interface AlertAction {
  type: 'notification' | 'escalation' | 'automation' | 'recovery';
  description: string;
  executed: boolean;
  executedAt?: string;
  result?: string;
}

export interface MetricsCollector {
  collectSystemMetrics(): Promise<SystemMetrics>;
  collectDiagnostics(): Promise<DiagnosticInfo>;
  getPerformanceMetrics(timeframe?: string): Promise<PerformanceMetrics>;
  getAlerts(severity?: string): Promise<MonitoringAlert[]>;
  exportMetrics(format: 'json' | 'prometheus' | 'csv'): Promise<string>;
}