import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { followService } from '../services/followService'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface FollowButtonProps {
  userId: string
  onFollowChange?: (isFollowing: boolean) => void
  className?: string
}

const FollowButton: React.FC<FollowButtonProps> = ({ userId, onFollowChange, className = '' }) => {
  const { user: currentUser, isAuthenticated } = useAuth()
  const [isFollowing, setIsFollowing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  // Don't show button for own profile
  const isOwnProfile = currentUser?.id === userId

  useEffect(() => {
    const checkFollowStatus = async () => {
      if (!isAuthenticated || isOwnProfile) {
        setIsChecking(false)
        return
      }

      try {
        setIsChecking(true)
        const following = await followService.isFollowing(userId)
        setIsFollowing(following)
      } catch (error) {
        console.error('Failed to check follow status:', error)
      } finally {
        setIsChecking(false)
      }
    }

    checkFollowStatus()
  }, [userId, isAuthenticated, isOwnProfile])

  const handleFollow = async () => {
    if (!isAuthenticated) {
      toast.error('Please log in to follow users')
      return
    }

    setIsLoading(true)
    try {
      if (isFollowing) {
        await followService.unfollowUser(userId)
        toast.success('Unfollowed successfully')
        setIsFollowing(false)
        onFollowChange?.(false)
      } else {
        await followService.followUser(userId)
        toast.success('Followed successfully')
        setIsFollowing(true)
        onFollowChange?.(true)
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to update follow status')
    } finally {
      setIsLoading(false)
    }
  }

  // Don't render for own profile
  if (isOwnProfile) {
    return null
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null
  }

  // Show loading state while checking follow status
  if (isChecking) {
    return (
      <button
        disabled
        className={`px-4 py-2 rounded-lg border border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed ${className}`}
      >
        <Loader2 className="w-4 h-4 animate-spin" />
      </button>
    )
  }

  return (
    <button
      onClick={handleFollow}
      disabled={isLoading}
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
        isFollowing
          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300 border border-gray-300'
          : 'bg-blue-600 text-white hover:bg-blue-700 border border-blue-600'
      } disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isFollowing ? (
        'Following'
      ) : (
        'Follow'
      )}
    </button>
  )
}

export default FollowButton