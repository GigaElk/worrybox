import api from './api'

export interface DemographicAnalytics {
  overview: {
    totalUsers: number
    activeUsers: number
    totalWorries: number
    averageWorriesPerUser: number
    timeRange: string
  }
  categoryTrends: {
    trending: Array<{
      category: string
      count: number
      change: number
      trend: 'up' | 'down' | 'stable'
    }>
    seasonal: Array<{
      category: string
      monthlyData: Array<{
        month: string
        count: number
      }>
    }>
  }
  sentimentAnalysis: {
    globalAverage: number
    distribution: {
      veryNegative: number
      negative: number
      neutral: number
      positive: number
      veryPositive: number
    }
    trends: Array<{
      period: string
      averageSentiment: number
    }>
  }
  geographicInsights: {
    topRegions: Array<{
      region: string
      userCount: number
      topCategories: string[]
    }>
    globalDistribution: {
      totalCountries: number
      totalRegions: number
    }
  }
  temporalPatterns: {
    hourlyActivity: Array<{
      hour: number
      averageActivity: number
    }>
    dailyActivity: Array<{
      dayOfWeek: string
      averageActivity: number
    }>
    monthlyActivity: Array<{
      month: string
      totalActivity: number
      uniqueUsers: number
    }>
  }
  privacyInsights: {
    privacyDistribution: {
      public: number
      friends: number
      private: number
    }
    engagementByPrivacy: Array<{
      privacyLevel: string
      averageLength: number
      blogContentPercentage: number
    }>
  }
  communityHealth: {
    newUserGrowth: Array<{
      period: string
      newUsers: number
      retentionRate: number
    }>
    engagementMetrics: {
      averagePostsPerUser: number
      averageSessionLength: number
      returnUserRate: number
    }
    supportMetrics: {
      postsWithSimilarWorries: number
      communityInteractionRate: number
    }
  }
}

export interface WorryHeatMapData {
  category: string
  intensity: number
  coordinates: {
    x: number
    y: number
  }
  metadata: {
    count: number
    averageSentiment: number
    trend: 'up' | 'down' | 'stable'
  }
}

export interface TrendingTopic {
  topic: string
  category: string
  keywords: string[]
  count: number
  growth: number
  sentiment: number
  timeframe: string
}

export interface CategoryTrends {
  trending: DemographicAnalytics['categoryTrends']['trending']
  seasonal: DemographicAnalytics['categoryTrends']['seasonal']
  timeRange: string
}

export interface CommunityHealth {
  overview: DemographicAnalytics['overview']
  communityHealth: DemographicAnalytics['communityHealth']
  sentimentAnalysis: DemographicAnalytics['sentimentAnalysis']
  timeRange: string
}

export const demographicAnalyticsService = {
  // Get comprehensive demographic analytics
  async getDemographicAnalytics(timeRange: '30d' | '90d' | '1y' = '90d'): Promise<DemographicAnalytics> {
    const response = await api.get(`/demographics/overview?timeRange=${timeRange}`)
    return response.data.data
  },

  // Get worry heat map data for visualization
  async getWorryHeatMapData(timeRange: '30d' | '90d' | '1y' = '90d'): Promise<WorryHeatMapData[]> {
    const response = await api.get(`/demographics/heatmap?timeRange=${timeRange}`)
    return response.data.data
  },

  // Get trending topics with growth analysis
  async getTrendingTopics(limit: number = 10): Promise<TrendingTopic[]> {
    const response = await api.get(`/demographics/trending?limit=${limit}`)
    return response.data.data
  },

  // Get category trends for demographic analysis
  async getCategoryTrends(timeRange: '30d' | '90d' | '1y' = '90d'): Promise<CategoryTrends> {
    const response = await api.get(`/demographics/categories/trends?timeRange=${timeRange}`)
    return response.data.data
  },

  // Get community health metrics
  async getCommunityHealth(timeRange: '30d' | '90d' | '1y' = '90d'): Promise<CommunityHealth> {
    const response = await api.get(`/demographics/community/health?timeRange=${timeRange}`)
    return response.data.data
  }
}