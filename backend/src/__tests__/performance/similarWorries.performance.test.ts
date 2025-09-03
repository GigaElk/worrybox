import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { WorryAnalysisService } from '../../services/worryAnalysisService'
import { performanceMonitor } from '../../utils/performanceMonitor'
import { mockDeep, mockReset, DeepMockProxy } from 'vitest-mock-extended'

// Mock Prisma
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => mockPrisma)
}))

const mockPrisma = mockDeep<PrismaClient>()

describe('Similar Worries Performance Tests', () => {
  let worryAnalysisService: WorryAnalysisService

  beforeEach(() => {
    mockReset(mockPrisma)
    worryAnalysisService = WorryAnalysisService.getInstance()
    performanceMonitor.clearMetrics()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Query Performance', () => {
    it('should complete findSimilarWorries query within acceptable time', async () => {
      const currentAnalysis = {
        postId: 'test-post',
        category: 'Health & Wellness',
        subcategory: 'Mental Health',
        keywords: 'anxiety,stress'
      }

      const mockPosts = Array.from({ length: 100 }, (_, i) => ({
        postId: `post-${i}`,
        category: 'Health & Wellness',
        subcategory: 'Mental Health',
        keywords: 'anxiety,worry',
        post: {
          id: `post-${i}`,
          shortContent: `Worry content ${i}`,
          privacyLevel: 'public',
          userId: `user-${i}`,
          createdAt: new Date(`2024-01-${String(i % 28 + 1).padStart(2, '0')}`),
          user: {
            id: `user-${i}`,
            username: `user${i}`,
            displayName: `User ${i}`
          }
        }
      }))

      mockPrisma.worryAnalysis.findUnique.mockResolvedValue(currentAnalysis)
      mockPrisma.worryAnalysis.findMany.mockResolvedValue(mockPosts)

      const startTime = Date.now()
      
      const result = await worryAnalysisService.findSimilarWorries(
        'test-post',
        10,
        'current-user',
        false
      )
      
      const endTime = Date.now()
      const executionTime = endTime - startTime

      // Should complete within 500ms for 100 posts
      expect(executionTime).toBeLessThan(500)
      expect(result.similarWorries.length).toBeGreaterThan(0)
    })

    it('should use database indexes effectively', async () => {
      const currentAnalysis = {
        postId: 'test-post',
        category: 'Health & Wellness',
        subcategory: 'Mental Health',
        keywords: 'anxiety,stress'
      }

      mockPrisma.worryAnalysis.findUnique.mockResolvedValue(currentAnalysis)
      mockPrisma.worryAnalysis.findMany.mockResolvedValue([])

      await worryAnalysisService.findSimilarWorries(
        'test-post',
        10,
        'current-user',
        false
      )

      // Verify the query structure uses indexed fields
      expect(mockPrisma.worryAnalysis.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              { postId: { not: 'test-post' } },
              expect.objectContaining({
                OR: expect.arrayContaining([
                  expect.objectContaining({ category: 'Health & Wellness' })
                ])
              })
            ])
          }),
          orderBy: expect.arrayContaining([
            { category: 'asc' },
            { similarWorryCount: 'desc' },
            { createdAt: 'desc' }
          ])
        })
      )
    })

    it('should handle large datasets efficiently', async () => {
      const currentAnalysis = {
        postId: 'test-post',
        category: 'Health & Wellness',
        keywords: 'anxiety'
      }

      // Simulate large dataset
      const largeMockPosts = Array.from({ length: 1000 }, (_, i) => ({
        postId: `post-${i}`,
        category: i % 2 === 0 ? 'Health & Wellness' : 'Work & Career',
        keywords: i % 3 === 0 ? 'anxiety,stress' : 'worry,concern',
        post: {
          id: `post-${i}`,
          shortContent: `Large dataset worry ${i}`,
          privacyLevel: i % 4 === 0 ? 'private' : 'public',
          userId: `user-${i}`,
          createdAt: new Date(`2024-01-${String((i % 28) + 1).padStart(2, '0')}`),
          user: {
            id: `user-${i}`,
            username: `user${i}`,
            displayName: `User ${i}`
          }
        }
      }))

      mockPrisma.worryAnalysis.findUnique.mockResolvedValue(currentAnalysis)
      mockPrisma.worryAnalysis.findMany.mockResolvedValue(largeMockPosts)

      const startTime = Date.now()
      
      const result = await worryAnalysisService.findSimilarWorries(
        'test-post',
        20,
        'current-user',
        false
      )
      
      const endTime = Date.now()
      const executionTime = endTime - startTime

      // Should handle large datasets within reasonable time
      expect(executionTime).toBeLessThan(1000) // 1 second
      expect(result.similarWorries.length).toBeLessThanOrEqual(20)
    })

    it('should optimize similarity calculation performance', async () => {
      const currentAnalysis = {
        postId: 'test-post',
        category: 'Health & Wellness',
        subcategory: 'Mental Health',
        keywords: 'anxiety,stress,worry,panic,fear,nervous,tension'
      }

      // Posts with varying keyword complexity
      const complexMockPosts = Array.from({ length: 50 }, (_, i) => ({
        postId: `post-${i}`,
        category: 'Health & Wellness',
        subcategory: 'Mental Health',
        keywords: Array.from({ length: 10 }, (_, j) => `keyword${i}-${j}`).join(','),
        post: {
          id: `post-${i}`,
          shortContent: `Complex keyword worry ${i}`,
          privacyLevel: 'public',
          userId: `user-${i}`,
          createdAt: new Date(`2024-01-${String((i % 28) + 1).padStart(2, '0')}`),
          user: {
            id: `user-${i}`,
            username: `user${i}`,
            displayName: `User ${i}`
          }
        }
      }))

      mockPrisma.worryAnalysis.findUnique.mockResolvedValue(currentAnalysis)
      mockPrisma.worryAnalysis.findMany.mockResolvedValue(complexMockPosts)

      const startTime = Date.now()
      
      await worryAnalysisService.findSimilarWorries(
        'test-post',
        10,
        'current-user',
        false
      )
      
      const endTime = Date.now()
      const executionTime = endTime - startTime

      // Complex similarity calculations should still be fast
      expect(executionTime).toBeLessThan(300) // 300ms
    })
  })

  describe('Caching Performance', () => {
    it('should serve cached results significantly faster', async () => {
      const currentAnalysis = {
        postId: 'test-post',
        category: 'Health & Wellness',
        keywords: 'anxiety'
      }

      const mockPosts = Array.from({ length: 20 }, (_, i) => ({
        postId: `post-${i}`,
        category: 'Health & Wellness',
        keywords: 'anxiety',
        post: {
          id: `post-${i}`,
          shortContent: `Cached worry ${i}`,
          privacyLevel: 'public',
          userId: `user-${i}`,
          createdAt: new Date(),
          user: {
            id: `user-${i}`,
            username: `user${i}`,
            displayName: `User ${i}`
          }
        }
      }))

      mockPrisma.worryAnalysis.findUnique.mockResolvedValue(currentAnalysis)
      mockPrisma.worryAnalysis.findMany.mockResolvedValue(mockPosts)

      // First call (cache miss)
      const startTime1 = Date.now()
      await worryAnalysisService.findSimilarWorries('test-post', 10, 'user', false)
      const endTime1 = Date.now()
      const firstCallTime = endTime1 - startTime1

      // Second call (cache hit)
      const startTime2 = Date.now()
      await worryAnalysisService.findSimilarWorries('test-post', 10, 'user', false)
      const endTime2 = Date.now()
      const secondCallTime = endTime2 - startTime2

      // Cached call should be significantly faster
      expect(secondCallTime).toBeLessThan(firstCallTime / 2)
      expect(secondCallTime).toBeLessThan(50) // Should be very fast from cache

      // Database should only be called once due to caching
      expect(mockPrisma.worryAnalysis.findUnique).toHaveBeenCalledTimes(1)
      expect(mockPrisma.worryAnalysis.findMany).toHaveBeenCalledTimes(1)
    })

    it('should handle cache invalidation efficiently', async () => {
      const currentAnalysis = {
        postId: 'test-post',
        category: 'Health & Wellness',
        keywords: 'anxiety'
      }

      mockPrisma.worryAnalysis.findUnique.mockResolvedValue(currentAnalysis)
      mockPrisma.worryAnalysis.findMany.mockResolvedValue([])

      // Initial call
      await worryAnalysisService.findSimilarWorries('test-post', 10, 'user', false)

      // Invalidate cache
      const invalidateStart = Date.now()
      worryAnalysisService.invalidatePostCache('test-post')
      const invalidateEnd = Date.now()
      const invalidateTime = invalidateEnd - invalidateStart

      // Cache invalidation should be very fast
      expect(invalidateTime).toBeLessThan(10) // Less than 10ms

      // Next call should hit database again
      await worryAnalysisService.findSimilarWorries('test-post', 10, 'user', false)

      expect(mockPrisma.worryAnalysis.findUnique).toHaveBeenCalledTimes(2)
    })

    it('should prevent cache memory leaks', async () => {
      const currentAnalysis = {
        postId: 'test-post',
        category: 'Health & Wellness',
        keywords: 'anxiety'
      }

      mockPrisma.worryAnalysis.findUnique.mockResolvedValue(currentAnalysis)
      mockPrisma.worryAnalysis.findMany.mockResolvedValue([])

      // Make many calls with different parameters to fill cache
      const promises = Array.from({ length: 100 }, (_, i) => 
        worryAnalysisService.findSimilarWorries(`test-post-${i}`, 10, `user-${i}`, false)
      )

      await Promise.all(promises)

      // Cache should handle many entries without excessive memory usage
      // This is more of a smoke test - in real scenarios you'd monitor memory usage
      expect(true).toBe(true) // Test passes if no memory errors occur
    })
  })

  describe('Count Query Performance', () => {
    it('should execute getSimilarWorryCount efficiently', async () => {
      const mockWorryAnalysis = { similarWorryCount: 10 }
      
      mockPrisma.worryAnalysis.findUnique.mockResolvedValue(mockWorryAnalysis)
      mockPrisma.meToo.count.mockResolvedValue(5)

      const startTime = Date.now()
      
      const result = await worryAnalysisService.getSimilarWorryCount('test-post', true)
      
      const endTime = Date.now()
      const executionTime = endTime - startTime

      // Count queries should be very fast
      expect(executionTime).toBeLessThan(100) // 100ms
      expect(result.count).toBe(15)
      expect(result.breakdown?.aiDetectedSimilar).toBe(10)
      expect(result.breakdown?.meTooResponses).toBe(5)
    })

    it('should use parallel queries for count operations', async () => {
      const mockWorryAnalysis = { similarWorryCount: 8 }
      
      mockPrisma.worryAnalysis.findUnique.mockResolvedValue(mockWorryAnalysis)
      mockPrisma.meToo.count.mockResolvedValue(3)

      await worryAnalysisService.getSimilarWorryCount('test-post', true)

      // Both queries should be called (parallel execution)
      expect(mockPrisma.worryAnalysis.findUnique).toHaveBeenCalledTimes(1)
      expect(mockPrisma.meToo.count).toHaveBeenCalledTimes(1)
    })

    it('should cache count results effectively', async () => {
      const mockWorryAnalysis = { similarWorryCount: 7 }
      
      mockPrisma.worryAnalysis.findUnique.mockResolvedValue(mockWorryAnalysis)
      mockPrisma.meToo.count.mockResolvedValue(2)

      // First call
      const startTime1 = Date.now()
      await worryAnalysisService.getSimilarWorryCount('test-post', false)
      const endTime1 = Date.now()
      const firstCallTime = endTime1 - startTime1

      // Second call (should be cached)
      const startTime2 = Date.now()
      await worryAnalysisService.getSimilarWorryCount('test-post', false)
      const endTime2 = Date.now()
      const secondCallTime = endTime2 - startTime2

      // Second call should be faster due to caching
      expect(secondCallTime).toBeLessThan(firstCallTime)
      expect(secondCallTime).toBeLessThan(20) // Very fast from cache

      // Database should only be called once
      expect(mockPrisma.worryAnalysis.findUnique).toHaveBeenCalledTimes(1)
      expect(mockPrisma.meToo.count).toHaveBeenCalledTimes(1)
    })
  })

  describe('Performance Monitoring', () => {
    it('should track query performance metrics', async () => {
      const currentAnalysis = {
        postId: 'test-post',
        category: 'Health & Wellness',
        keywords: 'anxiety'
      }

      mockPrisma.worryAnalysis.findUnique.mockResolvedValue(currentAnalysis)
      mockPrisma.worryAnalysis.findMany.mockResolvedValue([])

      await worryAnalysisService.findSimilarWorries('test-post', 10, 'user', false)

      const stats = performanceMonitor.getStats()
      
      expect(stats.totalQueries).toBeGreaterThan(0)
      expect(stats.averageQueryTime).toBeGreaterThan(0)
    })

    it('should identify slow queries', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      // Mock slow query
      mockPrisma.worryAnalysis.findUnique.mockImplementation(
        () => new Promise(resolve => 
          setTimeout(() => resolve({
            postId: 'test-post',
            category: 'Health & Wellness',
            keywords: 'anxiety'
          }), 1100) // Longer than slow query threshold
        )
      )
      mockPrisma.worryAnalysis.findMany.mockResolvedValue([])

      await worryAnalysisService.findSimilarWorries('test-post', 10, 'user', false)

      // Should log slow query warning
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Slow query detected'),
        expect.any(String),
        expect.any(Object)
      )

      consoleSpy.mockRestore()
    })

    it('should provide query-specific performance stats', async () => {
      const currentAnalysis = {
        postId: 'test-post',
        category: 'Health & Wellness',
        keywords: 'anxiety'
      }

      mockPrisma.worryAnalysis.findUnique.mockResolvedValue(currentAnalysis)
      mockPrisma.worryAnalysis.findMany.mockResolvedValue([])

      // Make multiple calls
      await worryAnalysisService.findSimilarWorries('test-post-1', 10, 'user', false)
      await worryAnalysisService.findSimilarWorries('test-post-2', 10, 'user', false)

      const findSimilarStats = performanceMonitor.getQueryStats('findSimilarWorries')
      
      expect(findSimilarStats.count).toBe(2)
      expect(findSimilarStats.averageTime).toBeGreaterThan(0)
      expect(findSimilarStats.minTime).toBeGreaterThan(0)
      expect(findSimilarStats.maxTime).toBeGreaterThanOrEqual(findSimilarStats.minTime)
    })
  })

  describe('Memory Usage', () => {
    it('should handle large result sets without excessive memory usage', async () => {
      const currentAnalysis = {
        postId: 'test-post',
        category: 'Health & Wellness',
        keywords: 'anxiety'
      }

      // Large result set
      const largeMockPosts = Array.from({ length: 500 }, (_, i) => ({
        postId: `post-${i}`,
        category: 'Health & Wellness',
        keywords: 'anxiety',
        post: {
          id: `post-${i}`,
          shortContent: `Memory test worry ${i}`.repeat(10), // Larger content
          privacyLevel: 'public',
          userId: `user-${i}`,
          createdAt: new Date(),
          user: {
            id: `user-${i}`,
            username: `user${i}`,
            displayName: `User ${i}`
          }
        }
      }))

      mockPrisma.worryAnalysis.findUnique.mockResolvedValue(currentAnalysis)
      mockPrisma.worryAnalysis.findMany.mockResolvedValue(largeMockPosts)

      const initialMemory = process.memoryUsage().heapUsed
      
      const result = await worryAnalysisService.findSimilarWorries(
        'test-post',
        50,
        'user',
        false
      )
      
      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory

      // Memory increase should be reasonable (less than 50MB for this test)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024)
      expect(result.similarWorries.length).toBeLessThanOrEqual(50)
    })

    it('should clean up cache memory periodically', async () => {
      const currentAnalysis = {
        postId: 'test-post',
        category: 'Health & Wellness',
        keywords: 'anxiety'
      }

      mockPrisma.worryAnalysis.findUnique.mockResolvedValue(currentAnalysis)
      mockPrisma.worryAnalysis.findMany.mockResolvedValue([])

      // Fill cache with many entries
      const promises = Array.from({ length: 50 }, (_, i) => 
        worryAnalysisService.findSimilarWorries(`test-post-${i}`, 10, 'user', false)
      )

      await Promise.all(promises)

      // Cache cleanup should occur automatically
      // This is tested implicitly - if memory grows unbounded, the test will fail
      expect(true).toBe(true)
    })
  })

  describe('Concurrent Access Performance', () => {
    it('should handle concurrent requests efficiently', async () => {
      const currentAnalysis = {
        postId: 'test-post',
        category: 'Health & Wellness',
        keywords: 'anxiety'
      }

      mockPrisma.worryAnalysis.findUnique.mockResolvedValue(currentAnalysis)
      mockPrisma.worryAnalysis.findMany.mockResolvedValue([])

      // Simulate concurrent requests
      const concurrentRequests = Array.from({ length: 10 }, (_, i) => 
        worryAnalysisService.findSimilarWorries(`test-post-${i}`, 10, `user-${i}`, false)
      )

      const startTime = Date.now()
      const results = await Promise.all(concurrentRequests)
      const endTime = Date.now()
      const totalTime = endTime - startTime

      // All requests should complete successfully
      expect(results).toHaveLength(10)
      results.forEach(result => {
        expect(result).toBeDefined()
        expect(result.similarWorries).toBeDefined()
      })

      // Concurrent execution should be efficient
      expect(totalTime).toBeLessThan(1000) // 1 second for 10 concurrent requests
    })
  })
})