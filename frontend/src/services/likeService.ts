import api from './api'

export interface LikeResponse {
  id: string
  userId: string
  postId: string
  createdAt: string
}

export interface LikeStatsResponse {
  likesCount: number
  isLiked: boolean
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
    const stats = await this.getLikeStats(postId)
    return stats.likesCount
  },

  // Check if user has liked a post
  async isLiked(postId: string): Promise<boolean> {
    const stats = await this.getLikeStats(postId)
    return stats.isLiked
  },

  // Get like statistics for a post
  async getLikeStats(postId: string): Promise<LikeStatsResponse> {
    const response = await api.get(`/likes/${postId}/stats`)
    return response.data.data
  },

  // Get posts liked by a user
  async getUserLikedPosts(userId: string): Promise<any[]> {
    const response = await api.get(`/likes/user/${userId}`)
    return response.data.data
  }
}