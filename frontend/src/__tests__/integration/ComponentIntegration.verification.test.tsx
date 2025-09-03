import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'

// Import components to test integration
import PostCard from '../../components/PostCard'
import WorryAnalysisPage from '../../pages/WorryAnalysisPage'
import MeTooButton from '../../components/MeTooButton'
import MeTooCount from '../../components/MeTooCount'
import SimilarWorriesCount from '../../components/SimilarWorriesCount'

// Mock services
import { postService } from '../../services/postService'
import { meTooService } from '../../services/meTooService'
import { privacyFilteringService } from '../../services/privacyFilteringService'
import { useAuth } from '../../contexts/AuthContext'

// Mock all dependencies
vi.mock('../../services/postService')
vi.mock('../../services/meTooService')
vi.mock('../../services/privacyFilteringService')
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
const mockMeTooService = meTooService as any
const mockPrivacyFilteringService = privacyFilteringService as any
const mockUseAuth = useAuth as any

describe('Component Integration Verification', () => {
  const mockUser = {
    id: 'user-123',
    username: 'testuser',
    displayName: 'Test User',
    email: 'test@example.com'
  }

  const mockPost = {
    id: 'test-post-123',
    shortContent: 'I am worried about my job security',
    longContent: null,
    worryPrompt: 'What is your biggest worry right now?',
    privacyLevel: 'public',
    userId: 'post-author-id',
    createdAt: '2024-01-15T10:00:00Z',
    publishedAt: '2024-01-15T10:00:00Z',
    commentsEnabled: true,
    isScheduled: false,
    user: {
      id: 'post-author-id',
      username: 'postauthor',
      displayName: 'Post Author',
      avatarUrl: null
    }
  }

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
    mockUseAuth.mockReturnValue({ 
      user: mockUser, 
      isAuthenticated: true,
      isLoading: false 
    })
    
    mockMeTooService.getMeTooCount.mockResolvedValue(3)
    mockMeTooService.getSimilarWorryCount.mockResolvedValue(8)
    mockMeTooService.hasMeToo.mockResolvedValue(false)
    mockMeTooService.addMeToo.mockResolvedValue({ id: 'metoo-123' })
    mockMeTooService.removeMeToo.mockResolvedValue(undefined)
    
    mockPrivacyFilteringService.getSimilarWorryCount.mockResolvedValue({
      totalCount: 8,
      aiSimilarCount: 5,
      meTooCount: 3,
      breakdown: { aiSimilar: 5, meToo: 3 }
    })
    mockPrivacyFilteringService.getMeTooCount.mockResolvedValue({ count: 3 })
    mockPrivacyFilteringService.onAuthenticationChange.mockImplementation(() => {})
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('MeTooButton Integration', () => {
    it('should properly update both separate and combined counts', async () => {
      let meTooUpdateEvent: CustomEvent | null = null
      
      // Capture the dispatched event
      const originalDispatchEvent = window.dispatchEvent
      window.dispatchEvent = vi.fn((event) => {
        if (event instanceof CustomEvent && event.type === 'meTooUpdated') {
          meTooUpdateEvent = event
        }
        return originalDispatchEvent.call(window, event)
      })

      renderWithRouter(<MeTooButton postId="test-post" showCount={true} />)

      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument()
      })

      // Click MeToo button
      const meTooButton = screen.getByRole('button')
      await userEvent.click(meTooButton)

      await waitFor(() => {
        expect(mockMeTooService.addMeToo).toHaveBeenCalledWith('test-post')
      })

      // Verify event was dispatched with correct data
      expect(meTooUpdateEvent).toBeTruthy()
      expect(meTooUpdateEvent?.detail).toEqual({
        postId: 'test-post',
        meTooCount: 4, // 3 + 1
        similarWorryCount: 9 // 8 + 1
      })

      window.dispatchEvent = originalDispatchEvent
    })

    it('should handle remove MeToo correctly', async () => {
      mockMeTooService.hasMeToo.mockResolvedValue(true) // User already has MeToo
      
      let meTooUpdateEvent: CustomEvent | null = null
      const originalDispatchEvent = window.dispatchEvent
      window.dispatchEvent = vi.fn((event) => {
        if (event instanceof CustomEvent && event.type === 'meTooUpdated') {
          meTooUpdateEvent = event
        }
        return originalDispatchEvent.call(window, event)
      })

      renderWithRouter(<MeTooButton postId="test-post" showCount={true} />)

      await waitFor(() => {
        expect(screen.getByText('You also worry about this')).toBeInTheDocument()
      })

      // Click to remove MeToo
      const meTooButton = screen.getByRole('button')
      await userEvent.click(meTooButton)

      await waitFor(() => {
        expect(mockMeTooService.removeMeToo).toHaveBeenCalledWith('test-post')
      })

      // Verify event was dispatched with decremented counts
      expect(meTooUpdateEvent?.detail).toEqual({
        postId: 'test-post',
        meTooCount: 2, // 3 - 1
        similarWorryCount: 7 // 8 - 1
      })

      window.dispatchEvent = originalDispatchEvent
    })
  })

  describe('PostCard Component Verification', () => {
    it('should only show count components, never similar worries content', async () => {
      renderWithRouter(<PostCard post={mockPost} />)

      await waitFor(() => {
        expect(screen.getByText(mockPost.shortContent)).toBeInTheDocument()
      })

      // Should show count components
      expect(screen.getByText('3')).toBeInTheDocument() // MeToo count
      expect(screen.getByText('8')).toBeInTheDocument() // Similar worries count

      // Should NOT show any similar worries content
      expect(screen.queryByText(/similar worries list/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/related worries/i)).not.toBeInTheDocument()
      
      // Should not show any actual worry content from other users
      expect(screen.queryByText(/job insecurity/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/anxiety about work/i)).not.toBeInTheDocument()
    })

    it('should have analysis link that opens in new tab', async () => {
      const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

      renderWithRouter(<PostCard post={mockPost} />)

      await waitFor(() => {
        const analysisButton = screen.getByText('Analysis')
        expect(analysisButton).toBeInTheDocument()
      })

      const analysisButton = screen.getByText('Analysis')
      await userEvent.click(analysisButton)

      expect(windowOpenSpy).toHaveBeenCalledWith('/analysis/test-post-123', '_blank')
      
      windowOpenSpy.mockRestore()
    })

    it('should handle MeToo count updates from MeTooButton', async () => {
      const { rerender } = renderWithRouter(<PostCard post={mockPost} />)

      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument() // Initial MeToo count
      })

      // Simulate MeToo update event
      act(() => {
        window.dispatchEvent(new CustomEvent('meTooUpdated', {
          detail: {
            postId: 'test-post-123',
            meTooCount: 4,
            similarWorryCount: 9
          }
        }))
      })

      // The count should update
      await waitFor(() => {
        expect(screen.getByText('4')).toBeInTheDocument() // Updated MeToo count
        expect(screen.getByText('9')).toBeInTheDocument() // Updated similar worries count
      })
    })
  })

  describe('WorryAnalysisPage Integration', () => {
    beforeEach(() => {
      mockPostService.getPost.mockResolvedValue(mockPost)
      mockPrivacyFilteringService.getSimilarWorries.mockResolvedValue({
        similarWorries: [
          {
            id: 'similar-1',
            shortContent: 'Job insecurity is keeping me awake',
            category: 'Work & Career',
            similarity: 0.92,
            isOwnPost: false,
            privacyLevel: 'public',
            createdAt: '2024-01-10T15:30:00Z',
            user: { id: 'other-user', username: 'worrier1', displayName: 'Worried Worker' }
          }
        ],
        totalCount: 5,
        visibleCount: 1,
        hasMore: true
      })
    })

    it('should use SimilarWorriesList only on analysis page', async () => {
      renderWithRouter(<WorryAnalysisPage />)

      await waitFor(() => {
        expect(screen.getByText(mockPost.shortContent)).toBeInTheDocument()
      })

      // Should show SimilarWorriesList component
      await waitFor(() => {
        expect(screen.getByText('Related Worries')).toBeInTheDocument()
        expect(screen.getByText('"Job insecurity is keeping me awake"')).toBeInTheDocument()
      })

      // Should show count components
      expect(screen.getByText('Direct Responses')).toBeInTheDocument()
      expect(screen.getByText('Similar Concerns')).toBeInTheDocument()
    })

    it('should handle authentication changes correctly', async () => {
      const { rerender } = renderWithRouter(<WorryAnalysisPage />)

      await waitFor(() => {
        expect(mockPrivacyFilteringService.onAuthenticationChange).toHaveBeenCalledWith(mockUser.id)
      })

      // Change authentication state
      mockUseAuth.mockReturnValue({ 
        user: null, 
        isAuthenticated: false,
        isLoading: false 
      })

      rerender(
        <BrowserRouter>
          <WorryAnalysisPage />
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(mockPrivacyFilteringService.onAuthenticationChange).toHaveBeenCalledWith(null)
      })
    })
  })

  describe('Count Components Integration', () => {
    it('should listen to MeToo update events correctly', async () => {
      renderWithRouter(
        <div>
          <MeTooCount postId="test-post" />
          <SimilarWorriesCount postId="test-post" showBreakdown={true} />
        </div>
      )

      await waitFor(() => {
        expect(screen.getByText('3 people said "Me Too"')).toBeInTheDocument()
        expect(screen.getByText('8 people have similar worries')).toBeInTheDocument()
      })

      // Simulate MeToo update
      act(() => {
        window.dispatchEvent(new CustomEvent('meTooUpdated', {
          detail: {
            postId: 'test-post',
            meTooCount: 4,
            similarWorryCount: 9
          }
        }))
      })

      await waitFor(() => {
        expect(screen.getByText('4 people said "Me Too"')).toBeInTheDocument()
        expect(screen.getByText('9 people have similar worries')).toBeInTheDocument()
      })
    })

    it('should ignore events for different posts', async () => {
      renderWithRouter(<MeTooCount postId="test-post" />)

      await waitFor(() => {
        expect(screen.getByText('3 people said "Me Too"')).toBeInTheDocument()
      })

      // Simulate event for different post
      act(() => {
        window.dispatchEvent(new CustomEvent('meTooUpdated', {
          detail: {
            postId: 'different-post',
            meTooCount: 10,
            similarWorryCount: 15
          }
        }))
      })

      // Count should remain unchanged
      await waitFor(() => {
        expect(screen.getByText('3 people said "Me Too"')).toBeInTheDocument()
      })
    })
  })

  describe('Privacy and Security Integration', () => {
    it('should handle unauthenticated users correctly', async () => {
      mockUseAuth.mockReturnValue({ 
        user: null, 
        isAuthenticated: false,
        isLoading: false 
      })

      renderWithRouter(<MeTooButton postId="test-post" />)

      await waitFor(() => {
        const button = screen.getByRole('button')
        expect(button).toBeDisabled()
        expect(button).toHaveAttribute('title', 'Log in to respond to posts')
      })

      // Should still show counts for anonymous users
      expect(screen.getByText('8')).toBeInTheDocument() // Similar worries count
    })

    it('should call privacy filtering service with correct user context', async () => {
      renderWithRouter(
        <div>
          <MeTooCount postId="test-post" />
          <SimilarWorriesCount postId="test-post" />
        </div>
      )

      await waitFor(() => {
        expect(mockPrivacyFilteringService.getMeTooCount).toHaveBeenCalledWith({ count: 3 })
        expect(mockPrivacyFilteringService.getSimilarWorryCount).toHaveBeenCalled()
      })
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle component failures gracefully', async () => {
      // Mock one component to fail
      mockMeTooService.getMeTooCount.mockRejectedValue(new Error('Service error'))

      renderWithRouter(
        <div>
          <MeTooCount postId="test-post" />
          <SimilarWorriesCount postId="test-post" />
        </div>
      )

      // SimilarWorriesCount should still work
      await waitFor(() => {
        expect(screen.getByText('8 people have similar worries')).toBeInTheDocument()
      })

      // MeTooCount should show error state
      await waitFor(() => {
        expect(screen.getByText(/Unable to load Me Too count/i)).toBeInTheDocument()
      })
    })

    it('should handle network errors with retry functionality', async () => {
      let callCount = 0
      mockMeTooService.getMeTooCount.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return Promise.reject(new Error('Network error'))
        }
        return Promise.resolve(3)
      })

      renderWithRouter(<MeTooCount postId="test-post" />)

      // Should show error initially
      await waitFor(() => {
        expect(screen.getByText(/Try again/i)).toBeInTheDocument()
      })

      // Click retry
      const retryButton = screen.getByText(/Try again/i)
      await userEvent.click(retryButton)

      // Should succeed on retry
      await waitFor(() => {
        expect(screen.getByText('3 people said "Me Too"')).toBeInTheDocument()
      })

      expect(callCount).toBe(2)
    })
  })

  describe('Performance Integration', () => {
    it('should not cause excessive re-renders', async () => {
      const renderSpy = vi.fn()
      
      const TestComponent = () => {
        renderSpy()
        return (
          <div>
            <MeTooCount postId="test-post" />
            <SimilarWorriesCount postId="test-post" />
          </div>
        )
      }

      renderWithRouter(<TestComponent />)

      await waitFor(() => {
        expect(screen.getByText('3 people said "Me Too"')).toBeInTheDocument()
      })

      // Trigger multiple events
      act(() => {
        window.dispatchEvent(new CustomEvent('meTooUpdated', {
          detail: { postId: 'test-post', meTooCount: 4, similarWorryCount: 9 }
        }))
      })

      act(() => {
        window.dispatchEvent(new CustomEvent('meTooUpdated', {
          detail: { postId: 'test-post', meTooCount: 5, similarWorryCount: 10 }
        }))
      })

      await waitFor(() => {
        expect(screen.getByText('5 people said "Me Too"')).toBeInTheDocument()
      })

      // Should not cause excessive re-renders due to React.memo optimization
      expect(renderSpy).toHaveBeenCalledTimes(3) // Initial + 2 updates
    })
  })

  describe('Accessibility Integration', () => {
    it('should maintain proper ARIA labels and roles', async () => {
      renderWithRouter(<MeTooButton postId="test-post" />)

      await waitFor(() => {
        const button = screen.getByRole('button')
        expect(button).toHaveAttribute('aria-label', 'Me too')
        expect(button).toHaveAttribute('title', 'Me too')
      })
    })

    it('should be keyboard navigable', async () => {
      renderWithRouter(
        <div>
          <MeTooButton postId="test-post" />
          <button>Next focusable element</button>
        </div>
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /me too/i })).toBeInTheDocument()
      })

      const user = userEvent.setup()
      
      // Tab to MeToo button
      await user.tab()
      expect(screen.getByRole('button', { name: /me too/i })).toHaveFocus()

      // Tab to next element
      await user.tab()
      expect(screen.getByText('Next focusable element')).toHaveFocus()
    })
  })
})