import api from './api'

export interface UpdateProfileRequest {
  displayName?: string
  bio?: string
  avatarUrl?: string
}

export interface UserProfile {
  id: string
  email: string
  username: string
  displayName?: string
  bio?: string
  avatarUrl?: string
  emailVerified: boolean
  createdAt: string
  updatedAt: string
}

export interface UserSearchResult {
  id: string
  username: string
  displayName?: string
  avatarUrl?: string
  bio?: string
}

export interface UserSearchResponse {
  users: UserSearchResult[]
  total: number
  hasMore: boolean
}

export interface UserSearchQuery {
  query?: string
  limit?: number
  offset?: number
}

export const userService = {
  // Get current user's profile
  async getProfile(): Promise<UserProfile> {
    const response = await api.get('/users/profile')
    return response.data.data
  },

  // Update current user's profile
  async updateProfile(data: UpdateProfileRequest): Promise<UserProfile> {
    const response = await api.put('/users/profile', data)
    return response.data.data
  },

  // Get user by username (public profile)
  async getUserByUsername(username: string): Promise<Omit<UserProfile, 'email'>> {
    const response = await api.get(`/users/username/${username}`)
    return response.data.data
  },

  // Search users
  async searchUsers(query: UserSearchQuery): Promise<UserSearchResponse> {
    const params = new URLSearchParams()
    if (query.query) params.append('query', query.query)
    if (query.limit) params.append('limit', query.limit.toString())
    if (query.offset) params.append('offset', query.offset.toString())

    const response = await api.get(`/users/search?${params.toString()}`)
    return response.data.data
  },

  // Check username availability
  async checkUsernameAvailability(username: string): Promise<{ username: string; available: boolean }> {
    const response = await api.get(`/users/username-available/${username}`)
    return response.data.data
  },
}