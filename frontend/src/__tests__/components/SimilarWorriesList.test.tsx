import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import SimilarWorriesList from '../../components/SimilarWorriesList'
import { privacyFilteringService } from '../../services/privacyFilteringService'
import { useAuth } from '../../hooks/useAuth'

// Mock dependencies
vi.mock('../../services/privacyFilteringService')
vi.mock('../../hooks/useAuth')

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  )
}

const mockSimilarWorries = [
  {
    id: '1',
    shortContent: 'I worry about my health',
    category: 'Health & Wellness',
    privacyLevel: 'public' as const,
    userId: 'user1',
    user: { username: 'user1', id: 'user1' },
    createdAt: '2024-01-01T00:00:00Z',
    similarity: 0.85,
    isOwnPost: false
  },
  {
    id: '2',
    shortContent: 'My private health concern',
    category: 'Health & Wellness',
    privacyLevel: 'private' as const,
    userId: 'user2',
    user: { username: 'user2', id: 'user2' },
    createdAt: '2024-01-02T00:00:00Z',
    similarity: 0.78,
    isOwnPost: true
  }
]

describe('SimilarWorriesList Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default auth mock
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user2', username: 'user2' },
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      loading: false
    })
  })

  describe('Loading States', () => {
    it('should show loading spinner initially', () => {
      vi.mocked(privacyFilteringService.getSimilarWorries).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      renderWithRouter(<SimilarWorriesList postId="post1" />)

      expect(screen.getByText('Loading similar worries...')).toBeInTheDocument()
    })

    it('should show loading spinner with custom message', () => {
      vi.mocked(privacyFilteringService.getSimilarWorries).mockImplementation(
        () => new Promise(() => {})
      )

      renderWithRouter(
        <SimilarWorriesList 
          postId="post1" 
          loadingMessage="Finding related concerns..." 
        />
      )

      expect(screen.getByText('Finding related concerns...')).toBeInTheDocument()
    })
  })

  describe('Data Display', () => {
    it('should display similar worries correctly', async () => {
      vi.mocked(privacyFilteringService.getSimilarWorries).mockResolvedValue({
        similarWorries: mockSimilarWorries,
        totalCount: 2,
        visibleCount: 2,
        hasMore: false
      })

      renderWithRouter(<SimilarWorriesList postId="post1" />)

      await waitFor(() => {
        expect(screen.getByText('I worry about my health')).toBeInTheDocument()
        expect(screen.getByText('My private health concern')).toBeInTheDocument()
      })

      // Check similarity percentages
      expect(screen.getByText('85% similar')).toBeInTheDocument()
      expect(screen.getByText('78% similar')).toBeInTheDocument()

      // Check categories
      expect(screen.getAllByText('Health & Wellness')).toHaveLength(2)
    })

    it('should show privacy indicators correctly', async () => {
      vi.mocked(privacyFilteringService.getSimilarWorries).mockResolvedValue({
        similarWorries: mockSimilarWorries,
        totalCount: 2,
        visibleCount: 2,
        hasMore: false
      })

      renderWithRouter(<SimilarWorriesList postId="post1" />)

      await waitFor(() => {
        // Should show "Your post" for own private posts
        expect(screen.getByText('Your post')).toBeInTheDocument()
        
        // Should show username for other posts
        expect(screen.getByText('@user1')).toBeInTheDocument()
      })
    })

    it('should handle empty results gracefully', async () => {
      vi.mocked(privacyFilteringService.getSimilarWorries).mockResolvedValue({
        similarWorries: [],
        totalCount: 0,
        visibleCount: 0,
        hasMore: false
      })

      renderWithRouter(<SimilarWorriesList postId="post1" />)

      await waitFor(() => {
        expect(screen.getByText('No similar worries found')).toBeInTheDocument()
        expect(screen.getByText('This worry appears to be unique.')).toBeInTheDocument()
      })
    })

    it('should show custom empty message', async () => {
      vi.mocked(privacyFilteringService.getSimilarWorries).mockResolvedValue({
        similarWorries: [],
        totalCount: 0,
        visibleCount: 0,
        hasMore: false
      })

      renderWithRouter(
        <SimilarWorriesList 
          postId="post1" 
          emptyMessage="No related concerns found for this topic."
        />
      )

      await waitFor(() => {
        expect(screen.getByText('No related concerns found for this topic.')).toBeInTheDocument()
      })
    })
  })

  describe('Privacy Handling', () => {
    it('should request private posts for authenticated users', async () => {
      vi.mocked(privacyFilteringService.getSimilarWorries).mockResolvedValue({
        similarWorries: mockSimilarWorries,
        totalCount: 2,
        visibleCount: 2,
        hasMore: false
      })

      renderWithRouter(<SimilarWorriesList postId="post1" />)

      await waitFor(() => {
        expect(privacyFilteringService.getSimilarWorries).toHaveBeenCalledWith('post1', {
          userId: 'user2',
          includePrivate: true,
          limit: 10
        })
      })
    })

    it('should not request private posts for unauthenticated users', async () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        isAuthenticated: false,
        login: vi.fn(),
        logout: vi.fn(),
        loading: false
      })

      vi.mocked(privacyFilteringService.getSimilarWorries).mockResolvedValue({
        similarWorries: [mockSimilarWorries[0]], // Only public worry
        totalCount: 1,
        visibleCount: 1,
        hasMore: false
      })

      renderWithRouter(<SimilarWorriesList postId="post1" />)

      await waitFor(() => {
        expect(privacyFilteringService.getSimilarWorries).toHaveBeenCalledWith('post1', {
          includePrivate: false,
          limit: 10
        })
      })
    })

    it('should handle privacy changes correctly', async () => {
      const { rerender } = renderWithRouter(<SimilarWorriesList postId="post1" />)

      // Initially authenticated
      await waitFor(() => {
        expect(privacyFilteringService.getSimilarWorries).toHaveBeenCalledWith('post1', {
          userId: 'user2',
          includePrivate: true,
          limit: 10
        })
      })

      // Change to unauthenticated
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        isAuthenticated: false,
        login: vi.fn(),
        logout: vi.fn(),
        loading: false
      })

      rerender(<SimilarWorriesList postId="post1" />)

      await waitFor(() => {
        expect(privacyFilteringService.getSimilarWorries).toHaveBeenCalledWith('post1', {
          includePrivate: false,
          limit: 10
        })
      })
    })
  })

  describe('Error Handling', () => {
    it('should display error message on API failure', async () => {
      vi.mocked(privacyFilteringService.getSimilarWorries).mockRejectedValue(
        new Error('Network error')
      )

      renderWithRouter(<SimilarWorriesList postId="post1" />)

      await waitFor(() => {
        expect(screen.getByText('Unable to load similar worries')).toBeInTheDocument()
        expect(screen.getByText('Try Again')).toBeInTheDocument()
      })
    })

    it('should handle retry functionality', async () => {
      let callCount = 0
      vi.mocked(privacyFilteringService.getSimilarWorries).mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return Promise.reject(new Error('Network error'))
        }
        return Promise.resolve({
          similarWorries: mockSimilarWorries,
          totalCount: 2,
          visibleCount: 2,
          hasMore: false
        })
      })

      renderWithRouter(<SimilarWorriesList postId="post1" />)

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument()
      })

      // Click retry
      fireEvent.click(screen.getByText('Try Again'))

      // Wait for success
      await waitFor(() => {
        expect(screen.getByText('I worry about my health')).toBeInTheDocument()
      })

      expect(callCount).toBe(2)
    })

    it('should show custom error message', async () => {
      vi.mocked(privacyFilteringService.getSimilarWorries).mockRejectedValue(
        new Error('Custom error')
      )

      renderWithRouter(
        <SimilarWorriesList 
          postId="post1" 
          errorMessage="Failed to load related worries"
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Failed to load related worries')).toBeInTheDocument()
      })
    })
  })

  describe('Interaction', () => {
    it('should navigate to worry analysis page on click', async () => {
      vi.mocked(privacyFilteringService.getSimilarWorries).mockResolvedValue({
        similarWorries: mockSimilarWorries,
        totalCount: 2,
        visibleCount: 2,
        hasMore: false
      })

      renderWithRouter(<SimilarWorriesList postId="post1" />)

      await waitFor(() => {
        const worryLink = screen.getByText('I worry about my health').closest('a')
        expect(worryLink).toHaveAttribute('href', '/worry/1')
      })
    })

    it('should handle click events correctly', async () => {
      const onWorryClick = vi.fn()
      
      vi.mocked(privacyFilteringService.getSimilarWorries).mockResolvedValue({
        similarWorries: mockSimilarWorries,
        totalCount: 2,
        visibleCount: 2,
        hasMore: false
      })

      renderWithRouter(
        <SimilarWorriesList postId="post1" onWorryClick={onWorryClick} />
      )

      await waitFor(() => {
        fireEvent.click(screen.getByText('I worry about my health'))
      })

      expect(onWorryClick).toHaveBeenCalledWith(mockSimilarWorries[0])
    })
  })

  describe('Customization', () => {
    it('should respect custom limit', async () => {
      vi.mocked(privacyFilteringService.getSimilarWorries).mockResolvedValue({
        similarWorries: mockSimilarWorries,
        totalCount: 2,
        visibleCount: 2,
        hasMore: false
      })

      renderWithRouter(<SimilarWorriesList postId="post1" limit={5} />)

      await waitFor(() => {
        expect(privacyFilteringService.getSimilarWorries).toHaveBeenCalledWith('post1', {
          userId: 'user2',
          includePrivate: true,
          limit: 5
        })
      })
    })

    it('should apply custom className', async () => {
      vi.mocked(privacyFilteringService.getSimilarWorries).mockResolvedValue({
        similarWorries: [],
        totalCount: 0,
        visibleCount: 0,
        hasMore: false
      })

      const { container } = renderWithRouter(
        <SimilarWorriesList postId="post1" className="custom-class" />
      )

      expect(container.firstChild).toHaveClass('custom-class')
    })

    it('should show similarity percentages when enabled', async () => {
      vi.mocked(privacyFilteringService.getSimilarWorries).mockResolvedValue({
        similarWorries: mockSimilarWorries,
        totalCount: 2,
        visibleCount: 2,
        hasMore: false
      })

      renderWithRouter(
        <SimilarWorriesList postId="post1" showSimilarity={true} />
      )

      await waitFor(() => {
        expect(screen.getByText('85% similar')).toBeInTheDocument()
        expect(screen.getByText('78% similar')).toBeInTheDocument()
      })
    })

    it('should hide similarity percentages when disabled', async () => {
      vi.mocked(privacyFilteringService.getSimilarWorries).mockResolvedValue({
        similarWorries: mockSimilarWorries,
        totalCount: 2,
        visibleCount: 2,
        hasMore: false
      })

      renderWithRouter(
        <SimilarWorriesList postId="post1" showSimilarity={false} />
      )

      await waitFor(() => {
        expect(screen.queryByText('85% similar')).not.toBeInTheDocument()
        expect(screen.queryByText('78% similar')).not.toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      vi.mocked(privacyFilteringService.getSimilarWorries).mockResolvedValue({
        similarWorries: mockSimilarWorries,
        totalCount: 2,
        visibleCount: 2,
        hasMore: false
      })

      renderWithRouter(<SimilarWorriesList postId="post1" />)

      await waitFor(() => {
        expect(screen.getByRole('list')).toHaveAttribute('aria-label', 'Similar worries')
        expect(screen.getAllByRole('listitem')).toHaveLength(2)
      })
    })

    it('should support keyboard navigation', async () => {
      vi.mocked(privacyFilteringService.getSimilarWorries).mockResolvedValue({
        similarWorries: mockSimilarWorries,
        totalCount: 2,
        visibleCount: 2,
        hasMore: false
      })

      renderWithRouter(<SimilarWorriesList postId="post1" />)

      await waitFor(() => {
        const links = screen.getAllByRole('link')
        links.forEach(link => {
          expect(link).toHaveAttribute('tabIndex', '0')
        })
      })
    })
  })
})