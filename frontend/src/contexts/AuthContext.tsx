import React, { createContext, useContext, useState, useEffect } from 'react'
import { authService, User } from '../services/authService'
import toast from 'react-hot-toast'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for existing auth token on app load
    const initializeAuth = async () => {
      const token = localStorage.getItem('auth_token')
      if (token) {
        try {
          const userData = await authService.getProfile()
          setUser(userData)
        } catch (error) {
          // Token is invalid, remove it
          localStorage.removeItem('auth_token')
          localStorage.removeItem('refresh_token')
        }
      }
      setIsLoading(false)
    }

    initializeAuth()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login({ email, password })
      
      // Store tokens
      localStorage.setItem('auth_token', response.token)
      localStorage.setItem('refresh_token', response.refreshToken)
      
      // Set user
      setUser(response.user)
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Login failed'
      throw new Error(message)
    }
  }

  const register = async (email: string, username: string, password: string) => {
    try {
      const response = await authService.register({ email, username, password })
      
      // Store tokens
      localStorage.setItem('auth_token', response.token)
      localStorage.setItem('refresh_token', response.refreshToken)
      
      // Set user
      setUser(response.user)
      
      // Show verification message if email not verified
      if (!response.user.emailVerified) {
        toast.success('Registration successful! Please check your email to verify your account.')
      }
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Registration failed'
      throw new Error(message)
    }
  }

  const logout = async () => {
    try {
      await authService.logout()
    } catch (error) {
      // Even if logout fails on server, we still want to clear local state
      console.error('Logout error:', error)
    } finally {
      // Clear local state
      setUser(null)
      localStorage.removeItem('auth_token')
      localStorage.removeItem('refresh_token')
    }
  }

  const refreshUser = async () => {
    try {
      const userData = await authService.getProfile()
      setUser(userData)
    } catch (error) {
      console.error('Failed to refresh user data:', error)
    }
  }

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}