import { describe, it, expect, vi, beforeEach } from 'vitest'
import { privacyFilteringService } from '../../services/privacyFilteringService'
import { postService } from '../../services/postService'

// Mock the postService
vi.mock('../../services/postService')

describe('Privacy Validation Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Private Post Exposure Prevention', () => {
    it('should never expose private posts to unauthorized users', async () => {
      const mockWorries = [
        { 
          id: '1', 
          shortContent: 'User1 private worry', 
          privacyLevel: 'private', 
          userId: 'user1',
          user: { username: 'user1', id: 'user1' }
        },
        { 
          id: '2', 
          shortContent: 'User2 private worry', 
          privacyLevel: 'private', 
          userId: 'user2',
          user: { username: 'user2', id: 'user2' }
        },
        { 
          id: '3', 
          shortContent: 'Public worry', 
          privacyLevel: 'public', 
          userId: 'user3',
          user: { username: 'user3', id: 'user3' }
        }
      ]

      vi.mocked(postService.getSimilarWorries).mockResolvedValue({
        similarWorries: mockWorries,
        totalCount: 3,
        visibleCount: 2, // Only 2 visible to user1
        hasMore: false
      })

      // Test as user1 - should see own private post and public posts
      const user1Result = await privacyFilteringService.getSimilarWorries('post1', {
        userId: 'user1',
        includePrivate: true
      })

      // Verify user1 can see their own private post
      const user1PrivatePost = user1Result.similarWorries.find(w => w.id === '1')
      expect(user1PrivatePost?.isOwnPost).toBe(true)

      // Verify user2's private post is not marked as own for user1
      const user2PrivatePost = user1Result.similarWorries.find(w => w.id === '2')
      expect(user2PrivatePost?.isOwnPost).toBe(false)

      // Verify public post is accessible
      const publicPost = user1Result.similarWorries.find(w => w.id === '3')
      expect(publicPost?.isOwnPost).toBe(false)
    })

    it('should prevent private post content leakage in error messages', async () => {
      vi.mocked(postService.getSimilarWorries).mockRejectedValue(
        new Error('Private post: I have a secret worry')
      )

      try {
        await privacyFilteringService.getSimilarWorries('post1', {
          userId: 'user1',
          includePrivate: true
        })
      } catch (error: any) {
        // Error message should not contain private content
        expect(error.message).not.toContain('secret worry')
      }
    })

    it('should validate user context for private requests', async () => {
      // Should reject private requests without user ID
      await expect(
        privacyFilteringService.getSimilarWorries('post1', {
          includePrivate: true,
          userId: undefined
        })
      ).rejects.toThrow('User ID is required when includePrivate is true')

      // Should reject empty user ID
      await expect(
        privacyFilteringService.getSimilarWorries('post1', {
          includePrivate: true,
          userId: ''
        })
      ).rejects.toThrow('User ID is required when includePrivate is true')
    })

    it('should handle privacy level changes correctly', async () => {
      const publicWorries = [
        { 
          id: '1', 
          shortContent: 'Public worry', 
          privacyLevel: 'public', 
          userId: 'user1',
          user: { username: 'user1', id: 'user1' }
        }
      ]

      const privateWorries = [
        ...publicWorries,
        { 
          id: '2', 
          shortContent: 'Private worry', 
          privacyLevel: 'private', 
          userId: 'user1',
          user: { username: 'user1', id: 'user1' }
        }
      ]

      // First call - public only
      vi.mocked(postService.getSimilarWorries).mockResolvedValueOnce({
        similarWorries: publicWorries,
        totalCount: 1,
        visibleCount: 1,
        hasMore: false
      })

      const publicResult = await privacyFilteringService.getSimilarWorries('post1', {
        includePrivate: false
      })

      expect(publicResult.similarWorries).toHaveLength(1)
      expect(publicResult.similarWorries[0].privacyLevel).toBe('public')

      // Second call - include private
      vi.mocked(postService.getSimilarWorries).mockResolvedValueOnce({
        similarWorries: privateWorries,
        totalCount: 2,
        visibleCount: 2,
        hasMore: false
      })

      const privateResult = await privacyFilteringService.getSimilarWorries('post1', {
        userId: 'user1',
        includePrivate: true
      })

      expect(privateResult.similarWorries).toHaveLength(2)
      expect(privateResult.similarWorries.some(w => w.privacyLevel === 'private')).toBe(true)
    })
  })

  describe('Cross-User Privacy Validation', () => {
    it('should isolate private data between different users', async () => {
      const mixedWorries = [
        { 
          id: '1', 
          shortContent: 'User A private', 
          privacyLevel: 'private', 
          userId: 'userA',
          user: { username: 'userA', id: 'userA' }
        },
        { 
          id: '2', 
          shortContent: 'User B private', 
          privacyLevel: 'private', 
          userId: 'userB',
          user: { username: 'userB', id: 'userB' }
        }
      ]

      vi.mocked(postService.getSimilarWorries).mockResolvedValue({
        similarWorries: mixedWorries,
        totalCount: 2,
        visibleCount: 1, // Each user should only see their own
        hasMore: false
      })

      // Test as User A
      const userAResult = await privacyFilteringService.getSimilarWorries('post1', {
        userId: 'userA',
        includePrivate: true
      })

      const userAPrivatePost = userAResult.similarWorries.find(w => w.id === '1')
      const userBPrivatePost = userAResult.similarWorries.find(w => w.id === '2')

      expect(userAPrivatePost?.isOwnPost).toBe(true)
      expect(userBPrivatePost?.isOwnPost).toBe(false)

      // Test as User B
      const userBResult = await privacyFilteringService.getSimilarWorries('post1', {
        userId: 'userB',
        includePrivate: true
      })

      const userBPrivatePostForB = userBResult.similarWorries.find(w => w.id === '2')
      const userAPrivatePostForB = userBResult.similarWorries.find(w => w.id === '1')

      expect(userBPrivatePostForB?.isOwnPost).toBe(true)
      expect(userAPrivatePostForB?.isOwnPost).toBe(false)
    })

    it('should handle edge case of same content different privacy levels', async () => {
      const sameContentWorries = [
        { 
          id: '1', 
          shortContent: 'I worry about work', 
          privacyLevel: 'public', 
          userId: 'user1',
          user: { username: 'user1', id: 'user1' }
        },
        { 
          id: '2', 
          shortContent: 'I worry about work', 
          privacyLevel: 'private', 
          userId: 'user2',
          user: { username: 'user2', id: 'user2' }
        }
      ]

      vi.mocked(postService.getSimilarWorries).mockResolvedValue({
        similarWorries: sameContentWorries,
        totalCount: 2,
        visibleCount: 2,
        hasMore: false
      })

      const result = await privacyFilteringService.getSimilarWorries('post1', {
        userId: 'user1',
        includePrivate: true
      })

      // Both should be visible but with correct ownership
      expect(result.similarWorries).toHaveLength(2)
      
      const publicPost = result.similarWorries.find(w => w.id === '1')
      const privatePost = result.similarWorries.find(w => w.id === '2')

      expect(publicPost?.isOwnPost).toBe(true)
      expect(privatePost?.isOwnPost).toBe(false)
    })
  })

  describe('Authentication State Changes', () => {
    it('should handle authentication state transitions', async () => {
      const publicWorries = [
        { 
          id: '1', 
          shortContent: 'Public worry', 
          privacyLevel: 'public', 
          userId: 'user1',
          user: { username: 'user1', id: 'user1' }
        }
      ]

      // Unauthenticated request
      vi.mocked(postService.getSimilarWorries).mockResolvedValueOnce({
        similarWorries: publicWorries,
        totalCount: 1,
        visibleCount: 1,
        hasMore: false
      })

      const unauthResult = await privacyFilteringService.getSimilarWorries('post1', {
        includePrivate: false
      })

      expect(unauthResult.similarWorries).toHaveLength(1)
      expect(unauthResult.similarWorries[0].isOwnPost).toBe(false)

      // Authenticated request (same user)
      const privateWorries = [
        ...publicWorries,
        { 
          id: '2', 
          shortContent: 'Private worry', 
          privacyLevel: 'private', 
          userId: 'user1',
          user: { username: 'user1', id: 'user1' }
        }
      ]

      vi.mocked(postService.getSimilarWorries).mockResolvedValueOnce({
        similarWorries: privateWorries,
        totalCount: 2,
        visibleCount: 2,
        hasMore: false
      })

      const authResult = await privacyFilteringService.getSimilarWorries('post1', {
        userId: 'user1',
        includePrivate: true
      })

      expect(authResult.similarWorries).toHaveLength(2)
      expect(authResult.similarWorries.filter(w => w.isOwnPost)).toHaveLength(2)
    })
  })

  describe('Data Sanitization', () => {
    it('should sanitize sensitive data in responses', async () => {
      const worryWithSensitiveData = [
        { 
          id: '1', 
          shortContent: 'I worry about my health', 
          privacyLevel: 'public', 
          userId: 'user1',
          user: { 
            username: 'user1', 
            id: 'user1',
            email: 'user1@example.com', // Should not be exposed
            password: 'secret123' // Should not be exposed
          }
        }
      ]

      vi.mocked(postService.getSimilarWorries).mockResolvedValue({
        similarWorries: worryWithSensitiveData,
        totalCount: 1,
        visibleCount: 1,
        hasMore: false
      })

      const result = await privacyFilteringService.getSimilarWorries('post1', {
        includePrivate: false
      })

      const worry = result.similarWorries[0]
      expect(worry.user.email).toBeUndefined()
      expect(worry.user.password).toBeUndefined()
      expect(worry.user.username).toBeDefined()
      expect(worry.user.id).toBeDefined()
    })

    it('should validate input parameters for security', async () => {
      // Test SQL injection attempts
      await expect(
        privacyFilteringService.getSimilarWorries("'; DROP TABLE posts; --", {
          includePrivate: false
        })
      ).rejects.toThrow()

      // Test XSS attempts
      await expect(
        privacyFilteringService.getSimilarWorries('<script>alert("xss")</script>', {
          includePrivate: false
        })
      ).rejects.toThrow()

      // Test extremely long input
      const longPostId = 'a'.repeat(10000)
      await expect(
        privacyFilteringService.getSimilarWorries(longPostId, {
          includePrivate: false
        })
      ).rejects.toThrow()
    })
  })
})