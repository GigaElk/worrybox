import React from 'react'
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import PostCard from '../components/PostCard'
import { PostResponse } from '../services/postService'

// Mock all the services and components
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', username: 'testuser' },
    isAuthenticated: true,
  }),
}))

vi.mock('../components/LikeButton', () => ({
  default: () => <div data-testid="like-button">Like Button</div>,
}))

vi.mock('../components/CommentSection', () => ({
  default: ({ commentsEnabled }: { commentsEnabled: boolean }) => (
    <div data-testid="comment-section">
      Comment Section - Enabled: {commentsEnabled.toString()}
    </div>
  ),
}))

vi.mock('../components/SimilarWorries', () => ({
  default: () => <div data-testid="similar-worries">Similar Worries</div>,
}))

vi.mock('../components/ResolutionModal', () => ({
  default: () => <div data-testid="resolution-modal">Resolution Modal</div>,
}))

vi.mock('../components/ResolutionDisplay', () => ({
  default: () => <div data-testid="resolution-display">Resolution Display</div>,
}))

vi.mock('../services/worryResolutionService', () => ({
  worryResolutionService: {
    getResolution: vi.fn().mockResolvedValue(null),
  },
}))

const createMockPost = (overrides: Partial<PostResponse> = {}): PostResponse => ({
  id: 'post-1',
  userId: 'user-1',
  shortContent: 'Test worry content',
  worryPrompt: "What's weighing on your mind today?",
  privacyLevel: 'public',
  commentsEnabled: true,
  isScheduled: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  publishedAt: new Date().toISOString(),
  user: {
    id: 'user-1',
    username: 'testuser',
    displayName: 'Test User',
  },
  ...overrides,
})

describe('PostCard', () => {
  it('should show comment section when comments are enabled', () => {
    const post = createMockPost({ commentsEnabled: true })
    
    render(<PostCard post={post} />)
    
    expect(screen.getByTestId('comment-section')).toBeInTheDocument()
    expect(screen.getByText('Comment Section - Enabled: true')).toBeInTheDocument()
  })

  it('should show disabled message when comments are disabled', () => {
    const post = createMockPost({ commentsEnabled: false })
    
    render(<PostCard post={post} />)
    
    expect(screen.getByText('Comments are disabled for this post')).toBeInTheDocument()
    expect(screen.queryByTestId('comment-section')).not.toBeInTheDocument()
  })

  it('should show comment status in metadata when comments are disabled', () => {
    const post = createMockPost({ commentsEnabled: false })
    
    render(<PostCard post={post} />)
    
    expect(screen.getByText('Comments disabled')).toBeInTheDocument()
  })

  it('should not show comment status in metadata when comments are enabled', () => {
    const post = createMockPost({ commentsEnabled: true })
    
    render(<PostCard post={post} />)
    
    expect(screen.queryByText('Comments disabled')).not.toBeInTheDocument()
  })
})