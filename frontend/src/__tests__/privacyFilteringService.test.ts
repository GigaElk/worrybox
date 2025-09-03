import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { privacyFilteringService } from '../services/privacyFilteringService'
import { worryAnalysisService } from '../services/worryAnalysisService'

// Mock the worryAnalysisService
vi.mock('../services/worryAnalysisService', () => ({
  worryAnalysisService: {
    findSimilarWorriesEnhanced: vi.fn(),
    getSimilarWorryCount: vi.fn()
  }
}))

const mockWorryAnalysisService = worryAnalysisService as any

describe('PrivacyFilteringService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    privacyFilteringService.clearCache()
  })

  afterEach(() => {
    privacyFilteringService.clearCache()
  })

  describe('getSimilarWorries', () => {
    const mockResponse = {
      similarWorries: [
        {
          id: 'worry1',
          shortContent: 'Public worry',
          category: 'Work',
          similarity: 0.8,
          isOwnPost: false,
          privacyLevel: 'public' as const,
          createdAt: '2024-01-15T10:00:00Z'
        },
        {
          id: 'worry2',
          shortContent: 'Private worry from other user',
          category: 'Personal',
          similarity: 0.7,
          isOwnPost: false,
          privacyLevel: 'private' as const,
          createdAt: '2024-01-14T10:00:00Z'
        },
        {
          id: 'worry3',
          shortContent: 'Own private worry',
          category: 'Health',
          similarity: 0.9,
          isOwnPost: true,
          privacyLevel: 'private' as const,
          createdAt: '2024-01-13T10:00:00Z'
        }
      ],
      totalCount: 3,
      visibleCount: 3,
      hasMore: false
    }

    it('filters out private posts from other users', async () => {
      mockWorryAnalysisService.findSimilarWorriesEnhanced.mockResolvedValue(mockResponse)

      const result = await privacyFilteringService.getSimilarWorries('post1', 'user1')

      expect(result.similarWorries).toHaveLength(2)
      expect(result.similarWorries[0].id).toBe('worry1') // Public post
      expect(result.similarWorries[1].id).toBe('worry3') // Own private post
      expect(result.visibleCount).toBe(2)
    })

    it('includes all public posts for anonymous users', async () => {
      const publicOnlyResponse = {
        ...mockResponse,
        similarWorries: [mockResponse.similarWorries[0]] // Only public post
      }
      mockWorryAnalysisService.findSimilarWorriesEnhanced.mockResolvedValue(publicOnlyResponse)

      const result = await privacyFilteringService.getSimilarWorries('post1')

      expect(result.similarWorries).toHaveLength(1)
      expect(result.similarWorries[0].privacyLevel).toBe('public')
    })

    it('caches results correctly', async () => {
      mockWorryAnalysisService.findSimilarWorriesEnhanced.mockResolvedValue(mockResponse)

      // First call
      await privacyFilteringService.getSimilarWorries('post1', 'user1')
      
      // Second call should use cache
      await privacyFilteringService.getSimilarWorries('post1', 'user1')

      expect(mockWorryAnalysisService.findSimilarWorriesEnhanced).toHaveBeenCalledTimes(1)
    })

    it('does not use cache for different users', async () => {
      mockWorryAnalysisService.findSimilarWorriesEnhanced.mockResolvedValue(mockResponse)

      // Call for user1
      await privacyFilteringService.getSimilarWorries('post1', 'user1')
      
      // Call for user2 should not use cache
      await privacyFilteringService.getSimilarWorries('post1', 'user2')

      expect(mockWorryAnalysisService.findSimilarWorriesEnhanced).toHaveBeenCalledTimes(2)
    })

    it('handles authentication required error', async () => {
      const authError = new Error('Unauthorized')
      authError.response = { status: 401, data: { error: 'Authentication required' } }
      mockWorryAnalysisService.findSimilarWorriesEnhanced.mockRejectedValue(authError)

      await expect(
        privacyFilteringService.getSimilarWorries('post1', 'user1')
      ).rejects.toMatchObject({
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required to view private content'
      })
    })

    it('handles insufficient permissions error', async () => {
      const permissionError = new Error('Forbidden')
      permissionError.response = { status: 403, data: { error: 'Insufficient permissions' } }
      mockWorryAnalysisService.findSimilarWorriesEnhanced.mockRejectedValue(permissionError)

      await expect(
        privacyFilteringService.getSimilarWorries('post1', 'user1')
      ).rejects.toMatchObject({
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'Insufficient permissions to view this content'
      })
    })

    it('handles privacy violation error', async () => {
      const privacyError = new Error('Privacy violation')
      privacyError.response = { 
        status: 400, 
        data: { error: { code: 'PRIVACY_VIOLATION', message: 'Privacy violation' } } 
      }
      mockWorryAnalysisService.findSimilarWorriesEnhanced.mockRejectedValue(privacyError)

      await expect(
        privacyFilteringService.getSimilarWorries('post1', 'user1')
      ).rejects.toMatchObject({
        code: 'PRIVACY_VIOLATION',
        message: 'Privacy violation detected'
      })
    })
  })

  describe('getSimilarWorryCount', () => {
    const mockCountResponse = {
      count: 10,
      breakdown: {
        aiDetectedSimilar: 6,
        meTooResponses: 4
      }
    }

    it('returns count data correctly', async () => {
      mockWorryAnalysisService.getSimilarWorryCount.mockResolvedValue(mockCountResponse)

      const result = await privacyFilteringService.getSimilarWorryCount('post1', 'user1', true)

      expect(result).toEqual(mockCountResponse)
      expect(mockWorryAnalysisService.getSimilarWorryCount).toHaveBeenCalledWith('post1', true)
    })

    it('caches count results', async () => {
      mockWorryAnalysisService.getSimilarWorryCount.mockResolvedValue(mockCountResponse)

      // First call
      await privacyFilteringService.getSimilarWorryCount('post1', 'user1', true)
      
      // Second call should use cache
      await privacyFilteringService.getSimilarWorryCount('post1', 'user1', true)

      expect(mockWorryAnalysisService.getSimilarWorryCount).toHaveBeenCalledTimes(1)
    })
  })

  describe('cache management', () => {
    it('invalidates cache for specific user and post', async () => {
      const mockResponse = { similarWorries: [], totalCount: 0, visibleCount: 0, hasMore: false }
      mockWorryAnalysisService.findSimilarWorriesEnhanced.mockResolvedValue(mockResponse)

      // Cache some data
      await privacyFilteringService.getSimilarWorries('post1', 'user1')
      
      // Invalidate cache
      privacyFilteringService.invalidatePrivacyCache('user1', 'post1')
      
      // Next call should not use cache
      await privacyFilteringService.getSimilarWorries('post1', 'user1')

      expect(mockWorryAnalysisService.findSimilarWorriesEnhanced).toHaveBeenCalledTimes(2)
    })

    it('invalidates all cache for user', async () => {
      const mockResponse = { similarWorries: [], totalCount: 0, visibleCount: 0, hasMore: false }
      mockWorryAnalysisService.findSimilarWorriesEnhanced.mockResolvedValue(mockResponse)

      // Cache data for multiple posts
      await privacyFilteringService.getSimilarWorries('post1', 'user1')
      await privacyFilteringService.getSimilarWorries('post2', 'user1')
      
      // Invalidate all cache for user
      privacyFilteringService.invalidatePrivacyCache('user1')
      
      // Next calls should not use cache
      await privacyFilteringService.getSimilarWorries('post1', 'user1')
      await privacyFilteringService.getSimilarWorries('post2', 'user1')

      expect(mockWorryAnalysisService.findSimilarWorriesEnhanced).toHaveBeenCalledTimes(4)
    })

    it('clears all cache on authentication change', async () => {
      const mockResponse = { similarWorries: [], totalCount: 0, visibleCount: 0, hasMore: false }
      mockWorryAnalysisService.findSimilarWorriesEnhanced.mockResolvedValue(mockResponse)

      // Cache some data
      await privacyFilteringService.getSimilarWorries('post1', 'user1')
      
      // Simulate authentication change
      privacyFilteringService.onAuthenticationChange('user2')
      
      // Next call should not use cache
      await privacyFilteringService.getSimilarWorries('post1', 'user1')

      expect(mockWorryAnalysisService.findSimilarWorriesEnhanced).toHaveBeenCalledTimes(2)
    })

    it('provides cache statistics', async () => {
      const mockResponse = { similarWorries: [], totalCount: 0, visibleCount: 0, hasMore: false }
      mockWorryAnalysisService.findSimilarWorriesEnhanced.mockResolvedValue(mockResponse)

      // Cache some data
      await privacyFilteringService.getSimilarWorries('post1', 'user1')
      
      const stats = privacyFilteringService.getCacheStats()

      expect(stats.size).toBe(1)
      expect(stats.maxSize).toBe(100)
      expect(stats.entries).toHaveLength(1)
      expect(stats.entries[0].userId).toBe('user1')
      expect(stats.entries[0].includePrivate).toBe(true)
    })
  })

  describe('privacy validation', () => {
    it('logs warning for privacy violations', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      const responseWithViolation = {
        similarWorries: [
          {
            id: 'worry1',
            shortContent: 'Private worry from other user',
            category: 'Personal',
            similarity: 0.7,
            isOwnPost: false, // Not own post
            privacyLevel: 'private' as const, // But private
            createdAt: '2024-01-14T10:00:00Z'
          }
        ],
        totalCount: 1,
        visibleCount: 1,
        hasMore: false
      }

      mockWorryAnalysisService.findSimilarWorriesEnhanced.mockResolvedValue(responseWithViolation)

      const result = await privacyFilteringService.getSimilarWorries('post1', 'user1')

      expect(result.similarWorries).toHaveLength(0)
      expect(consoleSpy).toHaveBeenCalledWith(
        'Privacy violation detected: private post from another user',
        expect.objectContaining({
          worryId: 'worry1',
          currentUserId: 'user1',
          isOwnPost: false
        })
      )

      consoleSpy.mockRestore()
    })
  })
})