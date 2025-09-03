import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import UserAvatar from '../components/UserAvatar'
import { profilePictureService } from '../services/profilePictureService'

// Mock the profile picture service
vi.mock('../services/profilePictureService')

const mockProfilePictureService = profilePictureService as any

describe('UserAvatar', () => {
  const defaultUser = {
    id: 'user-1',
    username: 'testuser',
    displayName: 'Test User',
    avatarUrl: 'https://example.com/avatar.jpg',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default mock implementation
    mockProfilePictureService.generateOptimizedUrl.mockReturnValue(
      'https://optimized.example.com/avatar.jpg'
    )
  })

  it('renders with user avatar image', async () => {
    render(<UserAvatar user={defaultUser} />)
    
    expect(mockProfilePictureService.generateOptimizedUrl).toHaveBeenCalledWith(
      'https://example.com/avatar.jpg',
      {
        width: 40,
        height: 40,
        quality: 'auto',
      }
    )
    
    const img = screen.getByAltText('Test User')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'https://optimized.example.com/avatar.jpg')
  })

  it('renders with initials when no avatar URL', () => {
    const userWithoutAvatar = {
      ...defaultUser,
      avatarUrl: null,
    }
    
    render(<UserAvatar user={userWithoutAvatar} />)
    
    expect(screen.getByText('TU')).toBeInTheDocument() // Test User initials
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('renders with single initial for single word name', () => {
    const userWithSingleName = {
      ...defaultUser,
      displayName: 'John',
    }
    
    render(<UserAvatar user={userWithSingleName} />)
    
    expect(screen.getByText('J')).toBeInTheDocument()
  })

  it('uses username when displayName is not available', () => {
    const userWithoutDisplayName = {
      ...defaultUser,
      displayName: undefined,
    }
    
    render(<UserAvatar user={userWithoutDisplayName} />)
    
    const img = screen.getByAltText('testuser')
    expect(img).toBeInTheDocument()
  })

  it('renders initials from username when no displayName', () => {
    const userWithoutDisplayName = {
      ...defaultUser,
      displayName: undefined,
      avatarUrl: null,
    }
    
    render(<UserAvatar user={userWithoutDisplayName} />)
    
    expect(screen.getByText('T')).toBeInTheDocument() // testuser initial
  })

  it('handles image load error gracefully', async () => {
    render(<UserAvatar user={defaultUser} />)
    
    const img = screen.getByAltText('Test User')
    
    // Simulate image error
    fireEvent.error(img)
    
    await waitFor(() => {
      expect(screen.getByText('TU')).toBeInTheDocument() // Should show initials
    })
  })

  it('shows loading state initially', () => {
    render(<UserAvatar user={defaultUser} />)
    
    // Should show loading placeholder
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('hides loading state after image loads', async () => {
    render(<UserAvatar user={defaultUser} />)
    
    const img = screen.getByAltText('Test User')
    
    // Simulate image load
    fireEvent.load(img)
    
    await waitFor(() => {
      expect(document.querySelector('.animate-pulse')).not.toBeInTheDocument()
    })
  })

  it('applies correct size classes', () => {
    const { rerender } = render(<UserAvatar user={defaultUser} size="xs" />)
    expect(document.querySelector('.w-6')).toBeInTheDocument()
    
    rerender(<UserAvatar user={defaultUser} size="sm" />)
    expect(document.querySelector('.w-8')).toBeInTheDocument()
    
    rerender(<UserAvatar user={defaultUser} size="lg" />)
    expect(document.querySelector('.w-12')).toBeInTheDocument()
    
    rerender(<UserAvatar user={defaultUser} size="xl" />)
    expect(document.querySelector('.w-16')).toBeInTheDocument()
    
    rerender(<UserAvatar user={defaultUser} size="2xl" />)
    expect(document.querySelector('.w-20')).toBeInTheDocument()
  })

  it('generates optimized URLs with correct dimensions for different sizes', () => {
    const { rerender } = render(<UserAvatar user={defaultUser} size="xs" />)
    expect(mockProfilePictureService.generateOptimizedUrl).toHaveBeenCalledWith(
      'https://example.com/avatar.jpg',
      { width: 24, height: 24, quality: 'auto' }
    )
    
    rerender(<UserAvatar user={defaultUser} size="lg" />)
    expect(mockProfilePictureService.generateOptimizedUrl).toHaveBeenCalledWith(
      'https://example.com/avatar.jpg',
      { width: 48, height: 48, quality: 'auto' }
    )
  })

  it('shows online status when enabled', () => {
    render(
      <UserAvatar 
        user={defaultUser} 
        showOnlineStatus={true} 
        isOnline={true} 
      />
    )
    
    const onlineIndicator = document.querySelector('.bg-green-400')
    expect(onlineIndicator).toBeInTheDocument()
    expect(onlineIndicator).toHaveAttribute('title', 'Online')
  })

  it('shows offline status when enabled', () => {
    render(
      <UserAvatar 
        user={defaultUser} 
        showOnlineStatus={true} 
        isOnline={false} 
      />
    )
    
    const offlineIndicator = document.querySelector('.bg-gray-400')
    expect(offlineIndicator).toBeInTheDocument()
    expect(offlineIndicator).toHaveAttribute('title', 'Offline')
  })

  it('does not show status indicator when disabled', () => {
    render(
      <UserAvatar 
        user={defaultUser} 
        showOnlineStatus={false} 
        isOnline={true} 
      />
    )
    
    expect(document.querySelector('.bg-green-400')).not.toBeInTheDocument()
    expect(document.querySelector('.bg-gray-400')).not.toBeInTheDocument()
  })

  it('handles click events', () => {
    const onClick = vi.fn()
    render(<UserAvatar user={defaultUser} onClick={onClick} />)
    
    const avatar = screen.getByTitle('Test User')
    fireEvent.click(avatar)
    
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('applies cursor pointer when clickable', () => {
    const onClick = vi.fn()
    render(<UserAvatar user={defaultUser} onClick={onClick} />)
    
    const avatar = screen.getByTitle('Test User')
    expect(avatar).toHaveClass('cursor-pointer')
  })

  it('does not apply cursor pointer when not clickable', () => {
    render(<UserAvatar user={defaultUser} />)
    
    const avatar = screen.getByTitle('Test User')
    expect(avatar).not.toHaveClass('cursor-pointer')
  })

  it('applies custom className', () => {
    render(<UserAvatar user={defaultUser} className="custom-class" />)
    
    const avatar = screen.getByTitle('Test User')
    expect(avatar).toHaveClass('custom-class')
  })

  it('sets correct title attribute', () => {
    render(<UserAvatar user={defaultUser} />)
    
    const avatar = screen.getByTitle('Test User')
    expect(avatar).toBeInTheDocument()
  })

  it('uses username as title when no displayName', () => {
    const userWithoutDisplayName = {
      ...defaultUser,
      displayName: undefined,
    }
    
    render(<UserAvatar user={userWithoutDisplayName} />)
    
    const avatar = screen.getByTitle('testuser')
    expect(avatar).toBeInTheDocument()
  })

  it('handles optimized URL generation error', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mockProfilePictureService.generateOptimizedUrl.mockImplementation(() => {
      throw new Error('Optimization failed')
    })
    
    render(<UserAvatar user={defaultUser} />)
    
    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to generate optimized URL, using original:',
      expect.any(Error)
    )
    
    const img = screen.getByAltText('Test User')
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg')
    
    consoleSpy.mockRestore()
  })

  it('renders question mark for empty name', () => {
    const userWithEmptyName = {
      ...defaultUser,
      username: '',
      displayName: '',
      avatarUrl: null,
    }
    
    render(<UserAvatar user={userWithEmptyName} />)
    
    expect(screen.getByText('?')).toBeInTheDocument()
  })

  it('handles whitespace in names correctly', () => {
    const userWithWhitespaceName = {
      ...defaultUser,
      displayName: '  John   Doe  ',
      avatarUrl: null,
    }
    
    render(<UserAvatar user={userWithWhitespaceName} />)
    
    expect(screen.getByText('JD')).toBeInTheDocument()
  })

  it('uses lazy loading for images', () => {
    render(<UserAvatar user={defaultUser} />)
    
    const img = screen.getByAltText('Test User')
    expect(img).toHaveAttribute('loading', 'lazy')
  })

  it('applies correct online status size classes', () => {
    const { rerender } = render(
      <UserAvatar 
        user={defaultUser} 
        size="xs" 
        showOnlineStatus={true} 
        isOnline={true} 
      />
    )
    
    expect(document.querySelector('.w-2.h-2')).toBeInTheDocument()
    
    rerender(
      <UserAvatar 
        user={defaultUser} 
        size="xl" 
        showOnlineStatus={true} 
        isOnline={true} 
      />
    )
    
    expect(document.querySelector('.w-4.h-4')).toBeInTheDocument()
  })
})