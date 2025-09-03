import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { MemoryRouter } from 'react-router-dom'
import WorryAnalysisPage from '../../pages/WorryAnalysisPage'
import { postService } from '../../services/postService'
import { privacyFilteringService } from '../../services/privacyFilteringService'
import { useAuth } from '../../hooks/useAuth'

// Mock all dependencies
vi.mock('../../services/postService')
vi.mock('../../services/privacyFilteringService')
vi.mock('../../hooks/useAuth')
vi.mock('../../components/WorryAnalysis', () => ({
  default: () => <div data-testid="worry-analysis">Worry Analysis Component</div>
}))

const renderWithRouter = (component: React.ReactElement, initialEntries = ['/worry/1']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      {component}
    </MemoryRouter>
  )
}

const mockPost = {
  id: '1',
  shortContent: 'I worry about my health',
  content: 'I have been worrying about my health lately and it is affecting my daily life.',
  category: 'Health & Wellness',
  privacyLevel: 'public' as const,
  userId: 'user1',
  user: { username: 'testuser', id: 'user1' },
  createdAt: '2024-01-01T00:00:00Z'
}

const mockSimilarWorries = [
  {
    id: '2',
    shortContent: 'Health anxiety is real',
    category: 'Health & Wellness',
    privacyLevel: 'public' as const,
    userId: 'user2',
    user: { username: 'user2', id: 'user2' },
    createdAt: '2024-01-02T00:00:00Z',
    similarity: 0.85,
    isOwnPost: false
  }
]

describe('WorryAnalysisPage Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default auth mock
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user1', username: 'testuser' },
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      loading: false
    })
  })

  describe('Page Loading', () => {
    it('should load and display post with all components', async () => {
      // Mock post loading
      vi.mocked(postService.getPost).mockResolvedValue(mockPost)
      
      // Mock similar worries
      vi.mocked(privacyFilteringService.getSimilarWorries).mockResolvedValue({
        similarWorries: mockSimilarWorries,
        totalCount: 1,
        visibleCount: 1,
        hasMore: false
      })
      
      // Mock counts
      vi.mocked(privacyFilteringService.getMeTooCount).mockResolvedValue({ count: 3 })
      vi.mocked(privacyFilteringService.getSimilarWorriesCount).mockResolvedValue({
        totalCount: 5,
        aiSimilarCount: 4,
        meTooCount: 1
      })

      renderWithRouter(<WorryAnalysisPage />)

      // Check post content
      await waitFor(() => {
        expect(screen.getByText('I worry about my health')).toBeInTheDocument()
        expect(screen.getByText('Health & Wellness')).toBeInTheDocument()
        expect(screen.getByText('@testuser')).toBeInTheDocument()
      })

      // Check components are rendered
      expect(screen.getByTestId('worry-analysis')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument() // Me Too count
      expect(screen.getByText('5')).toBeInTheDocument() // Similar worries count
    })

    it('should show loading state initially', () => {
      vi.mocked(postService.getPost).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      renderWithRouter(<WorryAnalysisPage />)

      expect(screen.getByText('Loading post...')).toBeInTheDocument()
    })

    it('should handle post not found', async () => {
      vi.mocked(postService.getPost).mockRejectedValue(
        new Error('Post not found')
      )

      renderWithRouter(<WorryAnalysisPage />)

      await waitFor(() => {
        expect(screen.getByText('Post not found')).toBeInTheDocument()
        expect(screen.getByText('Back to Home')).toBeInTheDocument()
      })
    })
  })

  describe('Privacy Integration', () => {
    it('should request private data for authenticated users', async () => {
      vi.mocked(postService.getPost).mockResolvedValue(mockPost)
      vi.mocked(privacyFilteringService.getSimilarWorries).mockResolvedValue({
        similarWorries: [],
        totalCount: 0,
        visibleCount: 0,
        hasMore: false
      })
      vi.mocked(privacyFilteringService.getMeTooCount).mockResolvedValue({ count: 0 })
      vi.mocked(privacyFilteringService.getSimilarWorriesCount).mockResolvedValue({
        totalCount: 0,
        aiSimilarCount: 0,
        meTooCount: 0
      })

      renderWithRouter(<WorryAnalysisPage />)

      await waitFor(() => {
        expect(privacyFilteringService.getSimilarWorries).toHaveBeenCalledWith('1', {
          userId: 'user1',
          includePrivate: true,
          limit: 10
        })
      })
    })

    it('should handle unauthenticated users', async () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        isAuthenticated: false,
        login: vi.fn(),
        logout: vi.fn(),
        loading: false
      })

      vi.mocked(postService.getPost).mockResolvedValue(mockPost)
      vi.mocked(privacyFilteringService.getSimilarWorries).mockResolvedValue({
        similarWorries: [],
        totalCount: 0,
        visibleCount: 0,
        hasMore: false
      })
      vi.mocked(privacyFilteringService.getMeTooCount).mockResolvedValue({ count: 0 })
      vi.mocked(privacyFilteringService.getSimilarWorriesCount).mockResolvedValue({
        totalCount: 0,
        aiSimilarCount: 0,
        meTooCount: 0
      })

      renderWithRouter(<WorryAnalysisPage />)

      await waitFor(() => {
        expect(privacyFilteringService.getSimilarWorries).toHaveBeenCalledWith('1', {
          includePrivate: false,
          limit: 10
        })
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle individual component failures gracefully', async () => {
      vi.mocked(postService.getPost).mockResolvedValue(mockPost)
      
      // Similar worries fails
      vi.mocked(privacyFilteringService.getSimilarWorries).mockRejectedValue(
        new Error('Similar worries error')
      )
      
      // Counts succeed
      vi.mocked(privacyFilteringService.getMeTooCount).mockResolvedValue({ count: 3 })
      vi.mocked(privacyFilteringService.getSimilarWorriesCount).mockResolvedValue({
        totalCount: 5,
        aiSimilarCount: 4,
        meTooCount: 1
      })

      renderWithRouter(<WorryAnalysisPage />)

      await waitFor(() => {
        // Post should still load
        expect(screen.getByText('I worry about my health')).toBeInTheDocument()
        
        // Counts should still work
        expect(screen.getByText('3')).toBeInTheDocument()
        expect(screen.getByText('5')).toBeInTheDocument()
        
        // Similar worries should show error
        expect(screen.getByText('Unable to load similar worries')).toBeInTheDocument()
      })
    })

    it('should show retry option for failed components', async () => {
      vi.mocked(postService.getPost).mockResolvedValue(mockPost)
      vi.mocked(privacyFilteringService.getSimilarWorries).mockRejectedValue(
        new Error('Network error')
      )
      vi.mocked(privacyFilteringService.getMeTooCount).mockResolvedValue({ count: 0 })
      vi.mocked(privacyFilteringService.getSimilarWorriesCount).mockResolvedValue({
        totalCount: 0,
        aiSimilarCount: 0,
        meTooCount: 0
      })

      renderWithRouter(<WorryAnalysisPage />)

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument()
      })
    })
  })

  describe('Responsive Layout', () => {
    it('should render two-column layout structure', async () => {
      vi.mocked(postService.getPost).mockResolvedValue(mockPost)
      vi.mocked(privacyFilteringService.getSimilarWorries).mockResolvedValue({
        similarWorries: mockSimilarWorries,
        totalCount: 1,
        visibleCount: 1,
        hasMore: false
      })
      vi.mocked(privacyFilteringService.getMeTooCount).mockResolvedValue({ count: 3 })
      vi.mocked(privacyFilteringService.getSimilarWorriesCount).mockResolvedValue({
        totalCount: 5,
        aiSimilarCount: 4,
        meTooCount: 1
      })

      const { container } = renderWithRouter(<WorryAnalysisPage />)

      await waitFor(() => {
        // Check for grid layout
        expect(container.querySelector('.grid')).toBeInTheDocument()
        expect(container.querySelector('.xl\\:col-span-2')).toBeInTheDocument()
        expect(container.querySelector('.xl\\:col-span-1')).toBeInTheDocument()
      })
    })
  })

  describe('Navigation', () => {
    it('should have back to home link', async () => {
      vi.mocked(postService.getPost).mockResolvedValue(mockPost)
      vi.mocked(privacyFilteringService.getSimilarWorries).mockResolvedValue({
        similarWorries: [],
        totalCount: 0,
        visibleCount: 0,
        hasMore: false
      })
      vi.mocked(privacyFilteringService.getMeTooCount).mockResolvedValue({ count: 0 })
      vi.mocked(privacyFilteringService.getSimilarWorriesCount).mockResolvedValue({
        totalCount: 0,
        aiSimilarCount: 0,
        meTooCount: 0
      })

      renderWithRouter(<WorryAnalysisPage />)

      await waitFor(() => {
        const backLink = screen.getByText('Back to Home').closest('a')
        expect(backLink).toHaveAttribute('href', '/')
      })
    })
  })

  describe('Real-time Updates', () => {
    it('should handle real-time count updates', async () => {
      vi.mocked(postService.getPost).mockResolvedValue(mockPost)
      vi.mocked(privacyFilteringService.getSimilarWorries).mockResolvedValue({
        similarWorries: [],
        totalCount: 0,
        visibleCount: 0,
        hasMore: false
      })
      vi.mocked(privacyFilteringService.getMeTooCount).mockResolvedValue({ count: 3 })
      vi.mocked(privacyFilteringService.getSimilarWorriesCount).mockResolvedValue({
        totalCount: 5,
        aiSimilarCount: 4,
        meTooCount: 1
      })

      renderWithRouter(<WorryAnalysisPage />)

      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument()
      })

      // Simulate real-time update
      const updateEvent = new CustomEvent('meTooUpdated', {
        detail: { postId: '1', newCount: 4 }
      })
      window.dispatchEvent(updateEvent)

      await waitFor(() => {
        expect(screen.getByText('4')).toBeInTheDocument()
      })
    })
  })
})