import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import SimilarWorries from '../components/SimilarWorries'
import { worryAnalysisService } from '../services/worryAnalysisService'

// Mock the worryAnalysisService
vi.mock('../services/worryAnalysisService', () => ({
  worryAnalysisService: {
    getSimilarWorryCount: vi.fn()
  }
}))

const mockWorryAnalysisService = worryAnalysisService as any

describe('SimilarWorries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('displays similar worry count when available', async () => {
    mockWorryAnalysisService.getSimilarWorryCount.mockResolvedValue({ count: 5 })

    render(<SimilarWorries postId="test-post-id" />)

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByText('5 people have similar worries')).toBeInTheDocument()
    })
  })

  it('displays singular text for one similar worry', async () => {
    mockWorryAnalysisService.getSimilarWorryCount.mockResolvedValue({ count: 1 })

    render(<SimilarWorries postId="test-post-id" />)

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('1 person has similar worries')).toBeInTheDocument()
    })
  })

  it('displays no similar worries message when count is zero', async () => {
    mockWorryAnalysisService.getSimilarWorryCount.mockResolvedValue({ count: 0 })

    render(<SimilarWorries postId="test-post-id" />)

    await waitFor(() => {
      expect(screen.getByText('No similar worries found')).toBeInTheDocument()
    })
  })

  it('displays error message when API call fails', async () => {
    mockWorryAnalysisService.getSimilarWorryCount.mockRejectedValue(new Error('API Error'))

    render(<SimilarWorries postId="test-post-id" />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load similar worry count')).toBeInTheDocument()
      expect(screen.getByText('Try again')).toBeInTheDocument()
    })
  })

  it('shows loading state initially', () => {
    mockWorryAnalysisService.getSimilarWorryCount.mockImplementation(() => new Promise(() => {}))

    render(<SimilarWorries postId="test-post-id" />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('displays breakdown when showBreakdown is true', async () => {
    mockWorryAnalysisService.getSimilarWorryCount.mockResolvedValue({
      count: 12,
      breakdown: {
        aiDetectedSimilar: 7,
        meTooResponses: 5
      }
    })

    render(<SimilarWorries postId="test-post-id" showBreakdown={true} />)

    await waitFor(() => {
      expect(screen.getByText('12')).toBeInTheDocument()
      expect(screen.getByText('Breakdown')).toBeInTheDocument()
      expect(screen.getByText('AI Detected:')).toBeInTheDocument()
      expect(screen.getByText('7')).toBeInTheDocument()
      expect(screen.getByText('Me Too:')).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument()
    })
  })

  it('does not display breakdown when showBreakdown is false', async () => {
    mockWorryAnalysisService.getSimilarWorryCount.mockResolvedValue({
      count: 12,
      breakdown: {
        aiDetectedSimilar: 7,
        meTooResponses: 5
      }
    })

    render(<SimilarWorries postId="test-post-id" showBreakdown={false} />)

    await waitFor(() => {
      expect(screen.getByText('12')).toBeInTheDocument()
      expect(screen.queryByText('Breakdown')).not.toBeInTheDocument()
    })
  })

  it('calls onCountChange callback when count is loaded', async () => {
    const onCountChange = vi.fn()
    mockWorryAnalysisService.getSimilarWorryCount.mockResolvedValue({ count: 8 })

    render(<SimilarWorries postId="test-post-id" onCountChange={onCountChange} />)

    await waitFor(() => {
      expect(onCountChange).toHaveBeenCalledWith(8)
    })
  })

  it('updates count when meTooUpdated event is dispatched', async () => {
    mockWorryAnalysisService.getSimilarWorryCount.mockResolvedValue({
      count: 10,
      breakdown: {
        aiDetectedSimilar: 7,
        meTooResponses: 3
      }
    })

    render(<SimilarWorries postId="test-post-id" showBreakdown={true} />)

    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument() // Me Too count
    })

    // Simulate MeTooButton dispatching an update event
    fireEvent(window, new CustomEvent('meTooUpdated', {
      detail: { postId: 'test-post-id', meTooCount: 4, similarWorryCount: 11 }
    }))

    await waitFor(() => {
      expect(screen.getByText('11')).toBeInTheDocument() // Updated total
      expect(screen.getByText('4')).toBeInTheDocument() // Updated Me Too count
    })
  })

  it('ignores meTooUpdated events for different posts', async () => {
    mockWorryAnalysisService.getSimilarWorryCount.mockResolvedValue({ count: 5 })

    render(<SimilarWorries postId="test-post-id" />)

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument()
    })

    // Simulate event for different post
    fireEvent(window, new CustomEvent('meTooUpdated', {
      detail: { postId: 'different-post-id', meTooCount: 2, similarWorryCount: 8 }
    }))

    // Should still show original count
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('retries loading when try again button is clicked', async () => {
    mockWorryAnalysisService.getSimilarWorryCount
      .mockRejectedValueOnce(new Error('API Error'))
      .mockResolvedValueOnce({ count: 6 })

    render(<SimilarWorries postId="test-post-id" />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load similar worry count')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Try again'))

    await waitFor(() => {
      expect(screen.getByText('6')).toBeInTheDocument()
      expect(screen.getByText('6 people have similar worries')).toBeInTheDocument()
    })

    expect(mockWorryAnalysisService.getSimilarWorryCount).toHaveBeenCalledTimes(2)
  })

  it('calls API with correct breakdown parameter', async () => {
    mockWorryAnalysisService.getSimilarWorryCount.mockResolvedValue({ count: 3 })

    render(<SimilarWorries postId="test-post-id" showBreakdown={true} />)

    await waitFor(() => {
      expect(mockWorryAnalysisService.getSimilarWorryCount).toHaveBeenCalledWith('test-post-id', true)
    })
  })

  it('calls API without breakdown parameter when showBreakdown is false', async () => {
    mockWorryAnalysisService.getSimilarWorryCount.mockResolvedValue({ count: 3 })

    render(<SimilarWorries postId="test-post-id" showBreakdown={false} />)

    await waitFor(() => {
      expect(mockWorryAnalysisService.getSimilarWorryCount).toHaveBeenCalledWith('test-post-id', false)
    })
  })
})