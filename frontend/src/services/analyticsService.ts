import api from './api'

export interface GeographicAnalyticsQuery {
  countries?: string[]
  regions?: string[]
  timeRange: '30d' | '90d' | '1y'
  categories?: string[]
  minUserThreshold?: number
}

export interface GeographicAnalyticsResult {
  region: string
  country: string
  timeRange: string
  totalUsers: number
  worryCategories: {
    category: string
    count: number
    percentage: number
    trend: 'increasing' | 'decreasing' | 'stable'
  }[]
  sentimentAnalysis: {
    averageSentiment: number
    distribution: Record<string, number>
  }
  topKeywords: string[]
  privacyNote: string
}

export interface RegionSummary {
  country: string
  region?: string
  totalUsers: number
  totalPosts: number
  averageSentiment: number
  topCategories: string[]
}

export interface CategoryTrend {
  country: string
  region?: string
  category: string
  month: string
  count: number
  trend: 'increasing' | 'decreasing' | 'stable'
}

export interface AvailableRegions {
  countries: string[]
  regionsByCountry: Record<string, string[]>
  totalRegions: number
}

export const analyticsService = {
  // Get geographic analytics data
  async getGeographicAnalytics(query: GeographicAnalyticsQuery): Promise<{
    data: GeographicAnalyticsResult[]
    meta: {
      totalRegions: number
      timeRange: string
      privacyNote: string
      generatedAt: string
    }
  }> {
    const params = new URLSearchParams()
    if (query.countries) params.append('countries', query.countries.join(','))
    if (query.regions) params.append('regions', query.regions.join(','))
    params.append('timeRange', query.timeRange)
    if (query.categories) params.append('categories', query.categories.join(','))
    if (query.minUserThreshold) params.append('minUserThreshold', query.minUserThreshold.toString())

    const response = await api.get(`/analytics/geographic?${params.toString()}`)
    return response.data
  },

  // Get region summaries for dashboard overview
  async getRegionSummaries(query: Partial<GeographicAnalyticsQuery>): Promise<{
    data: RegionSummary[]
    meta: {
      totalRegions: number
      timeRange: string
    }
  }> {
    const params = new URLSearchParams()
    if (query.timeRange) params.append('timeRange', query.timeRange)
    if (query.countries) params.append('countries', query.countries.join(','))

    const response = await api.get(`/analytics/regions/summaries?${params.toString()}`)
    return response.data
  },

  // Get available regions for filtering
  async getAvailableRegions(): Promise<{
    data: AvailableRegions
  }> {
    const response = await api.get('/analytics/regions/available')
    return response.data
  },

  // Get category trends by region
  async getCategoryTrends(query: Partial<GeographicAnalyticsQuery>): Promise<{
    data: CategoryTrend[]
    meta: {
      timeRange: string
    }
  }> {
    const params = new URLSearchParams()
    if (query.timeRange) params.append('timeRange', query.timeRange)
    if (query.countries) params.append('countries', query.countries.join(','))
    if (query.categories) params.append('categories', query.categories.join(','))

    const response = await api.get(`/analytics/categories/trends?${params.toString()}`)
    return response.data
  },

  // Export analytics data
  async exportAnalytics(query: GeographicAnalyticsQuery, format: 'json' | 'csv' = 'json'): Promise<Blob> {
    const params = new URLSearchParams()
    if (query.countries) params.append('countries', query.countries.join(','))
    if (query.regions) params.append('regions', query.regions.join(','))
    params.append('timeRange', query.timeRange)
    if (query.categories) params.append('categories', query.categories.join(','))
    if (query.minUserThreshold) params.append('minUserThreshold', query.minUserThreshold.toString())
    params.append('format', format)

    const response = await api.get(`/analytics/export?${params.toString()}`, {
      responseType: 'blob'
    })
    return response.data
  }
}