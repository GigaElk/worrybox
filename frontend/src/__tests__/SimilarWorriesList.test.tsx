import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import SimilarWorriesList from '../components/SimilarWorriesList'
import { worryAnalysisService } from '../services/worryAnalysisService'
import { useAuth } from '../contexts/AuthContext'

// Mock the services and contexts
vi.mock('../services/worryAnalysisService', () => ({
  worryAnalysisService: {
    findSimilarWorriesEnhanced: vi.fn()
  }
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn()
}))

const mockWorryAnalysisService = worryAnalysisService as any
const mockUseAuth = useAuth as any

describe('SimilarWorriesList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({
      user: { id: 'user1', username: 'testuser' },
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false
    })
  })

  it('renders loading state initially', () => {
    mockWorryAnalysisService.findSimilarWorriesEnhanced.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    )

    render(<SimilarWorriesList postId="post1" />)
    
    expect(screen.getByText('Loading similar worries...')).toBeInTheDocument()
    expect(screen.getByText('Similar Worries')).toBeInTheDocument()
  })

  it('renders similar worries list successfully', async () => {
    const mockResponse = {
      similarWorries: [
        {
          id: 'worry1',
          shortContent: 'I am worried about my job security',
          category: 'Work & Career',
          similarity: 0.85,
          isOwnPost: false,
          privacyLevel: 'public' as const,
          createdAt: '2024-01-15T10:00:00Z',
          user: {
            id: 'user2',
            username: 'otheruser',
            displayName: 'Other User'
          }
        },
        {
          id: 'worry2',
          shortContent: 'Concerned about my private thoughts',
          category: 'Personal Growth',
          similarity: 0.72,
          isOwnPost: true,
          privacyLevel: 'private' as const,
          createdAt: '2024-01-10T15:30:00Z'
        }
      ],
      totalCount: 2,
      visibleCount: 2,
      hasMore: false
    }

    mockWorryAnalysisService.findSimilarWorriesEnhanced.mockResolvedValue(mockResponse)

    render(<SimilarWorriesList postId="post1" />)

    await waitFor(() => {
      expect(screen.getByText('Similar Worries')).toBeInTheDocument()
      expect(screen.getByText('2 of 2')).toBeInTheDocument()
    })

    // Check first worry (public)
    expect(screen.getByText('"I am worried about my job security"')).toBeInTheDocument()
    expect(screen.getByText('Work & Career')).toBeInTheDocument()
    expect(screen.getByText('85% similar')).toBeInTheDocument()
    expect(screen.getByText('by @otheruser')).toBeInTheDocument()

    // Check second worry (own private post)
    expect(screen.getByText('"Concerned about my private thoughts"')).toBeInTheDocument()
    expect(screen.getByText('(Your private post)')).toBeInTheDocument()
    expect(screen.getByText('Personal Growth')).toBeInTheDocument()
    expect(screen.getByText('72% similar')).toBeInTheDocument()
  })

  it('renders empty state when no similar worries found', async () => {
    const mockResponse = {
      similarWorries: [],
      totalCount: 0,
      visibleCount: 0,
      hasMore: false
    }

    mockWorryAnalysisService.findSimilarWorriesEnhanced.mockResolvedValue(mockResponse)

    render(<SimilarWorriesList postId="post1" />)

    await waitFor(() => {
      expect(screen.getByText('No similar worries found')).toBeInTheDocument()
      expect(screen.getByText('This worry appears to be unique')).toBeInTheDocument()
    })
  })

  it('renders error state when API call fails', async () => {
    mockWorryAnalysisService.findSimilarWorriesEnhanced.mockRejectedValue(
      new Error('API Error')
    )

    render(<SimilarWorriesList postId="post1" />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load similar worries')).toBeInTheDocument()
      expect(screen.getByText('Try again')).toBeInTheDocument()
    })
  })

  it('calls API with correct parameters for authenticated user', async () => {
    const mockResponse = {
      similarWorries: [],
      totalCount: 0,
      visibleCount: 0,
      hasMore: false
    }

    mockWorryAnalysisService.findSimilarWorriesEnhanced.mockResolvedValue(mockResponse)

    render(<SimilarWorriesList postId="post1" limit={5} />)

    await waitFor(() => {
      expect(mockWorryAnalysisService.findSimilarWorriesEnhanced).toHaveBeenCalledWith(
        'post1',
        5,
        true // includePrivate should be true for authenticated user
      )
    })
  })

  it('calls API with correct parameters for unauthenticated user', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false
    })

    const mockResponse = {
      similarWorries: [],
      totalCount: 0,
      visibleCount: 0,
      hasMore: false
    }

    mockWorryAnalysisService.findSimilarWorriesEnhanced.mockResolvedValue(mockResponse)

    render(<SimilarWorriesList postId="post1" />)

    await waitFor(() => {
      expect(mockWorryAnalysisService.findSimilarWorriesEnhanced).toHaveBeenCalledWith(
        'post1',
        10,
        false // includePrivate should be false for unauthenticated user
      )
    })
  })

  it('displays privacy indicators correctly', async () => {
    const mockResponse = {
      similarWorries: [
        {
          id: 'worry1',
          shortContent: 'My private worry',
          category: 'Personal Growth',
          similarity: 0.90,
          isOwnPost: true,
          privacyLevel: 'private' as const,
          createdAt: '2024-01-15T10:00:00Z'
        }
      ],
      totalCount: 1,
      visibleCount: 1,
      hasMore: false
    }

    mockWorryAnalysisService.findSimilarWorriesEnhanced.mockResolvedValue(mockResponse)

    render(<SimilarWorriesList postId="post1" />)

    await waitFor(() => {
      // Should show lock icon for private posts
      expect(screen.getByText('(Your private post)')).toBeInTheDocument()
      // Should have blue background for own posts - find the worry container div
      const worryContainer = screen.getByText('"My private worry"').closest('.p-4')
      expect(worryContainer).toHaveClass('border-blue-200', 'bg-blue-50/50')
    })
  })
})