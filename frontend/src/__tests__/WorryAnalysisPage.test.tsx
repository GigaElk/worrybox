import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import WorryAnalysisPage from '../pages/WorryAnalysisPage'
import { postService } from '../services/postService'
import { useAuth } from '../contexts/AuthContext'

// Mock the services and contexts
vi.mock('../services/postService', () => ({
  postService: {
    getPost: vi.fn()
  }
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn()
}))

// Mock the child components
vi.mock('../components/WorryAnalysis', () => ({
  default: ({ postId }: { postId: string }) => (
    <div data-testid="worry-analysis">Worry Analysis for {postId}</div>
  )
}))

vi.mock('../components/MeTooCount', () => ({
  default: ({ postId }: { postId: string }) => (
    <div data-testid="metoo-count">MeToo Count for {postId}</div>
  )
}))

vi.mock('../components/SimilarWorries', () => ({
  default: ({ postId, showBreakdown }: { postId: string; showBreakdown?: boolean }) => (
    <div data-testid="similar-worries">
      Similar Worries for {postId} {showBreakdown ? '(with breakdown)' : ''}
    </div>
  )
}))

vi.mock('../components/SimilarWorriesList', () => ({
  default: ({ postId }: { postId: string }) => (
    <div data-testid="similar-worries-list">Similar Worries List for {postId}</div>
  )
}))

const mockPostService = postService as any
const mockUseAuth = useAuth as any

// Mock useParams
const mockUseParams = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => mockUseParams()
  }
})

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  )
}

describe('WorryAnalysisPage', () => {
  const mockPost = {
    id: 'post1',
    worryPrompt: 'What worries you most?',
    shortContent: 'I am worried about my job security',
    user: {
      id: 'user1',
      username: 'testuser',
      displayName: 'Test User'
    },
    createdAt: '2024-01-15T10:00:00Z'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseParams.mockReturnValue({ postId: 'post1' })
    mockUseAuth.mockReturnValue({
      user: { id: 'user1', username: 'testuser' },
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false
    })
  })

  it('renders loading state initially', () => {
    mockPostService.getPost.mockImplementation(() => new Promise(() => {}))

    renderWithRouter(<WorryAnalysisPage />)
    
    // Check for loading spinner by class
    const loadingSpinner = document.querySelector('.animate-spin')
    expect(loadingSpinner).toBeInTheDocument()
  })

  it('renders error state when post loading fails', async () => {
    mockPostService.getPost.mockRejectedValue(new Error('Post not found'))

    renderWithRouter(<WorryAnalysisPage />)

    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument()
      expect(screen.getByText('Failed to load post')).toBeInTheDocument()
      expect(screen.getByText('Return to Home')).toBeInTheDocument()
    })
  })

  it('renders complete layout when post loads successfully', async () => {
    mockPostService.getPost.mockResolvedValue(mockPost)

    renderWithRouter(<WorryAnalysisPage />)

    await waitFor(() => {
      // Navigation
      expect(screen.getByText('Back to Post')).toBeInTheDocument()
      
      // Post Summary
      expect(screen.getByText('"What worries you most?"')).toBeInTheDocument()
      expect(screen.getByText('I am worried about my job security')).toBeInTheDocument()
      expect(screen.getByText('Posted by Test User')).toBeInTheDocument()
      
      // Section Headers
      expect(screen.getByText('Worry Analysis')).toBeInTheDocument()
      expect(screen.getByText('Response Metrics')).toBeInTheDocument()
      expect(screen.getByText('Related Worries')).toBeInTheDocument()
      
      // Component Integration
      expect(screen.getByTestId('worry-analysis')).toBeInTheDocument()
      expect(screen.getByTestId('metoo-count')).toBeInTheDocument()
      expect(screen.getByTestId('similar-worries')).toBeInTheDocument()
      expect(screen.getByTestId('similar-worries-list')).toBeInTheDocument()
    })
  })

  it('shows breakdown for similar worries component', async () => {
    mockPostService.getPost.mockResolvedValue(mockPost)

    renderWithRouter(<WorryAnalysisPage />)

    await waitFor(() => {
      expect(screen.getByText('Similar Worries for post1 (with breakdown)')).toBeInTheDocument()
    })
  })

  it('displays formatted date correctly', async () => {
    mockPostService.getPost.mockResolvedValue(mockPost)

    renderWithRouter(<WorryAnalysisPage />)

    await waitFor(() => {
      expect(screen.getByText('January 15, 2024')).toBeInTheDocument()
    })
  })

  it('shows mobile tip on smaller screens', async () => {
    mockPostService.getPost.mockResolvedValue(mockPost)

    renderWithRouter(<WorryAnalysisPage />)

    await waitFor(() => {
      expect(screen.getByText(/For the best analysis experience/)).toBeInTheDocument()
    })
  })

  it('renders subsection labels correctly', async () => {
    mockPostService.getPost.mockResolvedValue(mockPost)

    renderWithRouter(<WorryAnalysisPage />)

    await waitFor(() => {
      expect(screen.getByText('Direct Responses')).toBeInTheDocument()
      expect(screen.getByText('Similar Concerns')).toBeInTheDocument()
    })
  })

  it('handles missing display name gracefully', async () => {
    const postWithoutDisplayName = {
      ...mockPost,
      user: {
        id: 'user1',
        username: 'testuser'
        // no displayName
      }
    }
    mockPostService.getPost.mockResolvedValue(postWithoutDisplayName)

    renderWithRouter(<WorryAnalysisPage />)

    await waitFor(() => {
      expect(screen.getByText('Posted by testuser')).toBeInTheDocument()
    })
  })

  it('passes correct props to child components', async () => {
    mockPostService.getPost.mockResolvedValue(mockPost)

    renderWithRouter(<WorryAnalysisPage />)

    await waitFor(() => {
      expect(screen.getByText('Worry Analysis for post1')).toBeInTheDocument()
      expect(screen.getByText('MeToo Count for post1')).toBeInTheDocument()
      expect(screen.getByText('Similar Worries for post1 (with breakdown)')).toBeInTheDocument()
      expect(screen.getByText('Similar Worries List for post1')).toBeInTheDocument()
    })
  })

  it('has proper responsive classes', async () => {
    mockPostService.getPost.mockResolvedValue(mockPost)

    const { container } = renderWithRouter(<WorryAnalysisPage />)

    await waitFor(() => {
      // Check for responsive grid classes
      const gridContainer = container.querySelector('.grid.grid-cols-1.xl\\:grid-cols-3')
      expect(gridContainer).toBeInTheDocument()
      
      // Check for responsive padding classes
      const mainContainer = container.querySelector('.px-4.sm\\:px-6.lg\\:px-8')
      expect(mainContainer).toBeInTheDocument()
    })
  })
})