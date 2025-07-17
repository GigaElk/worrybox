import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface PersonalAnalytics {
  overview: {
    totalWorries: number;
    worriesThisMonth: number;
    worriesThisWeek: number;
    averageWorriesPerWeek: number;
    mostActiveDay: string;
    mostActiveHour: number;
  };
  trends: {
    weeklyTrend: Array<{
      week: string;
      count: number;
      change: number; // percentage change from previous week
    }>;
    monthlyTrend: Array<{
      month: string;
      count: number;
      change: number;
    }>;
    dailyPattern: Array<{
      dayOfWeek: string;
      averageCount: number;
    }>;
    hourlyPattern: Array<{
      hour: number;
      averageCount: number;
    }>;
  };
  categories: {
    breakdown: Array<{
      category: string;
      count: number;
      percentage: number;
      trend: 'up' | 'down' | 'stable';
    }>;
    topWorries: Array<{
      category: string;
      subcategory?: string;
      recentCount: number;
      totalCount: number;
    }>;
  };
  sentiment: {
    averageSentiment: number;
    sentimentTrend: Array<{
      period: string;
      averageSentiment: number;
    }>;
    sentimentDistribution: {
      veryNegative: number;
      negative: number;
      neutral: number;
      positive: number;
      veryPositive: number;
    };
  };
  engagement: {
    totalPosts: number;
    postsWithBlogContent: number;
    averagePostLength: number;
    privacyBreakdown: {
      public: number;
      friends: number;
      private: number;
    };
    scheduledPosts: number;
  };
  insights: Array<{
    type: 'trend' | 'pattern' | 'milestone' | 'suggestion';
    title: string;
    description: string;
    severity: 'info' | 'warning' | 'positive';
    actionable?: boolean;
  }>;
}

export interface WorryFrequencyData {
  date: string;
  count: number;
}

export interface CategoryTrendData {
  category: string;
  data: Array<{
    period: string;
    count: number;
  }>;
}

export class AnalyticsService {
  private static instance: AnalyticsService;

  private constructor() {}

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  /**
   * Get comprehensive personal analytics for a user
   */
  async getPersonalAnalytics(userId: string, timeRange: '30d' | '90d' | '1y' = '30d'): Promise<PersonalAnalytics> {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
    }

    const [
      overview,
      trends,
      categories,
      sentiment,
      engagement,
      insights
    ] = await Promise.all([
      this.getOverviewData(userId, startDate, endDate),
      this.getTrendsData(userId, startDate, endDate),
      this.getCategoriesData(userId, startDate, endDate),
      this.getSentimentData(userId, startDate, endDate),
      this.getEngagementData(userId, startDate, endDate),
      this.generateInsights(userId, startDate, endDate)
    ]);

    return {
      overview,
      trends,
      categories,
      sentiment,
      engagement,
      insights
    };
  }

  private async getOverviewData(userId: string, startDate: Date, endDate: Date) {
    const totalWorries = await prisma.post.count({
      where: {
        userId,
        publishedAt: { not: null }
      }
    });

    const worriesInRange = await prisma.post.count({
      where: {
        userId,
        publishedAt: {
          gte: startDate,
          lte: endDate,
          not: null
        }
      }
    });

    const thisWeekStart = new Date();
    thisWeekStart.setDate(thisWeekStart.getDate() - 7);
    
    const worriesThisWeek = await prisma.post.count({
      where: {
        userId,
        publishedAt: {
          gte: thisWeekStart,
          not: null
        }
      }
    });

    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    
    const worriesThisMonth = await prisma.post.count({
      where: {
        userId,
        publishedAt: {
          gte: thisMonthStart,
          not: null
        }
      }
    });

    // Calculate average worries per week
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const weeksDiff = Math.max(1, daysDiff / 7);
    const averageWorriesPerWeek = Math.round((worriesInRange / weeksDiff) * 10) / 10;

    // Find most active day and hour
    const { mostActiveDay, mostActiveHour } = await this.getMostActiveTimePatterns(userId, startDate, endDate);

    return {
      totalWorries,
      worriesThisMonth,
      worriesThisWeek,
      averageWorriesPerWeek,
      mostActiveDay,
      mostActiveHour
    };
  }

  private async getTrendsData(userId: string, startDate: Date, endDate: Date) {
    // Weekly trend
    const weeklyTrend = await this.getWeeklyTrend(userId, startDate, endDate);
    
    // Monthly trend (for longer time ranges)
    const monthlyTrend = await this.getMonthlyTrend(userId, startDate, endDate);
    
    // Daily pattern (average by day of week)
    const dailyPattern = await this.getDailyPattern(userId, startDate, endDate);
    
    // Hourly pattern (average by hour of day)
    const hourlyPattern = await this.getHourlyPattern(userId, startDate, endDate);

    return {
      weeklyTrend,
      monthlyTrend,
      dailyPattern,
      hourlyPattern
    };
  }

  private async getCategoriesData(userId: string, startDate: Date, endDate: Date) {
    // Get worry analysis data for categories
    const categoryData = await prisma.worryAnalysis.groupBy({
      by: ['category'],
      where: {
        post: {
          userId,
          publishedAt: {
            gte: startDate,
            lte: endDate,
            not: null
          }
        }
      },
      _count: {
        category: true
      },
      orderBy: {
        _count: {
          category: 'desc'
        }
      }
    });

    const totalCategorized = categoryData.reduce((sum, item) => sum + item._count.category, 0);

    const breakdown = categoryData.map(item => ({
      category: item.category,
      count: item._count.category,
      percentage: totalCategorized > 0 ? Math.round((item._count.category / totalCategorized) * 100) : 0,
      trend: 'stable' as 'up' | 'down' | 'stable' // TODO: Calculate actual trend
    }));

    // Get top worries with subcategories
    const topWorries = await prisma.worryAnalysis.groupBy({
      by: ['category', 'subcategory'],
      where: {
        post: {
          userId,
          publishedAt: {
            gte: startDate,
            lte: endDate,
            not: null
          }
        }
      },
      _count: {
        category: true
      },
      orderBy: {
        _count: {
          category: 'desc'
        }
      },
      take: 10
    });

    const topWorriesFormatted = topWorries.map(item => ({
      category: item.category,
      subcategory: item.subcategory || undefined,
      recentCount: item._count.category,
      totalCount: item._count.category // TODO: Get actual total count
    }));

    return {
      breakdown,
      topWorries: topWorriesFormatted
    };
  }

  private async getSentimentData(userId: string, startDate: Date, endDate: Date) {
    const sentimentData = await prisma.worryAnalysis.findMany({
      where: {
        post: {
          userId,
          publishedAt: {
            gte: startDate,
            lte: endDate,
            not: null
          }
        },
        sentimentScore: { not: null }
      },
      select: {
        sentimentScore: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    const sentimentScores = sentimentData
      .map(item => item.sentimentScore?.toNumber() || 0)
      .filter(score => score !== 0);

    const averageSentiment = sentimentScores.length > 0 
      ? sentimentScores.reduce((sum, score) => sum + score, 0) / sentimentScores.length 
      : 0;

    // Calculate sentiment distribution
    const sentimentDistribution = {
      veryNegative: sentimentScores.filter(s => s <= -0.6).length,
      negative: sentimentScores.filter(s => s > -0.6 && s <= -0.2).length,
      neutral: sentimentScores.filter(s => s > -0.2 && s < 0.2).length,
      positive: sentimentScores.filter(s => s >= 0.2 && s < 0.6).length,
      veryPositive: sentimentScores.filter(s => s >= 0.6).length,
    };

    // Calculate sentiment trend over time
    const sentimentTrend = await this.getSentimentTrend(userId, startDate, endDate);

    return {
      averageSentiment: Math.round(averageSentiment * 100) / 100,
      sentimentTrend,
      sentimentDistribution
    };
  }

  private async getEngagementData(userId: string, startDate: Date, endDate: Date) {
    const posts = await prisma.post.findMany({
      where: {
        userId,
        publishedAt: {
          gte: startDate,
          lte: endDate,
          not: null
        }
      },
      select: {
        longContent: true,
        shortContent: true,
        privacyLevel: true,
        isScheduled: true
      }
    });

    const totalPosts = posts.length;
    const postsWithBlogContent = posts.filter(p => p.longContent && p.longContent.length > 0).length;
    const averagePostLength = totalPosts > 0 
      ? Math.round(posts.reduce((sum, p) => sum + p.shortContent.length, 0) / totalPosts)
      : 0;

    const privacyBreakdown = {
      public: posts.filter(p => p.privacyLevel === 'public').length,
      friends: posts.filter(p => p.privacyLevel === 'friends').length,
      private: posts.filter(p => p.privacyLevel === 'private').length,
    };

    const scheduledPosts = posts.filter(p => p.isScheduled).length;

    return {
      totalPosts,
      postsWithBlogContent,
      averagePostLength,
      privacyBreakdown,
      scheduledPosts
    };
  }

  private async generateInsights(userId: string, startDate: Date, endDate: Date) {
    const insights: PersonalAnalytics['insights'] = [];

    // Get basic data for insights
    const totalPosts = await prisma.post.count({
      where: {
        userId,
        publishedAt: {
          gte: startDate,
          lte: endDate,
          not: null
        }
      }
    });

    const previousPeriodStart = new Date(startDate);
    previousPeriodStart.setDate(previousPeriodStart.getDate() - (endDate.getDate() - startDate.getDate()));
    
    const previousPeriodPosts = await prisma.post.count({
      where: {
        userId,
        publishedAt: {
          gte: previousPeriodStart,
          lt: startDate,
          not: null
        }
      }
    });

    // Trend insights
    if (totalPosts > previousPeriodPosts * 1.5) {
      insights.push({
        type: 'trend',
        title: 'Increased Worry Activity',
        description: `You've shared ${Math.round(((totalPosts - previousPeriodPosts) / Math.max(previousPeriodPosts, 1)) * 100)}% more worries recently. Consider exploring coping strategies.`,
        severity: 'warning',
        actionable: true
      });
    } else if (totalPosts < previousPeriodPosts * 0.5 && previousPeriodPosts > 0) {
      insights.push({
        type: 'trend',
        title: 'Reduced Worry Activity',
        description: 'Your worry sharing has decreased recently. This could indicate improved mental well-being.',
        severity: 'positive'
      });
    }

    // Milestone insights
    if (totalPosts >= 50) {
      insights.push({
        type: 'milestone',
        title: 'Milestone Reached',
        description: `You've shared over ${totalPosts} worries. Your commitment to mental health awareness is commendable.`,
        severity: 'positive'
      });
    }

    // Pattern insights
    const { mostActiveHour } = await this.getMostActiveTimePatterns(userId, startDate, endDate);
    if (mostActiveHour >= 22 || mostActiveHour <= 5) {
      insights.push({
        type: 'pattern',
        title: 'Late Night Worry Pattern',
        description: 'You tend to share worries late at night. Consider establishing a calming bedtime routine.',
        severity: 'info',
        actionable: true
      });
    }

    return insights;
  }

  // Helper methods for trend calculations
  private async getWeeklyTrend(userId: string, startDate: Date, endDate: Date) {
    const weeks: Array<{ week: string; count: number; change: number }> = [];
    const currentDate = new Date(startDate);
    let previousCount = 0;

    while (currentDate <= endDate) {
      const weekEnd = new Date(currentDate);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      const count = await prisma.post.count({
        where: {
          userId,
          publishedAt: {
            gte: currentDate,
            lte: weekEnd,
            not: null
          }
        }
      });

      const change = previousCount > 0 ? Math.round(((count - previousCount) / previousCount) * 100) : 0;

      weeks.push({
        week: `${currentDate.getMonth() + 1}/${currentDate.getDate()}`,
        count,
        change
      });

      previousCount = count;
      currentDate.setDate(currentDate.getDate() + 7);
    }

    return weeks;
  }

  private async getMonthlyTrend(userId: string, startDate: Date, endDate: Date) {
    // Similar to weekly trend but grouped by month
    const months: Array<{ month: string; count: number; change: number }> = [];
    // Implementation would be similar to weekly trend
    return months;
  }

  private async getDailyPattern(userId: string, startDate: Date, endDate: Date) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dailyPattern: Array<{ dayOfWeek: string; averageCount: number }> = [];

    for (let day = 0; day < 7; day++) {
      const count = await prisma.post.count({
        where: {
          userId,
          publishedAt: {
            gte: startDate,
            lte: endDate,
            not: null
          }
        }
      });

      // This is a simplified version - in reality, you'd filter by day of week
      dailyPattern.push({
        dayOfWeek: dayNames[day],
        averageCount: Math.round((count / 7) * 10) / 10
      });
    }

    return dailyPattern;
  }

  private async getHourlyPattern(userId: string, startDate: Date, endDate: Date) {
    const hourlyPattern: Array<{ hour: number; averageCount: number }> = [];

    for (let hour = 0; hour < 24; hour++) {
      // This is simplified - in reality, you'd extract hour from publishedAt
      hourlyPattern.push({
        hour,
        averageCount: 0.5 // Placeholder
      });
    }

    return hourlyPattern;
  }

  private async getSentimentTrend(userId: string, startDate: Date, endDate: Date) {
    // Group sentiment by week and calculate average
    const sentimentTrend: Array<{ period: string; averageSentiment: number }> = [];
    
    // This would group sentiment data by time periods
    // Simplified implementation for now
    
    return sentimentTrend;
  }

  private async getMostActiveTimePatterns(userId: string, startDate: Date, endDate: Date) {
    // This would analyze the publishedAt timestamps to find patterns
    // Simplified implementation for now
    return {
      mostActiveDay: 'Monday',
      mostActiveHour: 14
    };
  }

  /**
   * Get worry frequency data for charts
   */
  async getWorryFrequencyData(userId: string, days: number = 30): Promise<WorryFrequencyData[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const data: WorryFrequencyData[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + 1);

      const count = await prisma.post.count({
        where: {
          userId,
          publishedAt: {
            gte: currentDate,
            lt: nextDate,
            not: null
          }
        }
      });

      data.push({
        date: currentDate.toISOString().split('T')[0],
        count
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return data;
  }

  /**
   * Get category trend data over time
   */
  async getCategoryTrendData(userId: string, days: number = 30): Promise<CategoryTrendData[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const categories = await prisma.worryAnalysis.groupBy({
      by: ['category'],
      where: {
        post: {
          userId,
          publishedAt: {
            gte: startDate,
            lte: endDate,
            not: null
          }
        }
      },
      _count: {
        category: true
      }
    });

    const categoryTrends: CategoryTrendData[] = [];

    for (const category of categories) {
      const data: Array<{ period: string; count: number }> = [];
      
      // Group by week for the trend
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const weekEnd = new Date(currentDate);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const count = await prisma.worryAnalysis.count({
          where: {
            category: category.category,
            post: {
              userId,
              publishedAt: {
                gte: currentDate,
                lte: weekEnd,
                not: null
              }
            }
          }
        });

        data.push({
          period: `${currentDate.getMonth() + 1}/${currentDate.getDate()}`,
          count
        });

        currentDate.setDate(currentDate.getDate() + 7);
      }

      categoryTrends.push({
        category: category.category,
        data
      });
    }

    return categoryTrends;
  }
}