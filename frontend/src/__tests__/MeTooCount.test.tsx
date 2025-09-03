import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import MeTooCount from '../components/MeTooCount'
import { meTooService } from '../services/meTooService'

// Mock the meTooService
vi.mock('../services/meTooService', () => ({
  meTooService: {
    getMeTooCount: vi.fn()
  }
}))

const mockMeTooService = meTooService as any

describe('MeTooCount', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state initially', () => {
    mockMeTooService.getMeTooCount.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    )

    render(<MeTooCount postId="post1" />)
    
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('displays Me Too count when available', async () => {
    mockMeTooService.getMeTooCount.mockResolvedValue(5)

    render(<MeTooCount postId="post1" />)

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByText('5 people said "Me Too"')).toBeInTheDocument()
    })
  })

  it('displays singular text for one Me Too', async () => {
    mockMeTooService.getMeTooCount.mockResolvedValue(1)

    render(<MeTooCount postId="post1" />)

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('1 person said "Me Too"')).toBeInTheDocument()
    })
  })

  it('displays no Me Too message when count is zero', async () => {
    mockMeTooService.getMeTooCount.mockResolvedValue(0)

    render(<MeTooCount postId="post1" />)

    await waitFor(() => {
      expect(screen.getByText('No "Me Too" responses yet')).toBeInTheDocument()
    })
  })

  it('displays error message when API call fails', async () => {
    mockMeTooService.getMeTooCount.mockRejectedValue(new Error('API Error'))

    render(<MeTooCount postId="post1" />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load Me Too count')).toBeInTheDocument()
      expect(screen.getByText('Try again')).toBeInTheDocument()
    })
  })

  it('retries loading when try again button is clicked', async () => {
    mockMeTooService.getMeTooCount
      .mockRejectedValueOnce(new Error('API Error'))
      .mockResolvedValueOnce(3)

    render(<MeTooCount postId="post1" />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load Me Too count')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Try again'))

    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument()
      expect(screen.getByText('3 people said "Me Too"')).toBeInTheDocument()
    })

    expect(mockMeTooService.getMeTooCount).toHaveBeenCalledTimes(2)
  })

  it('calls onCountChange callback when count is loaded', async () => {
    const onCountChange = vi.fn()
    mockMeTooService.getMeTooCount.mockResolvedValue(7)

    render(<MeTooCount postId="post1" onCountChange={onCountChange} />)

    await waitFor(() => {
      expect(onCountChange).toHaveBeenCalledWith(7)
    })
  })

  it('updates count when meTooUpdated event is dispatched', async () => {
    mockMeTooService.getMeTooCount.mockResolvedValue(2)

    render(<MeTooCount postId="post1" />)

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument()
    })

    // Simulate MeTooButton dispatching an update event
    fireEvent(window, new CustomEvent('meTooUpdated', {
      detail: { postId: 'post1', meTooCount: 3, similarWorryCount: 8 }
    }))

    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument()
      expect(screen.getByText('3 people said "Me Too"')).toBeInTheDocument()
    })
  })

  it('ignores meTooUpdated events for different posts', async () => {
    mockMeTooService.getMeTooCount.mockResolvedValue(2)

    render(<MeTooCount postId="post1" />)

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument()
    })

    // Simulate event for different post
    fireEvent(window, new CustomEvent('meTooUpdated', {
      detail: { postId: 'post2', meTooCount: 5, similarWorryCount: 10 }
    }))

    // Should still show original count
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('2 people said "Me Too"')).toBeInTheDocument()
  })

  it('applies custom className', async () => {
    mockMeTooService.getMeTooCount.mockResolvedValue(1)

    const { container } = render(<MeTooCount postId="post1" className="custom-class" />)

    await waitFor(() => {
      expect(container.firstChild).toHaveClass('custom-class')
    })
  })

  it('shows heart icon for non-zero counts', async () => {
    mockMeTooService.getMeTooCount.mockResolvedValue(3)

    render(<MeTooCount postId="post1" />)

    await waitFor(() => {
      // Heart icon should be present in the count display
      const heartIcon = document.querySelector('.lucide-heart')
      expect(heartIcon).toBeInTheDocument()
    })
  })

  it('shows heart icon for zero counts in empty state', async () => {
    mockMeTooService.getMeTooCount.mockResolvedValue(0)

    render(<MeTooCount postId="post1" />)

    await waitFor(() => {
      // Heart icon should be present in the empty state
      const heartIcon = document.querySelector('.lucide-heart')
      expect(heartIcon).toBeInTheDocument()
    })
  })
})