/**
 * Scheduler Manager Service
 * Manages and monitors scheduler instances
 */

export interface SchedulerStats {
  schedulers: Array<{
    name: string;
    status: 'running' | 'stopped' | 'error' | 'restarting';
    lastRun?: string;
    nextRun?: string;
    runCount?: number;
    errorCount?: number;
    averageDuration?: number;
    lastError?: string;
    memoryUsage?: number;
    cpuUsage?: number;
    restartCount?: number;
  }>;
  totalJobs?: number;
  activeJobs?: number;
  completedJobs?: number;
  failedJobs?: number;
  averageJobDuration?: number;
  history?: any[];
}

export class SchedulerManagerService {
  private static instance: SchedulerManagerService;
  private schedulers = new Map<string, any>();

  private constructor() {}

  public static getInstance(): SchedulerManagerService {
    if (!SchedulerManagerService.instance) {
      SchedulerManagerService.instance = new SchedulerManagerService();
    }
    return SchedulerManagerService.instance;
  }

  /**
   * Register a scheduler for monitoring
   */
  registerScheduler(name: string): void {
    this.schedulers.set(name, {
      name,
      status: 'stopped',
      runCount: 0,
      errorCount: 0,
      restartCount: 0,
    });
  }

  /**
   * Get scheduler statistics
   */
  async getSchedulerStats(): Promise<SchedulerStats> {
    const schedulerArray = Array.from(this.schedulers.values()).map(scheduler => ({
      name: scheduler.name,
      status: scheduler.status || 'stopped',
      lastRun: scheduler.lastRun,
      nextRun: scheduler.nextRun,
      runCount: scheduler.runCount || 0,
      errorCount: scheduler.errorCount || 0,
      averageDuration: scheduler.averageDuration || 0,
      lastError: scheduler.lastError,
      memoryUsage: scheduler.memoryUsage || 0,
      cpuUsage: scheduler.cpuUsage || 0,
      restartCount: scheduler.restartCount || 0,
    }));

    return {
      schedulers: schedulerArray,
      totalJobs: schedulerArray.reduce((sum, s) => sum + s.runCount, 0),
      activeJobs: schedulerArray.filter(s => s.status === 'running').length,
      completedJobs: schedulerArray.reduce((sum, s) => sum + s.runCount, 0),
      failedJobs: schedulerArray.reduce((sum, s) => sum + s.errorCount, 0),
      averageJobDuration: 0,
      history: [],
    };
  }

  /**
   * Update scheduler status
   */
  updateSchedulerStatus(name: string, status: string, metadata?: any): void {
    const scheduler = this.schedulers.get(name);
    if (scheduler) {
      scheduler.status = status;
      if (metadata) {
        Object.assign(scheduler, metadata);
      }
    }
  }
}

export default SchedulerManagerService;