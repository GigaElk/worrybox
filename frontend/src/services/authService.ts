import api from './api'

export interface User {
  id: string
  email: string
  username: string
  displayName?: string
  avatarUrl?: string
  emailVerified: boolean
  // Location fields
  country?: string
  region?: string
  city?: string
  locationSharing?: boolean
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  username: string
  password: string
}

export interface AuthResponse {
  user: User
  token: string
  refreshToken: string
}

export interface EmailAvailabilityResponse {
  email: string
  available: boolean
  suggestion?: string
}

export interface UsernameAvailabilityResponse {
  username: string
  available: boolean
  suggestions: string[]
}

export const authService = {
  // Authentication
  async login(data: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await api.post('/auth/login', data)
      return response.data.data
    } catch (error: any) {
      // If we get a 503 (service unavailable), try to wake up the database and retry once
      if (error.response?.status === 503 || error.code === 'ERR_NETWORK') {
        console.log('Login failed, attempting to wake up database and retry...')
        
        try {
          // Try to wake up the database
          await api.get('/wake')
          
          // Wait a moment for the database to wake up
          await new Promise(resolve => setTimeout(resolve, 2000))
          
          // Retry the login
          const response = await api.post('/auth/login', data)
          return response.data.data
        } catch (retryError) {
          // If retry fails, throw the original error
          throw error
        }
      }
      
      // For other errors (like 401), throw immediately
      throw error
    }
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await api.post('/auth/register', data)
    return response.data.data
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout')
  },

  async getProfile(): Promise<User> {
    const response = await api.get('/auth/profile')
    return response.data.data
  },

  // Availability checks
  async checkEmailAvailability(email: string): Promise<EmailAvailabilityResponse> {
    const response = await api.get(`/auth/check-email/${encodeURIComponent(email)}`)
    return response.data.data
  },

  async checkUsernameAvailability(username: string): Promise<UsernameAvailabilityResponse> {
    const response = await api.get(`/auth/check-username/${encodeURIComponent(username)}`)
    return response.data.data
  },

  // Password reset
  async forgotPassword(email: string): Promise<void> {
    await api.post('/auth/forgot-password', { email })
  },

  async resetPassword(token: string, password: string): Promise<void> {
    await api.post('/auth/reset-password', { token, password })
  },

  async verifyEmail(token: string): Promise<void> {
    await api.get(`/auth/verify-email?token=${token}`)
  },

  async resendVerificationEmail(): Promise<void> {
    await api.post('/auth/resend-verification')
  },
}