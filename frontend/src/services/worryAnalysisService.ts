import api from './api'

export interface WorryAnalysisResult {
  category: string
  subcategory?: string
  sentimentScore: number // -1 to 1, where -1 is most negative
  keywords: string[]
  similarWorryCount: number
  confidence: number // 0-1, confidence in the analysis
}

export interface SimilarWorry {
  id: string
  shortContent: string
  category: string
  subcategory?: string
  similarity: number // 0-1 similarity score
  anonymousCount: number
}

// Enhanced interface for privacy-aware similar worries
export interface EnhancedSimilarWorry {
  id: string
  shortContent: string
  category: string
  subcategory?: string
  similarity: number // 0-1 similarity score
  isOwnPost: boolean
  privacyLevel: 'public' | 'private'
  createdAt: string
  user?: {
    id: string
    username: string
    displayName?: string
  }
}

export interface SimilarWorriesResponse {
  similarWorries: EnhancedSimilarWorry[]
  totalCount: number
  visibleCount: number
  hasMore: boolean
}

export interface SimilarWorryCountResponse {
  count: number
  breakdown?: {
    aiDetectedSimilar: number
    meTooResponses: number
  }
}

export interface WorryCategory {
  category: string
  count: number
  percentage: number
}

// Privacy options for similar worries queries
export interface PrivacyOptions {
  includePrivate?: boolean
  includeOwnPosts?: boolean
  userContext?: {
    userId: string
    isAuthenticated: boolean
  }
}

// Error types for better error handling
export enum WorryAnalysisErrorType {
  NOT_FOUND = 'NOT_FOUND',
  PRIVACY_VIOLATION = 'PRIVACY_VIOLATION',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  RATE_LIMITED = 'RATE_LIMITED',
  UNKNOWN = 'UNKNOWN'
}

export class WorryAnalysisError extends Error {
  constructor(
    public type: WorryAnalysisErrorType,
    message: string,
    public originalError?: any
  ) {
    super(message)
    this.name = 'WorryAnalysisError'
  }
}

// Request options for API calls
export interface ApiRequestOptions {
  retries?: number
  timeout?: number
  fallbackToCache?: boolean
}

export const worryAnalysisService = {
  // Helper method to handle API errors consistently
  _handleApiError(error: any, context: string): WorryAnalysisError {
    if (error.response) {
      const status = error.response.status
      const message = error.response.data?.message || error.message

      switch (status) {
        case 404:
          return new WorryAnalysisError(WorryAnalysisErrorType.NOT_FOUND, `${context}: Resource not found`, error)
        case 401:
          return new WorryAnalysisError(WorryAnalysisErrorType.UNAUTHORIZED, `${context}: Unauthorized access`, error)
        case 403:
          return new WorryAnalysisError(WorryAnalysisErrorType.PRIVACY_VIOLATION, `${context}: Privacy violation`, error)
        case 429:
          return new WorryAnalysisError(WorryAnalysisErrorType.RATE_LIMITED, `${context}: Rate limited`, error)
        default:
          return new WorryAnalysisError(WorryAnalysisErrorType.NETWORK_ERROR, `${context}: ${message}`, error)
      }
    }

    if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
      return new WorryAnalysisError(WorryAnalysisErrorType.NETWORK_ERROR, `${context}: Network error`, error)
    }

    return new WorryAnalysisError(WorryAnalysisErrorType.UNKNOWN, `${context}: ${error.message}`, error)
  },

  // Helper method to retry API calls
  async _retryApiCall<T>(
    apiCall: () => Promise<T>,
    options: ApiRequestOptions = {},
    context: string
  ): Promise<T> {
    const { retries = 2, timeout = 10000 } = options
    let lastError: any

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), timeout)
        })

        const result = await Promise.race([apiCall(), timeoutPromise])
        return result as T
      } catch (error) {
        lastError = error
        
        // Don't retry on certain error types
        if (error.response?.status === 404 || error.response?.status === 403) {
          break
        }

        // Wait before retry (exponential backoff)
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
        }
      }
    }

    throw this._handleApiError(lastError, context)
  },

  // Analyze a worry post
  async analyzeWorry(postId: string, options: ApiRequestOptions = {}): Promise<WorryAnalysisResult> {
    return this._retryApiCall(
      () => api.post(`/analysis/posts/${postId}/analyze`).then(response => response.data.data),
      options,
      'Analyze worry'
    )
  },

  // Get analysis for a worry post
  async getWorryAnalysis(postId: string, options: ApiRequestOptions = {}): Promise<WorryAnalysisResult | null> {
    try {
      return await this._retryApiCall(
        () => api.get(`/analysis/posts/${postId}`).then(response => response.data.data),
        options,
        'Get worry analysis'
      )
    } catch (error) {
      if (error instanceof WorryAnalysisError && error.type === WorryAnalysisErrorType.NOT_FOUND) {
        return null
      }
      throw error
    }
  },

  // Find similar worries (legacy method - kept for backward compatibility)
  async findSimilarWorries(postId: string, limit = 5, options: ApiRequestOptions = {}): Promise<SimilarWorry[]> {
    return this._retryApiCall(
      () => api.get(`/analysis/posts/${postId}/similar?limit=${limit}`).then(response => response.data.data),
      options,
      'Find similar worries (legacy)'
    )
  },

  // Find similar worries with privacy controls (enhanced method)
  async findSimilarWorriesEnhanced(
    postId: string, 
    limit = 10, 
    privacyOptions: PrivacyOptions = {},
    apiOptions: ApiRequestOptions = {}
  ): Promise<SimilarWorriesResponse> {
    const { includePrivate = false, includeOwnPosts = true } = privacyOptions
    
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        includePrivate: includePrivate.toString(),
        includeOwnPosts: includeOwnPosts.toString()
      })

      return await this._retryApiCall(
        () => api.get(`/analysis/posts/${postId}/similar?${params}`).then(response => response.data.data),
        apiOptions,
        'Find similar worries (enhanced)'
      )
    } catch (error) {
      // Fallback to legacy method if enhanced API is not available
      if (error instanceof WorryAnalysisError && error.type === WorryAnalysisErrorType.NOT_FOUND) {
        console.warn('Enhanced similar worries API not available, falling back to legacy method')
        
        try {
          const legacyWorries = await this.findSimilarWorries(postId, limit, apiOptions)
          
          const enhancedWorries: EnhancedSimilarWorry[] = legacyWorries.map(worry => ({
            id: worry.id,
            shortContent: worry.shortContent,
            category: worry.category,
            subcategory: worry.subcategory,
            similarity: worry.similarity,
            isOwnPost: false, // Cannot determine from legacy API
            privacyLevel: 'public' as const, // Assume public for legacy data
            createdAt: new Date().toISOString(), // Use current time as fallback
            user: {
              id: 'unknown',
              username: 'anonymous',
              displayName: 'Anonymous User'
            }
          }))

          return {
            similarWorries: enhancedWorries,
            totalCount: enhancedWorries.length,
            visibleCount: enhancedWorries.length,
            hasMore: false
          }
        } catch (legacyError) {
          // If legacy also fails, return empty result
          console.error('Both enhanced and legacy similar worries APIs failed:', legacyError)
          return {
            similarWorries: [],
            totalCount: 0,
            visibleCount: 0,
            hasMore: false
          }
        }
      }
      
      throw error
    }
  },

  // Get similar worry count with breakdown
  async getSimilarWorryCount(
    postId: string, 
    includeBreakdown = false, 
    options: ApiRequestOptions = {}
  ): Promise<SimilarWorryCountResponse> {
    try {
      const params = new URLSearchParams({
        breakdown: includeBreakdown.toString()
      })

      return await this._retryApiCall(
        () => api.get(`/analysis/posts/${postId}/similar-count?${params}`).then(response => response.data.data),
        options,
        'Get similar worry count'
      )
    } catch (error) {
      console.warn('Enhanced similar worry count API not available, returning fallback')
      // Return basic count as fallback
      return { count: 0 }
    }
  },

  // Get MeToo count separately (new method for separate count endpoints)
  async getMeTooCount(postId: string, options: ApiRequestOptions = {}): Promise<{ count: number }> {
    try {
      return await this._retryApiCall(
        () => api.get(`/metoo/${postId}/count`).then(response => response.data.data),
        options,
        'Get MeToo count'
      )
    } catch (error) {
      console.warn('MeToo count API not available, returning fallback')
      return { count: 0 }
    }
  },

  // Get AI-detected similar worries count only (new method)
  async getAiSimilarWorryCount(postId: string, options: ApiRequestOptions = {}): Promise<{ count: number }> {
    try {
      const response = await this.getSimilarWorryCount(postId, true, options)
      return { count: response.breakdown?.aiDetectedSimilar || 0 }
    } catch (error) {
      console.warn('AI similar worry count not available, returning fallback')
      return { count: 0 }
    }
  },

  // Get worry categories and statistics
  async getWorryCategories(options: ApiRequestOptions = {}): Promise<WorryCategory[]> {
    return this._retryApiCall(
      () => api.get('/analysis/categories').then(response => response.data.data),
      options,
      'Get worry categories'
    )
  },

  // Update similar worry counts (admin function)
  async updateSimilarWorryCounts(options: ApiRequestOptions = {}): Promise<void> {
    return this._retryApiCall(
      () => api.post('/analysis/update-counts').then(() => undefined),
      options,
      'Update similar worry counts'
    )
  },

  // Validate post access for privacy (new method)
  async validatePostAccess(postId: string, options: ApiRequestOptions = {}): Promise<{
    canView: boolean
    canViewSimilar: boolean
    isOwner: boolean
    privacyLevel: 'public' | 'private'
  }> {
    try {
      return await this._retryApiCall(
        () => api.get(`/analysis/posts/${postId}/access`).then(response => response.data.data),
        options,
        'Validate post access'
      )
    } catch (error) {
      // Fallback to basic access (assume public and viewable)
      console.warn('Post access validation not available, assuming public access')
      return {
        canView: true,
        canViewSimilar: true,
        isOwner: false,
        privacyLevel: 'public'
      }
    }
  },

  // Clear cache for a specific post (new method for cache management)
  clearPostCache(postId: string): void {
    // This would integrate with a caching layer if implemented
    console.log(`Clearing cache for post ${postId}`)
  },

  // Batch get similar worry counts for multiple posts (new method for performance)
  async getBatchSimilarWorryCounts(
    postIds: string[], 
    includeBreakdown = false,
    options: ApiRequestOptions = {}
  ): Promise<Record<string, SimilarWorryCountResponse>> {
    try {
      const params = new URLSearchParams({
        postIds: postIds.join(','),
        breakdown: includeBreakdown.toString()
      })

      return await this._retryApiCall(
        () => api.get(`/analysis/posts/batch/similar-count?${params}`).then(response => response.data.data),
        options,
        'Get batch similar worry counts'
      )
    } catch (error) {
      console.warn('Batch similar worry count API not available, falling back to individual calls')
      
      // Fallback to individual calls
      const results: Record<string, SimilarWorryCountResponse> = {}
      
      for (const postId of postIds) {
        try {
          results[postId] = await this.getSimilarWorryCount(postId, includeBreakdown, options)
        } catch (individualError) {
          console.warn(`Failed to get count for post ${postId}:`, individualError)
          results[postId] = { count: 0 }
        }
      }
      
      return results
    }
  }
}