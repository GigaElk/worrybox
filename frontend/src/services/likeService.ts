import api from './api'

export interface LikeResponse {
  id: string
  userId: string
  postId: string
  createdAt: string
}

export interface LikeStatsResponse {
  supportCount: number
  count: number // backward compatibility
  isShowingSupport?: boolean
  userHasShownSupport?: boolean // backward compatibility
}

export const likeService = {
  // Like a post
  async likePost(postId: string): Promise<LikeResponse> {
    const response = await api.post(`/likes/${postId}`)
    return response.data.data
  },

  // Unlike a post
  async unlikePost(postId: string): Promise<void> {
    await api.delete(`/likes/${postId}`)
  },

  // Get like count for a post
  async getLikeCount(postId: string): Promise<number> {
    try {
      const response = await api.get(`/likes/${postId}/stats`)
      const data = response.data.data
      return data.supportCount || data.count || 0
    } catch (error) {
      console.error('Failed to fetch like count:', error)
      return 0
    }
  },

  // Check if user has liked a post
  async isLiked(postId: string): Promise<boolean> {
    try {
      const response = await api.get(`/likes/${postId}/check`)
      const data = response.data.data
      return data.isShowingSupport || data.userHasShownSupport || false
    } catch (error) {
      console.error('Failed to check like status:', error)
      return false
    }
  },

  // Get like statistics for a post (deprecated, use separate methods)
  async getLikeStats(postId: string): Promise<LikeStatsResponse> {
    try {
      const [countResponse, checkResponse] = await Promise.all([
        api.get(`/likes/${postId}/stats`),
        api.get(`/likes/${postId}/check`).catch(() => ({ data: { data: { isShowingSupport: false } } }))
      ])
      
      const countData = countResponse.data.data
      const checkData = checkResponse.data.data
      
      return {
        supportCount: countData.supportCount || countData.count || 0,
        count: countData.supportCount || countData.count || 0,
        isShowingSupport: checkData.isShowingSupport || false,
        userHasShownSupport: checkData.isShowingSupport || false
      }
    } catch (error) {
      console.error('Failed to fetch like stats:', error)
      return {
        supportCount: 0,
        count: 0,
        isShowingSupport: false,
        userHasShownSupport: false
      }
    }
  },

  // Get posts liked by a user (TODO: implement backend route)
  async getUserLikedPosts(userId: string): Promise<any[]> {
    try {
      const response = await api.get(`/users/${userId}/likes`)
      return response.data.data || []
    } catch (error) {
      console.error('Failed to fetch user liked posts:', error)
      return []
    }
  }
}
