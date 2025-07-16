import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { likeService } from '../services/likeService'
import { Heart, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface LikeButtonProps {
  postId: string
  onLikeChange?: (isLiked: boolean, likeCount: number) => void
  className?: string
  showCount?: boolean
}

const LikeButton: React.FC<LikeButtonProps> = ({ 
  postId, 
  onLikeChange, 
  className = '', 
  showCount = true 
}) => {
  const { isAuthenticated } = useAuth()
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const loadLikeData = async () => {
      try {
        setIsChecking(true)
        
        // Always load like count
        const count = await likeService.getLikeCount(postId)
        setLikeCount(count)
        
        // Only check if user has liked if authenticated
        if (isAuthenticated) {
          const liked = await likeService.isLiked(postId)
          setIsLiked(liked)
        }
      } catch (error) {
        console.error('Failed to load like data:', error)
      } finally {
        setIsChecking(false)
      }
    }

    loadLikeData()
  }, [postId, isAuthenticated])

  const handleLike = async () => {
    if (!isAuthenticated) {
      toast.error('Please log in to like posts')
      return
    }

    setIsLoading(true)
    try {
      if (isLiked) {
        await likeService.unlikePost(postId)
        setIsLiked(false)
        setLikeCount(prev => prev - 1)
        onLikeChange?.(false, likeCount - 1)
      } else {
        await likeService.likePost(postId)
        setIsLiked(true)
        setLikeCount(prev => prev + 1)
        onLikeChange?.(true, likeCount + 1)
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to update like status')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleLike}
      disabled={isLoading || isChecking || !isAuthenticated}
      className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
        isLiked
          ? 'text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100'
          : 'text-gray-600 hover:text-red-600 hover:bg-red-50'
      } disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      title={isAuthenticated ? (isLiked ? 'Unlike' : 'Like') : 'Log in to like posts'}
    >
      {isLoading || isChecking ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <Heart 
          className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} 
        />
      )}
      {showCount && (
        <span className="text-sm font-medium">
          {likeCount}
        </span>
      )}
    </button>
  )
}

export default LikeButton