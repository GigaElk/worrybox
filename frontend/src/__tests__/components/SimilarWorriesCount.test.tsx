import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import SimilarWorriesCount from '../../components/SimilarWorriesCount'
import { privacyFilteringService } from '../../services/privacyFilteringService'

// Mock the privacy filtering service
vi.mock('../../services/privacyFilteringService')

describe('SimilarWorriesCount Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Functionality', () => {
    it('should display total count correctly', async () => {
      vi.mocked(privacyFilteringService.getSimilarWorriesCount).mockResolvedValue({
        totalCount: 15,
        aiSimilarCount: 10,
        meTooCount: 5
      })

      render(<SimilarWorriesCount postId="post1" />)

      await waitFor(() => {
        expect(screen.getByText('15')).toBeInTheDocument()
        expect(screen.getByText('Similar Concerns')).toBeInTheDocument()
      })
    })

    it('should show breakdown when requested', async () => {
      vi.mocked(privacyFilteringService.getSimilarWorriesCount).mockResolvedValue({
        totalCount: 15,
        aiSimilarCount: 10,
        meTooCount: 5,
        breakdown: {
          aiSimilar: 10,
          meToo: 5
        }
      })

      render(<SimilarWorriesCount postId="post1" showBreakdown={true} />)

      await waitFor(() => {
        expect(screen.getByText('15')).toBeInTheDocument()
        expect(screen.getByText('10 AI Similar')).toBeInTheDocument()
        expect(screen.getByText('5 Me Too')).toBeInTheDocument()
      })
    })

    it('should handle zero counts', async () => {
      vi.mocked(privacyFilteringService.getSimilarWorriesCount).mockResolvedValue({
        totalCount: 0,
        aiSimilarCount: 0,
        meTooCount: 0
      })

      render(<SimilarWorriesCount postId="post1" />)

      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should display error state on API failure', async () => {
      vi.mocked(privacyFilteringService.getSimilarWorriesCount).mockRejectedValue(
        new Error('Network error')
      )

      render(<SimilarWorriesCount postId="post1" />)

      await waitFor(() => {
        expect(screen.getByText('Error loading count')).toBeInTheDocument()
      })
    })

    it('should show fallback value on error', async () => {
      vi.mocked(privacyFilteringService.getSimilarWorriesCount).mockRejectedValue(
        new Error('Network error')
      )

      render(<SimilarWorriesCount postId="post1" fallbackValue={8} />)

      await waitFor(() => {
        expect(screen.getByText('8')).toBeInTheDocument()
      })
    })
  })
})  d
escribe('Real-time Updates', () => {
    it('should update count when similarWorriesUpdated event is fired', async () => {
      vi.mocked(privacyFilteringService.getSimilarWorriesCount).mockResolvedValue({
        totalCount: 15,
        aiSimilarCount: 10,
        meTooCount: 5
      })

      render(<SimilarWorriesCount postId="post1" enableRealTimeUpdates={true} />)

      await waitFor(() => {
        expect(screen.getByText('15')).toBeInTheDocument()
      })

      // Simulate real-time update
      const updateEvent = new CustomEvent('similarWorriesUpdated', {
        detail: { 
          postId: 'post1', 
          totalCount: 18,
          aiSimilarCount: 12,
          meTooCount: 6
        }
      })
      window.dispatchEvent(updateEvent)

      await waitFor(() => {
        expect(screen.getByText('18')).toBeInTheDocument()
      })
    })

    it('should animate changes when enabled', async () => {
      vi.mocked(privacyFilteringService.getSimilarWorriesCount).mockResolvedValue({
        totalCount: 15,
        aiSimilarCount: 10,
        meTooCount: 5
      })

      const { container } = render(
        <SimilarWorriesCount 
          postId="post1" 
          animateChanges={true} 
          enableRealTimeUpdates={true} 
        />
      )

      await waitFor(() => {
        expect(screen.getByText('15')).toBeInTheDocument()
      })

      // Simulate update
      const updateEvent = new CustomEvent('similarWorriesUpdated', {
        detail: { postId: 'post1', totalCount: 16 }
      })
      window.dispatchEvent(updateEvent)

      // Check for animation class
      await waitFor(() => {
        expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
      })
    })
  })

  describe('Customization', () => {
    it('should use custom label', async () => {
      vi.mocked(privacyFilteringService.getSimilarWorriesCount).mockResolvedValue({
        totalCount: 15,
        aiSimilarCount: 10,
        meTooCount: 5
      })

      render(<SimilarWorriesCount postId="post1" label="Related Worries" />)

      await waitFor(() => {
        expect(screen.getByText('Related Worries')).toBeInTheDocument()
      })
    })

    it('should show compact format', async () => {
      vi.mocked(privacyFilteringService.getSimilarWorriesCount).mockResolvedValue({
        totalCount: 1234,
        aiSimilarCount: 800,
        meTooCount: 434
      })

      render(<SimilarWorriesCount postId="post1" compact={true} />)

      await waitFor(() => {
        expect(screen.getByText('1.2K')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      vi.mocked(privacyFilteringService.getSimilarWorriesCount).mockResolvedValue({
        totalCount: 15,
        aiSimilarCount: 10,
        meTooCount: 5
      })

      render(<SimilarWorriesCount postId="post1" />)

      await waitFor(() => {
        expect(screen.getByLabelText('Similar concerns count: 15')).toBeInTheDocument()
      })
    })
  })
})