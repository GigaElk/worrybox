import { SchedulerStatus } from '../types/monitoring';
import logger from './logger';

export class SchedulerMonitorService {
  private static instance: SchedulerMonitorService;
  private schedulers: Map<string, SchedulerStatus> = new Map();
  private memoryBaselines: Map<string, number> = new Map();

  public static getInstance(): SchedulerMonitorService {
    if (!SchedulerMonitorService.instance) {
      SchedulerMonitorService.instance = new SchedulerMonitorService();
    }
    return SchedulerMonitorService.instance;
  }

  /**
   * Register a scheduler for monitoring
   */
  registerScheduler(name: string): void {
    const status: SchedulerStatus = {
      name,
      status: 'stopped',
      lastRun: new Date().toISOString(),
      nextRun: 'Not scheduled',
      runCount: 0,
      errorCount: 0,
      memoryUsage: 0,
      uptime: 0,
    };

    this.schedulers.set(name, status);
    this.memoryBaselines.set(name, this.getCurrentMemoryUsage());
    
    logger.info('Scheduler registered for monitoring', { schedulerName: name });
  }

  /**
   * Update scheduler status when it starts
   */
  onSchedulerStart(name: string): void {
    const scheduler = this.schedulers.get(name);
    if (scheduler) {
      scheduler.status = 'running';
      scheduler.lastRun = new Date().toISOString();
      scheduler.uptime = 0; // Reset uptime counter
      
      this.schedulers.set(name, scheduler);
      
      logger.info('Scheduler started', { schedulerName: name });
    }
  }

  /**
   * Update scheduler status when it stops
   */
  onSchedulerStop(name: string): void {
    const scheduler = this.schedulers.get(name);
    if (scheduler) {
      scheduler.status = 'stopped';
      this.schedulers.set(name, scheduler);
      
      logger.info('Scheduler stopped', { schedulerName: name });
    }
  }

  /**
   * Record scheduler run completion
   */
  onSchedulerRun(name: string, success: boolean = true, nextRun?: string): void {
    const scheduler = this.schedulers.get(name);
    if (scheduler) {
      scheduler.runCount++;
      scheduler.lastRun = new Date().toISOString();
      
      if (nextRun) {
        scheduler.nextRun = nextRun;
      }
      
      if (!success) {
        scheduler.errorCount++;
        scheduler.status = 'error';
        
        logger.error('Scheduler run failed', { 
          schedulerName: name,
          runCount: scheduler.runCount,
          errorCount: scheduler.errorCount,
        });
      } else {
        // Reset status to running if it was in error state
        if (scheduler.status === 'error') {
          scheduler.status = 'running';
        }
      }
      
      // Update memory usage
      scheduler.memoryUsage = this.getSchedulerMemoryUsage(name);
      
      this.schedulers.set(name, scheduler);
    }
  }

  /**
   * Record scheduler error
   */
  onSchedulerError(name: string, error: Error): void {
    const scheduler = this.schedulers.get(name);
    if (scheduler) {
      scheduler.errorCount++;
      scheduler.status = 'error';
      
      this.schedulers.set(name, scheduler);
      
      logger.error('Scheduler error occurred', {
        schedulerName: name,
        error: error.message,
        errorCount: scheduler.errorCount,
      });
    }
  }

  /**
   * Get all scheduler statuses
   */
  getAllSchedulerStatuses(): SchedulerStatus[] {
    // Update uptime for running schedulers
    this.updateUptimes();
    
    return Array.from(this.schedulers.values());
  }

  /**
   * Get specific scheduler status
   */
  getSchedulerStatus(name: string): SchedulerStatus | null {
    const scheduler = this.schedulers.get(name);
    if (scheduler) {
      // Update uptime if running
      if (scheduler.status === 'running') {
        scheduler.uptime = this.calculateUptime(scheduler.lastRun);
      }
      scheduler.memoryUsage = this.getSchedulerMemoryUsage(name);
    }
    return scheduler || null;
  }

  /**
   * Check if any schedulers are in error state
   */
  hasFailedSchedulers(): boolean {
    return Array.from(this.schedulers.values()).some(s => s.status === 'error');
  }

  /**
   * Get failed schedulers
   */
  getFailedSchedulers(): SchedulerStatus[] {
    return Array.from(this.schedulers.values()).filter(s => s.status === 'error');
  }

  /**
   * Check if scheduler memory usage is excessive
   */
  isSchedulerMemoryExcessive(name: string, thresholdMB: number = 100): boolean {
    const scheduler = this.schedulers.get(name);
    if (!scheduler) return false;
    
    return scheduler.memoryUsage > thresholdMB;
  }

  /**
   * Get schedulers with high memory usage
   */
  getHighMemorySchedulers(thresholdMB: number = 100): SchedulerStatus[] {
    return Array.from(this.schedulers.values()).filter(s => 
      s.memoryUsage > thresholdMB
    );
  }

  /**
   * Reset scheduler error count (for recovery)
   */
  resetSchedulerErrors(name: string): void {
    const scheduler = this.schedulers.get(name);
    if (scheduler) {
      scheduler.errorCount = 0;
      if (scheduler.status === 'error') {
        scheduler.status = 'stopped';
      }
      this.schedulers.set(name, scheduler);
      
      logger.info('Scheduler error count reset', { schedulerName: name });
    }
  }

  /**
   * Get overall scheduler health status
   */
  getOverallStatus(): 'pass' | 'warn' | 'fail' {
    const schedulers = Array.from(this.schedulers.values());
    
    if (schedulers.length === 0) {
      return 'warn'; // No schedulers registered
    }

    const failedCount = schedulers.filter(s => s.status === 'error').length;
    const highMemoryCount = schedulers.filter(s => s.memoryUsage > 100).length;
    
    if (failedCount > 0) {
      return 'fail';
    }
    
    if (highMemoryCount > 0) {
      return 'warn';
    }
    
    return 'pass';
  }

  private getCurrentMemoryUsage(): number {
    const memUsage = process.memoryUsage();
    return Math.round(memUsage.heapUsed / 1024 / 1024); // MB
  }

  private getSchedulerMemoryUsage(name: string): number {
    // This is a simplified approach - in a real implementation,
    // you might want to track memory usage more precisely per scheduler
    const currentMemory = this.getCurrentMemoryUsage();
    const baseline = this.memoryBaselines.get(name) || currentMemory;
    
    // Return the delta from baseline, with a minimum of 0
    return Math.max(0, currentMemory - baseline);
  }

  private updateUptimes(): void {
    for (const [name, scheduler] of this.schedulers.entries()) {
      if (scheduler.status === 'running') {
        scheduler.uptime = this.calculateUptime(scheduler.lastRun);
        this.schedulers.set(name, scheduler);
      }
    }
  }

  private calculateUptime(startTime: string): number {
    const start = new Date(startTime).getTime();
    const now = Date.now();
    return Math.floor((now - start) / 1000); // seconds
  }
}