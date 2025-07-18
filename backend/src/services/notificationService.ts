import { PrismaClient } from '@prisma/client';
// import { OpenAIService } from './openaiService';

const prisma = new PrismaClient();

export interface NotificationPreferences {
  id: string;
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  checkInFrequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'never';
  supportNotifications: boolean;
  quietHoursStart?: string; // HH:MM format
  quietHoursEnd?: string; // HH:MM format
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'check_in' | 'support' | 'encouragement' | 'community' | 'reminder';
  title: string;
  message: string;
  isRead: boolean;
  sentAt?: string;
  scheduledFor?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface SmartNotificationContext {
  userId: string;
  lastPostDate?: Date;
  recentWorryCategories: string[];
  supportInteractions: number;
  userEngagement: 'high' | 'medium' | 'low';
  difficultPeriodIndicators: string[];
}

export class NotificationService {
  private static instance: NotificationService;
  // private openaiService: OpenAIService;

  private constructor() {
    // this.openaiService = OpenAIService.getInstance();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Get user's notification preferences
   */
  async getNotificationPreferences(userId: string): Promise<NotificationPreferences | null> {
    const preferences = await prisma.notificationPreferences.findUnique({
      where: { userId }
    });

    if (!preferences) return null;

    return this.formatNotificationPreferences(preferences);
  }

  /**
   * Update user's notification preferences
   */
  async updateNotificationPreferences(
    userId: string, 
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    const updated = await prisma.notificationPreferences.upsert({
      where: { userId },
      update: {
        emailNotifications: preferences.emailNotifications,
        pushNotifications: preferences.pushNotifications,
        checkInFrequency: preferences.checkInFrequency,
        supportNotifications: preferences.supportNotifications,
        quietHoursStart: preferences.quietHoursStart,
        quietHoursEnd: preferences.quietHoursEnd,
        timezone: preferences.timezone,
      },
      create: {
        userId,
        emailNotifications: preferences.emailNotifications ?? true,
        pushNotifications: preferences.pushNotifications ?? true,
        checkInFrequency: preferences.checkInFrequency ?? 'weekly',
        supportNotifications: preferences.supportNotifications ?? true,
        quietHoursStart: preferences.quietHoursStart,
        quietHoursEnd: preferences.quietHoursEnd,
        timezone: preferences.timezone ?? 'UTC',
      }
    });

    return this.formatNotificationPreferences(updated);
  }

  /**
   * Get user's notifications
   */
  async getUserNotifications(userId: string, limit: number = 20): Promise<Notification[]> {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return notifications.map(notification => this.formatNotification(notification));
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId: string, userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { 
        id: notificationId,
        userId 
      },
      data: { isRead: true }
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { userId },
      data: { isRead: true }
    });
  }

  /**
   * Create a notification
   */
  async createNotification(
    userId: string,
    type: Notification['type'],
    title: string,
    message: string,
    metadata?: Record<string, any>,
    scheduledFor?: Date
  ): Promise<Notification> {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        metadata: metadata || {},
        scheduledFor,
        isRead: false
      }
    });

    return this.formatNotification(notification);
  }

  /**
   * Generate smart check-in notification based on user context
   */
  async generateSmartCheckIn(context: SmartNotificationContext): Promise<{ title: string; message: string }> {
    const daysSinceLastPost = context.lastPostDate 
      ? Math.floor((Date.now() - context.lastPostDate.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // Create context for AI to generate personalized message
    const aiContext = `
User context:
- Days since last post: ${daysSinceLastPost || 'unknown'}
- Recent worry categories: ${context.recentWorryCategories.join(', ') || 'none'}
- Support interactions: ${context.supportInteractions}
- Engagement level: ${context.userEngagement}
- Difficult period indicators: ${context.difficultPeriodIndicators.join(', ') || 'none'}

Generate a gentle, supportive check-in notification. The message should be:
- Warm and caring, not pushy
- Acknowledge their journey
- Offer gentle encouragement
- Provide a soft call to action
- Be concise (under 100 words)

Return JSON with 'title' and 'message' fields.
`;

    try {
      // const response = await this.openaiService.generateText(aiContext, {
      //   maxTokens: 200,
      //   temperature: 0.7
      // });

      // const parsed = JSON.parse(response);
      // return {
      //   title: parsed.title || 'Thinking of you 💙',
      //   message: parsed.message || 'How are you doing today? Remember, it\'s okay to take things one step at a time.'
      // };
      throw new Error('OpenAI service not available');
    } catch (error) {
      console.error('Failed to generate smart check-in:', error);
      
      // Fallback messages based on context
      if (daysSinceLastPost && daysSinceLastPost > 7) {
        return {
          title: 'We miss you 💙',
          message: 'It\'s been a while since we\'ve heard from you. Remember, this community is here whenever you need support.'
        };
      }

      return {
        title: 'Checking in 💙',
        message: 'How are you feeling today? Remember that every small step forward matters.'
      };
    }
  }

  /**
   * Generate supportive message for difficult periods
   */
  async generateSupportiveMessage(context: SmartNotificationContext): Promise<{ title: string; message: string }> {
    const aiContext = `
User is going through a difficult period. Context:
- Recent worry categories: ${context.recentWorryCategories.join(', ')}
- Difficult period indicators: ${context.difficultPeriodIndicators.join(', ')}
- Support interactions: ${context.supportInteractions}

Generate a supportive, encouraging message that:
- Acknowledges their struggle without being overwhelming
- Offers hope and perspective
- Reminds them of available resources
- Uses warm, empathetic language
- Is concise (under 100 words)

Return JSON with 'title' and 'message' fields.
`;

    try {
      // const response = await this.openaiService.generateText(aiContext, {
      //   maxTokens: 200,
      //   temperature: 0.7
      // });

      // const parsed = JSON.parse(response);
      // return {
      //   title: parsed.title || 'You\'re not alone 💙',
      //   message: parsed.message || 'Difficult times don\'t last, but resilient people do. Take it one moment at a time.'
      // };
      throw new Error('OpenAI service not available');
    } catch (error) {
      console.error('Failed to generate supportive message:', error);
      
      return {
        title: 'You\'re stronger than you know 💙',
        message: 'Going through tough times is part of being human. Remember, this community believes in you and your ability to get through this.'
      };
    }
  }

  /**
   * Analyze user context for smart notifications
   */
  async analyzeUserContext(userId: string): Promise<SmartNotificationContext> {
    // Get user's recent posts
    const recentPosts = await prisma.post.findMany({
      where: {
        userId,
        publishedAt: { not: null }
      },
      include: {
        worryAnalysis: true
      },
      orderBy: { publishedAt: 'desc' },
      take: 10
    });

    // Get support interactions (comments, likes, etc.)
    const supportInteractions = await prisma.comment.count({
      where: {
        post: { userId }
      }
    });

    // Analyze recent worry categories
    const recentWorryCategories = recentPosts
      .map(post => post.worryAnalysis?.category)
      .filter(Boolean)
      .slice(0, 5);

    // Determine engagement level
    const postsLastWeek = recentPosts.filter(post => 
      post.publishedAt && 
      new Date(post.publishedAt).getTime() > Date.now() - (7 * 24 * 60 * 60 * 1000)
    ).length;

    let userEngagement: 'high' | 'medium' | 'low' = 'low';
    if (postsLastWeek >= 3) userEngagement = 'high';
    else if (postsLastWeek >= 1) userEngagement = 'medium';

    // Identify difficult period indicators
    const difficultPeriodIndicators: string[] = [];
    const recentKeywords = recentPosts
      .flatMap(post => post.worryAnalysis?.keywords || [])
      .slice(0, 10);

    // Check sentiment scores for difficult periods
    const recentSentiments = recentPosts
      .map(post => post.worryAnalysis?.sentimentScore)
      .filter(Boolean)
      .slice(0, 5);

    const avgSentiment = recentSentiments.length > 0 
      ? recentSentiments.reduce((sum, score) => sum + Number(score), 0) / recentSentiments.length
      : 0;

    if (avgSentiment < -0.5) {
      difficultPeriodIndicators.push('negative_sentiment');
    }
    if (recentKeywords.some(keyword => ['anxiety', 'panic', 'fear', 'worried'].includes(keyword.toLowerCase()))) {
      difficultPeriodIndicators.push('high_anxiety');
    }
    if (recentKeywords.some(keyword => ['sad', 'depressed', 'hopeless', 'despair'].includes(keyword.toLowerCase()))) {
      difficultPeriodIndicators.push('depression_indicators');
    }
    if (recentPosts.length > 0 && postsLastWeek === 0) {
      difficultPeriodIndicators.push('decreased_engagement');
    }

    return {
      userId,
      lastPostDate: recentPosts[0]?.publishedAt ? new Date(recentPosts[0].publishedAt) : undefined,
      recentWorryCategories: recentWorryCategories as string[],
      supportInteractions,
      userEngagement,
      difficultPeriodIndicators
    };
  }

  /**
   * Check if it's within user's quiet hours
   */
  async isWithinQuietHours(userId: string): Promise<boolean> {
    const preferences = await this.getNotificationPreferences(userId);
    if (!preferences?.quietHoursStart || !preferences?.quietHoursEnd) {
      return false;
    }

    const now = new Date();
    const userTimezone = preferences.timezone || 'UTC';
    
    // Convert current time to user's timezone
    const userTime = new Intl.DateTimeFormat('en-US', {
      timeZone: userTimezone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    }).format(now);

    const [currentHour, currentMinute] = userTime.split(':').map(Number);
    const currentTimeMinutes = currentHour * 60 + currentMinute;

    const [startHour, startMinute] = preferences.quietHoursStart.split(':').map(Number);
    const startTimeMinutes = startHour * 60 + startMinute;

    const [endHour, endMinute] = preferences.quietHoursEnd.split(':').map(Number);
    const endTimeMinutes = endHour * 60 + endMinute;

    // Handle quiet hours that span midnight
    if (startTimeMinutes > endTimeMinutes) {
      return currentTimeMinutes >= startTimeMinutes || currentTimeMinutes <= endTimeMinutes;
    } else {
      return currentTimeMinutes >= startTimeMinutes && currentTimeMinutes <= endTimeMinutes;
    }
  }

  /**
   * Process scheduled notifications
   */
  async processScheduledNotifications(): Promise<void> {
    const now = new Date();
    
    const scheduledNotifications = await prisma.notification.findMany({
      where: {
        scheduledFor: {
          lte: now
        },
        sentAt: null
      }
    });

    for (const notification of scheduledNotifications) {
      // Check if user is within quiet hours
      const isQuietTime = await this.isWithinQuietHours(notification.userId);
      
      if (!isQuietTime) {
        // Mark as sent
        await prisma.notification.update({
          where: { id: notification.id },
          data: { sentAt: now }
        });

        // Here you would integrate with email/push notification services
        console.log(`Sent notification to user ${notification.userId}: ${notification.title}`);
      }
    }
  }

  /**
   * Generate and schedule smart notifications for all users
   */
  async generateSmartNotifications(): Promise<void> {
    // Get users who have notifications enabled
    const users = await prisma.user.findMany({
      include: {
        notificationPreferences: true
      }
    });

    for (const user of users) {
      const preferences = user.notificationPreferences;
      if (!preferences || preferences.checkInFrequency === 'never') {
        continue;
      }

      // Check if user needs a check-in based on their frequency preference
      const lastCheckIn = await prisma.notification.findFirst({
        where: {
          userId: user.id,
          type: 'check_in'
        },
        orderBy: { createdAt: 'desc' }
      });

      const shouldSendCheckIn = this.shouldSendCheckIn(lastCheckIn?.createdAt || null, preferences.checkInFrequency);
      
      if (shouldSendCheckIn) {
        const context = await this.analyzeUserContext(user.id);
        
        // Generate appropriate notification based on context
        let notification;
        if (context.difficultPeriodIndicators.length > 0) {
          notification = await this.generateSupportiveMessage(context);
        } else {
          notification = await this.generateSmartCheckIn(context);
        }

        // Schedule notification for optimal time (not during quiet hours)
        const scheduledTime = await this.getOptimalNotificationTime(user.id);
        
        await this.createNotification(
          user.id,
          context.difficultPeriodIndicators.length > 0 ? 'support' : 'check_in',
          notification.title,
          notification.message,
          { context },
          scheduledTime
        );
      }
    }
  }

  /**
   * Determine if user should receive a check-in based on frequency
   */
  private shouldSendCheckIn(lastCheckInDate: Date | null, frequency: string): boolean {
    if (!lastCheckInDate) return true;

    const daysSinceLastCheckIn = Math.floor((Date.now() - lastCheckInDate.getTime()) / (1000 * 60 * 60 * 24));

    switch (frequency) {
      case 'daily': return daysSinceLastCheckIn >= 1;
      case 'weekly': return daysSinceLastCheckIn >= 7;
      case 'biweekly': return daysSinceLastCheckIn >= 14;
      case 'monthly': return daysSinceLastCheckIn >= 30;
      default: return false;
    }
  }

  /**
   * Get optimal notification time for user (avoiding quiet hours)
   */
  private async getOptimalNotificationTime(userId: string): Promise<Date> {
    const preferences = await this.getNotificationPreferences(userId);
    const now = new Date();
    
    // Default to sending in 1 hour if no quiet hours set
    if (!preferences?.quietHoursStart || !preferences?.quietHoursEnd) {
      return new Date(now.getTime() + 60 * 60 * 1000);
    }

    // Schedule for after quiet hours end
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const [endHour, endMinute] = preferences.quietHoursEnd.split(':').map(Number);
    tomorrow.setHours(endHour, endMinute, 0, 0);

    return tomorrow;
  }

  /**
   * Format notification preferences for API response
   */
  private formatNotificationPreferences(preferences: any): NotificationPreferences {
    return {
      id: preferences.id,
      userId: preferences.userId,
      emailNotifications: preferences.emailNotifications,
      pushNotifications: preferences.pushNotifications,
      checkInFrequency: preferences.checkInFrequency,
      supportNotifications: preferences.supportNotifications,
      quietHoursStart: preferences.quietHoursStart,
      quietHoursEnd: preferences.quietHoursEnd,
      timezone: preferences.timezone,
      createdAt: preferences.createdAt.toISOString(),
      updatedAt: preferences.updatedAt.toISOString()
    };
  }

  /**
   * Format notification for API response
   */
  private formatNotification(notification: any): Notification {
    return {
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      isRead: notification.isRead,
      sentAt: notification.sentAt?.toISOString(),
      scheduledFor: notification.scheduledFor?.toISOString(),
      metadata: notification.metadata,
      createdAt: notification.createdAt.toISOString(),
      updatedAt: notification.updatedAt.toISOString()
    };
  }
}