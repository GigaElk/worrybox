import { worryAnalysisService, EnhancedSimilarWorry, SimilarWorriesResponse, SimilarWorryCountResponse } from './worryAnalysisService'

interface CacheEntry<T> {
  data: T
  timestamp: number
  userId?: string
  includePrivate: boolean
}

interface PrivacyError extends Error {
  code: 'PRIVACY_VIOLATION' | 'AUTHENTICATION_REQUIRED' | 'INSUFFICIENT_PERMISSIONS'
  details?: any
}

class PrivacyFilteringService {
  private cache = new Map<string, CacheEntry<any>>()
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
  private readonly MAX_CACHE_SIZE = 100

  /**
   * Get similar worries with privacy filtering
   */
  async getSimilarWorries(
    postId: string,
    userId?: string,
    limit = 10
  ): Promise<SimilarWorriesResponse> {
    const includePrivate = !!userId
    const cacheKey = `similar-worries-${postId}-${userId || 'anonymous'}-${limit}`

    try {
      // Check cache first
      const cached = this.getCachedData<SimilarWorriesResponse>(cacheKey, userId, includePrivate)
      if (cached) {
        return cached
      }

      // Make API call with user context
      const response = await worryAnalysisService.findSimilarWorriesEnhanced(
        postId,
        limit,
        includePrivate
      )

      // Validate privacy filtering on client side as additional safety
      const filteredResponse = this.validatePrivacyFiltering(response, userId)

      // Cache the result
      this.setCachedData(cacheKey, filteredResponse, userId, includePrivate)

      return filteredResponse
    } catch (error) {
      throw this.handlePrivacyError(error, 'Failed to load similar worries')
    }
  }

  /**
   * Get similar worry count with privacy awareness
   */
  async getSimilarWorryCount(
    postId: string,
    userId?: string,
    includeBreakdown = false
  ): Promise<SimilarWorryCountResponse> {
    const cacheKey = `similar-worry-count-${postId}-${userId || 'anonymous'}-${includeBreakdown}`

    try {
      // Check cache first
      const cached = this.getCachedData<SimilarWorryCountResponse>(cacheKey, userId, !!userId)
      if (cached) {
        return cached
      }

      // Make API call
      const response = await worryAnalysisService.getSimilarWorryCount(postId, includeBreakdown)

      // Cache the result
      this.setCachedData(cacheKey, response, userId, !!userId)

      return response
    } catch (error) {
      throw this.handlePrivacyError(error, 'Failed to load similar worry count')
    }
  }

  /**
   * Invalidate cache when privacy settings change
   */
  invalidatePrivacyCache(userId?: string, postId?: string): void {
    if (postId && userId) {
      // Invalidate specific post cache for user
      const keysToDelete = Array.from(this.cache.keys()).filter(key => 
        key.includes(postId) && key.includes(userId)
      )
      keysToDelete.forEach(key => this.cache.delete(key))
    } else if (userId) {
      // Invalidate all cache for user
      const keysToDelete = Array.from(this.cache.keys()).filter(key => 
        key.includes(userId)
      )
      keysToDelete.forEach(key => this.cache.delete(key))
    } else {
      // Clear all cache
      this.cache.clear()
    }
  }

  /**
   * Invalidate cache when user authentication changes
   */
  onAuthenticationChange(newUserId?: string): void {
    // Clear all cache when auth state changes
    this.cache.clear()
  }

  /**
   * Validate that privacy filtering was applied correctly
   */
  private validatePrivacyFiltering(
    response: SimilarWorriesResponse,
    currentUserId?: string
  ): SimilarWorriesResponse {
    // If the response is falsy, return a valid empty response object.
    if (!response) {
      return { similarWorries: [], totalCount: 0, visibleCount: 0, hasMore: false };
    }

    const filteredWorries = (response.similarWorries || []).filter(worry => {
      // Allow public posts
      if (worry.privacyLevel === 'public') {
        return true
      }

      // Allow private posts only if they belong to current user
      if (worry.privacyLevel === 'private' && worry.isOwnPost && currentUserId) {
        return true
      }

      // Block private posts from other users
      if (worry.privacyLevel === 'private' && !worry.isOwnPost) {
        console.warn('Privacy violation detected: private post from another user', {
          worryId: worry.id,
          currentUserId,
          isOwnPost: worry.isOwnPost
        })
        return false
      }

      return true
    })

    return {
      ...response,
      similarWorries: filteredWorries,
      visibleCount: filteredWorries.length
    }
  }

  /**
   * Get cached data if valid
   */
  private getCachedData<T>(
    key: string,
    userId?: string,
    includePrivate = false
  ): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    // Check if cache is expired
    if (Date.now() - entry.timestamp > this.CACHE_DURATION) {
      this.cache.delete(key)
      return null
    }

    // Check if user context matches
    if (entry.userId !== userId || entry.includePrivate !== includePrivate) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  /**
   * Set cached data with metadata
   */
  private setCachedData<T>(
    key: string,
    data: T,
    userId?: string,
    includePrivate = false
  ): void {
    // Implement LRU cache by removing oldest entries
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value
      this.cache.delete(oldestKey)
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      userId,
      includePrivate
    })
  }

  /**
   * Handle privacy-related errors
   */
  private handlePrivacyError(error: any, defaultMessage: string): PrivacyError {
    if (error.response?.status === 401) {
      const privacyError = new Error('Authentication required to view private content') as PrivacyError
      privacyError.code = 'AUTHENTICATION_REQUIRED'
      privacyError.details = error.response.data
      return privacyError
    }

    if (error.response?.status === 403) {
      const privacyError = new Error('Insufficient permissions to view this content') as PrivacyError
      privacyError.code = 'INSUFFICIENT_PERMISSIONS'
      privacyError.details = error.response.data
      return privacyError
    }

    if (error.response?.data?.error?.code === 'PRIVACY_VIOLATION') {
      const privacyError = new Error('Privacy violation detected') as PrivacyError
      privacyError.code = 'PRIVACY_VIOLATION'
      privacyError.details = error.response.data
      return privacyError
    }

    // Return original error if not privacy-related
    return error
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats(): {
    size: number
    maxSize: number
    entries: Array<{
      key: string
      age: number
      userId?: string
      includePrivate: boolean
    }>
  } {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: Date.now() - entry.timestamp,
      userId: entry.userId,
      includePrivate: entry.includePrivate
    }))

    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
      entries
    }
  }

  /**
   * Clear all cache (for testing or manual cleanup)
   */
  clearCache(): void {
    this.cache.clear()
  }
}

// Export singleton instance
export const privacyFilteringService = new PrivacyFilteringService()
export default privacyFilteringService