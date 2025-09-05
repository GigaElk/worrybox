import api from './api'

export interface MeTooResponse {
  id: string
  userId: string
  postId: string
  createdAt: string
  user: {
    id: string
    username: string
    displayName?: string
    avatarUrl?: string
  }
}

export interface MeTooListResponse {
  meToos: MeTooResponse[]
  total: number
  hasMore: boolean
}

export const meTooService = {
  // Add MeToo to a post
  async addMeToo(postId: string): Promise<MeTooResponse> {
    const response = await api.post(`/metoo/${postId}`)
    
    // Invalidate cache after successful action
    this.invalidateCache(postId)
    
    return response.data.data
  },

  // Remove MeToo from a post
  async removeMeToo(postId: string): Promise<void> {
    await api.delete(`/metoo/${postId}`)
    
    // Invalidate cache after successful action
    this.invalidateCache(postId)
  },

  // Invalidate relevant caches when MeToo actions occur
  invalidateCache(postId: string): void {
    // Import cache service dynamically to avoid circular dependencies
    import('./cacheService').then(({ similarWorriesCache, invalidatePostCache }) => {
      invalidatePostCache(postId)
    }).catch(console.error)
  },

  // Check if user has MeToo'd a post
  async hasMeToo(postId: string): Promise<boolean> {
    try {
      const response = await api.get(`/metoo/${postId}/check`)
      return response.data.data.hasMeToo
    } catch (error) {
      return false
    }
  },

  // Get MeToo count for a post
  async getMeTooCount(postId: string): Promise<number> {
    try {
      const response = await api.get(`/metoo/${postId}/count`)
      const count = response.data.data.count
      return typeof count === 'number' && !isNaN(count) ? count : 0
    } catch (error) {
      console.warn(`Failed to get MeToo count for post ${postId}:`, error)
      return 0
    }
  },

  // Get similar worry count (AI + MeToo combined)
  async getSimilarWorryCount(postId: string): Promise<number> {
    try {
      const response = await api.get(`/metoo/${postId}/similar-worry-count`)
      const count = response.data.data.count
      return typeof count === 'number' && !isNaN(count) ? count : 0
    } catch (error) {
      console.warn(`Failed to get similar worry count for post ${postId}:`, error)
      return 0
    }
  },

  // Get MeToos for a post with pagination
  async getMeToos(postId: string, limit?: number, offset?: number): Promise<MeTooListResponse> {
    const params = new URLSearchParams()
    if (limit) params.append('limit', limit.toString())
    if (offset) params.append('offset', offset.toString())
    
    const response = await api.get(`/metoo/${postId}?${params.toString()}`)
    return response.data.data
  }
}