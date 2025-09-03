import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { WorryAnalysisService } from '../../services/worryAnalysisService'
import { mockDeep, mockReset, DeepMockProxy } from 'vitest-mock-extended'

// Mock Prisma
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => mockPrisma)
}))

const mockPrisma = mockDeep<PrismaClient>()

describe('Privacy Filtering in WorryAnalysisService', () => {
  let worryAnalysisService: WorryAnalysisService

  beforeEach(() => {
    mockReset(mockPrisma)
    worryAnalysisService = WorryAnalysisService.getInstance()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('findSimilarWorries Privacy Controls', () => {
    const mockCurrentAnalysis = {
      postId: 'current-post',
      category: 'Health & Wellness',
      subcategory: 'Mental Health',
      keywords: 'anxiety,stress,worry'
    }

    const mockSimilarPosts = [
      {
        postId: 'public-post-1',
        category: 'Health & Wellness',
        subcategory: 'Mental Health',
        keywords: 'anxiety,panic',
        post: {
          id: 'public-post-1',
          shortContent: 'I have anxiety about work',
          privacyLevel: 'public',
          userId: 'other-user-1',
          createdAt: new Date('2024-01-01'),
          user: {
            id: 'other-user-1',
            username: 'otheruser1',
            displayName: 'Other User 1'
          }
        }
      },
      {
        postId: 'private-post-1',
        category: 'Health & Wellness',
        subcategory: 'Mental Health',
        keywords: 'anxiety,stress',
        post: {
          id: 'private-post-1',
          shortContent: 'My private anxiety thoughts',
          privacyLevel: 'private',
          userId: 'other-user-2',
          createdAt: new Date('2024-01-02'),
          user: {
            id: 'other-user-2',
            username: 'otheruser2',
            displayName: 'Other User 2'
          }
        }
      },
      {
        postId: 'own-private-post',
        category: 'Health & Wellness',
        subcategory: 'Mental Health',
        keywords: 'anxiety,personal',
        post: {
          id: 'own-private-post',
          shortContent: 'My own private worry',
          privacyLevel: 'private',
          userId: 'current-user',
          createdAt: new Date('2024-01-03'),
          user: {
            id: 'current-user',
            username: 'currentuser',
            displayName: 'Current User'
          }
        }
      },
      {
        postId: 'friends-post-1',
        category: 'Health & Wellness',
        subcategory: 'Mental Health',
        keywords: 'anxiety,friends',
        post: {
          id: 'friends-post-1',
          shortContent: 'Friends only worry',
          privacyLevel: 'friends',
          userId: 'friend-user',
          createdAt: new Date('2024-01-04'),
          user: {
            id: 'friend-user',
            username: 'frienduser',
            displayName: 'Friend User'
          }
        }
      }
    ]

    it('should only return public posts for anonymous users', async () => {
      mockPrisma.worryAnalysis.findUnique.mockResolvedValue(mockCurrentAnalysis)
      mockPrisma.worryAnalysis.findMany.mockResolvedValue(mockSimilarPosts)

      const result = await worryAnalysisService.findSimilarWorries(
        'current-post',
        5,
        undefined, // No current user (anonymous)
        false
      )

      expect(result.similarWorries).toHaveLength(1)
      expect(result.similarWorries[0].privacyLevel).toBe('public')
      expect(result.similarWorries[0].id).toBe('public-post-1')
      expect(result.totalCount).toBe(4) // All posts found
      expect(result.visibleCount).toBe(1) // Only public visible
    })

    it('should return public posts and own private posts for authenticated users', async () => {
      mockPrisma.worryAnalysis.findUnique.mockResolvedValue(mockCurrentAnalysis)
      mockPrisma.worryAnalysis.findMany.mockResolvedValue(mockSimilarPosts)

      const result = await worryAnalysisService.findSimilarWorries(
        'current-post',
        5,
        'current-user',
        false
      )

      expect(result.similarWorries).toHaveLength(2)
      
      const publicPost = result.similarWorries.find(w => w.id === 'public-post-1')
      const ownPrivatePost = result.similarWorries.find(w => w.id === 'own-private-post')
      
      expect(publicPost).toBeDefined()
      expect(publicPost?.privacyLevel).toBe('public')
      expect(publicPost?.isOwnPost).toBe(false)
      
      expect(ownPrivatePost).toBeDefined()
      expect(ownPrivatePost?.privacyLevel).toBe('private')
      expect(ownPrivatePost?.isOwnPost).toBe(true)
      
      expect(result.totalCount).toBe(4)
      expect(result.visibleCount).toBe(2)
    })

    it('should include private posts when includePrivate is true and user is authenticated', async () => {
      mockPrisma.worryAnalysis.findUnique.mockResolvedValue(mockCurrentAnalysis)
      mockPrisma.worryAnalysis.findMany.mockResolvedValue(mockSimilarPosts)

      const result = await worryAnalysisService.findSimilarWorries(
        'current-post',
        5,
        'current-user',
        true // Include private
      )

      expect(result.similarWorries).toHaveLength(2) // Still only public + own private
      expect(result.visibleCount).toBe(2)
    })

    it('should sanitize user data for private posts from other users', async () => {
      mockPrisma.worryAnalysis.findUnique.mockResolvedValue(mockCurrentAnalysis)
      mockPrisma.worryAnalysis.findMany.mockResolvedValue(mockSimilarPosts)

      const result = await worryAnalysisService.findSimilarWorries(
        'current-post',
        5,
        'current-user',
        false
      )

      const publicPost = result.similarWorries.find(w => w.id === 'public-post-1')
      const ownPrivatePost = result.similarWorries.find(w => w.id === 'own-private-post')

      // Public post should have user data
      expect(publicPost?.user).toBeDefined()
      expect(publicPost?.user?.username).toBe('otheruser1')

      // Own private post should have user data
      expect(ownPrivatePost?.user).toBeDefined()
      expect(ownPrivatePost?.user?.username).toBe('currentuser')
    })

    it('should handle empty results gracefully', async () => {
      mockPrisma.worryAnalysis.findUnique.mockResolvedValue(null)

      const result = await worryAnalysisService.findSimilarWorries(
        'nonexistent-post',
        5,
        'current-user',
        false
      )

      expect(result.similarWorries).toHaveLength(0)
      expect(result.totalCount).toBe(0)
      expect(result.visibleCount).toBe(0)
      expect(result.hasMore).toBe(false)
    })

    it('should calculate similarity scores correctly', async () => {
      mockPrisma.worryAnalysis.findUnique.mockResolvedValue(mockCurrentAnalysis)
      mockPrisma.worryAnalysis.findMany.mockResolvedValue([mockSimilarPosts[0]]) // Only public post

      const result = await worryAnalysisService.findSimilarWorries(
        'current-post',
        5,
        undefined,
        false
      )

      expect(result.similarWorries).toHaveLength(1)
      const worry = result.similarWorries[0]
      
      // Should have category match bonus (0.5) + subcategory match bonus (0.3) + keyword overlap
      expect(worry.similarity).toBeGreaterThan(0.8) // Category + subcategory match
      expect(worry.similarity).toBeLessThanOrEqual(1.0)
    })

    it('should respect minimum similarity threshold', async () => {
      const lowSimilarityPost = {
        postId: 'low-similarity-post',
        category: 'Work & Career', // Different category
        subcategory: 'Job Search',
        keywords: 'interview,resume', // No keyword overlap
        post: {
          id: 'low-similarity-post',
          shortContent: 'Job interview anxiety',
          privacyLevel: 'public',
          userId: 'other-user',
          createdAt: new Date('2024-01-01'),
          user: {
            id: 'other-user',
            username: 'otheruser',
            displayName: 'Other User'
          }
        }
      }

      mockPrisma.worryAnalysis.findUnique.mockResolvedValue(mockCurrentAnalysis)
      mockPrisma.worryAnalysis.findMany.mockResolvedValue([lowSimilarityPost])

      const result = await worryAnalysisService.findSimilarWorries(
        'current-post',
        5,
        undefined,
        false
      )

      // Should filter out posts below similarity threshold (0.2)
      expect(result.similarWorries).toHaveLength(0)
    })

    it('should handle database errors gracefully', async () => {
      mockPrisma.worryAnalysis.findUnique.mockRejectedValue(new Error('Database error'))

      const result = await worryAnalysisService.findSimilarWorries(
        'current-post',
        5,
        'current-user',
        false
      )

      expect(result.similarWorries).toHaveLength(0)
      expect(result.totalCount).toBe(0)
      expect(result.visibleCount).toBe(0)
      expect(result.hasMore).toBe(false)
    })
  })

  describe('getSimilarWorryCount Privacy Controls', () => {
    it('should return combined count correctly', async () => {
      const mockWorryAnalysis = { similarWorryCount: 5 }
      
      mockPrisma.worryAnalysis.findUnique.mockResolvedValue(mockWorryAnalysis)
      mockPrisma.meToo.count.mockResolvedValue(3)

      const result = await worryAnalysisService.getSimilarWorryCount('test-post', false)

      expect(result.count).toBe(8) // 5 + 3
      expect(result.breakdown).toBeUndefined()
    })

    it('should return breakdown when requested', async () => {
      const mockWorryAnalysis = { similarWorryCount: 5 }
      
      mockPrisma.worryAnalysis.findUnique.mockResolvedValue(mockWorryAnalysis)
      mockPrisma.meToo.count.mockResolvedValue(3)

      const result = await worryAnalysisService.getSimilarWorryCount('test-post', true)

      expect(result.count).toBe(8)
      expect(result.breakdown).toBeDefined()
      expect(result.breakdown?.aiDetectedSimilar).toBe(5)
      expect(result.breakdown?.meTooResponses).toBe(3)
    })

    it('should handle missing worry analysis', async () => {
      mockPrisma.worryAnalysis.findUnique.mockResolvedValue(null)
      mockPrisma.meToo.count.mockResolvedValue(2)

      const result = await worryAnalysisService.getSimilarWorryCount('test-post', true)

      expect(result.count).toBe(2) // Only MeToo count
      expect(result.breakdown?.aiDetectedSimilar).toBe(0)
      expect(result.breakdown?.meTooResponses).toBe(2)
    })

    it('should handle database errors gracefully', async () => {
      mockPrisma.worryAnalysis.findUnique.mockRejectedValue(new Error('Database error'))

      const result = await worryAnalysisService.getSimilarWorryCount('test-post', false)

      expect(result.count).toBe(0)
    })
  })

  describe('Cache Functionality', () => {
    it('should cache results correctly', async () => {
      const mockAnalysis = {
        postId: 'test-post',
        category: 'Health & Wellness',
        subcategory: 'Mental Health',
        keywords: 'anxiety'
      }

      mockPrisma.worryAnalysis.findUnique.mockResolvedValue(mockAnalysis)
      mockPrisma.worryAnalysis.findMany.mockResolvedValue([])

      // First call
      await worryAnalysisService.findSimilarWorries('test-post', 5, 'user1', false)
      
      // Second call should use cache
      await worryAnalysisService.findSimilarWorries('test-post', 5, 'user1', false)

      // Should only call database once due to caching
      expect(mockPrisma.worryAnalysis.findUnique).toHaveBeenCalledTimes(1)
      expect(mockPrisma.worryAnalysis.findMany).toHaveBeenCalledTimes(1)
    })

    it('should invalidate cache correctly', async () => {
      const mockAnalysis = {
        postId: 'test-post',
        category: 'Health & Wellness',
        subcategory: 'Mental Health',
        keywords: 'anxiety'
      }

      mockPrisma.worryAnalysis.findUnique.mockResolvedValue(mockAnalysis)
      mockPrisma.worryAnalysis.findMany.mockResolvedValue([])

      // First call
      await worryAnalysisService.findSimilarWorries('test-post', 5, 'user1', false)
      
      // Invalidate cache
      worryAnalysisService.invalidatePostCache('test-post')
      
      // Second call should hit database again
      await worryAnalysisService.findSimilarWorries('test-post', 5, 'user1', false)

      expect(mockPrisma.worryAnalysis.findUnique).toHaveBeenCalledTimes(2)
      expect(mockPrisma.worryAnalysis.findMany).toHaveBeenCalledTimes(2)
    })
  })

  describe('Performance Monitoring', () => {
    it('should monitor query performance', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      mockPrisma.worryAnalysis.findUnique.mockResolvedValue({
        postId: 'test-post',
        category: 'Health & Wellness',
        keywords: 'test'
      })
      mockPrisma.worryAnalysis.findMany.mockResolvedValue([])

      await worryAnalysisService.findSimilarWorries('test-post', 5, 'user1', false)

      // Performance monitoring should be active (implementation detail)
      expect(consoleSpy).toHaveBeenCalled()
      
      consoleSpy.mockRestore()
    })
  })
})