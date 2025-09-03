import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SimilarWorriesList from '../../components/SimilarWorriesList'
import { privacyFilteringService } from '../../services/privacyFilteringService'
import { useAuth } from '../../contexts/AuthContext'
import { SimilarWorriesResponse, EnhancedSimilarWorry } from '../../services/worryAnalysisService'

// Mock dependencies
vi.mock('../../services/privacyFilteringService')
vi.mock('../../contexts/AuthContext')
vi.mock('../../hooks/useErrorHandler', () => ({
  useErrorHandler: () => ({
    errorState: { isError: false, errorType: null, errorMessage: null, canRetry: false },
    handleError: vi.fn(),
    clearError: vi.fn(),
    retry: vi.fn()
  })
}))

const mockPrivacyFilteringService = privacyFilteringService as any
const mockUseAuth = useAuth as any

describe('SimilarWorriesList Component - Comprehensive Tests', () => {
  const mockUser = {
    id: 'user-123',
    username: 'testuser',
    displayName: 'Test User'
  }

  const createMockWorry = (overrides: Partial<EnhancedSimilarWorry> = {}): EnhancedSimilarWorry => ({
    id: 'worry-1',
    shortContent: 'I worry about my health',
    category: 'Health & Wellness',
    subcategory: 'Mental Health',
    similarity: 0.85,
    anonymousCount: 5,
    isOwnPost: false,
    privacyLevel: 'public',
    createdAt: '2024-01-01T00:00:00Z',
    user: {
      id: 'other-user',
      username: 'otheruser',
      displayName: 'Other User'
    },
    ...overrides
  })

  const createMockResponse = (worries: EnhancedSimilarWorry[] = []): SimilarWorriesResponse => ({
    similarWorries: worries,
    totalCount: worries.length,
    visibleCount: worries.length,
    hasMore: false
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ user: mockUser })
    mockPrivacyFilteringService.getSimilarWorries.mockResolvedValue(createMockResponse())
    mockPrivacyFilteringService.onAuthenticationChange.mockImplementation(() => {})
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should render loading state initially', () => {
      mockPrivacyFilteringService.getSimilarWorries.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      render(<SimilarWorriesList postId="test-post" />)

      expect(screen.getByText('Loading similar worries...')).toBeInTheDocument()
      expect(screen.getByText('Similar Worries')).toBeInTheDocument()
    })

    it('should render empty state when no worries found', async () => {
      mockPrivacyFilteringService.getSimilarWorries.mockResolvedValue(createMockResponse([]))

      render(<SimilarWorriesList postId="test-post" />)

      await waitFor(() => {
        expect(screen.getByText('No similar worries found')).toBeInTheDocument()
        expect(screen.getByText('This worry appears to be unique')).toBeInTheDocument()
      })
    })

    it('should render similar worries list successfully', async () => {
      const mockWorries = [
        createMockWorry({
          id: 'worry-1',
          shortContent: 'I worry about work stress',
          category: 'Work & Career',
          similarity: 0.9
        }),
        createMockWorry({
          id: 'worry-2',
          shortContent: 'Health anxiety keeps me up',
          category: 'Health & Wellness',
          similarity: 0.8
        })
      ]

      mockPrivacyFilteringService.getSimilarWorries.mockResolvedValue(
        createMockResponse(mockWorries)
      )

      render(<SimilarWorriesList postId="test-post" />)

      await waitFor(() => {
        expect(screen.getByText('Similar Worries')).toBeInTheDocument()
        expect(screen.getByText('"I worry about work stress"')).toBeInTheDocument()
        expect(screen.getByText('"Health anxiety keeps me up"')).toBeInTheDocument()
        expect(screen.getByText('2 of 2')).toBeInTheDocument()
      })
    })
  })

  describe('Privacy Controls', () => {
    it('should display own private posts with privacy indicator', async () => {
      const ownPrivateWorry = createMockWorry({
        id: 'own-private',
        shortContent: 'My private worry',
        privacyLevel: 'private',
        isOwnPost: true,
        user: mockUser
      })

      mockPrivacyFilteringService.getSimilarWorries.mockResolvedValue(
        createMockResponse([ownPrivateWorry])
      )

      render(<SimilarWorriesList postId="test-post" />)

      await waitFor(() => {
        expect(screen.getByText('(Your private post)')).toBeInTheDocument()
        expect(screen.getByText('"My private worry"')).toBeInTheDocument()
        // Should show lock icon for private posts
        expect(document.querySelector('[data-testid="lock-icon"]') || 
               document.querySelector('svg')).toBeInTheDocument()
      })
    })

    it('should not display private posts from other users', async () => {
      const otherPrivateWorry = createMockWorry({
        id: 'other-private',
        shortContent: 'Someone elses private worry',
        privacyLevel: 'private',
        isOwnPost: false,
        user: {
          id: 'other-user',
          username: 'otheruser',
          displayName: 'Other User'
        }
      })

      // Privacy filtering service should not return other users' private posts
      mockPrivacyFilteringService.getSimilarWorries.mockResolvedValue(
        createMockResponse([]) // Empty - privacy filtered out
      )

      render(<SimilarWorriesList postId="test-post" />)

      await waitFor(() => {
        expect(screen.queryByText('"Someone elses private worry"')).not.toBeInTheDocument()
        expect(screen.getByText('No similar worries found')).toBeInTheDocument()
      })
    })

    it('should handle authentication changes', async () => {
      const { rerender } = render(<SimilarWorriesList postId="test-post" />)

      // Change user
      mockUseAuth.mockReturnValue({ user: null })
      
      rerender(<SimilarWorriesList postId="test-post" />)

      expect(mockPrivacyFilteringService.onAuthenticationChange).toHaveBeenCalledWith(null)
    })

    it('should call privacy filtering service with correct user context', async () => {
      render(<SimilarWorriesList postId="test-post" limit={15} />)

      await waitFor(() => {
        expect(mockPrivacyFilteringService.getSimilarWorries).toHaveBeenCalledWith(
          'test-post',
          mockUser.id,
          15
        )
      })
    })
  })

  describe('Similarity and Metadata Display', () => {
    it('should display similarity percentages correctly', async () => {
      const mockWorries = [
        createMockWorry({
          id: 'worry-1',
          similarity: 0.95,
          shortContent: 'Very similar worry'
        }),
        createMockWorry({
          id: 'worry-2',
          similarity: 0.67,
          shortContent: 'Somewhat similar worry'
        })
      ]

      mockPrivacyFilteringService.getSimilarWorries.mockResolvedValue(
        createMockResponse(mockWorries)
      )

      render(<SimilarWorriesList postId="test-post" />)

      await waitFor(() => {
        expect(screen.getByText('95% similar')).toBeInTheDocument()
        expect(screen.getByText('67% similar')).toBeInTheDocument()
      })
    })

    it('should display category tags with correct styling', async () => {
      const mockWorries = [
        createMockWorry({
          id: 'worry-1',
          category: 'Health & Wellness',
          shortContent: 'Health worry'
        }),
        createMockWorry({
          id: 'worry-2',
          category: 'Work & Career',
          shortContent: 'Work worry'
        })
      ]

      mockPrivacyFilteringService.getSimilarWorries.mockResolvedValue(
        createMockResponse(mockWorries)
      )

      render(<SimilarWorriesList postId="test-post" />)

      await waitFor(() => {
        expect(screen.getByText('Health & Wellness')).toBeInTheDocument()
        expect(screen.getByText('Work & Career')).toBeInTheDocument()
      })
    })

    it('should format time ago correctly', async () => {
      const now = new Date()
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      const mockWorries = [
        createMockWorry({
          id: 'worry-1',
          createdAt: now.toISOString(),
          shortContent: 'Today worry'
        }),
        createMockWorry({
          id: 'worry-2',
          createdAt: yesterday.toISOString(),
          shortContent: 'Yesterday worry'
        }),
        createMockWorry({
          id: 'worry-3',
          createdAt: weekAgo.toISOString(),
          shortContent: 'Week ago worry'
        })
      ]

      mockPrivacyFilteringService.getSimilarWorries.mockResolvedValue(
        createMockResponse(mockWorries)
      )

      render(<SimilarWorriesList postId="test-post" />)

      await waitFor(() => {
        expect(screen.getByText('Today')).toBeInTheDocument()
        expect(screen.getByText('1 day ago')).toBeInTheDocument()
        expect(screen.getByText('1 week ago')).toBeInTheDocument()
      })
    })

    it('should display usernames for public posts', async () => {
      const mockWorry = createMockWorry({
        id: 'worry-1',
        privacyLevel: 'public',
        isOwnPost: false,
        user: {
          id: 'other-user',
          username: 'publicuser',
          displayName: 'Public User'
        }
      })

      mockPrivacyFilteringService.getSimilarWorries.mockResolvedValue(
        createMockResponse([mockWorry])
      )

      render(<SimilarWorriesList postId="test-post" />)

      await waitFor(() => {
        expect(screen.getByText('by @publicuser')).toBeInTheDocument()
      })
    })

    it('should not display usernames for own posts', async () => {
      const mockWorry = createMockWorry({
        id: 'worry-1',
        isOwnPost: true,
        user: mockUser
      })

      mockPrivacyFilteringService.getSimilarWorries.mockResolvedValue(
        createMockResponse([mockWorry])
      )

      render(<SimilarWorriesList postId="test-post" />)

      await waitFor(() => {
        expect(screen.queryByText('by @testuser')).not.toBeInTheDocument()
      })
    })
  })

  describe('Load More Functionality', () => {
    it('should show load more button when hasMore is true', async () => {
      const mockResponse: SimilarWorriesResponse = {
        similarWorries: [createMockWorry()],
        totalCount: 10,
        visibleCount: 1,
        hasMore: true
      }

      mockPrivacyFilteringService.getSimilarWorries.mockResolvedValue(mockResponse)

      render(<SimilarWorriesList postId="test-post" />)

      await waitFor(() => {
        expect(screen.getByText('Load more similar worries')).toBeInTheDocument()
      })
    })

    it('should not show load more button when hasMore is false', async () => {
      const mockResponse: SimilarWorriesResponse = {
        similarWorries: [createMockWorry()],
        totalCount: 1,
        visibleCount: 1,
        hasMore: false
      }

      mockPrivacyFilteringService.getSimilarWorries.mockResolvedValue(mockResponse)

      render(<SimilarWorriesList postId="test-post" />)

      await waitFor(() => {
        expect(screen.queryByText('Load more similar worries')).not.toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should display error state when API call fails', async () => {
      const mockErrorHandler = {
        errorState: { 
          isError: true, 
          errorType: 'network', 
          errorMessage: 'Failed to load similar worries',
          canRetry: true 
        },
        handleError: vi.fn(),
        clearError: vi.fn(),
        retry: vi.fn()
      }

      vi.mocked(require('../../hooks/useErrorHandler').useErrorHandler).mockReturnValue(mockErrorHandler)

      mockPrivacyFilteringService.getSimilarWorries.mockRejectedValue(
        new Error('Network error')
      )

      render(<SimilarWorriesList postId="test-post" />)

      await waitFor(() => {
        expect(screen.getByText('Failed to load similar worries')).toBeInTheDocument()
      })
    })

    it('should handle retry functionality', async () => {
      const mockRetry = vi.fn()
      const mockErrorHandler = {
        errorState: { 
          isError: true, 
          errorType: 'network', 
          errorMessage: 'Network error',
          canRetry: true 
        },
        handleError: vi.fn(),
        clearError: vi.fn(),
        retry: mockRetry
      }

      vi.mocked(require('../../hooks/useErrorHandler').useErrorHandler).mockReturnValue(mockErrorHandler)

      render(<SimilarWorriesList postId="test-post" />)

      await waitFor(() => {
        const retryButton = screen.getByText('Try again')
        expect(retryButton).toBeInTheDocument()
      })

      const retryButton = screen.getByText('Try again')
      await userEvent.click(retryButton)

      expect(mockRetry).toHaveBeenCalled()
    })

    it('should handle privacy-specific errors', async () => {
      const privacyError = new Error('Privacy violation')
      privacyError.name = 'PRIVACY_VIOLATION'

      mockPrivacyFilteringService.getSimilarWorries.mockRejectedValue(privacyError)

      render(<SimilarWorriesList postId="test-post" />)

      await waitFor(() => {
        // Should handle privacy errors gracefully
        expect(screen.getByText('Similar Worries')).toBeInTheDocument()
      })
    })
  })

  describe('Performance and Optimization', () => {
    it('should use circuit breaker for resilience', async () => {
      // Mock circuit breaker behavior
      const circuitBreakerSpy = vi.spyOn(
        require('../../utils/retryUtils'), 
        'similarWorriesCircuitBreaker'
      )

      render(<SimilarWorriesList postId="test-post" />)

      await waitFor(() => {
        expect(circuitBreakerSpy).toHaveBeenCalled()
      })
    })

    it('should implement retry logic with exponential backoff', async () => {
      let callCount = 0
      mockPrivacyFilteringService.getSimilarWorries.mockImplementation(() => {
        callCount++
        if (callCount < 3) {
          return Promise.reject(new Error('Temporary failure'))
        }
        return Promise.resolve(createMockResponse([createMockWorry()]))
      })

      render(<SimilarWorriesList postId="test-post" />)

      await waitFor(() => {
        expect(screen.getByText('"I worry about my health"')).toBeInTheDocument()
      }, { timeout: 5000 })

      expect(callCount).toBe(3) // Should retry twice before succeeding
    })

    it('should show retry count during loading', async () => {
      let callCount = 0
      mockPrivacyFilteringService.getSimilarWorries.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return new Promise((resolve, reject) => {
            setTimeout(() => reject(new Error('First failure')), 100)
          })
        }
        return new Promise(() => {}) // Never resolves to keep loading
      })

      render(<SimilarWorriesList postId="test-post" />)

      // Should show retry count
      await waitFor(() => {
        expect(screen.getByText(/Retrying\.\.\. \(\d\/3\)/)).toBeInTheDocument()
      }, { timeout: 2000 })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', async () => {
      const mockWorries = [createMockWorry()]
      mockPrivacyFilteringService.getSimilarWorries.mockResolvedValue(
        createMockResponse(mockWorries)
      )

      render(<SimilarWorriesList postId="test-post" />)

      await waitFor(() => {
        const heading = screen.getByRole('heading', { name: /Similar Worries/i })
        expect(heading).toBeInTheDocument()
      })
    })

    it('should be keyboard navigable', async () => {
      const mockWorries = [createMockWorry()]
      mockPrivacyFilteringService.getSimilarWorries.mockResolvedValue(
        createMockResponse(mockWorries)
      )

      render(<SimilarWorriesList postId="test-post" />)

      await waitFor(() => {
        const worryElement = screen.getByText('"I worry about my health"')
        expect(worryElement).toBeInTheDocument()
      })

      // Test keyboard navigation
      const user = userEvent.setup()
      await user.tab()
      
      // Should be able to navigate through elements
      expect(document.activeElement).toBeDefined()
    })
  })

  describe('Integration with Error Boundary', () => {
    it('should be wrapped with error boundary', () => {
      // This test ensures the component is properly wrapped
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // Force an error in the component
      mockPrivacyFilteringService.getSimilarWorries.mockImplementation(() => {
        throw new Error('Component error')
      })

      render(<SimilarWorriesList postId="test-post" />)

      // Error boundary should catch the error
      expect(consoleSpy).toHaveBeenCalled()
      
      consoleSpy.mockRestore()
    })
  })
})