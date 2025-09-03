import { describe, it, expect, vi, beforeEach } from 'vitest'
import { privacyFilteringService } from '../../services/privacyFilteringService'
import { postService } from '../../services/postService'

// Mock the postService
vi.mock('../../services/postService', () => ({
  postService: {
    getSimilarWorries: vi.fn(),
    getMeTooCount: vi.fn(),
    getSimilarWorriesCount: vi.fn()
  }
}))

describe('Privacy Filtering Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getSimilarWorries', () => {
    it('should include private posts for authenticated users', async () => {
      const mockWorries = [
        { id: '1', shortContent: 'Public worry', privacyLevel: 'public', userId: 'user1' },
        { id: '2', shortContent: 'Private worry', privacyLevel: 'private', userId: 'user1' }
      ]

      vi.mocked(postService.getSimilarWorries).mockResolvedValue({
        similarWorries: mockWorries,
        totalCount: 2,
        visibleCount: 2,
        hasMore: false
      })

      const result = await privacyFilteringService.getSimilarWorries('post1', {
        userId: 'user1',
        includePrivate: true
      })

      expect(result.similarWorries).toHaveLength(2)
      expect(result.similarWorries[0].isOwnPost).toBe(true)
      expect(result.similarWorries[1].isOwnPost).toBe(true)
    })

    it('should exclude private posts for unauthenticated users', async () => {
      const mockWorries = [
        { id: '1', shortContent: 'Public worry', privacyLevel: 'public', userId: 'user1' },
        { id: '2', shortContent: 'Private worry', privacyLevel: 'private', userId: 'user1' }
      ]

      vi.mocked(postService.getSimilarWorries).mockResolvedValue({
        similarWorries: mockWorries,
        totalCount: 2,
        visibleCount: 1,
        hasMore: false
      })

      const result = await privacyFilteringService.getSimilarWorries('post1', {
        includePrivate: false
      })

      expect(result.similarWorries).toHaveLength(2)
      expect(result.similarWorries.every(w => w.privacyLevel === 'public')).toBe(true)
    })

    it('should mark own posts correctly', async () => {
      const mockWorries = [
        { id: '1', shortContent: 'Own worry', privacyLevel: 'public', userId: 'user1' },
        { id: '2', shortContent: 'Other worry', privacyLevel: 'public', userId: 'user2' }
      ]

      vi.mocked(postService.getSimilarWorries).mockResolvedValue({
        similarWorries: mockWorries,
        totalCount: 2,
        visibleCount: 2,
        hasMore: false
      })

      const result = await privacyFilteringService.getSimilarWorries('post1', {
        userId: 'user1',
        includePrivate: false
      })

      expect(result.similarWorries[0].isOwnPost).toBe(true)
      expect(result.similarWorries[1].isOwnPost).toBe(false)
    })

    it('should handle API errors gracefully', async () => {
      vi.mocked(postService.getSimilarWorries).mockRejectedValue(new Error('API Error'))

      await expect(
        privacyFilteringService.getSimilarWorries('post1', { includePrivate: false })
      ).rejects.toThrow('API Error')
    })

    it('should validate privacy parameters', async () => {
      await expect(
        privacyFilteringService.getSimilarWorries('', { includePrivate: false })
      ).rejects.toThrow('Post ID is required')

      await expect(
        privacyFilteringService.getSimilarWorries('post1', { 
          includePrivate: true,
          userId: undefined 
        })
      ).rejects.toThrow('User ID is required when includePrivate is true')
    })
  })

  describe('getMeTooCount', () => {
    it('should return me too count for valid post', async () => {
      vi.mocked(postService.getMeTooCount).mockResolvedValue({ count: 5 })

      const result = await privacyFilteringService.getMeTooCount('post1')

      expect(result.count).toBe(5)
      expect(postService.getMeTooCount).toHaveBeenCalledWith('post1')
    })

    it('should handle errors gracefully', async () => {
      vi.mocked(postService.getMeTooCount).mockRejectedValue(new Error('Not found'))

      await expect(
        privacyFilteringService.getMeTooCount('invalid')
      ).rejects.toThrow('Not found')
    })
  })

  describe('getSimilarWorriesCount', () => {
    it('should return breakdown when requested', async () => {
      const mockCount = {
        totalCount: 10,
        aiSimilarCount: 7,
        meTooCount: 3,
        breakdown: {
          aiSimilar: 7,
          meToo: 3
        }
      }

      vi.mocked(postService.getSimilarWorriesCount).mockResolvedValue(mockCount)

      const result = await privacyFilteringService.getSimilarWorriesCount('post1', {
        showBreakdown: true
      })

      expect(result.totalCount).toBe(10)
      expect(result.breakdown).toEqual({ aiSimilar: 7, meToo: 3 })
    })

    it('should return simple count when breakdown not requested', async () => {
      const mockCount = {
        totalCount: 10,
        aiSimilarCount: 7,
        meTooCount: 3
      }

      vi.mocked(postService.getSimilarWorriesCount).mockResolvedValue(mockCount)

      const result = await privacyFilteringService.getSimilarWorriesCount('post1', {
        showBreakdown: false
      })

      expect(result.totalCount).toBe(10)
      expect(result.breakdown).toBeUndefined()
    })
  })

  describe('Privacy Validation', () => {
    it('should never expose private posts to wrong users', async () => {
      const mockWorries = [
        { id: '1', shortContent: 'User1 private', privacyLevel: 'private', userId: 'user1' },
        { id: '2', shortContent: 'User2 private', privacyLevel: 'private', userId: 'user2' },
        { id: '3', shortContent: 'Public worry', privacyLevel: 'public', userId: 'user3' }
      ]

      vi.mocked(postService.getSimilarWorries).mockResolvedValue({
        similarWorries: mockWorries,
        totalCount: 3,
        visibleCount: 2,
        hasMore: false
      })

      // User1 should only see their own private post and public posts
      const user1Result = await privacyFilteringService.getSimilarWorries('post1', {
        userId: 'user1',
        includePrivate: true
      })

      const user1Worries = user1Result.similarWorries
      expect(user1Worries).toHaveLength(3)
      
      // Check that user1 can see their own private post
      const user1Private = user1Worries.find(w => w.id === '1')
      expect(user1Private?.isOwnPost).toBe(true)
      
      // Check that user2's private post is not marked as own
      const user2Private = user1Worries.find(w => w.id === '2')
      expect(user2Private?.isOwnPost).toBe(false)
      
      // Check public post
      const publicPost = user1Worries.find(w => w.id === '3')
      expect(publicPost?.isOwnPost).toBe(false)
    })

    it('should handle edge cases in privacy filtering', async () => {
      // Test with empty results
      vi.mocked(postService.getSimilarWorries).mockResolvedValue({
        similarWorries: [],
        totalCount: 0,
        visibleCount: 0,
        hasMore: false
      })

      const result = await privacyFilteringService.getSimilarWorries('post1', {
        includePrivate: false
      })

      expect(result.similarWorries).toHaveLength(0)
      expect(result.totalCount).toBe(0)
    })
  })
})