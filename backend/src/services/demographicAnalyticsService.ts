import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface DemographicAnalytics {
  overview: {
    totalUsers: number;
    activeUsers: number; // users who posted in last 30 days
    totalWorries: number;
    averageWorriesPerUser: number;
    timeRange: string;
  };
  categoryTrends: {
    trending: Array<{
      category: string;
      count: number;
      change: number; // percentage change from previous period
      trend: 'up' | 'down' | 'stable';
    }>;
    seasonal: Array<{
      category: string;
      monthlyData: Array<{
        month: string;
        count: number;
      }>;
    }>;
  };
  sentimentAnalysis: {
    globalAverage: number;
    distribution: {
      veryNegative: number;
      negative: number;
      neutral: number;
      positive: number;
      veryPositive: number;
    };
    trends: Array<{
      period: string;
      averageSentiment: number;
    }>;
  };
  geographicInsights: {
    // Anonymized geographic data (country/region level only)
    topRegions: Array<{
      region: string;
      userCount: number; // only show if > minimum threshold
      topCategories: string[];
    }>;
    globalDistribution: {
      totalCountries: number;
      totalRegions: number;
    };
  };
  temporalPatterns: {
    hourlyActivity: Array<{
      hour: number;
      averageActivity: number;
    }>;
    dailyActivity: Array<{
      dayOfWeek: string;
      averageActivity: number;
    }>;
    monthlyActivity: Array<{
      month: string;
      totalActivity: number;
      uniqueUsers: number;
    }>;
  };
  privacyInsights: {
    privacyDistribution: {
      public: number;
      friends: number;
      private: number;
    };
    engagementByPrivacy: Array<{
      privacyLevel: string;
      averageLength: number;
      blogContentPercentage: number;
    }>;
  };
  communityHealth: {
    newUserGrowth: Array<{
      period: string;
      newUsers: number;
      retentionRate: number;
    }>;
    engagementMetrics: {
      averagePostsPerUser: number;
      averageSessionLength: number;
      returnUserRate: number;
    };
    supportMetrics: {
      postsWithSimilarWorries: number;
      communityInteractionRate: number;
    };
  };
}

export interface WorryHeatMapData {
  category: string;
  intensity: number; // 0-100 scale
  coordinates: {
    x: number; // category position
    y: number; // time/demographic position
  };
  metadata: {
    count: number;
    averageSentiment: number;
    trend: 'up' | 'down' | 'stable';
  };
}

export interface TrendingTopic {
  topic: string;
  category: string;
  keywords: string[];
  count: number;
  growth: number; // percentage growth
  sentiment: number;
  timeframe: string;
}

export class DemographicAnalyticsService {
  private static instance: DemographicAnalyticsService;
  private readonly MINIMUM_SAMPLE_SIZE = 10; // Minimum users required to show demographic data

  private constructor() {}

  public static getInstance(): DemographicAnalyticsService {
    if (!DemographicAnalyticsService.instance) {
      DemographicAnalyticsService.instance = new DemographicAnalyticsService();
    }
    return DemographicAnalyticsService.instance;
  }

  /**
   * Get comprehensive demographic analytics with privacy protection
   */
  async getDemographicAnalytics(timeRange: '30d' | '90d' | '1y' = '90d'): Promise<DemographicAnalytics> {
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
      categoryTrends,
      sentimentAnalysis,
      geographicInsights,
      temporalPatterns,
      privacyInsights,
      communityHealth
    ] = await Promise.all([
      this.getOverviewData(startDate, endDate),
      this.getCategoryTrends(startDate, endDate),
      this.getSentimentAnalysis(startDate, endDate),
      this.getGeographicInsights(startDate, endDate),
      this.getTemporalPatterns(startDate, endDate),
      this.getPrivacyInsights(startDate, endDate),
      this.getCommunityHealth(startDate, endDate)
    ]);

    return {
      overview: { ...overview, timeRange },
      categoryTrends,
      sentimentAnalysis,
      geographicInsights,
      temporalPatterns,
      privacyInsights,
      communityHealth
    };
  }

  private async getOverviewData(startDate: Date, endDate: Date) {
    const [totalUsers, activeUsers, totalWorries] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          posts: {
            some: {
              publishedAt: {
                gte: startDate,
                lte: endDate,
                not: null
              }
            }
          }
        }
      }),
      prisma.post.count({
        where: {
          publishedAt: {
            gte: startDate,
            lte: endDate,
            not: null
          }
        }
      })
    ]);

    const averageWorriesPerUser = activeUsers > 0 ? Math.round((totalWorries / activeUsers) * 10) / 10 : 0;

    return {
      totalUsers,
      activeUsers,
      totalWorries,
      averageWorriesPerUser
    };
  }

  private async getCategoryTrends(startDate: Date, endDate: Date) {
    // Get current period category data
    const currentCategories = await prisma.worryAnalysis.groupBy({
      by: ['category'],
      where: {
        post: {
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

    // Get previous period for comparison
    const previousPeriodStart = new Date(startDate);
    const periodLength = endDate.getTime() - startDate.getTime();
    previousPeriodStart.setTime(startDate.getTime() - periodLength);

    const previousCategories = await prisma.worryAnalysis.groupBy({
      by: ['category'],
      where: {
        post: {
          publishedAt: {
            gte: previousPeriodStart,
            lt: startDate,
            not: null
          }
        }
      },
      _count: {
        category: true
      }
    });

    // Calculate trends
    const trending = currentCategories.map(current => {
      const previous = previousCategories.find(p => p.category === current.category);
      const previousCount = previous?._count.category || 0;
      const currentCount = current._count.category;
      
      let change = 0;
      let trend: 'up' | 'down' | 'stable' = 'stable';
      
      if (previousCount > 0) {
        change = Math.round(((currentCount - previousCount) / previousCount) * 100);
        if (change > 10) trend = 'up';
        else if (change < -10) trend = 'down';
      } else if (currentCount > 0) {
        change = 100;
        trend = 'up';
      }

      return {
        category: current.category,
        count: currentCount,
        change,
        trend
      };
    });

    // Get seasonal data (monthly breakdown)
    const seasonal = await this.getSeasonalCategoryData(startDate, endDate);

    return {
      trending,
      seasonal
    };
  }

  private async getSentimentAnalysis(startDate: Date, endDate: Date) {
    const sentimentData = await prisma.worryAnalysis.findMany({
      where: {
        post: {
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

    const globalAverage = sentimentScores.length > 0 
      ? sentimentScores.reduce((sum, score) => sum + score, 0) / sentimentScores.length 
      : 0;

    // Calculate distribution
    const distribution = {
      veryNegative: sentimentScores.filter(s => s <= -0.6).length,
      negative: sentimentScores.filter(s => s > -0.6 && s <= -0.2).length,
      neutral: sentimentScores.filter(s => s > -0.2 && s < 0.2).length,
      positive: sentimentScores.filter(s => s >= 0.2 && s < 0.6).length,
      veryPositive: sentimentScores.filter(s => s >= 0.6).length,
    };

    // Calculate trends over time (weekly averages)
    const trends = await this.getSentimentTrends(startDate, endDate);

    return {
      globalAverage: Math.round(globalAverage * 100) / 100,
      distribution,
      trends
    };
  }

  private async getGeographicInsights(startDate: Date, endDate: Date) {
    // Note: This is a placeholder implementation
    // In a real app, you'd need to collect geographic data (with user consent)
    // and ensure it meets privacy requirements (minimum sample sizes, etc.)
    
    return {
      topRegions: [], // Would be populated with actual geographic data
      globalDistribution: {
        totalCountries: 0,
        totalRegions: 0
      }
    };
  }

  private async getTemporalPatterns(startDate: Date, endDate: Date) {
    // This is a simplified implementation
    // In reality, you'd extract hour/day from publishedAt timestamps
    
    const hourlyActivity = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      averageActivity: Math.random() * 10 // Placeholder data
    }));

    const dailyActivity = [
      'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
    ].map(dayOfWeek => ({
      dayOfWeek,
      averageActivity: Math.random() * 15 // Placeholder data
    }));

    const monthlyActivity = await this.getMonthlyActivity(startDate, endDate);

    return {
      hourlyActivity,
      dailyActivity,
      monthlyActivity
    };
  }

  private async getPrivacyInsights(startDate: Date, endDate: Date) {
    const posts = await prisma.post.findMany({
      where: {
        publishedAt: {
          gte: startDate,
          lte: endDate,
          not: null
        }
      },
      select: {
        privacyLevel: true,
        shortContent: true,
        longContent: true
      }
    });

    const privacyDistribution = {
      public: posts.filter(p => p.privacyLevel === 'public').length,
      friends: posts.filter(p => p.privacyLevel === 'friends').length,
      private: posts.filter(p => p.privacyLevel === 'private').length,
    };

    const engagementByPrivacy = ['public', 'friends', 'private'].map(privacyLevel => {
      const levelPosts = posts.filter(p => p.privacyLevel === privacyLevel);
      const averageLength = levelPosts.length > 0 
        ? Math.round(levelPosts.reduce((sum, p) => sum + p.shortContent.length, 0) / levelPosts.length)
        : 0;
      const blogContentPercentage = levelPosts.length > 0
        ? Math.round((levelPosts.filter(p => p.longContent && p.longContent.length > 0).length / levelPosts.length) * 100)
        : 0;

      return {
        privacyLevel,
        averageLength,
        blogContentPercentage
      };
    });

    return {
      privacyDistribution,
      engagementByPrivacy
    };
  }

  private async getCommunityHealth(startDate: Date, endDate: Date) {
    // Get new user growth data
    const newUserGrowth = await this.getNewUserGrowth(startDate, endDate);
    
    // Calculate engagement metrics
    const totalPosts = await prisma.post.count({
      where: {
        publishedAt: {
          gte: startDate,
          lte: endDate,
          not: null
        }
      }
    });

    const activeUsers = await prisma.user.count({
      where: {
        posts: {
          some: {
            publishedAt: {
              gte: startDate,
              lte: endDate,
              not: null
            }
          }
        }
      }
    });

    const averagePostsPerUser = activeUsers > 0 ? Math.round((totalPosts / activeUsers) * 10) / 10 : 0;

    // Get support metrics
    const postsWithSimilarWorries = await prisma.worryAnalysis.count({
      where: {
        similarWorryCount: { gt: 0 },
        post: {
          publishedAt: {
            gte: startDate,
            lte: endDate,
            not: null
          }
        }
      }
    });

    const communityInteractionRate = totalPosts > 0 
      ? Math.round((postsWithSimilarWorries / totalPosts) * 100) 
      : 0;

    return {
      newUserGrowth,
      engagementMetrics: {
        averagePostsPerUser,
        averageSessionLength: 0, // Would need session tracking
        returnUserRate: 0 // Would need return visit tracking
      },
      supportMetrics: {
        postsWithSimilarWorries,
        communityInteractionRate
      }
    };
  }

  // Helper methods
  private async getSeasonalCategoryData(startDate: Date, endDate: Date) {
    // This would group category data by month
    // Simplified implementation for now
    return [];
  }

  private async getSentimentTrends(startDate: Date, endDate: Date) {
    // This would calculate weekly sentiment averages
    // Simplified implementation for now
    return [];
  }

  private async getMonthlyActivity(startDate: Date, endDate: Date) {
    // This would group activity by month
    // Simplified implementation for now
    return [];
  }

  private async getNewUserGrowth(startDate: Date, endDate: Date) {
    // This would calculate new user registration trends
    // Simplified implementation for now
    return [];
  }

  /**
   * Generate worry heat map data for visualization
   */
  async getWorryHeatMapData(timeRange: '30d' | '90d' | '1y' = '90d'): Promise<WorryHeatMapData[]> {
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

    const categoryData = await prisma.worryAnalysis.groupBy({
      by: ['category'],
      where: {
        post: {
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
      _avg: {
        sentimentScore: true
      }
    });

    const maxCount = Math.max(...categoryData.map(c => c._count.category));

    return categoryData.map((category, index) => ({
      category: category.category,
      intensity: Math.round((category._count.category / maxCount) * 100),
      coordinates: {
        x: index,
        y: 0 // Would be calculated based on time/demographic dimension
      },
      metadata: {
        count: category._count.category,
        averageSentiment: category._avg.sentimentScore?.toNumber() || 0,
        trend: 'stable' as 'up' | 'down' | 'stable' // Would be calculated
      }
    }));
  }

  /**
   * Get trending topics with growth analysis
   */
  async getTrendingTopics(limit: number = 10): Promise<TrendingTopic[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);

    // Get current period keywords
    const currentKeywords = await prisma.worryAnalysis.findMany({
      where: {
        post: {
          publishedAt: {
            gte: startDate,
            lte: endDate,
            not: null
          }
        }
      },
      select: {
        keywords: true,
        category: true,
        sentimentScore: true
      }
    });

    // Aggregate keyword data
    const keywordMap = new Map<string, {
      count: number;
      categories: Set<string>;
      sentiments: number[];
    }>();

    currentKeywords.forEach(analysis => {
      const keywords = typeof analysis.keywords === 'string' 
        ? analysis.keywords.split(',').map(k => k.trim()).filter(k => k)
        : analysis.keywords || [];
      keywords.forEach(keyword => {
        if (!keywordMap.has(keyword)) {
          keywordMap.set(keyword, {
            count: 0,
            categories: new Set(),
            sentiments: []
          });
        }
        
        const data = keywordMap.get(keyword)!;
        data.count++;
        data.categories.add(analysis.category);
        if (analysis.sentimentScore) {
          data.sentiments.push(analysis.sentimentScore.toNumber());
        }
      });
    });

    // Convert to trending topics format
    const trendingTopics: TrendingTopic[] = Array.from(keywordMap.entries())
      .filter(([_, data]) => data.count >= 3) // Minimum threshold
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, limit)
      .map(([keyword, data]) => ({
        topic: keyword,
        category: Array.from(data.categories)[0], // Primary category
        keywords: [keyword],
        count: data.count,
        growth: 0, // Would need previous period comparison
        sentiment: data.sentiments.length > 0 
          ? data.sentiments.reduce((sum, s) => sum + s, 0) / data.sentiments.length 
          : 0,
        timeframe: '30d'
      }));

    return trendingTopics;
  }

  /**
   * Check if demographic data meets minimum privacy requirements
   */
  private meetsPrivacyThreshold(count: number): boolean {
    return count >= this.MINIMUM_SAMPLE_SIZE;
  }
}