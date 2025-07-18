import { PostResponse, PostsResponse } from './postService'

export interface CacheEntry {
  data: PostsResponse
  timestamp: number
  key: string
}

export type FeedType = 'all' | 'personalized' | 'discovery'
export type FeedFilter = 'all' | 'public' | 'friends' | 'private'

class FeedCacheService {
  private cache = new Map<string, CacheEntry>()
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
  private readonly MAX_CACHE_SIZE = 50

  private generateCacheKey(
    feedType: FeedType,
    filter: FeedFilter,
    offset: number,
    limit: number
  ): string {
    return `${feedType}-${filter}-${offset}-${limit}`
  }

  get(
    feedType: FeedType,
    filter: FeedFilter,
    offset: number,
    limit: number
  ): PostsResponse | null {
    const key = this.generateCacheKey(feedType, filter, offset, limit)
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    // Check if cache entry is still valid
    if (Date.now() - entry.timestamp > this.CACHE_DURATION) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  set(
    feedType: FeedType,
    filter: FeedFilter,
    offset: number,
    limit: number,
    data: PostsResponse
  ): void {
    const key = this.generateCacheKey(feedType, filter, offset, limit)

    // Remove oldest entries if cache is full
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) {
        this.cache.delete(oldestKey)
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      key
    })
  }

  invalidate(feedType?: FeedType): void {
    if (feedType) {
      // Invalidate specific feed type
      const keysToDelete: string[] = []
      for (const [key] of this.cache) {
        if (key.startsWith(feedType)) {
          keysToDelete.push(key)
        }
      }
      keysToDelete.forEach(key => this.cache.delete(key))
    } else {
      // Invalidate all cache
      this.cache.clear()
    }
  }

  invalidatePost(_postId: string): void {
    // Remove any cached entries that might contain this post
    // For simplicity, we'll clear all cache when a post is updated/deleted
    this.cache.clear()
  }

  updatePost(updatedPost: PostResponse): void {
    // Update the post in all cached entries
    for (const [key, entry] of this.cache) {
      const updatedPosts = entry.data.posts.map(post =>
        post.id === updatedPost.id ? updatedPost : post
      )
      
      if (updatedPosts.some(post => post.id === updatedPost.id)) {
        this.cache.set(key, {
          ...entry,
          data: {
            ...entry.data,
            posts: updatedPosts
          }
        })
      }
    }
  }

  removePost(postId: string): void {
    // Remove the post from all cached entries
    for (const [key, entry] of this.cache) {
      const filteredPosts = entry.data.posts.filter(post => post.id !== postId)
      
      if (filteredPosts.length !== entry.data.posts.length) {
        this.cache.set(key, {
          ...entry,
          data: {
            ...entry.data,
            posts: filteredPosts,
            total: Math.max(0, entry.data.total - 1)
          }
        })
      }
    }
  }

  addPost(newPost: PostResponse, feedType: FeedType): void {
    // Add new post to relevant cached entries (only first page)
    for (const [key, entry] of this.cache) {
      if (key.startsWith(feedType) && key.includes('-0-')) { // First page (offset 0)
        this.cache.set(key, {
          ...entry,
          data: {
            ...entry.data,
            posts: [newPost, ...entry.data.posts],
            total: entry.data.total + 1
          }
        })
      }
    }
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }

  clearExpired(): void {
    const now = Date.now()
    const keysToDelete: string[] = []

    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > this.CACHE_DURATION) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key))
  }
}

export const feedCache = new FeedCacheService()

// Clean up expired cache entries every 5 minutes
setInterval(() => {
  feedCache.clearExpired()
}, 5 * 60 * 1000)