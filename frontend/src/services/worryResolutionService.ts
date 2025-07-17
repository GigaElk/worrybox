import api from './api'

export interface WorryResolution {
  id: string
  postId: string
  userId: string
  resolutionStory?: string
  copingMethods: string[]
  helpfulnessRating?: number // 1-5
  resolvedAt: string
  createdAt: string
  post: {
    id: string
    shortContent: string
    longContent?: string
    worryPrompt: string
    privacyLevel: string
    publishedAt?: string
    createdAt: string
  }
}

export interface ResolutionStats {
  totalResolved: number
  totalWorries: number
  resolutionRate: number
  averageHelpfulnessRating?: number
  mostCommonCopingMethods: Array<{
    method: string
    count: number
  }>
  recentResolutions: WorryResolution[]
}

export interface CreateResolutionData {
  resolutionStory?: string
  copingMethods: string[]
  helpfulnessRating?: number
}

export const worryResolutionService = {
  // Mark a worry as resolved
  async resolveWorry(postId: string, resolutionData: CreateResolutionData): Promise<WorryResolution> {
    const response = await api.post(`/resolutions/posts/${postId}/resolve`, resolutionData)
    return response.data.data
  },

  // Update an existing resolution
  async updateResolution(postId: string, updateData: Partial<CreateResolutionData>): Promise<WorryResolution> {
    const response = await api.put(`/resolutions/posts/${postId}/resolve`, updateData)
    return response.data.data
  },

  // Remove resolution (mark as unresolved)
  async unresolveWorry(postId: string): Promise<void> {
    await api.delete(`/resolutions/posts/${postId}/resolve`)
  },

  // Get resolution for a specific post
  async getResolution(postId: string): Promise<WorryResolution | null> {
    try {
      const response = await api.get(`/resolutions/posts/${postId}`)
      return response.data.data
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null
      }
      throw error
    }
  },

  // Get all resolved worries for a user
  async getUserResolvedWorries(userId: string): Promise<WorryResolution[]> {
    const response = await api.get(`/resolutions/users/${userId}/resolved`)
    return response.data.data
  },

  // Get resolution statistics for the authenticated user
  async getResolutionStats(): Promise<ResolutionStats> {
    const response = await api.get('/resolutions/stats')
    return response.data.data
  },

  // Get public resolution stories for inspiration
  async getPublicResolutionStories(limit: number = 10, category?: string): Promise<WorryResolution[]> {
    const params = new URLSearchParams()
    params.append('limit', limit.toString())
    if (category) {
      params.append('category', category)
    }
    
    const response = await api.get(`/resolutions/stories?${params.toString()}`)
    return response.data.data
  },

  // Get resolution suggestions based on similar worries
  async getResolutionSuggestions(postId: string, limit: number = 5): Promise<WorryResolution[]> {
    const response = await api.get(`/resolutions/posts/${postId}/suggestions?limit=${limit}`)
    return response.data.data
  }
}