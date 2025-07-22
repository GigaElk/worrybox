import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import PostForm from '../components/PostForm'
import { postService } from '../services/postService'

// Mock the post service
vi.mock('../services/postService', () => ({
  postService: {
    getWorryPrompts: vi.fn(),
    createPost: vi.fn(),
  },
}))

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const mockPostService = postService as any

describe('PostForm', () => {
  const mockOnPostCreated = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockPostService.getWorryPrompts.mockResolvedValue([
      "What's weighing on your mind today?",
      "What's causing you stress right now?",
    ])
  })

  it('should render comment control checkbox', async () => {
    render(
      <PostForm onPostCreated={mockOnPostCreated} onCancel={mockOnCancel} />
    )

    await waitFor(() => {
      expect(screen.getByLabelText('Allow others to comment on this post')).toBeInTheDocument()
    })
  })

  it('should have comments enabled by default', async () => {
    render(
      <PostForm onPostCreated={mockOnPostCreated} onCancel={mockOnCancel} />
    )

    await waitFor(() => {
      const checkbox = screen.getByLabelText('Allow others to comment on this post') as HTMLInputElement
      expect(checkbox.checked).toBe(true)
    })
  })

  it('should allow toggling comment control', async () => {
    render(
      <PostForm onPostCreated={mockOnPostCreated} onCancel={mockOnCancel} />
    )

    await waitFor(() => {
      const checkbox = screen.getByLabelText('Allow others to comment on this post') as HTMLInputElement
      expect(checkbox.checked).toBe(true)
      
      fireEvent.click(checkbox)
      expect(checkbox.checked).toBe(false)
    })
  })

  it('should include commentsEnabled in form submission', async () => {
    const mockPost = {
      id: 'post-1',
      userId: 'user-1',
      shortContent: 'Test worry',
      worryPrompt: "What's weighing on your mind today?",
      privacyLevel: 'public',
      commentsEnabled: false,
      isScheduled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      user: {
        id: 'user-1',
        username: 'testuser',
        displayName: 'Test User',
      },
    }

    mockPostService.createPost.mockResolvedValue(mockPost)

    render(
      <PostForm onPostCreated={mockOnPostCreated} onCancel={mockOnCancel} />
    )

    await waitFor(() => {
      // Fill in required fields
      fireEvent.change(screen.getByLabelText('Share your worry'), {
        target: { value: 'Test worry content' },
      })

      // Disable comments
      const checkbox = screen.getByLabelText('Allow others to comment on this post')
      fireEvent.click(checkbox)

      // Submit form
      fireEvent.click(screen.getByText('Share Worry'))
    })

    await waitFor(() => {
      expect(mockPostService.createPost).toHaveBeenCalledWith(
        expect.objectContaining({
          commentsEnabled: false,
        })
      )
    })
  })
})