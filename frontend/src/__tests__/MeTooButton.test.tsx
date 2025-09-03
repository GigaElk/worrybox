import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import MeTooButton from '../components/MeTooButton'
import { useAuth } from '../contexts/AuthContext'
import { meTooService } from '../services/meTooService'
import toast from 'react-hot-toast'

// Mock dependencies
vi.mock('../contexts/AuthContext')
vi.mock('../services/meTooService')
vi.mock('react-hot-toast')

const mockUseAuth = useAuth as any
const mockMeTooService = meTooService as any
const mockToast = toast as any

describe('MeTooButton', () => {
  const defaultProps = {
    postId: 'test-post-id',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default mock implementations
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
    })
    
    mockMeTooService.getMeTooCount.mockResolvedValue(5)
    mockMeTooService.getSimilarWorryCount.mockResolvedValue(3)
    mockMeTooService.hasMeToo.mockResolvedValue(false)
    mockMeTooService.addMeToo.mockResolvedValue({})
    mockMeTooService.removeMeToo.mockResolvedValue({})
    
    mockToast.error.mockImplementation(() => {})
  })

  it('renders correctly with default props', async () => {
    render(<MeTooButton {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument() // similarWorryCount
    })
  })

  it('shows loading state initially', () => {
    render(<MeTooButton {...defaultProps} />)
    
    expect(screen.getByRole('button')).toBeDisabled()
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('loads MeToo data on mount', async () => {
    render(<MeTooButton {...defaultProps} />)
    
    await waitFor(() => {
      expect(mockMeTooService.getMeTooCount).toHaveBeenCalledWith('test-post-id')
      expect(mockMeTooService.getSimilarWorryCount).toHaveBeenCalledWith('test-post-id')
      expect(mockMeTooService.hasMeToo).toHaveBeenCalledWith('test-post-id')
    })
  })

  it('does not check user MeToo status when not authenticated', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
    })
    
    render(<MeTooButton {...defaultProps} />)
    
    await waitFor(() => {
      expect(mockMeTooService.getMeTooCount).toHaveBeenCalled()
      expect(mockMeTooService.getSimilarWorryCount).toHaveBeenCalled()
      expect(mockMeTooService.hasMeToo).not.toHaveBeenCalled()
    })
  })

  it('shows correct text when user has not MeToo\'d', async () => {
    render(<MeTooButton {...defaultProps} />)
    
    await waitFor(() => {
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('title', 'Me too')
      expect(button).toHaveAttribute('aria-label', 'Me too')
    })
  })

  it('shows correct text when user has MeToo\'d', async () => {
    mockMeTooService.hasMeToo.mockResolvedValue(true)
    
    render(<MeTooButton {...defaultProps} />)
    
    await waitFor(() => {
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('title', 'You also worry about this')
      expect(button).toHaveAttribute('aria-label', 'You also worry about this')
    })
  })

  it('applies correct styling when user has MeToo\'d', async () => {
    mockMeTooService.hasMeToo.mockResolvedValue(true)
    
    render(<MeTooButton {...defaultProps} />)
    
    await waitFor(() => {
      const button = screen.getByRole('button')
      expect(button).toHaveClass('text-blue-600', 'bg-blue-50')
    })
  })

  it('handles adding MeToo', async () => {
    const onMeTooChange = vi.fn()
    render(<MeTooButton {...defaultProps} onMeTooChange={onMeTooChange} />)
    
    await waitFor(() => {
      expect(screen.getByRole('button')).not.toBeDisabled()
    })
    
    fireEvent.click(screen.getByRole('button'))
    
    await waitFor(() => {
      expect(mockMeTooService.addMeToo).toHaveBeenCalledWith('test-post-id')
      expect(onMeTooChange).toHaveBeenCalledWith(true, 6, 4) // count + 1
    })
  })

  it('handles removing MeToo', async () => {
    mockMeTooService.hasMeToo.mockResolvedValue(true)
    const onMeTooChange = vi.fn()
    
    render(<MeTooButton {...defaultProps} onMeTooChange={onMeTooChange} />)
    
    await waitFor(() => {
      expect(screen.getByRole('button')).not.toBeDisabled()
    })
    
    fireEvent.click(screen.getByRole('button'))
    
    await waitFor(() => {
      expect(mockMeTooService.removeMeToo).toHaveBeenCalledWith('test-post-id')
      expect(onMeTooChange).toHaveBeenCalledWith(false, 4, 2) // count - 1
    })
  })

  it('shows error toast when not authenticated and trying to MeToo', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
    })
    
    render(<MeTooButton {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument()
    })
    
    fireEvent.click(screen.getByRole('button'))
    
    expect(mockToast.error).toHaveBeenCalledWith('Please log in to respond to posts')
  })

  it('handles API errors gracefully', async () => {
    mockMeTooService.addMeToo.mockRejectedValue({
      response: {
        data: {
          error: {
            message: 'Server error'
          }
        }
      }
    })
    
    render(<MeTooButton {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByRole('button')).not.toBeDisabled()
    })
    
    fireEvent.click(screen.getByRole('button'))
    
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Server error')
    })
  })

  it('handles API errors without specific message', async () => {
    mockMeTooService.addMeToo.mockRejectedValue(new Error('Network error'))
    
    render(<MeTooButton {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByRole('button')).not.toBeDisabled()
    })
    
    fireEvent.click(screen.getByRole('button'))
    
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Failed to update response')
    })
  })

  it('shows loading state during MeToo action', async () => {
    let resolveAddMeToo: (value: any) => void
    mockMeTooService.addMeToo.mockReturnValue(
      new Promise(resolve => {
        resolveAddMeToo = resolve
      })
    )
    
    render(<MeTooButton {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByRole('button')).not.toBeDisabled()
    })
    
    fireEvent.click(screen.getByRole('button'))
    
    // Should show loading state
    expect(screen.getByRole('button')).toBeDisabled()
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
    
    // Resolve the promise
    resolveAddMeToo!({})
    
    await waitFor(() => {
      expect(screen.getByRole('button')).not.toBeDisabled()
    })
  })

  it('hides count when showCount is false', async () => {
    render(<MeTooButton {...defaultProps} showCount={false} />)
    
    await waitFor(() => {
      expect(screen.queryByText('3')).not.toBeInTheDocument()
    })
  })

  it('applies custom className', async () => {
    render(<MeTooButton {...defaultProps} className="custom-class" />)
    
    await waitFor(() => {
      expect(screen.getByRole('button')).toHaveClass('custom-class')
    })
  })

  it('shows tooltip for similar worry count', async () => {
    render(<MeTooButton {...defaultProps} />)
    
    await waitFor(() => {
      const countElement = screen.getByText('3')
      expect(countElement).toHaveAttribute('title', '3 people have similar worries')
    })
  })

  it('shows singular tooltip for one similar worry', async () => {
    mockMeTooService.getSimilarWorryCount.mockResolvedValue(1)
    
    render(<MeTooButton {...defaultProps} />)
    
    await waitFor(() => {
      const countElement = screen.getByText('1')
      expect(countElement).toHaveAttribute('title', '1 person has similar worries')
    })
  })

  it('shows empty tooltip when no similar worries', async () => {
    mockMeTooService.getSimilarWorryCount.mockResolvedValue(0)
    
    render(<MeTooButton {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.queryByText('0')).not.toBeInTheDocument()
    })
  })

  it('handles loading errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockMeTooService.getMeTooCount.mockRejectedValue(new Error('Load error'))
    
    render(<MeTooButton {...defaultProps} />)
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load MeToo data:', expect.any(Error))
    })
    
    consoleSpy.mockRestore()
  })
})