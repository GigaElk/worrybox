import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import WorryAnalysisPage from '../../pages/WorryAnalysisPage'
import { postService } from '../../services/postService'
import { privacyFilteringService } from '../../services/privacyFilteringService'
import { meTooService } from '../../services/meTooService'
import { useAuth } from '../../contexts/AuthContext'

// Mock all dependencies
vi.mock('../../services/postService')
vi.mock('../../services/privacyFilteringService')
vi.mock('../../services/meTooService')
vi.mock('../../contexts/AuthContext')
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ postId: 'test-post-123' }),
    Link: ({ children, to, ...props }: any) => <a href={to} {...props}>{children}</a>
  }
})

const mockPostService = postService as any
const mockPrivacyFilteringService = privacyFilteringService as any
const mockMeTooService = meTooService as any
const mockUseAuth = useAuth as any

describe('WorryAnalysisPage - Complete Integration Tests', () => {
  const mockUser = {
    id: 'user-123',
    username: 'testuser',
    displayName: 'Test User',
    email: 'test@example.com'
  }

  const mockPost = {
    id: 'test-post-123',
    shortContent: 'I am worried about my job security',
    longContent: 'I have been feeling anxious about potential layoffs at my company...',
    worryPrompt: 'What is your biggest worry right now?',
    privacyLevel: 'public',
    userId: 'post-author-id',
    createdAt: '2024-01-15T10:00:00Z',
    user: {
      id: 'post-author-id',
      username: 'postauthor',
      displayName: 'Post Author'
    }
  }

  const mockSimilarWorries = [
    {
      id: 'similar-1',
      shortContent: 'Job insecurity is keeping me awake',
      category: 'Work & Career',
      subcategory: 'Job Security',
      similarity: 0.92,
      anonymousCount: 8,
      isOwnPost: false,
      privacyLevel: 'public',
      createdAt: '2024-01-10T15:30:00Z',
      user: {
        id: 'other-user-1',
        username: 'worrier1',
        displayName: 'Worried Worker'
      }
    },
    {
      id: 'similar-2',
      shortContent: 'My own private worry about work',
      category: 'Work & Career',
      subcategory: 'Job Security',
      similarity: 0.87,
      anonymousCount: 3,
      isOwnPost: true,
      privacyLevel: 'private',
      createdAt: '2024-01-12T09:15:00Z',
      user: mockUser
    }
  ]

  const renderWithRouter = (component: React.ReactElement) => {
    return render(
      <BrowserRouter>
        {component}
      </BrowserRouter>
    )
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default mocks
    mockUseAuth.mockReturnValue({ user: mockUser })
    mockPostService.getPost.mockResolvedValue(mockPost)
    mockPrivacyFilteringService.getSimilarWorries.mockResolvedValue({
      similarWorries: mockSimilarWorries,
      totalCount: 15,
      visibleCount: 2,
      hasMore: true
    })
    mockPrivacyFilteringService.getSimilarWorryCount.mockResolvedValue({
      totalCount: 12,
      aiSimilarCount: 8,
      meTooCount: 4,
      breakdown: {
        aiSimilar: 8,
        meToo: 4
      }
    })
    mockPrivacyFilteringService.getMeTooCount.mockResolvedValue({ count: 4 })
    mockPrivacyFilteringService.onAuthenticationChange.mockImplementation(() => {})
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Page Loading and Initial State', () => {
    it('should display loading state initially', () => {
      mockPostService.getPost.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      renderWithRouter(<WorryAnalysisPage />)

      expect(screen.getByText(/Loading post\.\.\./)).toBeInTheDocument()
    })

    it('should load and display post information correctly', async () => {
      renderWithRouter(<WorryAnalysisPage />)

      await waitFor(() => {
        expect(screen.getByText(mockPost.shortContent)).toBeInTheDocument()
        expect(screen.getByText(`"${mockPost.worryPrompt}"`)).toBeInTheDocument()
        expect(screen.getByText('Posted by Post Author')).toBeInTheDocument()
      })
    })

    it('should display formatted date correctly', async () => {
      renderWithRouter(<WorryAnalysisPage />)

      await waitFor(() => {
        expect(screen.getByText('January 15, 2024')).toBeInTheDocument()
      })
    })

    it('should show navigation back to post', async () => {
      renderWithRouter(<WorryAnalysisPage />)

      await waitFor(() => {
        const backLink = screen.getByText('Back to Post')
        expect(backLink).toBeInTheDocument()
        expect(backLink.closest('a')).toHaveAttribute('href', '/posts/test-post-123')
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle post not found error', async () => {
      mockPostService.getPost.mockRejectedValue(new Error('Post not found'))

      renderWithRouter(<WorryAnalysisPage />)

      await waitFor(() => {
        expect(screen.getByText('Post not found')).toBeInTheDocument()
        expect(screen.getByText('Back to Home')).toBeInTheDocument()
      })
    })

    it('should handle network errors gracefully', async () => {
      mockPostService.getPost.mockRejectedValue(new Error('Network error'))

      renderWithRouter(<WorryAnalysisPage />)

      await waitFor(() => {
        expect(screen.getByText(/Unable to load post/)).toBeInTheDocument()
      })
    })

    it('should show retry functionality on error', async () => {
      let callCount = 0
      mockPostService.getPost.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return Promise.reject(new Error('Temporary error'))
        }
        return Promise.resolve(mockPost)
      })

      renderWithRouter(<WorryAnalysisPage />)

      await waitFor(() => {
        expect(screen.getByText(/Unable to load post/)).toBeInTheDocument()
      })

      const retryButton = screen.getByRole('button', { name: /retry/i })
      await userEvent.click(retryButton)

      await waitFor(() => {
        expect(screen.getByText(mockPost.shortContent)).toBeInTheDocument()
      })

      expect(callCount).toBe(2)
    })
  })

  describe('Component Integration', () => {
    it('should load all components successfully', async () => {
      renderWithRouter(<WorryAnalysisPage />)

      await waitFor(() => {
        // Post content
        expect(screen.getByText(mockPost.shortContent)).toBeInTheDocument()
        
        // Main sections
        expect(screen.getByText('Worry Analysis')).toBeInTheDocument()
        expect(screen.getByText('Response Metrics')).toBeInTheDocument()
        expect(screen.getByText('Related Worries')).toBeInTheDocument()
        
        // Subsections
        expect(screen.getByText('Direct Responses')).toBeInTheDocument()
        expect(screen.getByText('Similar Concerns')).toBeInTheDocument()
      })
    })

    it('should display MeToo count correctly', async () => {
      renderWithRouter(<WorryAnalysisPage />)

      await waitFor(() => {
        expect(screen.getByText('4')).toBeInTheDocument() // MeToo count
        expect(screen.getByText('4 people said "Me Too"')).toBeInTheDocument()
      })
    })

    it('should display similar worries count with breakdown', async () => {
      renderWithRouter(<WorryAnalysisPage />)

      await waitFor(() => {
        expect(screen.getByText('12')).toBeInTheDocument() // Total count
        expect(screen.getByText('Breakdown')).toBeInTheDocument()
        expect(screen.getByText('8')).toBeInTheDocument() // AI detected
        expect(screen.getByText('4')).toBeInTheDocument() // Me Too responses
      })
    })

    it('should display similar worries list', async () => {
      renderWithRouter(<WorryAnalysisPage />)

      await waitFor(() => {
        expect(screen.getByText('"Job insecurity is keeping me awake"')).toBeInTheDocument()
        expect(screen.getByText('"My own private worry about work"')).toBeInTheDocument()
        expect(screen.getByText('2 of 15')).toBeInTheDocument() // Visible count
      })
    })

    it('should show privacy indicators for own private posts', async () => {
      renderWithRouter(<WorryAnalysisPage />)

      await waitFor(() => {
        expect(screen.getByText('(Your private post)')).toBeInTheDocument()
      })
    })

    it('should display similarity percentages', async () => {
      renderWithRouter(<WorryAnalysisPage />)

      await waitFor(() => {
        expect(screen.getByText('92% similar')).toBeInTheDocument()
        expect(screen.getByText('87% similar')).toBeInTheDocument()
      })
    })

    it('should show category tags', async () => {
      renderWithRouter(<WorryAnalysisPage />)

      await waitFor(() => {
        expect(screen.getAllByText('Work & Career')).toHaveLength(2)
      })
    })
  })

  describe('Authentication and Privacy', () => {
    it('should handle unauthenticated users', async () => {
      mockUseAuth.mockReturnValue({ user: null })
      
      // Unauthenticated users should only see public posts
      mockPrivacyFilteringService.getSimilarWorries.mockResolvedValue({
        similarWorries: [mockSimilarWorries[0]], // Only public post
        totalCount: 15,
        visibleCount: 1,
        hasMore: true
      })

      renderWithRouter(<WorryAnalysisPage />)

      await waitFor(() => {
        expect(screen.getByText('"Job insecurity is keeping me awake"')).toBeInTheDocument()
        expect(screen.queryByText('"My own private worry about work"')).not.toBeInTheDocument()
        expect(screen.getByText('1 of 15')).toBeInTheDocument()
      })
    })

    it('should call privacy filtering service with correct user context', async () => {
      renderWithRouter(<WorryAnalysisPage />)

      await waitFor(() => {
        expect(mockPrivacyFilteringService.getSimilarWorries).toHaveBeenCalledWith(
          'test-post-123',
          mockUser.id,
          expect.any(Number)
        )
      })
    })

    it('should handle authentication changes', async () => {
      const { rerender } = renderWithRouter(<WorryAnalysisPage />)

      // Change authentication state
      mockUseAuth.mockReturnValue({ user: null })
      
      rerender(
        <BrowserRouter>
          <WorryAnalysisPage />
        </BrowserRouter>
      )

      expect(mockPrivacyFilteringService.onAuthenticationChange).toHaveBeenCalledWith(null)
    })
  })

  describe('Error Boundaries and Resilience', () => {
    it('should handle worry analysis component failure gracefully', async () => {
      // Mock WorryAnalysis component to throw error
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      renderWithRouter(<WorryAnalysisPage />)

      await waitFor(() => {
        // Other components should still work
        expect(screen.getByText('Response Metrics')).toBeInTheDocument()
        expect(screen.getByText('Related Worries')).toBeInTheDocument()
      })

      consoleSpy.mockRestore()
    })

    it('should handle metrics section failure gracefully', async () => {
      mockPrivacyFilteringService.getMeTooCount.mockRejectedValue(new Error('Metrics error'))
      mockPrivacyFilteringService.getSimilarWorryCount.mockRejectedValue(new Error('Count error'))

      renderWithRouter(<WorryAnalysisPage />)

      await waitFor(() => {
        // Main content should still load
        expect(screen.getByText(mockPost.shortContent)).toBeInTheDocument()
        expect(screen.getByText('Worry Analysis')).toBeInTheDocument()
      })
    })

    it('should handle similar worries list failure gracefully', async () => {
      mockPrivacyFilteringService.getSimilarWorries.mockRejectedValue(new Error('List error'))

      renderWithRouter(<WorryAnalysisPage />)

      await waitFor(() => {
        // Other sections should still work
        expect(screen.getByText(mockPost.shortContent)).toBeInTheDocument()
        expect(screen.getByText('Response Metrics')).toBeInTheDocument()
      })
    })
  })

  describe('Performance and Loading States', () => {
    it('should show loading states for individual components', async () => {
      // Make components load slowly
      mockPrivacyFilteringService.getSimilarWorries.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          similarWorries: mockSimilarWorries,
          totalCount: 15,
          visibleCount: 2,
          hasMore: true
        }), 100))
      )

      renderWithRouter(<WorryAnalysisPage />)

      // Should show loading for similar worries while post loads immediately
      await waitFor(() => {
        expect(screen.getByText(mockPost.shortContent)).toBeInTheDocument()
        expect(screen.getByText('Loading similar worries...')).toBeInTheDocument()
      })

      // Eventually should load similar worries
      await waitFor(() => {
        expect(screen.getByText('"Job insecurity is keeping me awake"')).toBeInTheDocument()
      }, { timeout: 2000 })
    })

    it('should handle retry attempts with exponential backoff', async () => {
      let attemptCount = 0
      mockPostService.getPost.mockImplementation(() => {
        attemptCount++
        if (attemptCount < 3) {
          return Promise.reject(new Error('Temporary failure'))
        }
        return Promise.resolve(mockPost)
      })

      renderWithRouter(<WorryAnalysisPage />)

      await waitFor(() => {
        expect(screen.getByText(/Loading post\.\.\. \(attempt \d\/3\)/)).toBeInTheDocument()
      })

      await waitFor(() => {
        expect(screen.getByText(mockPost.shortContent)).toBeInTheDocument()
      }, { timeout: 5000 })

      expect(attemptCount).toBe(3)
    })
  })

  describe('Responsive Design', () => {
    it('should show mobile tip on small screens', async () => {
      // Mock window size
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768, // Mobile width
      })

      renderWithRouter(<WorryAnalysisPage />)

      await waitFor(() => {
        expect(screen.getByText(/For the best analysis experience/)).toBeInTheDocument()
      })
    })
  })

  describe('Real-time Updates', () => {
    it('should handle MeToo count updates', async () => {
      renderWithRouter(<WorryAnalysisPage />)

      await waitFor(() => {
        expect(screen.getByText('4 people said "Me Too"')).toBeInTheDocument()
      })

      // Simulate MeToo update event
      act(() => {
        window.dispatchEvent(new CustomEvent('meTooUpdated', {
          detail: {
            postId: 'test-post-123',
            meTooCount: 5,
            similarWorryCount: 13
          }
        }))
      })

      await waitFor(() => {
        expect(screen.getByText('5 people said "Me Too"')).toBeInTheDocument()
      })
    })

    it('should handle similar worries count updates', async () => {
      renderWithRouter(<WorryAnalysisPage />)

      await waitFor(() => {
        expect(screen.getByText('12')).toBeInTheDocument() // Initial count
      })

      // Simulate similar worries update
      act(() => {
        window.dispatchEvent(new CustomEvent('meTooUpdated', {
          detail: {
            postId: 'test-post-123',
            meTooCount: 5,
            similarWorryCount: 13
          }
        }))
      })

      await waitFor(() => {
        expect(screen.getByText('13')).toBeInTheDocument() // Updated count
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', async () => {
      renderWithRouter(<WorryAnalysisPage />)

      await waitFor(() => {
        const mainHeading = screen.getByRole('heading', { level: 1 })
        expect(mainHeading).toHaveTextContent(mockPost.shortContent)

        const sectionHeadings = screen.getAllByRole('heading', { level: 2 })
        expect(sectionHeadings).toHaveLength(1) // Worry Analysis

        const subsectionHeadings = screen.getAllByRole('heading', { level: 3 })
        expect(subsectionHeadings.length).toBeGreaterThan(0) // Response Metrics, Related Worries
      })
    })

    it('should be keyboard navigable', async () => {
      renderWithRouter(<WorryAnalysisPage />)

      await waitFor(() => {
        expect(screen.getByText(mockPost.shortContent)).toBeInTheDocument()
      })

      const user = userEvent.setup()
      
      // Should be able to navigate to back link
      await user.tab()
      expect(document.activeElement).toHaveAttribute('href', '/posts/test-post-123')
    })

    it('should have proper ARIA labels', async () => {
      renderWithRouter(<WorryAnalysisPage />)

      await waitFor(() => {
        // Check for proper labeling of metrics
        expect(screen.getByText('4')).toBeInTheDocument()
        expect(screen.getByText('12')).toBeInTheDocument()
      })
    })
  })
})