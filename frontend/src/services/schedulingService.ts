import api from './api'

export interface ScheduledPost {
  id: string
  userId: string
  shortContent: string
  longContent?: string
  worryPrompt: string
  privacyLevel: string
  isScheduled: boolean
  scheduledFor?: string
  createdAt: string
  updatedAt: string
  user: {
    id: string
    username: string
    displayName?: string
    avatarUrl?: string
  }
}

export interface ScheduledPostsResponse {
  posts: ScheduledPost[]
  total: number
}

export interface UpdateScheduledPostRequest {
  shortContent?: string
  longContent?: string
  worryPrompt?: string
  privacyLevel?: 'public' | 'friends' | 'private'
  scheduledFor?: string
}

export interface SchedulingStats {
  totalScheduled: number
  scheduledToday: number
  scheduledThisWeek: number
}

export const schedulingService = {
  // Get all scheduled posts for the current user
  async getScheduledPosts(): Promise<ScheduledPostsResponse> {
    const response = await api.get('/scheduling/posts')
    return response.data.data
  },

  // Update a scheduled post
  async updateScheduledPost(postId: string, data: UpdateScheduledPostRequest): Promise<ScheduledPost> {
    const response = await api.put(`/scheduling/posts/${postId}`, data)
    return response.data.data
  },

  // Cancel a scheduled post
  async cancelScheduledPost(postId: string): Promise<void> {
    await api.delete(`/scheduling/posts/${postId}`)
  },

  // Get scheduling statistics
  async getSchedulingStats(): Promise<SchedulingStats> {
    const response = await api.get('/scheduling/stats')
    return response.data.data
  }
}