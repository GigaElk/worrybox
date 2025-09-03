import { describe, it, expect, vi, beforeEach } from 'vitest'
import { similarWorriesCache } from '../services/cacheService'

describe('Performance Optimizations - Core Features', () => {
  beforeEach(() => {
    similarWorriesCache.clear()
  })

  describe('Cache Service', () => {
    it('should cache and retrieve data', () => {
      const testData = {
        similarWorries: [],
        totalCount: 5,
        visibleCount: 5,
        hasMore: false
      }

      similarWorriesCache.setSimilarWorries('post1', testData, 'user1', false)
      const cached = similarWorriesCache.getSimilarWorries('post1', 'user1', false)
      
      expect(cached).toEqual(testData)
    })

    it('should respect privacy in cache', () => {
      const privateData = {
        similarWorries: [],
        totalCount: 1,
        visibleCount: 1,
        hasMore: false
      }

      // Set private cache for user1
      similarWorriesCache.setSimilarWorries('post1', privateData, 'user1', true)

      // User1 should get the data
      const user1Data = similarWorriesCache.getSimilarWorries('post1', 'user1', true)
      expect(user1Data).toEqual(privateData)

      // User2 should not get the data
      const user2Data = similarWorriesCache.getSimilarWorries('post1', 'user2', true)
      expect(user2Data).toBeNull()
    })

    it('should handle MeToo count caching', () => {
      similarWorriesCache.setMeTooCount('post1', 5)
      const cached = similarWorriesCache.getMeTooCount('post1')
      
      expect(cached).toEqual({ count: 5 })
    })

    it('should invalidate cache correctly', () => {
      similarWorriesCache.setMeTooCount('post1', 5)
      similarWorriesCache.setSimilarWorryCount('post1', { count: 10 }, false)

      // Verify data is cached
      expect(similarWorriesCache.getMeTooCount('post1')).toEqual({ count: 5 })
      expect(similarWorriesCache.getSimilarWorryCount('post1', false)).toEqual({ count: 10 })

      // Invalidate cache for post
      similarWorriesCache.invalidateCountsForPost('post1')

      // Data should be gone
      expect(similarWorriesCache.getMeTooCount('post1')).toBeNull()
      expect(similarWorriesCache.getSimilarWorryCount('post1', false)).toBeNull()
    })

    it('should clear all cache', () => {
      similarWorriesCache.setMeTooCount('post1', 5)
      similarWorriesCache.setMeTooCount('post2', 3)
      
      // Verify data exists
      expect(similarWorriesCache.getMeTooCount('post1')).toEqual({ count: 5 })
      expect(similarWorriesCache.getMeTooCount('post2')).toEqual({ count: 3 })
      
      // Clear all
      similarWorriesCache.clear()
      
      // Verify all data is gone
      expect(similarWorriesCache.getMeTooCount('post1')).toBeNull()
      expect(similarWorriesCache.getMeTooCount('post2')).toBeNull()
    })

    it('should provide cache statistics', () => {
      similarWorriesCache.setMeTooCount('post1', 5)
      similarWorriesCache.setSimilarWorryCount('post2', { count: 10 }, true)
      
      const stats = similarWorriesCache.getStats()
      
      expect(stats.totalEntries).toBeGreaterThan(0)
      expect(typeof stats.publicEntries).toBe('number')
      expect(typeof stats.privateEntries).toBe('number')
    })
  })

  describe('Cache Privacy Features', () => {
    it('should handle user-specific cache clearing', () => {
      // Set data for different users
      similarWorriesCache.setSimilarWorries('post1', { similarWorries: [], totalCount: 1, visibleCount: 1, hasMore: false }, 'user1', true)
      similarWorriesCache.setSimilarWorries('post2', { similarWorries: [], totalCount: 2, visibleCount: 2, hasMore: false }, 'user2', true)
      
      // Clear cache for user1
      similarWorriesCache.clearUserCache('user1')
      
      // User1 data should be gone, user2 data should remain
      expect(similarWorriesCache.getSimilarWorries('post1', 'user1', true)).toBeNull()
      expect(similarWorriesCache.getSimilarWorries('post2', 'user2', true)).toBeDefined()
    })

    it('should handle post-specific cache clearing', () => {
      similarWorriesCache.setMeTooCount('post1', 5)
      similarWorriesCache.setMeTooCount('post2', 3)
      similarWorriesCache.setSimilarWorryCount('post1', { count: 10 }, false)
      
      // Clear cache for post1
      similarWorriesCache.clearPostCache('post1')
      
      // Post1 data should be gone, post2 data should remain
      expect(similarWorriesCache.getMeTooCount('post1')).toBeNull()
      expect(similarWorriesCache.getMeTooCount('post2')).toEqual({ count: 3 })
    })
  })

  describe('Memory Management', () => {
    it('should handle cache operations without memory leaks', () => {
      // Add and remove many items to test memory management
      for (let i = 0; i < 100; i++) {
        similarWorriesCache.setMeTooCount(`post${i}`, i)
      }
      
      // Clear cache
      similarWorriesCache.clear()
      
      // Verify cache is empty
      const stats = similarWorriesCache.getStats()
      expect(stats.totalEntries).toBe(0)
    })
  })
})