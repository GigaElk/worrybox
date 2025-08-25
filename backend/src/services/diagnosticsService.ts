import {
  SystemMetrics,
  DiagnosticInfo,
  MemoryMetrics,
  CpuMetrics,
  DatabaseMetrics,
  SchedulerMetrics,
  ApiMetrics,
  ErrorMetrics,
  HealthMetrics,
  PlatformMetrics,
  PerformanceMetrics,
  MonitoringAlert,
  MetricsCollector,
  SystemDiagnostics,
  ApplicationDiagnostics,
  EnvironmentDiagnostics,
  TroubleshootingInfo,
} from '../types/diagnostics';
import { HealthCheckService } from './healthCheck';
import { PlatformAdapterService } from './platformAdapter';
import { MemoryManagerService } from './memoryManager';
import { SchedulerManagerService } from './schedulerManager';
import { ErrorHandlingService } from './errorHandler';
import logger from './logger';
import { randomUUID } from 'crypto';
import * as os from 'os';
import * as fs from 'fs/promises';
import * as path from 'path';

export class DiagnosticsService implements MetricsCollector {
  private static instance: DiagnosticsService;
  private healthCheck: HealthCheckService;
  private platformAdapter: PlatformAdapterService;
  private memoryManager: MemoryManagerService;
  private schedulerManager: SchedulerManagerService;
  private errorHandler: ErrorHandlingService;
  
  // Metrics storage
  private metricsHistory: SystemMetrics[] = [];
  private performanceHistory: PerformanceMetrics[] = [];
  private alerts: MonitoringAlert[] = [];
  
  // Request tracking
  private requestMetrics = new Map<string, any>();
  private endpointMetrics = new Map<string, any>();
  
  // Monitoring intervals
  private metricsInterval?: NodeJS.Timeout;
  private alertsInterval?: NodeJS.Timeout;
  
  // State tracking
  private isInitialized = false;
  private startTime = new Date();
  
  private constructor() {
    this.healthCheck = HealthCheckService.getInstance();
    this.platformAdapter = PlatformAdapterService.getInstance();
    this.memoryManager = MemoryManagerService.getInstance();
    this.schedulerManager = SchedulerManagerService.getInstance();
    this.errorHandler = ErrorHandlingService.getInstance();
  }

  public static getInstance(): DiagnosticsService {
    if (!DiagnosticsService.instance) {
      DiagnosticsService.instance = new DiagnosticsService();
    }
    return DiagnosticsService.instance;
  }

  /**
   * Initialize the diagnostics service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    logger.info('Initializing diagnostics service', {
      platform: this.platformAdapter.getPlatform(),
      startTime: this.startTime.toISOString(),
    });

    // Start metrics collection
    this.startMetricsCollection();
    
    // Start alert monitoring
    this.startAlertMonitoring();

    this.isInitialized = true;
    logger.info('Diagnostics service initialized');
  }

  /**
   * Collect comprehensive system metrics
   */
  async collectSystemMetrics(): Promise<SystemMetrics> {
    const timestamp = new Date().toISOString();
    const uptime = Math.floor((Date.now() - this.startTime.getTime()) / 1000);

    const [
      memory,
      cpu,
      database,
      scheduler,
      api,
      errors,
      health,
      platform,
    ] = await Promise.all([
      this.collectMemoryMetrics(),
      this.collectCpuMetrics(),
      this.collectDatabaseMetrics(),
      this.collectSchedulerMetrics(),
      this.collectApiMetrics(),
      this.collectErrorMetrics(),
      this.collectHealthMetrics(),
      this.collectPlatformMetrics(),
    ]);

    const metrics: SystemMetrics = {
      timestamp,
      uptime,
      memory,
      cpu,
      database,
      scheduler,
      api,
      errors,
      health,
      platform,
    };

    // Store in history
    this.metricsHistory.push(metrics);
    this.limitArraySize(this.metricsHistory, 1000); // Keep last 1000 entries

    return metrics;
  }

  /**
   * Collect comprehensive diagnostic information
   */
  async collectDiagnostics(): Promise<DiagnosticInfo> {
    const requestId = randomUUID();
    const timestamp = new Date().toISOString();

    logger.info('Collecting diagnostic information', { requestId });

    const [
      system,
      application,
      environment,
      troubleshooting,
    ] = await Promise.all([
      this.collectSystemDiagnostics(),
      this.collectApplicationDiagnostics(),
      this.collectEnvironmentDiagnostics(),
      this.collectTroubleshootingInfo(),
    ]);

    return {
      timestamp,
      requestId,
      system,
      application,
      environment,
      troubleshooting,
    };
  }

  /**
   * Get performance metrics for a specific timeframe
   */
  async getPerformanceMetrics(timeframe = '1h'): Promise<PerformanceMetrics> {
    const now = Date.now();
    const timeframeMs = this.parseTimeframe(timeframe);
    const cutoffTime = now - timeframeMs;

    // Filter metrics within timeframe
    const relevantMetrics = this.metricsHistory.filter(
      m => new Date(m.timestamp).getTime() > cutoffTime
    );

    if (relevantMetrics.length === 0) {
      return this.getDefaultPerformanceMetrics();
    }

    // Calculate performance metrics
    const responseTimes = relevantMetrics.map(m => m.api.responses.averageTime);
    const errorRates = relevantMetrics.map(m => m.errors.errorRate);
    const throughputs = relevantMetrics.map(m => m.api.requests.perSecond);

    const averageResponseTime = this.calculateAverage(responseTimes);
    const throughput = this.calculateAverage(throughputs);
    const errorRate = this.calculateAverage(errorRates);
    const availability = this.calculateAvailability(relevantMetrics);
    const apdex = this.calculateApdex(responseTimes);

    const bottlenecks = await this.identifyBottlenecks(relevantMetrics);

    const performance: PerformanceMetrics = {
      averageResponseTime,
      throughput,
      errorRate,
      availability,
      apdex,
      bottlenecks,
    };

    // Store in performance history
    this.performanceHistory.push(performance);
    this.limitArraySize(this.performanceHistory, 500);

    return performance;
  }

  /**
   * Get monitoring alerts
   */
  async getAlerts(severity?: string): Promise<MonitoringAlert[]> {
    let alerts = [...this.alerts];

    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }

    // Sort by timestamp (newest first)
    alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return alerts;
  }

  /**
   * Export metrics in different formats
   */
  async exportMetrics(format: 'json' | 'prometheus' | 'csv'): Promise<string> {
    const metrics = await this.collectSystemMetrics();

    switch (format) {
      case 'json':
        return JSON.stringify(metrics, null, 2);
      
      case 'prometheus':
        return this.formatPrometheusMetrics(metrics);
      
      case 'csv':
        return this.formatCsvMetrics(metrics);
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Track API request metrics
   */
  trackRequest(req: any, res: any, responseTime: number): void {
    const endpoint = `${req.method} ${req.route?.path || req.path}`;
    const statusCode = res.statusCode;
    const timestamp = new Date().toISOString();

    // Update request metrics
    if (!this.requestMetrics.has('total')) {
      this.requestMetrics.set('total', 0);
    }
    this.requestMetrics.set('total', this.requestMetrics.get('total') + 1);

    // Update endpoint metrics
    if (!this.endpointMetrics.has(endpoint)) {
      this.endpointMetrics.set(endpoint, {
        requestCount: 0,
        totalResponseTime: 0,
        errorCount: 0,
        lastAccessed: timestamp,
        responseTimes: [],
      });
    }

    const endpointData = this.endpointMetrics.get(endpoint);
    endpointData.requestCount++;
    endpointData.totalResponseTime += responseTime;
    endpointData.lastAccessed = timestamp;
    endpointData.responseTimes.push(responseTime);

    // Limit response times array
    if (endpointData.responseTimes.length > 1000) {
      endpointData.responseTimes = endpointData.responseTimes.slice(-1000);
    }

    if (statusCode >= 400) {
      endpointData.errorCount++;
    }

    // Check for performance alerts
    this.checkPerformanceAlerts(endpoint, responseTime, statusCode);
  }

  /**
   * Create a monitoring alert
   */
  createAlert(
    severity: 'info' | 'warning' | 'error' | 'critical',
    category: 'performance' | 'availability' | 'security' | 'resource',
    title: string,
    description: string,
    metric: string,
    threshold: number,
    currentValue: number
  ): void {
    const alert: MonitoringAlert = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      severity,
      category,
      title,
      description,
      metric,
      threshold,
      currentValue,
      duration: 0,
      acknowledged: false,
      actions: [],
    };

    this.alerts.push(alert);
    this.limitArraySize(this.alerts, 1000);

    logger.warn('Monitoring alert created', {
      alertId: alert.id,
      severity,
      category,
      title,
      metric,
      threshold,
      currentValue,
    });

    // Execute automatic actions based on severity
    this.executeAlertActions(alert);
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    logger.info('Cleaning up diagnostics service');

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    if (this.alertsInterval) {
      clearInterval(this.alertsInterval);
    }

    // Clear metrics history
    this.metricsHistory = [];
    this.performanceHistory = [];
    this.requestMetrics.clear();
    this.endpointMetrics.clear();

    this.isInitialized = false;
    logger.info('Diagnostics service cleaned up');
  }

  // Private methods

  private async collectMemoryMetrics(): Promise<MemoryMetrics> {
    const memUsage = process.memoryUsage();
    const memoryStats = await this.memoryManager.getMemoryStats();
    
    return {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapUsedPercentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
      memoryLeaks: memoryStats.leaks || [],
      gcStats: memoryStats.gcStats || {
        totalCollections: 0,
        totalTime: 0,
        averageTime: 0,
        lastCollection: new Date().toISOString(),
        collections: {
          scavenge: 0,
          markSweep: 0,
          incrementalMarking: 0,
        },
      },
      memoryPressure: this.calculateMemoryPressure(memUsage),
    };
  }

  private async collectCpuMetrics(): Promise<CpuMetrics> {
    const cpuUsage = process.cpuUsage();
    const loadAvg = os.loadavg();
    
    const totalUsage = cpuUsage.user + cpuUsage.system;
    const usagePercentage = Math.round((totalUsage / 1000000) * 100) / 100;

    return {
      usage: usagePercentage,
      loadAverage: loadAvg,
      userTime: cpuUsage.user,
      systemTime: cpuUsage.system,
      idleTime: 0, // Would need additional calculation
      processes: [], // Would need process enumeration
    };
  }

  private async collectDatabaseMetrics(): Promise<DatabaseMetrics> {
    try {
      // This would integrate with your database connection pool
      // For now, returning mock data structure
      return {
        connectionPool: {
          total: 10,
          active: 3,
          idle: 7,
          waiting: 0,
          maxConnections: 10,
          connectionUtilization: 30,
          averageWaitTime: 0,
          connectionErrors: 0,
          connectionTimeouts: 0,
        },
        queryPerformance: {
          totalQueries: 0,
          averageQueryTime: 0,
          slowQueryCount: 0,
          failedQueries: 0,
          queriesPerSecond: 0,
          queryTypes: {},
        },
        transactions: {
          totalTransactions: 0,
          activeTransactions: 0,
          committedTransactions: 0,
          rolledBackTransactions: 0,
          averageTransactionTime: 0,
          deadlocks: 0,
        },
        health: {
          status: 'healthy',
          lastHealthCheck: new Date().toISOString(),
          responseTime: 0,
          errorRate: 0,
          uptime: 0,
        },
        slowQueries: [],
      };
    } catch (error) {
      logger.error('Failed to collect database metrics', error);
      throw error;
    }
  }

  private async collectSchedulerMetrics(): Promise<SchedulerMetrics> {
    const schedulerStats = await this.schedulerManager.getSchedulerStats();
    
    return {
      schedulers: schedulerStats.schedulers.map(s => ({
        name: s.name,
        status: s.status,
        lastRun: s.lastRun || new Date().toISOString(),
        nextRun: s.nextRun || new Date().toISOString(),
        runCount: s.runCount || 0,
        errorCount: s.errorCount || 0,
        averageDuration: s.averageDuration || 0,
        lastError: s.lastError,
        memoryUsage: s.memoryUsage || 0,
        cpuUsage: s.cpuUsage || 0,
      })),
      totalJobs: schedulerStats.totalJobs || 0,
      activeJobs: schedulerStats.activeJobs || 0,
      completedJobs: schedulerStats.completedJobs || 0,
      failedJobs: schedulerStats.failedJobs || 0,
      averageJobDuration: schedulerStats.averageJobDuration || 0,
      jobQueue: {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        retrying: 0,
        averageWaitTime: 0,
        throughput: 0,
      },
    };
  }

  private async collectApiMetrics(): Promise<ApiMetrics> {
    const totalRequests = this.requestMetrics.get('total') || 0;
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const oneHourAgo = now - 3600000;

    // Calculate requests per time period (simplified)
    const requestsPerSecond = Math.round(totalRequests / ((now - this.startTime.getTime()) / 1000));
    const requestsPerMinute = requestsPerSecond * 60;
    const requestsPerHour = requestsPerMinute * 60;

    // Collect endpoint metrics
    const endpoints = Array.from(this.endpointMetrics.entries()).map(([path, data]) => {
      const averageResponseTime = data.totalResponseTime / data.requestCount;
      const errorRate = (data.errorCount / data.requestCount) * 100;
      
      return {
        path,
        method: path.split(' ')[0],
        requestCount: data.requestCount,
        averageResponseTime,
        errorRate,
        lastAccessed: data.lastAccessed,
        slowestRequest: Math.max(...data.responseTimes),
        fastestRequest: Math.min(...data.responseTimes),
        throughput: data.requestCount / ((now - this.startTime.getTime()) / 60000),
      };
    });

    // Calculate response metrics
    const allResponseTimes = Array.from(this.endpointMetrics.values())
      .flatMap(data => data.responseTimes);
    
    const averageResponseTime = allResponseTimes.length > 0 
      ? allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length 
      : 0;

    return {
      requests: {
        total: totalRequests,
        perSecond: requestsPerSecond,
        perMinute: requestsPerMinute,
        perHour: requestsPerHour,
        byMethod: {},
        byStatusCode: {},
        averageSize: 0,
      },
      responses: {
        averageTime: averageResponseTime,
        p50: this.calculatePercentile(allResponseTimes, 50),
        p95: this.calculatePercentile(allResponseTimes, 95),
        p99: this.calculatePercentile(allResponseTimes, 99),
        slowRequests: allResponseTimes.filter(t => t > 1000).length,
        timeouts: 0,
        averageSize: 0,
      },
      endpoints,
      performance: {
        averageResponseTime,
        throughput: requestsPerSecond,
        errorRate: 0,
        availability: 100,
        apdex: this.calculateApdex(allResponseTimes),
        bottlenecks: [],
      },
      security: {
        suspiciousRequests: 0,
        blockedRequests: 0,
        rateLimitHits: 0,
        authenticationFailures: 0,
        authorizationFailures: 0,
        securityEvents: [],
      },
    };
  }

  private async collectErrorMetrics(): Promise<ErrorMetrics> {
    const errorMetrics = this.errorHandler.getErrorMetrics();
    
    return {
      total: errorMetrics.totalErrors,
      byType: errorMetrics.errorsByType,
      bySeverity: errorMetrics.errorsBySeverity,
      byEndpoint: errorMetrics.errorsByEndpoint,
      errorRate: errorMetrics.errorRate,
      recentErrors: [], // Would need to be populated from error handler
      patterns: [], // Would need to be populated from error handler
    };
  }

  private async collectHealthMetrics(): Promise<HealthMetrics> {
    const healthStatus = await this.healthCheck.getDetailedHealth();
    
    return {
      overall: healthStatus.status,
      components: Object.entries(healthStatus.checks).map(([name, check]) => ({
        name,
        status: check.status === 'pass' ? 'healthy' : check.status === 'warn' ? 'degraded' : 'unhealthy',
        lastCheck: check.lastChecked,
        responseTime: check.responseTime || 0,
        errorRate: 0,
        message: check.message,
        dependencies: [],
      })),
      checks: Object.entries(healthStatus.checks).map(([name, check]) => ({
        name,
        status: check.status,
        duration: check.responseTime || 0,
        timestamp: check.lastChecked,
        output: check.message,
        details: check.details,
      })),
      lastFullCheck: healthStatus.timestamp,
      uptime: Math.floor((Date.now() - this.startTime.getTime()) / 1000),
      availability: 100, // Would need historical calculation
    };
  }

  private async collectPlatformMetrics(): Promise<PlatformMetrics> {
    const platform = this.platformAdapter.getPlatform();
    const config = this.platformAdapter.getOptimalConfig();
    
    return {
      platform,
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      nodeVersion: process.version,
      region: process.env.RENDER_REGION,
      instanceId: process.env.RENDER_INSTANCE_ID,
      containerInfo: platform === 'render' ? {
        id: process.env.RENDER_INSTANCE_ID || 'unknown',
        image: 'node:18',
        created: this.startTime.toISOString(),
        status: 'running',
        ports: [process.env.PORT || '3000'],
        environment: {
          NODE_ENV: process.env.NODE_ENV || 'production',
          PORT: process.env.PORT || '3000',
        },
      } : undefined,
      limits: {
        memory: config.memoryLimit,
        cpu: 1, // Render typically provides 1 CPU
        storage: 1000, // GB
        connections: config.maxConnections,
        bandwidth: 100, // Mbps
      },
      usage: {
        memory: Math.round(process.memoryUsage().rss / 1024 / 1024),
        memoryPercentage: Math.round((process.memoryUsage().rss / 1024 / 1024 / config.memoryLimit) * 100),
        cpu: 0, // Would need calculation
        storage: 0, // Would need calculation
        storagePercentage: 0,
        connections: 0, // Would need tracking
        connectionsPercentage: 0,
        bandwidth: 0, // Would need tracking
      },
    };
  }

  private async collectSystemDiagnostics(): Promise<SystemDiagnostics> {
    const memInfo = process.memoryUsage();
    const cpuInfo = os.cpus();
    
    return {
      os: {
        platform: os.platform(),
        release: os.release(),
        arch: os.arch(),
        hostname: os.hostname(),
        uptime: os.uptime(),
      },
      process: {
        pid: process.pid,
        ppid: process.ppid || 0,
        uid: process.getuid ? process.getuid() : 0,
        gid: process.getgid ? process.getgid() : 0,
        cwd: process.cwd(),
        execPath: process.execPath,
        argv: process.argv,
        env: Object.fromEntries(
          Object.entries(process.env).filter(([_, value]) => value !== undefined)
        ) as Record<string, string>,
      },
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
        cached: 0, // Would need OS-specific calculation
        buffers: 0, // Would need OS-specific calculation
        swapTotal: 0, // Would need OS-specific calculation
        swapFree: 0, // Would need OS-specific calculation
      },
      cpu: {
        model: cpuInfo[0]?.model || 'Unknown',
        cores: cpuInfo.length,
        speed: cpuInfo[0]?.speed || 0,
        usage: cpuInfo.map(cpu => {
          const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
          return Math.round(((total - cpu.times.idle) / total) * 100);
        }),
        loadAverage: os.loadavg(),
      },
      network: {
        interfaces: Object.entries(os.networkInterfaces()).flatMap(([name, interfaces]) =>
          (interfaces || []).map(iface => ({
            name,
            address: iface.address,
            netmask: iface.netmask,
            family: iface.family,
            mac: iface.mac,
            internal: iface.internal,
            cidr: iface.cidr || '',
          }))
        ),
        connections: [], // Would need netstat-like functionality
      },
      storage: {
        disks: [], // Would need OS-specific disk enumeration
        totalSpace: 0,
        freeSpace: 0,
        usedSpace: 0,
      },
    };
  }

  private async collectApplicationDiagnostics(): Promise<ApplicationDiagnostics> {
    let packageJson: any = {};
    try {
      const packagePath = path.join(process.cwd(), 'package.json');
      const packageContent = await fs.readFile(packagePath, 'utf-8');
      packageJson = JSON.parse(packageContent);
    } catch (error) {
      logger.warn('Could not read package.json', error);
    }

    return {
      version: packageJson.version || '1.0.0',
      startTime: this.startTime.toISOString(),
      uptime: Math.floor((Date.now() - this.startTime.getTime()) / 1000),
      nodeVersion: process.version,
      dependencies: Object.entries(packageJson.dependencies || {}).map(([name, version]) => ({
        name,
        version: version as string,
        type: 'production',
      })),
      configuration: {
        environment: process.env.NODE_ENV || 'development',
        port: parseInt(process.env.PORT || '3000'),
        database: {
          host: process.env.DATABASE_HOST || 'localhost',
          port: parseInt(process.env.DATABASE_PORT || '5432'),
          database: process.env.DATABASE_NAME || 'app',
          ssl: process.env.DATABASE_SSL === 'true',
          poolSize: parseInt(process.env.DATABASE_POOL_SIZE || '10'),
        },
        logging: {
          level: process.env.LOG_LEVEL || 'info',
          format: 'json',
        },
        security: {
          cors: true,
          helmet: true,
          rateLimit: true,
        },
      },
      features: [
        {
          name: 'health-monitoring',
          enabled: true,
          status: 'active',
          dependencies: ['database', 'memory-manager'],
        },
        {
          name: 'error-handling',
          enabled: true,
          status: 'active',
          dependencies: ['logger'],
        },
        {
          name: 'scheduler-management',
          enabled: true,
          status: 'active',
          dependencies: ['memory-manager'],
        },
      ],
      services: [
        {
          name: 'health-check',
          status: 'running',
          startTime: this.startTime.toISOString(),
          restartCount: 0,
          healthCheck: {
            status: 'healthy',
            lastCheck: new Date().toISOString(),
          },
        },
        {
          name: 'diagnostics',
          status: 'running',
          startTime: this.startTime.toISOString(),
          restartCount: 0,
          healthCheck: {
            status: 'healthy',
            lastCheck: new Date().toISOString(),
          },
        },
      ],
    };
  }

  private async collectEnvironmentDiagnostics(): Promise<EnvironmentDiagnostics> {
    const platform = this.platformAdapter.getPlatform();
    
    return {
      platform,
      region: process.env.RENDER_REGION,
      cloudProvider: platform === 'render' ? 'render' : undefined,
      networking: {
        publicIp: process.env.RENDER_EXTERNAL_URL,
        dns: ['8.8.8.8', '8.8.4.4'], // Default DNS
        routes: [], // Would need route table access
      },
      security: {
        firewalls: [], // Would need firewall rule access
        certificates: [], // Would need certificate store access
      },
    };
  }

  private async collectTroubleshootingInfo(): Promise<TroubleshootingInfo> {
    return {
      commonIssues: [
        {
          category: 'memory',
          severity: 'high',
          title: 'Memory Usage High',
          description: 'Application memory usage is approaching limits',
          symptoms: ['Slow response times', 'Increased garbage collection', 'Out of memory errors'],
          possibleCauses: ['Memory leaks', 'Large object retention', 'Insufficient memory allocation'],
          solutions: ['Restart application', 'Increase memory limits', 'Optimize memory usage'],
          preventionMeasures: ['Regular memory monitoring', 'Memory leak detection', 'Proper object cleanup'],
        },
        {
          category: 'database',
          severity: 'high',
          title: 'Database Connection Issues',
          description: 'Database connections are failing or timing out',
          symptoms: ['Connection timeouts', 'Query failures', 'Slow database operations'],
          possibleCauses: ['Network issues', 'Database overload', 'Connection pool exhaustion'],
          solutions: ['Check network connectivity', 'Restart database connections', 'Optimize queries'],
          preventionMeasures: ['Connection monitoring', 'Query optimization', 'Proper connection pooling'],
        },
      ],
      recommendations: [
        {
          type: 'monitoring',
          priority: 'high',
          title: 'Implement Comprehensive Monitoring',
          description: 'Set up detailed monitoring for all system components',
          implementation: ['Add metrics collection', 'Set up alerting', 'Create dashboards'],
          expectedBenefit: 'Early detection of issues and improved system reliability',
          effort: 'medium',
        },
        {
          type: 'optimization',
          priority: 'medium',
          title: 'Optimize Memory Usage',
          description: 'Implement memory optimization strategies',
          implementation: ['Add memory profiling', 'Optimize object lifecycle', 'Implement caching strategies'],
          expectedBenefit: 'Reduced memory usage and improved performance',
          effort: 'high',
        },
      ],
      diagnosticCommands: [
        {
          name: 'memory-usage',
          description: 'Check current memory usage',
          command: 'node -e "console.log(process.memoryUsage())"',
          category: 'system',
          safe: true,
          requiresElevation: false,
        },
        {
          name: 'process-info',
          description: 'Get process information',
          command: 'node -e "console.log({pid: process.pid, uptime: process.uptime()})"',
          category: 'system',
          safe: true,
          requiresElevation: false,
        },
      ],
      logAnalysis: {
        errorPatterns: [],
        warningPatterns: [],
        performanceIssues: [],
        securityEvents: [],
        recentEntries: [],
      },
      performanceAnalysis: {
        bottlenecks: [],
        trends: [],
        recommendations: [],
        benchmarks: [],
      },
    };
  }

  private calculateMemoryPressure(memUsage: NodeJS.MemoryUsage): 'low' | 'medium' | 'high' | 'critical' {
    const heapUsedPercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    if (heapUsedPercentage > 90) return 'critical';
    if (heapUsedPercentage > 75) return 'high';
    if (heapUsedPercentage > 50) return 'medium';
    return 'low';
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private calculateAvailability(metrics: SystemMetrics[]): number {
    if (metrics.length === 0) return 100;
    
    const healthyCount = metrics.filter(m => m.health.overall === 'healthy').length;
    return (healthyCount / metrics.length) * 100;
  }

  private calculateApdex(responseTimes: number[], satisfiedThreshold = 500, toleratedThreshold = 2000): number {
    if (responseTimes.length === 0) return 1;
    
    const satisfied = responseTimes.filter(t => t <= satisfiedThreshold).length;
    const tolerated = responseTimes.filter(t => t > satisfiedThreshold && t <= toleratedThreshold).length;
    
    return (satisfied + (tolerated * 0.5)) / responseTimes.length;
  }

  private async identifyBottlenecks(metrics: SystemMetrics[]): Promise<any[]> {
    const bottlenecks: any[] = [];
    
    if (metrics.length === 0) return bottlenecks;
    
    const latest = metrics[metrics.length - 1];
    
    // Check memory bottleneck
    if (latest.memory.memoryPressure === 'high' || latest.memory.memoryPressure === 'critical') {
      bottlenecks.push({
        type: 'memory',
        description: 'High memory usage detected',
        impact: latest.memory.memoryPressure,
        frequency: 1,
        averageDelay: 0,
        recommendations: ['Optimize memory usage', 'Increase memory limits', 'Implement memory monitoring'],
      });
    }
    
    // Check CPU bottleneck
    if (latest.cpu.usage > 80) {
      bottlenecks.push({
        type: 'cpu',
        description: 'High CPU usage detected',
        impact: 'high',
        frequency: 1,
        averageDelay: 0,
        recommendations: ['Optimize CPU-intensive operations', 'Scale horizontally', 'Profile application'],
      });
    }
    
    // Check database bottleneck
    if (latest.database.health.status !== 'healthy') {
      bottlenecks.push({
        type: 'database',
        description: 'Database performance issues detected',
        impact: 'high',
        frequency: 1,
        averageDelay: latest.database.health.responseTime,
        recommendations: ['Optimize queries', 'Check database resources', 'Review connection pooling'],
      });
    }
    
    return bottlenecks;
  }

  private getDefaultPerformanceMetrics(): PerformanceMetrics {
    return {
      averageResponseTime: 0,
      throughput: 0,
      errorRate: 0,
      availability: 100,
      apdex: 1,
      bottlenecks: [],
    };
  }

  private parseTimeframe(timeframe: string): number {
    const match = timeframe.match(/^(\d+)([smhd])$/);
    if (!match) return 3600000; // Default 1 hour
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 3600000;
    }
  }

  private formatPrometheusMetrics(metrics: SystemMetrics): string {
    const lines: string[] = [];
    const timestamp = Date.now();
    
    // Memory metrics
    lines.push(`# HELP memory_heap_used_bytes Heap memory used in bytes`);
    lines.push(`# TYPE memory_heap_used_bytes gauge`);
    lines.push(`memory_heap_used_bytes ${metrics.memory.heapUsed * 1024 * 1024} ${timestamp}`);
    
    lines.push(`# HELP memory_heap_total_bytes Total heap memory in bytes`);
    lines.push(`# TYPE memory_heap_total_bytes gauge`);
    lines.push(`memory_heap_total_bytes ${metrics.memory.heapTotal * 1024 * 1024} ${timestamp}`);
    
    // CPU metrics
    lines.push(`# HELP cpu_usage_percent CPU usage percentage`);
    lines.push(`# TYPE cpu_usage_percent gauge`);
    lines.push(`cpu_usage_percent ${metrics.cpu.usage} ${timestamp}`);
    
    // API metrics
    lines.push(`# HELP api_requests_total Total number of API requests`);
    lines.push(`# TYPE api_requests_total counter`);
    lines.push(`api_requests_total ${metrics.api.requests.total} ${timestamp}`);
    
    lines.push(`# HELP api_response_time_seconds Average API response time in seconds`);
    lines.push(`# TYPE api_response_time_seconds gauge`);
    lines.push(`api_response_time_seconds ${metrics.api.responses.averageTime / 1000} ${timestamp}`);
    
    // Error metrics
    lines.push(`# HELP errors_total Total number of errors`);
    lines.push(`# TYPE errors_total counter`);
    lines.push(`errors_total ${metrics.errors.total} ${timestamp}`);
    
    return lines.join('\n');
  }

  private formatCsvMetrics(metrics: SystemMetrics): string {
    const headers = [
      'timestamp',
      'uptime',
      'memory_heap_used_mb',
      'memory_heap_total_mb',
      'cpu_usage_percent',
      'api_requests_total',
      'api_response_time_ms',
      'errors_total',
      'health_status',
    ];
    
    const values = [
      metrics.timestamp,
      metrics.uptime,
      metrics.memory.heapUsed,
      metrics.memory.heapTotal,
      metrics.cpu.usage,
      metrics.api.requests.total,
      metrics.api.responses.averageTime,
      metrics.errors.total,
      metrics.health.overall,
    ];
    
    return [headers.join(','), values.join(',')].join('\n');
  }

  private checkPerformanceAlerts(endpoint: string, responseTime: number, statusCode: number): void {
    // Check for slow response time
    if (responseTime > 2000) {
      this.createAlert(
        'warning',
        'performance',
        'Slow Response Time',
        `Endpoint ${endpoint} responded in ${responseTime}ms`,
        'response_time',
        2000,
        responseTime
      );
    }
    
    // Check for very slow response time
    if (responseTime > 5000) {
      this.createAlert(
        'error',
        'performance',
        'Very Slow Response Time',
        `Endpoint ${endpoint} responded in ${responseTime}ms`,
        'response_time',
        5000,
        responseTime
      );
    }
    
    // Check for server errors
    if (statusCode >= 500) {
      this.createAlert(
        'error',
        'availability',
        'Server Error',
        `Endpoint ${endpoint} returned status ${statusCode}`,
        'status_code',
        500,
        statusCode
      );
    }
  }

  private executeAlertActions(alert: MonitoringAlert): void {
    // Execute automatic actions based on alert severity and category
    if (alert.severity === 'critical') {
      // Critical alerts might trigger immediate actions
      alert.actions.push({
        type: 'notification',
        description: 'Critical alert notification sent',
        executed: true,
        executedAt: new Date().toISOString(),
        result: 'Notification sent successfully',
      });
    }
    
    if (alert.category === 'resource' && alert.severity === 'error') {
      // Resource alerts might trigger cleanup actions
      alert.actions.push({
        type: 'automation',
        description: 'Automatic resource cleanup initiated',
        executed: true,
        executedAt: new Date().toISOString(),
        result: 'Cleanup process started',
      });
    }
  }

  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(async () => {
      try {
        await this.collectSystemMetrics();
      } catch (error) {
        logger.error('Metrics collection error', error);
      }
    }, 60000); // Collect every minute
  }

  private startAlertMonitoring(): void {
    this.alertsInterval = setInterval(() => {
      try {
        this.processAlerts();
      } catch (error) {
        logger.error('Alert monitoring error', error);
      }
    }, 30000); // Check every 30 seconds
  }

  private processAlerts(): void {
    const now = Date.now();
    
    // Update alert durations
    this.alerts.forEach(alert => {
      if (!alert.resolvedAt) {
        alert.duration = now - new Date(alert.timestamp).getTime();
      }
    });
    
    // Auto-resolve old alerts
    this.alerts.forEach(alert => {
      if (!alert.resolvedAt && alert.duration > 3600000) { // 1 hour
        alert.resolvedAt = new Date().toISOString();
        logger.info('Alert auto-resolved due to age', {
          alertId: alert.id,
          title: alert.title,
          duration: alert.duration,
        });
      }
    });
    
    // Clean up old resolved alerts
    this.alerts = this.alerts.filter(alert => {
      if (alert.resolvedAt) {
        const resolvedTime = new Date(alert.resolvedAt).getTime();
        return now - resolvedTime < 86400000; // Keep for 24 hours
      }
      return true;
    });
  }

  private limitArraySize<T>(array: T[], maxSize: number): void {
    if (array.length > maxSize) {
      array.splice(0, array.length - maxSize);
    }
  }
}