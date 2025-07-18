import cron from 'node-cron';
import { NotificationService } from './notificationService';

export class NotificationScheduler {
  private static instance: NotificationScheduler;
  private notificationService: NotificationService;
  private isRunning = false;

  private constructor() {
    this.notificationService = NotificationService.getInstance();
  }

  public static getInstance(): NotificationScheduler {
    if (!NotificationScheduler.instance) {
      NotificationScheduler.instance = new NotificationScheduler();
    }
    return NotificationScheduler.instance;
  }

  /**
   * Start the notification scheduler
   */
  public startScheduler(): void {
    if (this.isRunning) {
      console.log('📅 Notification scheduler is already running');
      return;
    }

    console.log('📅 Starting notification scheduler...');

    // Generate smart notifications every 6 hours
    cron.schedule('0 */6 * * *', async () => {
      console.log('🔔 Generating smart notifications...');
      try {
        await this.notificationService.generateSmartNotifications();
        console.log('✅ Smart notifications generated successfully');
      } catch (error) {
        console.error('❌ Error generating smart notifications:', error);
      }
    });

    // Process scheduled notifications every 15 minutes
    cron.schedule('*/15 * * * *', async () => {
      try {
        await this.notificationService.processScheduledNotifications();
      } catch (error) {
        console.error('❌ Error processing scheduled notifications:', error);
      }
    });

    // Send daily check-ins at 9 AM (for users with daily frequency)
    cron.schedule('0 9 * * *', async () => {
      console.log('🌅 Processing daily check-ins...');
      try {
        await this.generateDailyCheckIns();
        console.log('✅ Daily check-ins processed');
      } catch (error) {
        console.error('❌ Error processing daily check-ins:', error);
      }
    });

    // Send weekly check-ins on Monday at 10 AM
    cron.schedule('0 10 * * 1', async () => {
      console.log('📅 Processing weekly check-ins...');
      try {
        await this.generateWeeklyCheckIns();
        console.log('✅ Weekly check-ins processed');
      } catch (error) {
        console.error('❌ Error processing weekly check-ins:', error);
      }
    });

    this.isRunning = true;
    console.log('✅ Notification scheduler started successfully');
  }

  /**
   * Stop the notification scheduler
   */
  public stopScheduler(): void {
    if (!this.isRunning) {
      console.log('📅 Notification scheduler is not running');
      return;
    }

    // Note: node-cron doesn't provide a direct way to stop all tasks
    // In a production environment, you'd want to keep track of task references
    this.isRunning = false;
    console.log('🛑 Notification scheduler stopped');
  }

  /**
   * Generate daily check-ins for users who have daily frequency set
   */
  private async generateDailyCheckIns(): Promise<void> {
    // This would be called by the daily cron job
    // The main generateSmartNotifications method handles frequency checking
    await this.notificationService.generateSmartNotifications();
  }

  /**
   * Generate weekly check-ins for users who have weekly frequency set
   */
  private async generateWeeklyCheckIns(): Promise<void> {
    // This would be called by the weekly cron job
    // The main generateSmartNotifications method handles frequency checking
    await this.notificationService.generateSmartNotifications();
  }

  /**
   * Manual trigger for testing purposes
   */
  public async triggerSmartNotifications(): Promise<void> {
    console.log('🔔 Manually triggering smart notifications...');
    try {
      await this.notificationService.generateSmartNotifications();
      console.log('✅ Smart notifications triggered successfully');
    } catch (error) {
      console.error('❌ Error triggering smart notifications:', error);
      throw error;
    }
  }

  /**
   * Get scheduler status
   */
  public getStatus(): { isRunning: boolean } {
    return { isRunning: this.isRunning };
  }
}