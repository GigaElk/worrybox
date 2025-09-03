import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { likeService } from '../services/likeService'
import { Heart, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface LikeButtonProps {
  postId: string
  onLikeChange?: (isSupported: boolean, supportCount: number) => void
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
  const [isSupported, setIsSupported] = useState(false)
  const [supportCount, setSupportCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const loadSupportData = async () => {
      try {
        setIsChecking(true)
        
        // Always load support count
        const count = await likeService.getLikeCount(postId)
        setSupportCount(count)
        
        // Only check if user has shown support if authenticated
        if (isAuthenticated) {
          const supported = await likeService.isLiked(postId)
          setIsSupported(supported)
        }
      } catch (error) {
        console.error('Failed to load support data:', error)
      } finally {
        setIsChecking(false)
      }
    }

    loadSupportData()
  }, [postId, isAuthenticated])

  const handleSupport = async () => {
    if (!isAuthenticated) {
      toast.error('Please log in to show support')
      return
    }

    setIsLoading(true)
    try {
      if (isSupported) {
        await likeService.unlikePost(postId)
        setIsSupported(false)
        setSupportCount(prev => prev - 1)
        onLikeChange?.(false, supportCount - 1)
      } else {
        await likeService.likePost(postId)
        setIsSupported(true)
        setSupportCount(prev => prev + 1)
        onLikeChange?.(true, supportCount + 1)
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to update support status')
    } finally {
      setIsLoading(false)
    }
  }

  const getSupportText = () => {
    if (supportCount === 0) return ''
    if (supportCount === 1) return '1 person showed support'
    return `${supportCount} people showed support`
  }

  return (
    <button
      onClick={handleSupport}
      disabled={isLoading || isChecking || !isAuthenticated}
      className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
        isSupported
          ? 'text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100'
          : 'text-gray-600 hover:text-red-600 hover:bg-red-50'
      } disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      title={isAuthenticated ? (isSupported ? 'Remove support' : 'Show support') : 'Log in to show support'}
      aria-label={isAuthenticated ? (isSupported ? 'Remove support' : 'Show support') : 'Log in to show support'}
    >
      {isLoading || isChecking ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <Heart 
          className={`w-5 h-5 ${isSupported ? 'fill-current' : ''}`} 
        />
      )}
      {showCount && (
        <span className="text-sm font-medium" title={getSupportText()}>
          {supportCount}
        </span>
      )}
    </button>
  )
}

export default LikeButton