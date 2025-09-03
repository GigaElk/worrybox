import { SimilarWorriesResponse, SimilarWorryCountResponse } from './worryAnalysisService'

interface CacheEntry<T> {
  data: T
  timestamp: number
  expiresAt: number
  userId?: string // For privacy-aware caching
  privacyLevel?: 'public' | 'private'
}

interface CacheOptions {
  ttl?: number // Time to live in milliseconds
  maxSize?: number // Maximum number of entries
  respectPrivacy?: boolean // Whether to consider user context for cache validity
}

class CacheService {
  private cache = new Map<string, CacheEntry<any>>()
  private readonly defaultTTL = 5 * 60 * 1000 // 5 minutes
  private readonly maxSize = 1000
  private readonly cleanupInterval = 60 * 1000 // 1 minute

  constructor() {
    // Periodic cleanup of expired entries
    setInterval(() => this.cleanup(), this.cleanupInterval)
  }

  private generateKey(
    baseKey: string, 
    userId?: string, 
    additionalParams?: Record<string, any>
  ): string {
    const params = additionalParams ? JSON.stringify(additionalParams) : ''
    return `${baseKey}:${userId || 'anonymous'}:${params}`
  }

  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() > entry.expiresAt
  }

  private isValidForUser(entry: CacheEntry<any>, userId?: string): boolean {
    // Public data is valid for any user
    if (entry.privacyLevel === 'public') {
      return true
    }
    
    // Private data is only valid for the same user
    if (entry.privacyLevel === 'private') {
      return entry.userId === userId
    }
    
    // Mixed data requires exact user match
    return entry.userId === userId
  }

  set<T>(
    key: string, 
    data: T, 
    options: CacheOptions & { userId?: string; privacyLevel?: 'public' | 'private' } = {}
  ): void {
    const {
      ttl = this.defaultTTL,
      userId,
      privacyLevel = 'public'
    } = options

    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      this.cache.delete(oldestKey)
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
      userId,
      privacyLevel
    }

    this.cache.set(key, entry)
  }

  get<T>(key: string, userId?: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key)
      return null
    }

    if (!this.isValidForUser(entry, userId)) {
      return null
    }

    return entry.data as T
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  // Clear cache entries for a specific user (useful when user logs out)
  clearUserCache(userId: string): void {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.userId === userId) {
        this.cache.delete(key)
      }
    }
  }

  // Clear cache entries that might contain private data for a specific post
  clearPostCache(postId: string): void {
    const keysToDelete: string[] = []
    
    for (const key of this.cache.keys()) {
      if (key.includes(postId)) {
        keysToDelete.push(key)
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key))
  }

  private cleanup(): void {
    const now = Date.now()
    const keysToDelete: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key))
  }

  // Get cache statistics
  getStats() {
    const now = Date.now()
    let expiredCount = 0
    let publicCount = 0
    let privateCount = 0

    for (const entry of this.cache.values()) {
      if (now > entry.expiresAt) {
        expiredCount++
      }
      
      if (entry.privacyLevel === 'public') {
        publicCount++
      } else {
        privateCount++
      }
    }

    return {
      totalEntries: this.cache.size,
      expiredEntries: expiredCount,
      publicEntries: publicCount,
      privateEntries: privateCount,
      hitRate: this.getHitRate()
    }
  }

  private hitCount = 0
  private missCount = 0

  private getHitRate(): number {
    const total = this.hitCount + this.missCount
    return total > 0 ? this.hitCount / total : 0
  }

  // Track cache hits and misses for analytics
  private recordHit(): void {
    this.hitCount++
  }

  private recordMiss(): void {
    this.missCount++
  }
}

// Specialized cache methods for similar worries
class SimilarWorriesCache extends CacheService {
  private readonly SIMILAR_WORRIES_TTL = 10 * 60 * 1000 // 10 minutes
  private readonly COUNT_TTL = 5 * 60 * 1000 // 5 minutes

  setSimilarWorries(
    postId: string,
    data: SimilarWorriesResponse,
    userId?: string,
    includePrivate = false
  ): void {
    const key = this.generateSimilarWorriesKey(postId, includePrivate)
    const privacyLevel = includePrivate && userId ? 'private' : 'public'
    
    this.set(key, data, {
      ttl: this.SIMILAR_WORRIES_TTL,
      userId,
      privacyLevel
    })
  }

  getSimilarWorries(
    postId: string,
    userId?: string,
    includePrivate = false
  ): SimilarWorriesResponse | null {
    const key = this.generateSimilarWorriesKey(postId, includePrivate)
    return this.get<SimilarWorriesResponse>(key, userId)
  }

  setSimilarWorryCount(
    postId: string,
    data: SimilarWorryCountResponse,
    includeBreakdown = false
  ): void {
    const key = this.generateCountKey(postId, includeBreakdown)
    
    this.set(key, data, {
      ttl: this.COUNT_TTL,
      privacyLevel: 'public' // Counts are generally public
    })
  }

  getSimilarWorryCount(
    postId: string,
    includeBreakdown = false
  ): SimilarWorryCountResponse | null {
    const key = this.generateCountKey(postId, includeBreakdown)
    return this.get<SimilarWorryCountResponse>(key)
  }

  setMeTooCount(postId: string, count: number): void {
    const key = `metoo_count:${postId}`
    
    this.set(key, { count }, {
      ttl: this.COUNT_TTL,
      privacyLevel: 'public'
    })
  }

  getMeTooCount(postId: string): { count: number } | null {
    const key = `metoo_count:${postId}`
    return this.get<{ count: number }>(key)
  }

  // Invalidate cache when MeToo actions occur
  invalidateCountsForPost(postId: string): void {
    this.delete(this.generateCountKey(postId, false))
    this.delete(this.generateCountKey(postId, true))
    this.delete(`metoo_count:${postId}`)
  }

  // Invalidate similar worries when new posts are created in the same category
  invalidateSimilarWorriesForCategory(category: string): void {
    // This is a simplified approach - in a real implementation,
    // you might want to track category-to-post mappings
    for (const key of this.cache.keys()) {
      if (key.startsWith('similar_worries:')) {
        this.delete(key)
      }
    }
  }

  private generateSimilarWorriesKey(postId: string, includePrivate: boolean): string {
    return `similar_worries:${postId}:private_${includePrivate}`
  }

  private generateCountKey(postId: string, includeBreakdown: boolean): string {
    return `similar_count:${postId}:breakdown_${includeBreakdown}`
  }
}

// Global cache instances
export const cacheService = new CacheService()
export const similarWorriesCache = new SimilarWorriesCache()

// Cache invalidation helpers
export const invalidateUserCache = (userId: string) => {
  similarWorriesCache.clearUserCache(userId)
}

export const invalidatePostCache = (postId: string) => {
  similarWorriesCache.clearPostCache(postId)
  similarWorriesCache.invalidateCountsForPost(postId)
}

export const invalidateCategoryCache = (category: string) => {
  similarWorriesCache.invalidateSimilarWorriesForCategory(category)
}

// Cache warming - preload frequently accessed data
export const warmCache = async (
  postIds: string[],
  userId?: string
) => {
  // This would be implemented to preload cache with frequently accessed data
  console.log('Cache warming not yet implemented for posts:', postIds)
}