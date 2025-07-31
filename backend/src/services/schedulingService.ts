import { PrismaClient } from '@prisma/client';
import * as cron from 'node-cron';

const prisma = new PrismaClient();

export class SchedulingService {
  private static instance: SchedulingService;
  private cronJob: cron.ScheduledTask | null = null;

  private constructor() {}

  public static getInstance(): SchedulingService {
    if (!SchedulingService.instance) {
      SchedulingService.instance = new SchedulingService();
    }
    return SchedulingService.instance;
  }

  /**
   * Start the cron job to check for scheduled posts every minute
   */
  public startScheduler(): void {
    if (this.cronJob) {
      console.log('📅 Scheduler is already running');
      return;
    }

    // Run every minute to check for posts to publish and trial expirations
    this.cronJob = cron.schedule('* * * * *', async () => {
      try {
        await this.publishScheduledPosts();
        await this.handleTrialExpirations();
      } catch (error) {
        console.error('❌ Error in scheduled tasks:', error);
      }
    });

    console.log('📅 Scheduler started - checking every minute for posts to publish and trial expirations');
  }

  /**
   * Stop the cron job
   */
  public stopScheduler(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('📅 Post scheduler stopped');
    }
  }

  /**
   * Find and publish posts that are scheduled for now or earlier
   */
  private async publishScheduledPosts(): Promise<void> {
    const now = new Date();
    
    // Find posts that are scheduled and due for publishing
    const postsToPublish = await prisma.post.findMany({
      where: {
        isScheduled: true,
        publishedAt: null,
        scheduledFor: {
          lte: now
        }
      },
      include: {
        user: {
          select: {
            username: true,
            displayName: true
          }
        }
      }
    });

    if (postsToPublish.length === 0) {
      return; // No posts to publish
    }

    console.log(`📝 Publishing ${postsToPublish.length} scheduled post(s)`);

    // Publish each post
    for (const post of postsToPublish) {
      try {
        await prisma.post.update({
          where: { id: post.id },
          data: {
            publishedAt: now,
            isScheduled: false // Mark as no longer scheduled
          }
        });

        console.log(`✅ Published scheduled post by ${post.user.displayName || post.user.username}: "${post.shortContent.substring(0, 50)}..."`);
      } catch (error) {
        console.error(`❌ Failed to publish post ${post.id}:`, error);
      }
    }
  }

  /**
   * Get all scheduled posts for a user
   */
  public async getScheduledPosts(userId: string): Promise<any[]> {
    return prisma.post.findMany({
      where: {
        userId,
        isScheduled: true,
        publishedAt: null
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true
          }
        }
      },
      orderBy: {
        scheduledFor: 'asc'
      }
    });
  }

  /**
   * Cancel a scheduled post
   */
  public async cancelScheduledPost(postId: string, userId: string): Promise<void> {
    const post = await prisma.post.findFirst({
      where: {
        id: postId,
        userId,
        isScheduled: true,
        publishedAt: null
      }
    });

    if (!post) {
      throw new Error('Scheduled post not found or you do not have permission to cancel it');
    }

    await prisma.post.delete({
      where: { id: postId }
    });
  }

  /**
   * Update a scheduled post
   */
  public async updateScheduledPost(postId: string, userId: string, data: {
    shortContent?: string;
    longContent?: string;
    worryPrompt?: string;
    privacyLevel?: string;
    scheduledFor?: Date;
  }): Promise<any> {
    const post = await prisma.post.findFirst({
      where: {
        id: postId,
        userId,
        isScheduled: true,
        publishedAt: null
      }
    });

    if (!post) {
      throw new Error('Scheduled post not found or you do not have permission to edit it');
    }

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        ...data,
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true
          }
        }
      }
    });

    return {
      id: updatedPost.id,
      userId: updatedPost.userId,
      shortContent: updatedPost.shortContent,
      longContent: updatedPost.longContent || undefined,
      worryPrompt: updatedPost.worryPrompt,
      privacyLevel: updatedPost.privacyLevel,
      isScheduled: updatedPost.isScheduled,
      scheduledFor: updatedPost.scheduledFor?.toISOString(),
      publishedAt: updatedPost.publishedAt?.toISOString(),
      createdAt: updatedPost.createdAt.toISOString(),
      updatedAt: updatedPost.updatedAt.toISOString(),
      user: updatedPost.user
    };
  }

  /**
   * Get statistics about scheduled posts
   */
  public async getSchedulingStats(): Promise<{
    totalScheduled: number;
    scheduledToday: number;
    scheduledThisWeek: number;
  }> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    const startOfWeek = new Date(startOfDay.getTime() - (startOfDay.getDay() * 24 * 60 * 60 * 1000));
    const endOfWeek = new Date(startOfWeek.getTime() + (7 * 24 * 60 * 60 * 1000));

    const [totalScheduled, scheduledToday, scheduledThisWeek] = await Promise.all([
      prisma.post.count({
        where: {
          isScheduled: true,
          publishedAt: null
        }
      }),
      prisma.post.count({
        where: {
          isScheduled: true,
          publishedAt: null,
          scheduledFor: {
            gte: startOfDay,
            lt: endOfDay
          }
        }
      }),
      prisma.post.count({
        where: {
          isScheduled: true,
          publishedAt: null,
          scheduledFor: {
            gte: startOfWeek,
            lt: endOfWeek
          }
        }
      })
    ]);

    return {
      totalScheduled,
      scheduledToday,
      scheduledThisWeek
    };
  }

  /**
   * Handle trial expirations - downgrade users whose trials have expired
   */
  private async handleTrialExpirations(): Promise<void> {
    const now = new Date();
    
    // Find subscriptions with expired trials that haven't been processed
    const expiredTrials = await prisma.subscription.findMany({
      where: {
        trialEndsAt: {
          lte: now
        },
        tier: 'premium', // Still on premium tier but trial expired
        lemonSqueezyId: null, // No paid subscription
      },
      include: {
        user: {
          select: {
            username: true,
            displayName: true,
            email: true
          }
        }
      }
    });

    if (expiredTrials.length === 0) {
      return; // No expired trials to process
    }

    console.log(`⏰ Processing ${expiredTrials.length} expired trial(s)`);

    // Downgrade each expired trial to free tier
    for (const subscription of expiredTrials) {
      try {
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            tier: 'free',
            trialEndsAt: null, // Clear trial end date
          }
        });

        console.log(`⬇️ Trial expired for ${subscription.user.displayName || subscription.user.username} - downgraded to free tier`);
        
        // TODO: Send email notification about trial expiration
        // await sendTrialExpirationEmail(subscription.user.email);
        
      } catch (error) {
        console.error(`❌ Failed to process trial expiration for subscription ${subscription.id}:`, error);
      }
    }
  }
}