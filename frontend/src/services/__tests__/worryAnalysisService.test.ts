import { describe, it, expect, vi, beforeEach } from 'vitest'
import { worryAnalysisService, WorryAnalysisError, WorryAnalysisErrorType } from '../worryAnalysisService'
import api from '../api'

// Mock the api module
vi.mock('../api')
const mockApi = api as any

describe('worryAnalysisService - Core Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Enhanced Similar Worries', () => {
    it('should call enhanced API with privacy options', async () => {
      const mockResponse = {
        data: {
          data: {
            similarWorries: [
              {
                id: 'worry1',
                shortContent: 'Test worry',
                category: 'Test',
                similarity: 0.8,
                isOwnPost: false,
                privacyLevel: 'public',
                createdAt: '2024-01-01T00:00:00Z',
                user: { id: 'user1', username: 'testuser' }
              }
            ],
            totalCount: 1,
            visibleCount: 1,
            hasMore: false
          }
        }
      }
      mockApi.get.mockResolvedValue(mockResponse)

      const result = await worryAnalysisService.findSimilarWorriesEnhanced('test-post', 10, {
        includePrivate: true,
        includeOwnPosts: false
      })

      expect(result.similarWorries).toHaveLength(1)
      expect(result.similarWorries[0].privacyLevel).toBe('public')
      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining('includePrivate=true')
      )
      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining('includeOwnPosts=false')
      )
    })

    it('should fallback to legacy API when enhanced API fails', async () => {
      // Mock enhanced API failure
      mockApi.get.mockRejectedValueOnce({
        response: { status: 404 }
      })

      // Mock legacy API success
      const legacyResponse = {
        data: {
          data: [
            {
              id: 'worry1',
              shortContent: 'Test worry',
              category: 'Test',
              similarity: 0.8,
              anonymousCount: 5
            }
          ]
        }
      }
      mockApi.get.mockResolvedValueOnce(legacyResponse)

      const result = await worryAnalysisService.findSimilarWorriesEnhanced('test-post')

      expect(result.similarWorries).toHaveLength(1)
      expect(result.similarWorries[0].privacyLevel).toBe('public')
      expect(result.similarWorries[0].isOwnPost).toBe(false)
    })
  })

  describe('Separate Count Methods', () => {
    it('should get similar worry count with breakdown', async () => {
      const mockResponse = {
        data: {
          data: {
            count: 10,
            breakdown: {
              aiDetectedSimilar: 7,
              meTooResponses: 3
            }
          }
        }
      }
      mockApi.get.mockResolvedValue(mockResponse)

      const result = await worryAnalysisService.getSimilarWorryCount('test-post', true)

      expect(result.count).toBe(10)
      expect(result.breakdown?.aiDetectedSimilar).toBe(7)
      expect(result.breakdown?.meTooResponses).toBe(3)
      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining('breakdown=true')
      )
    })

    it('should get MeToo count separately', async () => {
      const mockResponse = { data: { data: { count: 3 } } }
      mockApi.get.mockResolvedValue(mockResponse)

      const result = await worryAnalysisService.getMeTooCount('test-post')

      expect(result.count).toBe(3)
      expect(mockApi.get).toHaveBeenCalledWith('/metoo/test-post/count')
    })

    it('should get AI similar worry count only', async () => {
      const mockResponse = {
        data: {
          data: {
            count: 10,
            breakdown: {
              aiDetectedSimilar: 7,
              meTooResponses: 3
            }
          }
        }
      }
      mockApi.get.mockResolvedValue(mockResponse)

      const result = await worryAnalysisService.getAiSimilarWorryCount('test-post')

      expect(result.count).toBe(7)
    })
  })

  describe('Error Handling', () => {
    it('should handle 404 errors for getWorryAnalysis', async () => {
      mockApi.get.mockRejectedValue({
        response: { status: 404, data: { message: 'Post not found' } }
      })

      const result = await worryAnalysisService.getWorryAnalysis('nonexistent-post')
      expect(result).toBeNull()
    })

    it('should return fallback values when APIs fail', async () => {
      mockApi.get.mockRejectedValue(new Error('API Error'))

      const countResult = await worryAnalysisService.getSimilarWorryCount('test-post')
      expect(countResult.count).toBe(0)

      const meTooResult = await worryAnalysisService.getMeTooCount('test-post')
      expect(meTooResult.count).toBe(0)
    }, 10000)
  })

  describe('Post Access Validation', () => {
    it('should validate post access', async () => {
      const mockResponse = {
        data: {
          data: {
            canView: true,
            canViewSimilar: true,
            isOwner: false,
            privacyLevel: 'public'
          }
        }
      }
      mockApi.get.mockResolvedValue(mockResponse)

      const result = await worryAnalysisService.validatePostAccess('test-post')

      expect(result.canView).toBe(true)
      expect(result.privacyLevel).toBe('public')
      expect(mockApi.get).toHaveBeenCalledWith('/analysis/posts/test-post/access')
    })

    it('should provide fallback access when validation fails', async () => {
      mockApi.get.mockRejectedValue(new Error('API Error'))

      const result = await worryAnalysisService.validatePostAccess('test-post')

      expect(result.canView).toBe(true)
      expect(result.privacyLevel).toBe('public')
      expect(result.isOwner).toBe(false)
    })
  })

  describe('Batch Operations', () => {
    it('should handle batch similar worry counts', async () => {
      const mockResponse = {
        data: {
          data: {
            'post1': { count: 5 },
            'post2': { count: 3 },
            'post3': { count: 8 }
          }
        }
      }
      mockApi.get.mockResolvedValue(mockResponse)

      const result = await worryAnalysisService.getBatchSimilarWorryCounts(['post1', 'post2', 'post3'])

      expect(result['post1'].count).toBe(5)
      expect(result['post2'].count).toBe(3)
      expect(result['post3'].count).toBe(8)
    })
  })

  describe('TypeScript Interfaces', () => {
    it('should properly type enhanced similar worry responses', async () => {
      const mockResponse = {
        data: {
          data: {
            similarWorries: [
              {
                id: 'worry1',
                shortContent: 'Test worry',
                category: 'Work & Career',
                subcategory: 'Job Security',
                similarity: 0.85,
                isOwnPost: true,
                privacyLevel: 'private',
                createdAt: '2024-01-01T00:00:00Z',
                user: {
                  id: 'user1',
                  username: 'testuser',
                  displayName: 'Test User'
                }
              }
            ],
            totalCount: 1,
            visibleCount: 1,
            hasMore: false
          }
        }
      }
      mockApi.get.mockResolvedValue(mockResponse)

      const result = await worryAnalysisService.findSimilarWorriesEnhanced('test-post')

      // TypeScript should infer correct types
      const worry = result.similarWorries[0]
      expect(worry.id).toBe('worry1')
      expect(worry.similarity).toBe(0.85)
      expect(worry.isOwnPost).toBe(true)
      expect(worry.privacyLevel).toBe('private')
      expect(worry.user?.username).toBe('testuser')
    })

    it('should properly type count responses with breakdown', async () => {
      const mockResponse = {
        data: {
          data: {
            count: 15,
            breakdown: {
              aiDetectedSimilar: 10,
              meTooResponses: 5
            }
          }
        }
      }
      mockApi.get.mockResolvedValue(mockResponse)

      const result = await worryAnalysisService.getSimilarWorryCount('test-post', true)

      // TypeScript should infer correct types
      expect(result.count).toBe(15)
      expect(result.breakdown?.aiDetectedSimilar).toBe(10)
      expect(result.breakdown?.meTooResponses).toBe(5)
    })
  })

  describe('Cache Management', () => {
    it('should clear post cache', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      worryAnalysisService.clearPostCache('test-post')

      expect(consoleSpy).toHaveBeenCalledWith('Clearing cache for post test-post')
      
      consoleSpy.mockRestore()
    })
  })
})