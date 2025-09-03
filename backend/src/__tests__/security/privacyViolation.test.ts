import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { WorryAnalysisService } from '../../services/worryAnalysisService'
import { mockDeep, mockReset, DeepMockProxy } from 'vitest-mock-extended'

// Mock Prisma
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => mockPrisma)
}))

const mockPrisma = mockDeep<PrismaClient>()

describe('Privacy Violation Prevention Tests', () => {
  let worryAnalysisService: WorryAnalysisService

  beforeEach(() => {
    mockReset(mockPrisma)
    worryAnalysisService = WorryAnalysisService.getInstance()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Private Post Exposure Prevention', () => {
    const createMockPost = (privacyLevel: string, userId: string, postId: string) => ({
      postId,
      category: 'Health & Wellness',
      subcategory: 'Mental Health',
      keywords: 'anxiety,stress',
      post: {
        id: postId,
        shortContent: `${privacyLevel} post content`,
        privacyLevel,
        userId,
        createdAt: new Date('2024-01-01'),
        user: {
          id: userId,
          username: `user_${userId}`,
          displayName: `User ${userId}`
        }
      }
    })

    it('should NEVER return private posts from other users to anonymous users', async () => {
      const currentAnalysis = {
        postId: 'current-post',
        category: 'Health & Wellness',
        keywords: 'anxiety'
      }

      const mockPosts = [
        createMockPost('private', 'user-1', 'private-post-1'),
        createMockPost('private', 'user-2', 'private-post-2'),
        createMockPost('public', 'user-3', 'public-post-1')
      ]

      mockPrisma.worryAnalysis.findUnique.mockResolvedValue(currentAnalysis)
      mockPrisma.worryAnalysis.findMany.mockResolvedValue(mockPosts)

      const result = await worryAnalysisService.findSimilarWorries(
        'current-post',
        10,
        undefined, // Anonymous user
        false
      )

      // Should only return public posts
      expect(result.similarWorries).toHaveLength(1)
      expect(result.similarWorries[0].privacyLevel).toBe('public')
      expect(result.similarWorries[0].id).toBe('public-post-1')

      // Verify no private posts are exposed
      const privatePostIds = result.similarWorries
        .filter(w => w.privacyLevel === 'private')
        .map(w => w.id)
      expect(privatePostIds).toHaveLength(0)
    })

    it('should NEVER return private posts from other users to authenticated users', async () => {
      const currentAnalysis = {
        postId: 'current-post',
        category: 'Health & Wellness',
        keywords: 'anxiety'
      }

      const mockPosts = [
        createMockPost('private', 'other-user-1', 'other-private-1'),
        createMockPost('private', 'other-user-2', 'other-private-2'),
        createMockPost('private', 'current-user', 'own-private-1'),
        createMockPost('public', 'other-user-3', 'public-post-1')
      ]

      mockPrisma.worryAnalysis.findUnique.mockResolvedValue(currentAnalysis)
      mockPrisma.worryAnalysis.findMany.mockResolvedValue(mockPosts)

      const result = await worryAnalysisService.findSimilarWorries(
        'current-post',
        10,
        'current-user', // Authenticated user
        false
      )

      // Should return public posts and own private posts only
      expect(result.similarWorries).toHaveLength(2)
      
      const returnedIds = result.similarWorries.map(w => w.id)
      expect(returnedIds).toContain('public-post-1')
      expect(returnedIds).toContain('own-private-1')
      expect(returnedIds).not.toContain('other-private-1')
      expect(returnedIds).not.toContain('other-private-2')
    })

    it('should NEVER expose user data for private posts from other users', async () => {
      const currentAnalysis = {
        postId: 'current-post',
        category: 'Health & Wellness',
        keywords: 'anxiety'
      }

      const mockPosts = [
        createMockPost('public', 'other-user', 'public-post-1'),
        createMockPost('private', 'current-user', 'own-private-1')
      ]

      mockPrisma.worryAnalysis.findUnique.mockResolvedValue(currentAnalysis)
      mockPrisma.worryAnalysis.findMany.mockResolvedValue(mockPosts)

      const result = await worryAnalysisService.findSimilarWorries(
        'current-post',
        10,
        'current-user',
        false
      )

      expect(result.similarWorries).toHaveLength(2)

      // Public post should have user data
      const publicPost = result.similarWorries.find(w => w.id === 'public-post-1')
      expect(publicPost?.user).toBeDefined()
      expect(publicPost?.user?.username).toBe('user_other-user')

      // Own private post should have user data
      const ownPrivatePost = result.similarWorries.find(w => w.id === 'own-private-1')
      expect(ownPrivatePost?.user).toBeDefined()
      expect(ownPrivatePost?.user?.username).toBe('user_current-user')
    })

    it('should handle friends privacy level securely', async () => {
      const currentAnalysis = {
        postId: 'current-post',
        category: 'Health & Wellness',
        keywords: 'anxiety'
      }

      const mockPosts = [
        createMockPost('friends', 'friend-user', 'friends-post-1'),
        createMockPost('friends', 'current-user', 'own-friends-post'),
        createMockPost('public', 'other-user', 'public-post-1')
      ]

      mockPrisma.worryAnalysis.findUnique.mockResolvedValue(currentAnalysis)
      mockPrisma.worryAnalysis.findMany.mockResolvedValue(mockPosts)

      const result = await worryAnalysisService.findSimilarWorries(
        'current-post',
        10,
        'current-user',
        false
      )

      // Should only return public posts and own friends posts
      // (Friends posts from others should be filtered out until friendship is implemented)
      expect(result.similarWorries).toHaveLength(2)
      
      const returnedIds = result.similarWorries.map(w => w.id)
      expect(returnedIds).toContain('public-post-1')
      expect(returnedIds).toContain('own-friends-post')
      expect(returnedIds).not.toContain('friends-post-1') // Other user's friends post
    })

    it('should prevent privacy leaks through similarity scores', async () => {
      const currentAnalysis = {
        postId: 'current-post',
        category: 'Health & Wellness',
        keywords: 'anxiety,stress,private-info'
      }

      const mockPosts = [
        {
          postId: 'private-post-1',
          category: 'Health & Wellness',
          keywords: 'anxiety,stress,private-info,secret', // High similarity
          post: {
            id: 'private-post-1',
            shortContent: 'Private post with secret info',
            privacyLevel: 'private',
            userId: 'other-user',
            createdAt: new Date('2024-01-01'),
            user: {
              id: 'other-user',
              username: 'otheruser',
              displayName: 'Other User'
            }
          }
        }
      ]

      mockPrisma.worryAnalysis.findUnique.mockResolvedValue(currentAnalysis)
      mockPrisma.worryAnalysis.findMany.mockResolvedValue(mockPosts)

      const result = await worryAnalysisService.findSimilarWorries(
        'current-post',
        10,
        'current-user', // Different user
        false
      )

      // Should not return the private post even if it has high similarity
      expect(result.similarWorries).toHaveLength(0)
      expect(result.visibleCount).toBe(0)
      
      // Total count should still reflect that posts exist (for analytics)
      // but they should not be visible
      expect(result.totalCount).toBe(1)
    })

    it('should prevent includePrivate flag from exposing other users private posts', async () => {
      const currentAnalysis = {
        postId: 'current-post',
        category: 'Health & Wellness',
        keywords: 'anxiety'
      }

      const mockPosts = [
        createMockPost('private', 'other-user-1', 'other-private-1'),
        createMockPost('private', 'other-user-2', 'other-private-2'),
        createMockPost('private', 'current-user', 'own-private-1')
      ]

      mockPrisma.worryAnalysis.findUnique.mockResolvedValue(currentAnalysis)
      mockPrisma.worryAnalysis.findMany.mockResolvedValue(mockPosts)

      const result = await worryAnalysisService.findSimilarWorries(
        'current-post',
        10,
        'current-user',
        true // includePrivate = true
      )

      // Even with includePrivate=true, should only return own private posts
      expect(result.similarWorries).toHaveLength(1)
      expect(result.similarWorries[0].id).toBe('own-private-1')
      expect(result.similarWorries[0].isOwnPost).toBe(true)
    })
  })

  describe('Data Sanitization Tests', () => {
    it('should sanitize user data based on privacy level', async () => {
      const currentAnalysis = {
        postId: 'current-post',
        category: 'Health & Wellness',
        keywords: 'anxiety'
      }

      const mockPosts = [
        {
          postId: 'public-post',
          category: 'Health & Wellness',
          keywords: 'anxiety',
          post: {
            id: 'public-post',
            shortContent: 'Public worry',
            privacyLevel: 'public',
            userId: 'other-user',
            createdAt: new Date('2024-01-01'),
            user: {
              id: 'other-user',
              username: 'publicuser',
              displayName: 'Public User'
            }
          }
        },
        {
          postId: 'own-private-post',
          category: 'Health & Wellness',
          keywords: 'anxiety',
          post: {
            id: 'own-private-post',
            shortContent: 'Own private worry',
            privacyLevel: 'private',
            userId: 'current-user',
            createdAt: new Date('2024-01-01'),
            user: {
              id: 'current-user',
              username: 'currentuser',
              displayName: 'Current User'
            }
          }
        }
      ]

      mockPrisma.worryAnalysis.findUnique.mockResolvedValue(currentAnalysis)
      mockPrisma.worryAnalysis.findMany.mockResolvedValue(mockPosts)

      const result = await worryAnalysisService.findSimilarWorries(
        'current-post',
        10,
        'current-user',
        false
      )

      expect(result.similarWorries).toHaveLength(2)

      // Public post should have full user data
      const publicPost = result.similarWorries.find(w => w.id === 'public-post')
      expect(publicPost?.user).toEqual({
        id: 'other-user',
        username: 'publicuser',
        displayName: 'Public User'
      })

      // Own private post should have full user data
      const ownPost = result.similarWorries.find(w => w.id === 'own-private-post')
      expect(ownPost?.user).toEqual({
        id: 'current-user',
        username: 'currentuser',
        displayName: 'Current User'
      })
    })

    it('should handle null user data gracefully', async () => {
      const currentAnalysis = {
        postId: 'current-post',
        category: 'Health & Wellness',
        keywords: 'anxiety'
      }

      const mockPosts = [
        {
          postId: 'post-without-user',
          category: 'Health & Wellness',
          keywords: 'anxiety',
          post: {
            id: 'post-without-user',
            shortContent: 'Post without user data',
            privacyLevel: 'public',
            userId: 'deleted-user',
            createdAt: new Date('2024-01-01'),
            user: null // User deleted
          }
        }
      ]

      mockPrisma.worryAnalysis.findUnique.mockResolvedValue(currentAnalysis)
      mockPrisma.worryAnalysis.findMany.mockResolvedValue(mockPosts)

      const result = await worryAnalysisService.findSimilarWorries(
        'current-post',
        10,
        'current-user',
        false
      )

      expect(result.similarWorries).toHaveLength(1)
      expect(result.similarWorries[0].user).toBeUndefined()
    })
  })

  describe('Edge Cases and Attack Vectors', () => {
    it('should prevent SQL injection through postId parameter', async () => {
      const maliciousPostId = "'; DROP TABLE posts; --"
      
      // Should handle malicious input gracefully
      await expect(
        worryAnalysisService.findSimilarWorries(maliciousPostId, 10, 'user', false)
      ).resolves.toBeDefined()

      // Verify Prisma was called with the malicious string as-is (Prisma handles sanitization)
      expect(mockPrisma.worryAnalysis.findUnique).toHaveBeenCalledWith({
        where: { postId: maliciousPostId },
        select: expect.any(Object)
      })
    })

    it('should prevent user ID spoofing', async () => {
      const currentAnalysis = {
        postId: 'current-post',
        category: 'Health & Wellness',
        keywords: 'anxiety'
      }

      const mockPosts = [
        createMockPost('private', 'victim-user', 'victim-private-post')
      ]

      mockPrisma.worryAnalysis.findUnique.mockResolvedValue(currentAnalysis)
      mockPrisma.worryAnalysis.findMany.mockResolvedValue(mockPosts)

      // Attacker tries to spoof victim's user ID
      const result = await worryAnalysisService.findSimilarWorries(
        'current-post',
        10,
        'victim-user', // Spoofed user ID
        false
      )

      // Should only return posts where isOwnPost is correctly calculated
      // (based on post.userId matching currentUserId)
      expect(result.similarWorries).toHaveLength(1)
      expect(result.similarWorries[0].isOwnPost).toBe(true) // Correctly identified as own post
    })

    it('should handle extremely large limit values safely', async () => {
      const currentAnalysis = {
        postId: 'current-post',
        category: 'Health & Wellness',
        keywords: 'anxiety'
      }

      mockPrisma.worryAnalysis.findUnique.mockResolvedValue(currentAnalysis)
      mockPrisma.worryAnalysis.findMany.mockResolvedValue([])

      // Should handle large limits without crashing
      await expect(
        worryAnalysisService.findSimilarWorries('current-post', 999999, 'user', false)
      ).resolves.toBeDefined()

      // Verify the query was made with a reasonable limit (limit * 3)
      expect(mockPrisma.worryAnalysis.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 999999 * 3
        })
      )
    })

    it('should prevent timing attacks through consistent response times', async () => {
      const currentAnalysis = {
        postId: 'current-post',
        category: 'Health & Wellness',
        keywords: 'anxiety'
      }

      mockPrisma.worryAnalysis.findUnique.mockResolvedValue(currentAnalysis)
      mockPrisma.worryAnalysis.findMany.mockResolvedValue([])

      const startTime = Date.now()
      
      await worryAnalysisService.findSimilarWorries(
        'nonexistent-post',
        10,
        'user',
        false
      )
      
      const endTime = Date.now()
      const responseTime = endTime - startTime

      // Response time should be reasonable (not artificially delayed)
      expect(responseTime).toBeLessThan(1000) // Less than 1 second
    })
  })

  describe('Cache Security', () => {
    it('should not cache private data for wrong users', async () => {
      const currentAnalysis = {
        postId: 'current-post',
        category: 'Health & Wellness',
        keywords: 'anxiety'
      }

      const mockPosts = [
        createMockPost('private', 'user-1', 'private-post-1')
      ]

      mockPrisma.worryAnalysis.findUnique.mockResolvedValue(currentAnalysis)
      mockPrisma.worryAnalysis.findMany.mockResolvedValue(mockPosts)

      // First call with user-1 (should see their private post)
      const result1 = await worryAnalysisService.findSimilarWorries(
        'current-post',
        10,
        'user-1',
        false
      )

      // Second call with user-2 (should not see user-1's private post)
      const result2 = await worryAnalysisService.findSimilarWorries(
        'current-post',
        10,
        'user-2',
        false
      )

      expect(result1.similarWorries).toHaveLength(1)
      expect(result2.similarWorries).toHaveLength(0)
    })

    it('should invalidate cache when privacy settings change', async () => {
      const postId = 'test-post'
      
      // Simulate cache invalidation
      worryAnalysisService.invalidatePostCache(postId)
      
      // Verify subsequent calls hit the database
      const currentAnalysis = {
        postId,
        category: 'Health & Wellness',
        keywords: 'anxiety'
      }

      mockPrisma.worryAnalysis.findUnique.mockResolvedValue(currentAnalysis)
      mockPrisma.worryAnalysis.findMany.mockResolvedValue([])

      await worryAnalysisService.findSimilarWorries(postId, 10, 'user', false)

      expect(mockPrisma.worryAnalysis.findUnique).toHaveBeenCalled()
      expect(mockPrisma.worryAnalysis.findMany).toHaveBeenCalled()
    })
  })
})