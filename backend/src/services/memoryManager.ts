import {
  MemoryConfig,
  MemoryUsage,
  MemoryTrend,
  GarbageCollectionStats,
  GCEvent,
  MemoryLeak,
  CleanupStrategy,
  MemoryAlert,
  MemoryPressureEvent,
  HeapSnapshot,
  MemoryHealthReport
} from '../types/memory';
import { PlatformAdapterService } from './platformAdapter';
import { CorrelationService } from './correlationService';
import logger from './logger';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

export class MemoryManagerService {
  private static instance: MemoryManagerService;
  private config: MemoryConfig;
  private platformAdapter: PlatformAdapterService;
  private correlationService: CorrelationService;
  
  // Memory tracking
  private memoryHistory: MemoryUsage[] = [];
  private gcStats: GarbageCollectionStats;
  private alerts: MemoryAlert[] = [];
  private pressureEvents: MemoryPressureEvent[] = [];
  private heapSnapshots: HeapSnapshot[] = [];
  
  // Monitoring state
  private monitoringInterval?: NodeJS.Timeout;
  private isMonitoring = false;
  private lastCleanup = Date.now();
  private cleanupStrategies: CleanupStrategy[] = [];
  
  // Leak detection
  private leakDetectionSamples: MemoryUsage[] = [];
  private lastLeakCheck = Date.now();

  private constructor() {
    this.platformAdapter = PlatformAdapterService.getInstance();
    this.correlationService = CorrelationService.getInstance();
    this.config = this.getOptimalConfig();
    this.gcStats = this.initializeGCStats();
    this.setupGCMonitoring();
    this.initializeCleanupStrategies();
  }

  public static getInstance(): MemoryManagerService {
    if (!MemoryManagerService.instance) {
      MemoryManagerService.instance = new MemoryManagerService();
    }
    return MemoryManagerService.instance;
  }

  /**
   * Start memory monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    logger.info('Starting memory monitoring', {
      config: this.config,
      platform: this.platformAdapter.getPlatform(),
    });

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.performMemoryCheck();
    }, this.config.monitoringInterval);

    // Initial memory check
    this.performMemoryCheck();
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    this.isMonitoring = false;
    logger.info('Memory monitoring stopped');
  }

  /**
   * Get current memory usage
   */
  getCurrentMemoryUsage(): MemoryUsage {
    const memUsage = process.memoryUsage();
    const platformLimits = this.platformAdapter.monitorResourceLimits();
    
    return {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
      arrayBuffers: Math.round((memUsage as any).arrayBuffers / 1024 / 1024 || 0),
      usagePercentage: platformLimits.memory.percentage,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Trigger garbage collection manually
   */
  async triggerGarbageCollection(trigger: string = 'manual'): Promise<number> {
    if (!global.gc) {
      logger.warn('Garbage collection not available (start with --expose-gc flag)');
      return 0;
    }

    const beforeGC = this.getCurrentMemoryUsage();
    const startTime = Date.now();
    
    try {
      global.gc();
      
      const afterGC = this.getCurrentMemoryUsage();
      const duration = Date.now() - startTime;
      const memoryFreed = beforeGC.heapUsed - afterGC.heapUsed;
      
      const gcEvent: GCEvent = {
        timestamp: new Date().toISOString(),
        duration,
        memoryBefore: beforeGC.heapUsed,
        memoryAfter: afterGC.heapUsed,
        memoryFreed,
        type: trigger === 'manual' ? 'manual' : 'automatic',
        trigger,
      };
      
      this.recordGCEvent(gcEvent);
      
      logger.info('Garbage collection completed', {
        trigger,
        duration,
        memoryBefore: beforeGC.heapUsed,
        memoryAfter: afterGC.heapUsed,
        memoryFreed,
        efficiency: Math.round((memoryFreed / beforeGC.heapUsed) * 100),
      });
      
      return memoryFreed;
    } catch (error) {
      logger.error('Garbage collection failed', error);
      return 0;
    }
  }

  /**
   * Handle memory pressure
   */
  async handleMemoryPressure(level: 'low' | 'moderate' | 'high' | 'critical'): Promise<MemoryPressureEvent> {
    const startTime = Date.now();
    const initialMemory = this.getCurrentMemoryUsage();
    const correlationId = this.correlationService.generateSystemCorrelationId('memory-pressure');
    
    logger.warn('Memory pressure detected', {
      level,
      memoryUsage: initialMemory,
      correlationId,
    });

    const actionsPerformed: string[] = [];
    let totalMemoryFreed = 0;

    try {
      // Execute cleanup strategies based on priority and level
      const applicableStrategies = this.getApplicableCleanupStrategies(level, initialMemory.usagePercentage);
      
      for (const strategy of applicableStrategies) {
        try {
          logger.info(`Executing cleanup strategy: ${strategy.name}`, { correlationId });
          const memoryFreed = await strategy.action();
          totalMemoryFreed += memoryFreed;
          actionsPerformed.push(`${strategy.name}: ${memoryFreed}MB freed`);
        } catch (error) {
          logger.error(`Cleanup strategy failed: ${strategy.name}`, error);
          actionsPerformed.push(`${strategy.name}: failed`);
        }
      }

      // Trigger garbage collection for critical levels
      if (level === 'high' || level === 'critical') {
        const gcFreed = await this.triggerGarbageCollection(`memory-pressure-${level}`);
        totalMemoryFreed += gcFreed;
        actionsPerformed.push(`Garbage collection: ${gcFreed}MB freed`);
      }

      // Create heap snapshot for critical situations
      if (level === 'critical' && this.config.heapDumpEnabled) {
        try {
          await this.createHeapSnapshot(`memory-pressure-${level}`, correlationId);
          actionsPerformed.push('Heap snapshot created');
        } catch (error) {
          logger.error('Failed to create heap snapshot', error);
          actionsPerformed.push('Heap snapshot failed');
        }
      }

      const finalMemory = this.getCurrentMemoryUsage();
      const duration = Date.now() - startTime;
      const success = finalMemory.usagePercentage < initialMemory.usagePercentage;

      const pressureEvent: MemoryPressureEvent = {
        timestamp: new Date().toISOString(),
        level,
        memoryUsage: initialMemory,
        trigger: 'automatic',
        actionsPerformed,
        memoryFreed: totalMemoryFreed,
        duration,
        success,
      };

      this.recordPressureEvent(pressureEvent);

      logger.info('Memory pressure handling completed', {
        level,
        duration,
        memoryFreed: totalMemoryFreed,
        success,
        correlationId,
      });

      return pressureEvent;
    } catch (error) {
      logger.error('Memory pressure handling failed', error);
      
      return {
        timestamp: new Date().toISOString(),
        level,
        memoryUsage: initialMemory,
        trigger: 'automatic',
        actionsPerformed: ['Error occurred during cleanup'],
        memoryFreed: 0,
        duration: Date.now() - startTime,
        success: false,
      };
    }
  }

  /**
   * Detect memory leaks
   */
  detectMemoryLeaks(): MemoryLeak {
    if (this.leakDetectionSamples.length < this.config.leakDetectionSamples) {
      return {
        detected: false,
        confidence: 0,
        growthRate: 0,
        detectionTime: new Date().toISOString(),
        recommendations: [],
      };
    }

    // Calculate memory growth trend
    const samples = this.leakDetectionSamples.slice(-this.config.leakDetectionSamples);
    const timeSpan = new Date(samples[samples.length - 1].timestamp).getTime() - 
                    new Date(samples[0].timestamp).getTime();
    const memoryGrowth = samples[samples.length - 1].heapUsed - samples[0].heapUsed;
    const growthRate = (memoryGrowth / (timeSpan / 60000)); // MB per minute

    // Determine if it's a leak
    const isLeak = growthRate > 1 && // Growing more than 1MB per minute
                   samples.every((sample, index) => 
                     index === 0 || sample.heapUsed >= samples[index - 1].heapUsed * 0.95
                   ); // Consistent growth

    const confidence = isLeak ? Math.min(100, Math.abs(growthRate) * 20) : 0;

    const recommendations: string[] = [];
    if (isLeak) {
      recommendations.push('Monitor application for memory leaks');
      recommendations.push('Review recent code changes for potential leaks');
      recommendations.push('Consider creating a heap snapshot for analysis');
      if (growthRate > 5) {
        recommendations.push('Critical: Memory growing rapidly, immediate investigation required');
      }
    }

    return {
      detected: isLeak,
      confidence: Math.round(confidence),
      growthRate: Math.round(growthRate * 100) / 100,
      detectionTime: new Date().toISOString(),
      recommendations,
    };
  }

  /**
   * Create heap snapshot
   */
  async createHeapSnapshot(trigger: string, correlationId?: string): Promise<HeapSnapshot> {
    if (!this.config.heapDumpEnabled) {
      throw new Error('Heap dumps are disabled');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `heap-${timestamp}-${trigger}.heapsnapshot`;
    const filepath = path.join(this.config.heapDumpPath, filename);

    // Ensure directory exists
    await fs.promises.mkdir(this.config.heapDumpPath, { recursive: true });

    try {
      // Use v8.writeHeapSnapshot if available
      const v8 = require('v8');
      if (v8.writeHeapSnapshot) {
        v8.writeHeapSnapshot(filepath);
      } else {
        throw new Error('Heap snapshot not supported in this Node.js version');
      }

      const stats = await fs.promises.stat(filepath);
      const snapshot: HeapSnapshot = {
        timestamp: new Date().toISOString(),
        filename,
        size: stats.size,
        memoryUsage: this.getCurrentMemoryUsage(),
        trigger,
        correlationId,
      };

      this.heapSnapshots.push(snapshot);
      
      // Cleanup old snapshots
      await this.cleanupOldHeapSnapshots();

      logger.info('Heap snapshot created', {
        filename,
        size: Math.round(stats.size / 1024 / 1024),
        trigger,
        correlationId,
      });

      return snapshot;
    } catch (error) {
      logger.error('Failed to create heap snapshot', error);
      throw error;
    }
  }

  /**
   * Get memory statistics (alias for compatibility)
   */
  async getMemoryStats(): Promise<any> {
    return this.getMemoryHealthReport();
  }

  /**
   * Get health metrics (alias for compatibility)
   */
  getHealthMetrics(): any {
    return this.getMemoryHealthReport();
  }

  /**
   * Check memory pressure (alias for compatibility)
   */
  checkMemoryPressure(): boolean {
    const usage = this.getCurrentMemoryUsage();
    return usage.heapUsed / usage.heapTotal > 0.8;
  }

  /**
   * Force garbage collection (alias for compatibility)
   */
  forceGarbageCollection(trigger?: string): Promise<number> {
    return this.triggerGarbageCollection(trigger);
  }

  /**
   * Get memory health report
   */
  getMemoryHealthReport(): MemoryHealthReport {
    const currentUsage = this.getCurrentMemoryUsage();
    const trend = this.calculateMemoryTrend();
    const leakDetection = this.detectMemoryLeaks();
    
    let status: 'healthy' | 'warning' | 'critical' | 'emergency' = 'healthy';
    
    if (currentUsage.usagePercentage >= this.config.emergencyThreshold) {
      status = 'emergency';
    } else if (currentUsage.usagePercentage >= this.config.criticalThreshold) {
      status = 'critical';
    } else if (currentUsage.usagePercentage >= this.config.warningThreshold || leakDetection.detected) {
      status = 'warning';
    }

    const recommendations = this.generateRecommendations(currentUsage, trend, leakDetection);

    return {
      status,
      currentUsage,
      trend,
      gcStats: { ...this.gcStats },
      leakDetection,
      recentAlerts: this.alerts.slice(-10),
      recentPressureEvents: this.pressureEvents.slice(-5),
      recommendations,
      nextCleanupIn: this.getNextCleanupTime(),
    };
  }

  /**
   * Force emergency cleanup
   */
  async performEmergencyCleanup(): Promise<number> {
    logger.warn('Performing emergency memory cleanup');
    
    const pressureEvent = await this.handleMemoryPressure('critical');
    return pressureEvent.memoryFreed;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stopMonitoring();
    
    // Clear history arrays to free memory
    this.memoryHistory = [];
    this.leakDetectionSamples = [];
    this.alerts = [];
    this.pressureEvents = [];
    
    logger.info('Memory manager cleaned up');
  }

  // Private methods

  private getOptimalConfig(): MemoryConfig {
    const platformConfig = this.platformAdapter.getConfig();
    const isRender = this.platformAdapter.isRender();
    
    return {
      warningThreshold: isRender ? 75 : 80, // More aggressive on Render
      criticalThreshold: isRender ? 85 : 90,
      emergencyThreshold: isRender ? 92 : 95,
      gcTriggerThreshold: isRender ? 80 : 85,
      monitoringInterval: 30000, // 30 seconds
      leakDetectionEnabled: true,
      leakDetectionSamples: 10,
      heapDumpEnabled: process.env.NODE_ENV !== 'production', // Disable in production by default
      heapDumpPath: path.join(process.cwd(), 'heap-dumps'),
      maxHeapDumps: 5,
      cleanupStrategies: [],
    };
  }

  private initializeGCStats(): GarbageCollectionStats {
    return {
      totalCollections: 0,
      totalDuration: 0,
      averageDuration: 0,
      lastCollection: new Date().toISOString(),
      collections: [],
      efficiency: 0,
    };
  }

  private setupGCMonitoring(): void {
    // Monitor garbage collection if available
    if (global.gc) {
      const originalGC = global.gc;
      global.gc = (() => {
        const startTime = Date.now();
        const beforeMemory = this.getCurrentMemoryUsage();
        
        originalGC();
        
        const afterMemory = this.getCurrentMemoryUsage();
        const duration = Date.now() - startTime;
        
        const gcEvent: GCEvent = {
          timestamp: new Date().toISOString(),
          duration,
          memoryBefore: beforeMemory.heapUsed,
          memoryAfter: afterMemory.heapUsed,
          memoryFreed: beforeMemory.heapUsed - afterMemory.heapUsed,
          type: 'manual',
          trigger: 'global.gc()',
        };
        
        this.recordGCEvent(gcEvent);
      }) as any;
    }
  }

  private initializeCleanupStrategies(): void {
    this.cleanupStrategies = [
      {
        name: 'Garbage Collection',
        priority: 10,
        threshold: this.config.gcTriggerThreshold,
        action: async () => this.triggerGarbageCollection('cleanup-strategy'),
        description: 'Trigger manual garbage collection',
        enabled: !!global.gc,
      },
      {
        name: 'Clear Performance Metrics Cache',
        priority: 8,
        threshold: 85,
        action: async () => {
          try {
            const { PerformanceMetricsService } = await import('./performanceMetrics');
            const service = PerformanceMetricsService.getInstance();
            service.cleanup();
            return 5; // Estimated MB freed
          } catch (error) {
            return 0;
          }
        },
        description: 'Clear performance metrics history',
        enabled: true,
      },
      {
        name: 'Clear Memory History',
        priority: 6,
        threshold: 90,
        action: async () => {
          const sizeBefore = this.memoryHistory.length;
          this.memoryHistory = this.memoryHistory.slice(-50); // Keep only last 50 entries
          this.leakDetectionSamples = this.leakDetectionSamples.slice(-10);
          return Math.round((sizeBefore - this.memoryHistory.length) * 0.001); // Rough estimate
        },
        description: 'Clear old memory usage history',
        enabled: true,
      },
    ];
  }

  private performMemoryCheck(): void {
    const currentUsage = this.getCurrentMemoryUsage();
    
    // Add to history
    this.memoryHistory.push(currentUsage);
    if (this.memoryHistory.length > 1000) {
      this.memoryHistory = this.memoryHistory.slice(-1000);
    }

    // Add to leak detection samples
    this.leakDetectionSamples.push(currentUsage);
    if (this.leakDetectionSamples.length > this.config.leakDetectionSamples) {
      this.leakDetectionSamples = this.leakDetectionSamples.slice(-this.config.leakDetectionSamples);
    }

    // Check thresholds and trigger actions
    this.checkMemoryThresholds(currentUsage);
  }

  private checkMemoryThresholds(usage: MemoryUsage): void {
    const correlationId = this.correlationService.generateSystemCorrelationId('memory-check');

    if (usage.usagePercentage >= this.config.emergencyThreshold) {
      this.createAlert('emergency', 'Memory usage critical - emergency cleanup required', usage, correlationId);
      this.handleMemoryPressure('critical').catch(error => {
        logger.error('Emergency memory cleanup failed', error);
      });
    } else if (usage.usagePercentage >= this.config.criticalThreshold) {
      this.createAlert('critical', 'Memory usage critical - cleanup required', usage, correlationId);
      this.handleMemoryPressure('high').catch(error => {
        logger.error('Critical memory cleanup failed', error);
      });
    } else if (usage.usagePercentage >= this.config.warningThreshold) {
      this.createAlert('warning', 'Memory usage high - monitoring closely', usage, correlationId);
      
      // Trigger proactive cleanup
      if (Date.now() - this.lastCleanup > 300000) { // 5 minutes since last cleanup
        this.handleMemoryPressure('moderate').catch(error => {
          logger.error('Proactive memory cleanup failed', error);
        });
        this.lastCleanup = Date.now();
      }
    }
  }

  private createAlert(level: 'warning' | 'critical' | 'emergency', message: string, usage: MemoryUsage, correlationId?: string): void {
    const alert: MemoryAlert = {
      level,
      message,
      timestamp: new Date().toISOString(),
      memoryUsage: usage,
      correlationId,
    };

    this.alerts.push(alert);
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    logger.warn('Memory alert created', {
      level,
      message,
      memoryUsage: usage.usagePercentage,
      correlationId,
    });
  }

  private recordGCEvent(event: GCEvent): void {
    this.gcStats.collections.push(event);
    this.gcStats.totalCollections++;
    this.gcStats.totalDuration += event.duration;
    this.gcStats.averageDuration = this.gcStats.totalDuration / this.gcStats.totalCollections;
    this.gcStats.lastCollection = event.timestamp;
    
    // Calculate efficiency
    if (event.memoryBefore > 0) {
      this.gcStats.efficiency = (event.memoryFreed / event.memoryBefore) * 100;
    }

    // Keep only last 50 GC events
    if (this.gcStats.collections.length > 50) {
      this.gcStats.collections = this.gcStats.collections.slice(-50);
    }
  }

  private recordPressureEvent(event: MemoryPressureEvent): void {
    this.pressureEvents.push(event);
    
    // Keep only last 20 pressure events
    if (this.pressureEvents.length > 20) {
      this.pressureEvents = this.pressureEvents.slice(-20);
    }
  }

  private getApplicableCleanupStrategies(level: string, memoryPercentage: number): CleanupStrategy[] {
    return this.cleanupStrategies
      .filter(strategy => strategy.enabled && memoryPercentage >= strategy.threshold)
      .sort((a, b) => b.priority - a.priority);
  }

  private calculateMemoryTrend(): MemoryTrend {
    if (this.memoryHistory.length < 5) {
      return {
        samples: [...this.memoryHistory],
        trend: 'stable',
        growthRate: 0,
        leakSuspected: false,
        recommendations: [],
      };
    }

    const recentSamples = this.memoryHistory.slice(-20);
    const timeSpan = new Date(recentSamples[recentSamples.length - 1].timestamp).getTime() - 
                    new Date(recentSamples[0].timestamp).getTime();
    const memoryChange = recentSamples[recentSamples.length - 1].heapUsed - recentSamples[0].heapUsed;
    const growthRate = (memoryChange / (timeSpan / 60000)); // MB per minute

    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (Math.abs(growthRate) > 0.5) {
      trend = growthRate > 0 ? 'increasing' : 'decreasing';
    }

    const leakSuspected = growthRate > 1 && trend === 'increasing';
    
    const recommendations: string[] = [];
    if (leakSuspected) {
      recommendations.push('Potential memory leak detected');
      recommendations.push('Monitor application closely');
    }

    return {
      samples: recentSamples,
      trend,
      growthRate: Math.round(growthRate * 100) / 100,
      leakSuspected,
      recommendations,
    };
  }

  private generateRecommendations(usage: MemoryUsage, trend: MemoryTrend, leak: MemoryLeak): string[] {
    const recommendations: string[] = [];

    if (usage.usagePercentage > 90) {
      recommendations.push('Critical: Memory usage very high, immediate action required');
      recommendations.push('Consider restarting the service');
    } else if (usage.usagePercentage > 80) {
      recommendations.push('Memory usage high, monitor closely');
      recommendations.push('Consider triggering garbage collection');
    }

    if (trend.trend === 'increasing' && trend.growthRate > 1) {
      recommendations.push('Memory usage increasing rapidly');
      recommendations.push('Investigate recent changes for memory leaks');
    }

    if (leak.detected) {
      recommendations.push(`Memory leak detected with ${leak.confidence}% confidence`);
      recommendations.push('Create heap snapshot for analysis');
      recommendations.push('Review application code for memory leaks');
    }

    if (this.platformAdapter.isRender()) {
      recommendations.push('Running on Render.com - monitor 512MB limit closely');
    }

    return recommendations;
  }

  private getNextCleanupTime(): number | undefined {
    const timeSinceLastCleanup = Date.now() - this.lastCleanup;
    const cleanupInterval = 300000; // 5 minutes
    
    if (timeSinceLastCleanup < cleanupInterval) {
      return cleanupInterval - timeSinceLastCleanup;
    }
    
    return undefined;
  }

  private async cleanupOldHeapSnapshots(): Promise<void> {
    if (this.heapSnapshots.length <= this.config.maxHeapDumps) {
      return;
    }

    const toDelete = this.heapSnapshots.slice(0, this.heapSnapshots.length - this.config.maxHeapDumps);
    
    for (const snapshot of toDelete) {
      try {
        const filepath = path.join(this.config.heapDumpPath, snapshot.filename);
        await fs.promises.unlink(filepath);
        logger.debug('Deleted old heap snapshot', { filename: snapshot.filename });
      } catch (error) {
        logger.warn('Failed to delete old heap snapshot', { filename: snapshot.filename, error });
      }
    }

    this.heapSnapshots = this.heapSnapshots.slice(-this.config.maxHeapDumps);
  }
}