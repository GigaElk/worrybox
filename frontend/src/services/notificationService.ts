import api from './api'

export interface NotificationPreferences {
  id: string
  userId: string
  emailNotifications: boolean
  pushNotifications: boolean
  checkInFrequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'never'
  supportNotifications: boolean
  quietHoursStart?: string
  quietHoursEnd?: string
  timezone: string
  createdAt: string
  updatedAt: string
}

export interface Notification {
  id: string
  userId: string
  type: 'check_in' | 'support' | 'encouragement' | 'community' | 'reminder'
  title: string
  message: string
  isRead: boolean
  sentAt?: string
  scheduledFor?: string
  metadata?: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface NotificationContext {
  userId: string
  lastPostDate?: string
  recentWorryCategories: string[]
  supportInteractions: number
  userEngagement: 'high' | 'medium' | 'low'
  difficultPeriodIndicators: string[]
}

export const notificationService = {
  // Get user's notification preferences
  async getNotificationPreferences(): Promise<NotificationPreferences | null> {
    const response = await api.get('/notifications/preferences')
    return response.data.data
  },

  // Update user's notification preferences
  async updateNotificationPreferences(preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    const response = await api.put('/notifications/preferences', preferences)
    return response.data.data
  },

  // Get user's notifications
  async getUserNotifications(limit: number = 20): Promise<Notification[]> {
    const response = await api.get(`/notifications?limit=${limit}`)
    return response.data.data
  },

  // Mark notification as read
  async markNotificationAsRead(notificationId: string): Promise<void> {
    await api.put(`/notifications/${notificationId}/read`)
  },

  // Mark all notifications as read
  async markAllNotificationsAsRead(): Promise<void> {
    await api.put('/notifications/read-all')
  },

  // Get user's notification context (for debugging)
  async getUserNotificationContext(): Promise<NotificationContext> {
    const response = await api.get('/notifications/context')
    return response.data.data
  },

  // Trigger smart notifications (for testing)
  async triggerSmartNotifications(): Promise<void> {
    await api.post('/notifications/trigger-smart')
  }
}