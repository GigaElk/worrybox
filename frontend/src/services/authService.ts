import api from './api'

export interface User {
  id: string
  email: string
  username: string
  displayName?: string
  avatarUrl?: string
  emailVerified: boolean
}

export interface AuthResponse {
  user: User
  token: string
  refreshToken: string
}

export interface RegisterData {
  email: string
  username: string
  password: string
}

export interface LoginData {
  email: string
  password: string
}

export class AuthService {
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await api.post('/auth/register', data)
    return response.data.data
  }

  async login(data: LoginData): Promise<AuthResponse> {
    const response = await api.post('/auth/login', data)
    return response.data.data
  }

  async logout(): Promise<void> {
    await api.post('/auth/logout')
  }

  async refreshToken(refreshToken: string): Promise<{ token: string; refreshToken: string }> {
    const response = await api.post('/auth/refresh', { refreshToken })
    return response.data.data
  }

  async getProfile(): Promise<User> {
    const response = await api.get('/auth/profile')
    return response.data.data
  }

  async forgotPassword(email: string): Promise<void> {
    await api.post('/auth/forgot-password', { email })
  }

  async resetPassword(token: string, password: string): Promise<void> {
    await api.post('/auth/reset-password', { token, password })
  }

  async verifyEmail(token: string): Promise<void> {
    await api.get(`/auth/verify-email?token=${token}`)
  }
}

export const authService = new AuthService()