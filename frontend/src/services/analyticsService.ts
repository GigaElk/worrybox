import api from './api'

export interface PersonalAnalytics {
  overview: {
    totalWorries: number
    worriesThisMonth: number
    worriesThisWeek: number
    averageWorriesPerWeek: number
    mostActiveDay: string
    mostActiveHour: number
  }
  trends: {
    weeklyTrend: Array<{
      week: string
      count: number
      change: number
    }>
    monthlyTrend: Array<{
      month: string
      count: number
      change: number
    }>
    dailyPattern: Array<{
      dayOfWeek: string
      averageCount: number
    }>
    hourlyPattern: Array<{
      hour: number
      averageCount: number
    }>
  }
  categories: {
    breakdown: Array<{
      category: string
      count: number
      percentage: number
      trend: 'up' | 'down' | 'stable'
    }>
    topWorries: Array<{
      category: string
      subcategory?: string
      recentCount: number
      totalCount: number
    }>
  }
  sentiment: {
    averageSentiment: number
    sentimentTrend: Array<{
      period: string
      averageSentiment: number
    }>
    sentimentDistribution: {
      veryNegative: number
      negative: number
      neutral: number
      positive: number
      veryPositive: number
    }
  }
  engagement: {
    totalPosts: number
    postsWithBlogContent: number
    averagePostLength: number
    privacyBreakdown: {
      public: number
      friends: number
      private: number
    }
    scheduledPosts: number
  }
  insights: Array<{
    type: 'trend' | 'pattern' | 'milestone' | 'suggestion'
    title: string
    description: string
    severity: 'info' | 'warning' | 'positive'
    actionable?: boolean
  }>
}

export interface WorryFrequencyData {
  date: string
  count: number
}

export interface CategoryTrendData {
  category: string
  data: Array<{
    period: string
    count: number
  }>
}

export interface AnalyticsSummary {
  overview: PersonalAnalytics['overview']
  topCategories: PersonalAnalytics['categories']['breakdown']
  recentInsights: PersonalAnalytics['insights']
  sentimentSummary: {
    average: number
    distribution: PersonalAnalytics['sentiment']['sentimentDistribution']
  }
}

export const analyticsService = {
  // Get comprehensive personal analytics
  async getPersonalAnalytics(timeRange: '30d' | '90d' | '1y' = '30d'): Promise<PersonalAnalytics> {
    const response = await api.get(`/analytics/personal?timeRange=${timeRange}`)
    return response.data.data
  },

  // Get analytics summary for dashboard
  async getAnalyticsSummary(): Promise<AnalyticsSummary> {
    const response = await api.get('/analytics/summary')
    return response.data.data
  },

  // Get worry frequency data for charts
  async getWorryFrequencyData(days: number = 30): Promise<WorryFrequencyData[]> {
    const response = await api.get(`/analytics/frequency?days=${days}`)
    return response.data.data
  },

  // Get category trend data for charts
  async getCategoryTrendData(days: number = 30): Promise<CategoryTrendData[]> {
    const response = await api.get(`/analytics/categories/trends?days=${days}`)
    return response.data.data
  }
}