import * as cron from 'node-cron';
import { ModerationService } from './moderationService';
import { WorryAnalysisService } from './worryAnalysisService';
import { GoogleAIService } from './googleAIService';
import logger from './logger';

export class AIReprocessingService {
  private static instance: AIReprocessingService;
  private moderationService: ModerationService;
  private worryAnalysisService: WorryAnalysisService;
  private isRunning = false;

  private constructor() {
    this.moderationService = new ModerationService();
    this.worryAnalysisService = WorryAnalysisService.getInstance();
  }

  public static getInstance(): AIReprocessingService {
    if (!AIReprocessingService.instance) {
      AIReprocessingService.instance = new AIReprocessingService();
    }
    return AIReprocessingService.instance;
  }

  /**
   * Start the automatic reprocessing scheduler
   */
  public startScheduler(): void {
    // Run every 30 minutes to check for pending items
    cron.schedule('*/30 * * * *', async () => {
      if (this.isRunning) {
        logger.info('⏳ AI reprocessing already running, skipping...');
        return;
      }

      await this.runReprocessingBatch();
    });

    logger.info('🕐 AI reprocessing scheduler started (runs every 30 minutes)');
  }

  /**
   * Manually trigger a reprocessing batch
   */
  public async runReprocessingBatch(): Promise<{
    commentModeration: { processed: number; failed: number };
    worryAnalysis: { processed: number; failed: number };
  }> {
    if (this.isRunning) {
      throw new Error('Reprocessing is already running');
    }

    this.isRunning = true;
    logger.info('🚀 Starting AI reprocessing batch...');

    try {
      const googleAI = GoogleAIService.getInstance();
      
      if (!googleAI.isAvailable()) {
        logger.warn('🤖 Google AI not available, skipping reprocessing');
        return {
          commentModeration: { processed: 0, failed: 0 },
          worryAnalysis: { processed: 0, failed: 0 }
        };
      }

      // Process comment moderation queue
      const commentResults = await this.moderationService.reprocessPendingItems(10);
      
      // Process worry analysis queue
      const worryResults = await this.worryAnalysisService.reprocessPendingWorryAnalyses(5);

      const totalProcessed = commentResults.processed + worryResults.processed;
      const totalFailed = commentResults.failed + worryResults.failed;

      if (totalProcessed > 0 || totalFailed > 0) {
        logger.info('✅ AI reprocessing batch completed:', {
          comments: commentResults,
          worryAnalyses: worryResults,
          totalProcessed,
          totalFailed
        });
      }

      return {
        commentModeration: commentResults,
        worryAnalysis: worryResults
      };

    } catch (error) {
      logger.error('❌ AI reprocessing batch failed:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get reprocessing status
   */
  public async getReprocessingStatus(): Promise<{
    isRunning: boolean;
    googleAIAvailable: boolean;
    queueStats: {
      totalPending: number;
      totalCompleted: number;
      totalFailed: number;
      byType: {
        comments: number;
        worryAnalyses: number;
      };
    };
  }> {
    const googleAI = GoogleAIService.getInstance();
    const stats = await this.moderationService.getReprocessingQueueStats();

    // Get breakdown by content type
    const [commentsPending, worryAnalysesPending] = await Promise.all([
      // We'll need to add this to the moderation service or query directly
      this.getQueueCountByType('comment'),
      this.getQueueCountByType('worry_analysis')
    ]);

    return {
      isRunning: this.isRunning,
      googleAIAvailable: googleAI.isAvailable(),
      queueStats: {
        totalPending: stats.totalPending,
        totalCompleted: stats.totalCompleted,
        totalFailed: stats.totalFailed,
        byType: {
          comments: commentsPending,
          worryAnalyses: worryAnalysesPending
        }
      }
    };
  }

  /**
   * Helper method to get queue count by content type
   */
  private async getQueueCountByType(contentType: string): Promise<number> {
    try {
      // We'll need to import prisma or add this method to the moderation service
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      
      const count = await prisma.aIReprocessingQueue.count({
        where: {
          contentType,
          status: 'pending'
        }
      });

      await prisma.$disconnect();
      return count;
    } catch (error) {
      logger.error('❌ Failed to get queue count by type:', error);
      return 0;
    }
  }

  /**
   * Clear completed and failed items older than specified days
   */
  public async cleanupOldItems(daysOld = 7): Promise<{ deleted: number }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();

      const result = await prisma.aIReprocessingQueue.deleteMany({
        where: {
          status: { in: ['completed', 'failed'] },
          processedAt: {
            lt: cutoffDate
          }
        }
      });

      await prisma.$disconnect();

      logger.info('🧹 Cleaned up old reprocessing queue items:', { 
        deleted: result.count, 
        olderThan: `${daysOld} days` 
      });

      return { deleted: result.count };
    } catch (error) {
      logger.error('❌ Failed to cleanup old reprocessing items:', error);
      return { deleted: 0 };
    }
  }
}