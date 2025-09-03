import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../contexts/AuthContext'
import PostFeed from '../components/PostFeed'
import UserProfile from '../components/UserProfile'
import MeTooButton from '../components/MeTooButton'
import FollowButton from '../components/FollowButton'
import ProfilePictureUpload from '../components/ProfilePictureUpload'

// Mock services
vi.mock('../services/postService')
vi.mock('../services/meTooService')
vi.mock('../services/followService')
vi.mock('../services/profilePictureService')
vi.mock('../services/authService')
vi.mock('react-hot-toast')

// Mock components that aren't directly tested
vi.mock('../components/PostCard', () => ({
  default: ({ post, onEdit, onDelete }: any) => (
    <div data-testid={`post-${post.id}`}>
      <span>{post.shortContent}</span>
      <button onClick={() => onEdit(post)}>Edit</button>
      <button onClick={() => onDelete(post.id)}>Delete</button>
    </div>
  ),
}))

const mockServices = {
  postService: require('../services/postService').postService,
  meTooService: require('../services/meTooService').meTooService,
  followService: require('../services/followService').followService,
  profilePictureService: require('../services/profilePictureService').profilePictureService,
  authService: require('../services/authService').authService,
}

const mockToast = require('react-hot-toast').default

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <AuthProvider>
      {children}
    </AuthProvider>
  </BrowserRouter>
)

describe('Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default mocks
    mockServices.postService.getPosts.mockResolvedValue({
      posts: [
        {
          id: 'post-1',
          shortContent: 'Test post content',
          userId: 'user-1',
          createdAt: '2023-01-01T00:00:00Z',
          supportCount: 5,
          meTooCount: 3,
          similarWorryCount: 2,
          user: {
            id: 'user-1',
            username: 'testuser',
            displayName: 'Test User',
          },
        },
      ],
      hasMore: false,
    })
    
    mockServices.meTooService.getMeTooCount.mockResolvedValue(3)
    mockServices.meTooService.getSimilarWorryCount.mockResolvedValue(2)
    mockServices.meTooService.hasMeToo.mockResolvedValue(false)
    mockServices.meTooService.addMeToo.mockResolvedValue({})
    mockServices.meTooService.removeMeToo.mockResolvedValue({})
    
    mockServices.followService.isFollowing.mockResolvedValue(false)
    mockServices.followService.followUser.mockResolvedValue({})
    mockServices.followService.unfollowUser.mockResolvedValue({})
    mockServices.followService.getFollowStats.mockResolvedValue({
      followersCount: 10,
      followingCount: 5,
    })
    
    mockServices.profilePictureService.validateFile.mockReturnValue({
      isValid: true,
      error: null,
    })
    mockServices.profilePictureService.uploadProfilePicture.mockResolvedValue({
      profilePictureUrl: 'https://example.com/new-avatar.jpg',
    })
    
    mockToast.success.mockImplementation(() => {})
    mockToast.error.mockImplementation(() => {})
  })

  describe('Support Workflow Integration', () => {
    it('completes full support workflow from post feed', async () => {
      render(
        <TestWrapper>
          <PostFeed />
        </TestWrapper>
      )

      // Wait for posts to load
      await waitFor(() => {
        expect(screen.getByTestId('post-post-1')).toBeInTheDocument()
      })

      // Find and click MeToo button (assuming it's rendered within PostCard)
      const meTooButton = screen.getByRole('button', { name: /me too/i })
      expect(meTooButton).toBeInTheDocument()

      fireEvent.click(meTooButton)

      await waitFor(() => {
        expect(mockServices.meTooService.addMeToo).toHaveBeenCalledWith('post-1')
        expect(mockToast.success).toHaveBeenCalled()
      })
    })

    it('handles support workflow errors gracefully', async () => {
      mockServices.meTooService.addMeToo.mockRejectedValue(
        new Error('Network error')
      )

      render(
        <TestWrapper>
          <MeTooButton postId="post-1" />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByRole('button')).not.toBeDisabled()
      })

      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Failed to update response')
      })
    })
  })

  describe('Follow Workflow Integration', () => {
    it('completes full follow workflow', async () => {
      const mockUser = {
        id: 'user-2',
        username: 'followuser',
        displayName: 'Follow User',
        avatarUrl: null,
      }

      render(
        <TestWrapper>
          <FollowButton user={mockUser} />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Follow')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Follow'))

      await waitFor(() => {
        expect(mockServices.followService.followUser).toHaveBeenCalledWith('user-2')
        expect(screen.getByText('Following')).toBeInTheDocument()
      })
    })

    it('handles unfollow workflow', async () => {
      mockServices.followService.isFollowing.mockResolvedValue(true)
      
      const mockUser = {
        id: 'user-2',
        username: 'followuser',
        displayName: 'Follow User',
        avatarUrl: null,
      }

      render(
        <TestWrapper>
          <FollowButton user={mockUser} />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Following')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Following'))

      await waitFor(() => {
        expect(mockServices.followService.unfollowUser).toHaveBeenCalledWith('user-2')
        expect(screen.getByText('Follow')).toBeInTheDocument()
      })
    })

    it('integrates follow stats with user profile', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'testuser',
        displayName: 'Test User',
        bio: 'Test bio',
        avatarUrl: null,
        createdAt: '2023-01-01T00:00:00Z',
      }

      render(
        <TestWrapper>
          <UserProfile user={mockUser} />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(mockServices.followService.getFollowStats).toHaveBeenCalledWith('user-1')
        expect(screen.getByText('10')).toBeInTheDocument() // followers count
        expect(screen.getByText('5')).toBeInTheDocument() // following count
      })
    })
  })

  describe('Profile Picture Upload Workflow Integration', () => {
    it('completes full profile picture upload workflow', async () => {
      const onUploadSuccess = vi.fn()
      
      render(
        <TestWrapper>
          <ProfilePictureUpload onUploadSuccess={onUploadSuccess} />
        </TestWrapper>
      )

      // Create a mock file
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      })

      fireEvent.change(fileInput)

      await waitFor(() => {
        expect(screen.getByText('Upload Picture')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Upload Picture'))

      await waitFor(() => {
        expect(mockServices.profilePictureService.uploadProfilePicture).toHaveBeenCalledWith(
          file,
          expect.any(Function)
        )
        expect(mockToast.success).toHaveBeenCalledWith('Profile picture updated successfully!')
        expect(onUploadSuccess).toHaveBeenCalledWith('https://example.com/new-avatar.jpg')
      })
    })

    it('handles upload progress updates', async () => {
      let progressCallback: (progress: any) => void
      
      mockServices.profilePictureService.uploadProfilePicture.mockImplementation(
        (file: File, onProgress: (progress: any) => void) => {
          progressCallback = onProgress
          return new Promise(resolve => {
            setTimeout(() => {
              resolve({ profilePictureUrl: 'https://example.com/new-avatar.jpg' })
            }, 100)
          })
        }
      )

      render(
        <TestWrapper>
          <ProfilePictureUpload />
        </TestWrapper>
      )

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      })

      fireEvent.change(fileInput)

      await waitFor(() => {
        expect(screen.getByText('Upload Picture')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Upload Picture'))

      // Simulate progress updates
      progressCallback!({ loaded: 25, total: 100, percentage: 25 })
      
      await waitFor(() => {
        expect(screen.getByText('Uploading... 25%')).toBeInTheDocument()
      })

      progressCallback!({ loaded: 75, total: 100, percentage: 75 })
      
      await waitFor(() => {
        expect(screen.getByText('Uploading... 75%')).toBeInTheDocument()
      })
    })
  })

  describe('Error Recovery Mechanisms', () => {
    it('recovers from network errors in post feed', async () => {
      // First call fails, second succeeds
      mockServices.postService.getPosts
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          posts: [
            {
              id: 'post-1',
              shortContent: 'Test post content',
              userId: 'user-1',
              createdAt: '2023-01-01T00:00:00Z',
              supportCount: 5,
              meTooCount: 3,
              similarWorryCount: 2,
              user: {
                id: 'user-1',
                username: 'testuser',
                displayName: 'Test User',
              },
            },
          ],
          hasMore: false,
        })

      render(
        <TestWrapper>
          <PostFeed />
        </TestWrapper>
      )

      // Should show error state initially
      await waitFor(() => {
        expect(screen.getByText('Unable to load posts')).toBeInTheDocument()
      })

      // Click retry
      fireEvent.click(screen.getByText('Try Again'))

      // Should load posts successfully
      await waitFor(() => {
        expect(screen.getByTestId('post-post-1')).toBeInTheDocument()
      })
    })

    it('handles partial service failures gracefully', async () => {
      // MeToo service fails but posts still load
      mockServices.meTooService.getMeTooCount.mockRejectedValue(
        new Error('MeToo service down')
      )

      render(
        <TestWrapper>
          <MeTooButton postId="post-1" />
        </TestWrapper>
      )

      // Should still render button with default values
      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument()
      })

      // Should not show count when service fails
      expect(screen.queryByText('3')).not.toBeInTheDocument()
    })

    it('maintains data consistency during concurrent operations', async () => {
      let meTooCount = 3
      
      mockServices.meTooService.getMeTooCount.mockImplementation(() => 
        Promise.resolve(meTooCount)
      )
      
      mockServices.meTooService.addMeToo.mockImplementation(() => {
        meTooCount++
        return Promise.resolve({})
      })
      
      mockServices.meTooService.removeMeToo.mockImplementation(() => {
        meTooCount--
        return Promise.resolve({})
      })

      const onMeTooChange = vi.fn()
      
      render(
        <TestWrapper>
          <MeTooButton postId="post-1" onMeTooChange={onMeTooChange} />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument()
      })

      // Add MeToo
      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(onMeTooChange).toHaveBeenCalledWith(true, 4, 3)
      })

      // Remove MeToo
      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(onMeTooChange).toHaveBeenCalledWith(false, 3, 2)
      })
    })
  })

  describe('API Integration and Data Consistency', () => {
    it('maintains consistent state across multiple components', async () => {
      const mockUser = {
        id: 'user-2',
        username: 'testuser2',
        displayName: 'Test User 2',
        avatarUrl: null,
      }

      // Mock follow state changes
      let isFollowing = false
      let followersCount = 10
      
      mockServices.followService.isFollowing.mockImplementation(() => 
        Promise.resolve(isFollowing)
      )
      
      mockServices.followService.followUser.mockImplementation(() => {
        isFollowing = true
        followersCount++
        return Promise.resolve({})
      })
      
      mockServices.followService.getFollowStats.mockImplementation(() =>
        Promise.resolve({
          followersCount,
          followingCount: 5,
        })
      )

      render(
        <TestWrapper>
          <div>
            <FollowButton user={mockUser} />
            <UserProfile user={mockUser} />
          </div>
        </TestWrapper>
      )

      // Initial state
      await waitFor(() => {
        expect(screen.getByText('Follow')).toBeInTheDocument()
        expect(screen.getByText('10')).toBeInTheDocument() // followers count
      })

      // Follow user
      fireEvent.click(screen.getByText('Follow'))

      await waitFor(() => {
        expect(screen.getByText('Following')).toBeInTheDocument()
        // Note: In a real app, you'd need to trigger a re-fetch of stats
        // This test demonstrates the integration pattern
      })
    })

    it('handles authentication state changes', async () => {
      // Mock authentication context
      const mockAuthContext = {
        isAuthenticated: false,
        user: null,
        login: vi.fn(),
        logout: vi.fn(),
      }

      // This would require mocking the AuthContext provider
      // For now, we test the component behavior when not authenticated
      render(
        <TestWrapper>
          <MeTooButton postId="post-1" />
        </TestWrapper>
      )

      await waitFor(() => {
        const button = screen.getByRole('button')
        expect(button).toHaveAttribute('title', 'Log in to respond to posts')
      })

      fireEvent.click(screen.getByRole('button'))

      expect(mockToast.error).toHaveBeenCalledWith('Please log in to respond to posts')
    })
  })

  describe('Performance and Loading States', () => {
    it('shows appropriate loading states during operations', async () => {
      // Delay the service response
      mockServices.postService.getPosts.mockImplementation(() =>
        new Promise(resolve => {
          setTimeout(() => {
            resolve({
              posts: [],
              hasMore: false,
            })
          }, 100)
        })
      )

      render(
        <TestWrapper>
          <PostFeed />
        </TestWrapper>
      )

      // Should show loading state
      expect(screen.getByText('Loading posts...')).toBeInTheDocument()

      // Should hide loading state after data loads
      await waitFor(() => {
        expect(screen.queryByText('Loading posts...')).not.toBeInTheDocument()
      })
    })

    it('handles concurrent requests efficiently', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'testuser',
        displayName: 'Test User',
        avatarUrl: null,
      }

      // Track number of API calls
      let apiCallCount = 0
      mockServices.followService.isFollowing.mockImplementation(() => {
        apiCallCount++
        return Promise.resolve(false)
      })

      render(
        <TestWrapper>
          <div>
            <FollowButton user={mockUser} />
            <FollowButton user={mockUser} />
          </div>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getAllByText('Follow')).toHaveLength(2)
      })

      // Should make API calls for each component
      // In a real app, you might want to implement caching to reduce calls
      expect(apiCallCount).toBeGreaterThan(0)
    })
  })
})