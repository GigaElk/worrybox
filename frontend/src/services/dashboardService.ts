import api from './api'

export interface DashboardStats {
  totalWorries: number
  worriesThisWeek: number
  resolvedWorries: number
  followersCount: number
  followingCount: number
}

export interface RecentWorry {
  id: string
  shortContent: string
  worryPrompt: string
  privacyLevel: string
  publishedAt: string
  createdAt: string
}

export interface DashboardData {
  stats: DashboardStats
  recentWorries: RecentWorry[]
}

export const dashboardService = {
  // Get complete dashboard data
  async getDashboardData(): Promise<DashboardData> {
    const response = await api.get('/dashboard')
    return response.data.data
  },

  // Get basic statistics only
  async getBasicStats(): Promise<DashboardStats> {
    const response = await api.get('/dashboard/stats')
    return response.data.data
  },

  // Get recent worries only
  async getRecentWorries(limit: number = 5): Promise<RecentWorry[]> {
    const response = await api.get(`/dashboard/recent-worries?limit=${limit}`)
    return response.data.data
  },
}