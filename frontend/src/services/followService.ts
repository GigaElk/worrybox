import api from './api'

export interface FollowResponse {
  id: string
  followerId: string
  followingId: string
  createdAt: string
  follower: {
    id: string
    username: string
    displayName?: string
    avatarUrl?: string
  }
  following: {
    id: string
    username: string
    displayName?: string
    avatarUrl?: string
  }
}

export interface FollowStatsResponse {
  followersCount: number
  followingCount: number
}

export const followService = {
  // Follow a user
  async followUser(userId: string): Promise<FollowResponse> {
    const response = await api.post(`/follows/${userId}`)
    return response.data.data
  },

  // Unfollow a user
  async unfollowUser(userId: string): Promise<void> {
    await api.delete(`/follows/${userId}`)
  },

  // Check if following a user
  async isFollowing(userId: string): Promise<boolean> {
    try {
      const response = await api.get(`/follows/${userId}/status`)
      return response.data.data.isFollowing
    } catch (error) {
      return false
    }
  },

  // Get user's followers
  async getFollowers(userId: string, limit?: number, offset?: number): Promise<{ followers: FollowResponse[], hasMore: boolean }> {
    const params = new URLSearchParams()
    if (limit) params.append('limit', limit.toString())
    if (offset) params.append('offset', offset.toString())
    
    const response = await api.get(`/follows/${userId}/followers?${params.toString()}`)
    return response.data.data
  },

  // Get users that a user is following
  async getFollowing(userId: string, limit?: number, offset?: number): Promise<{ following: FollowResponse[], hasMore: boolean }> {
    const params = new URLSearchParams()
    if (limit) params.append('limit', limit.toString())
    if (offset) params.append('offset', offset.toString())
    
    const response = await api.get(`/follows/${userId}/following?${params.toString()}`)
    return response.data.data
  },

  // Get follow statistics
  async getFollowStats(userId: string): Promise<FollowStatsResponse> {
    const response = await api.get(`/follows/${userId}/stats`)
    return response.data.data
  }
}