import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import MeTooCount from '../../components/MeTooCount'
import { privacyFilteringService } from '../../services/privacyFilteringService'

// Mock the privacy filtering service
vi.mock('../../services/privacyFilteringService')

describe('MeTooCount Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Functionality', () => {
    it('should display me too count correctly', async () => {
      vi.mocked(privacyFilteringService.getMeTooCount).mockResolvedValue({
        count: 5
      })

      render(<MeTooCount postId="post1" />)

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument()
        expect(screen.getByText('Me Too')).toBeInTheDocument()
      })
    })

    it('should show loading state initially', () => {
      vi.mocked(privacyFilteringService.getMeTooCount).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      render(<MeTooCount postId="post1" />)

      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('should handle zero count', async () => {
      vi.mocked(privacyFilteringService.getMeTooCount).mockResolvedValue({
        count: 0
      })

      render(<MeTooCount postId="post1" />)

      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument()
        expect(screen.getByText('Me Too')).toBeInTheDocument()
      })
    })

    it('should handle large numbers correctly', async () => {
      vi.mocked(privacyFilteringService.getMeTooCount).mockResolvedValue({
        count: 1234
      })

      render(<MeTooCount postId="post1" />)

      await waitFor(() => {
        expect(screen.getByText('1,234')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should display error state on API failure', async () => {
      vi.mocked(privacyFilteringService.getMeTooCount).mockRejectedValue(
        new Error('Network error')
      )

      render(<MeTooCount postId="post1" />)

      await waitFor(() => {
        expect(screen.getByText('Error loading count')).toBeInTheDocument()
      })
    })

    it('should show fallback value on error when provided', async () => {
      vi.mocked(privacyFilteringService.getMeTooCount).mockRejectedValue(
        new Error('Network error')
      )

      render(<MeTooCount postId="post1" fallbackValue={3} />)

      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument()
        expect(screen.getByText('Me Too')).toBeInTheDocument()
      })
    })

    it('should handle retry functionality', async () => {
      let callCount = 0
      vi.mocked(privacyFilteringService.getMeTooCount).mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return Promise.reject(new Error('Network error'))
        }
        return Promise.resolve({ count: 7 })
      })

      render(<MeTooCount postId="post1" showRetry={true} />)

      // Wait for error
      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument()
      })

      // Click retry
      fireEvent.click(screen.getByText('Retry'))

      // Wait for success
      await waitFor(() => {
        expect(screen.getByText('7')).toBeInTheDocument()
      })

      expect(callCount).toBe(2)
    })
  })

  describe('Real-time Updates', () => {
    it('should update count when meTooUpdated event is fired', async () => {
      vi.mocked(privacyFilteringService.getMeTooCount).mockResolvedValue({
        count: 5
      })

      render(<MeTooCount postId="post1" enableRealTimeUpdates={true} />)

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument()
      })

      // Simulate real-time update
      const updateEvent = new CustomEvent('meTooUpdated', {
        detail: { postId: 'post1', newCount: 8 }
      })
      window.dispatchEvent(updateEvent)

      await waitFor(() => {
        expect(screen.getByText('8')).toBeInTheDocument()
      })
    })

    it('should ignore updates for different posts', async () => {
      vi.mocked(privacyFilteringService.getMeTooCount).mockResolvedValue({
        count: 5
      })

      render(<MeTooCount postId="post1" enableRealTimeUpdates={true} />)

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument()
      })

      // Simulate update for different post
      const updateEvent = new CustomEvent('meTooUpdated', {
        detail: { postId: 'post2', newCount: 10 }
      })
      window.dispatchEvent(updateEvent)

      // Count should remain unchanged
      expect(screen.getByText('5')).toBeInTheDocument()
    })

    it('should clean up event listeners on unmount', async () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

      const { unmount } = render(
        <MeTooCount postId="post1" enableRealTimeUpdates={true} />
      )

      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'meTooUpdated',
        expect.any(Function)
      )
    })
  })

  describe('Customization', () => {
    it('should apply custom className', async () => {
      vi.mocked(privacyFilteringService.getMeTooCount).mockResolvedValue({
        count: 5
      })

      const { container } = render(
        <MeTooCount postId="post1" className="custom-class" />
      )

      expect(container.firstChild).toHaveClass('custom-class')
    })

    it('should use custom label', async () => {
      vi.mocked(privacyFilteringService.getMeTooCount).mockResolvedValue({
        count: 5
      })

      render(<MeTooCount postId="post1" label="Direct Responses" />)

      await waitFor(() => {
        expect(screen.getByText('Direct Responses')).toBeInTheDocument()
      })
    })

    it('should show compact format when requested', async () => {
      vi.mocked(privacyFilteringService.getMeTooCount).mockResolvedValue({
        count: 1234
      })

      render(<MeTooCount postId="post1" compact={true} />)

      await waitFor(() => {
        expect(screen.getByText('1.2K')).toBeInTheDocument()
      })
    })

    it('should animate changes when enabled', async () => {
      vi.mocked(privacyFilteringService.getMeTooCount).mockResolvedValue({
        count: 5
      })

      const { container } = render(
        <MeTooCount postId="post1" animateChanges={true} enableRealTimeUpdates={true} />
      )

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument()
      })

      // Simulate update
      const updateEvent = new CustomEvent('meTooUpdated', {
        detail: { postId: 'post1', newCount: 6 }
      })
      window.dispatchEvent(updateEvent)

      // Check for animation class
      await waitFor(() => {
        expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      vi.mocked(privacyFilteringService.getMeTooCount).mockResolvedValue({
        count: 5
      })

      render(<MeTooCount postId="post1" />)

      await waitFor(() => {
        expect(screen.getByLabelText('Me Too count: 5')).toBeInTheDocument()
      })
    })

    it('should announce count changes to screen readers', async () => {
      vi.mocked(privacyFilteringService.getMeTooCount).mockResolvedValue({
        count: 5
      })

      render(<MeTooCount postId="post1" enableRealTimeUpdates={true} />)

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument()
      })

      // Simulate update
      const updateEvent = new CustomEvent('meTooUpdated', {
        detail: { postId: 'post1', newCount: 6 }
      })
      window.dispatchEvent(updateEvent)

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent('Me Too count updated to 6')
      })
    })
  })

  describe('Performance', () => {
    it('should debounce rapid updates', async () => {
      vi.mocked(privacyFilteringService.getMeTooCount).mockResolvedValue({
        count: 5
      })

      render(<MeTooCount postId="post1" enableRealTimeUpdates={true} />)

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument()
      })

      // Fire multiple rapid updates
      for (let i = 6; i <= 10; i++) {
        const updateEvent = new CustomEvent('meTooUpdated', {
          detail: { postId: 'post1', newCount: i }
        })
        window.dispatchEvent(updateEvent)
      }

      // Should only show the final count after debounce
      await waitFor(() => {
        expect(screen.getByText('10')).toBeInTheDocument()
      }, { timeout: 1000 })
    })

    it('should not re-render unnecessarily', async () => {
      let renderCount = 0
      
      const TestWrapper: React.FC<{ count: number }> = ({ count }) => {
        renderCount++
        return <MeTooCount postId="post1" fallbackValue={count} />
      }

      const { rerender } = render(<TestWrapper count={5} />)
      expect(renderCount).toBe(1)

      // Re-render with same props
      rerender(<TestWrapper count={5} />)
      expect(renderCount).toBe(1) // Should not re-render due to memoization

      // Re-render with different props
      rerender(<TestWrapper count={6} />)
      expect(renderCount).toBe(2) // Should re-render
    })
  })

  describe('Edge Cases', () => {
    it('should handle invalid postId gracefully', async () => {
      vi.mocked(privacyFilteringService.getMeTooCount).mockRejectedValue(
        new Error('Invalid post ID')
      )

      render(<MeTooCount postId="" />)

      await waitFor(() => {
        expect(screen.getByText('Error loading count')).toBeInTheDocument()
      })
    })

    it('should handle negative counts', async () => {
      vi.mocked(privacyFilteringService.getMeTooCount).mockResolvedValue({
        count: -1
      })

      render(<MeTooCount postId="post1" />)

      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument() // Should normalize to 0
      })
    })

    it('should handle very large numbers', async () => {
      vi.mocked(privacyFilteringService.getMeTooCount).mockResolvedValue({
        count: 999999999
      })

      render(<MeTooCount postId="post1" compact={true} />)

      await waitFor(() => {
        expect(screen.getByText('999M+')).toBeInTheDocument()
      })
    })
  })
})