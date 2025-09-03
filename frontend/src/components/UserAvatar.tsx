import React, { useState } from 'react'
import { User } from 'lucide-react'
import { profilePictureService } from '../services/profilePictureService'

interface UserAvatarProps {
  user: {
    id: string
    username: string
    displayName?: string
    avatarUrl?: string | null
  }
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  className?: string
  showOnlineStatus?: boolean
  isOnline?: boolean
  onClick?: () => void
}

const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  size = 'md',
  className = '',
  showOnlineStatus = false,
  isOnline = false,
  onClick
}) => {
  const [imageError, setImageError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Size configurations
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
    '2xl': 'w-20 h-20 text-2xl'
  }

  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
    '2xl': 'w-10 h-10'
  }

  const onlineStatusSizes = {
    xs: 'w-2 h-2 -bottom-0 -right-0',
    sm: 'w-2 h-2 -bottom-0 -right-0',
    md: 'w-3 h-3 -bottom-0.5 -right-0.5',
    lg: 'w-3 h-3 -bottom-0.5 -right-0.5',
    xl: 'w-4 h-4 -bottom-1 -right-1',
    '2xl': 'w-4 h-4 -bottom-1 -right-1'
  }

  // Generate user initials
  const getInitials = () => {
    const name = user.displayName || user.username
    if (!name) return '?'
    
    const words = name.trim().split(' ')
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase()
    }
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase()
  }

  // Generate optimized Cloudinary URL
  const getOptimizedImageUrl = () => {
    if (!user.avatarUrl || imageError) return null

    // Get dimensions based on size
    const dimensions = {
      xs: { width: 24, height: 24 },
      sm: { width: 32, height: 32 },
      md: { width: 40, height: 40 },
      lg: { width: 48, height: 48 },
      xl: { width: 64, height: 64 },
      '2xl': { width: 80, height: 80 }
    }

    const { width, height } = dimensions[size]

    try {
      return profilePictureService.generateOptimizedUrl(user.avatarUrl, {
        width,
        height,
        quality: 'auto'
      })
    } catch (error) {
      console.warn('Failed to generate optimized URL, using original:', error)
      return user.avatarUrl
    }
  }

  const handleImageLoad = () => {
    setIsLoading(false)
  }

  const handleImageError = () => {
    setImageError(true)
    setIsLoading(false)
  }

  const optimizedImageUrl = getOptimizedImageUrl()
  const shouldShowImage = optimizedImageUrl && !imageError
  const baseClasses = `${sizeClasses[size]} rounded-full flex-shrink-0 relative ${className}`
  const interactiveClasses = onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''

  return (
    <div 
      className={`${baseClasses} ${interactiveClasses}`}
      onClick={onClick}
      title={user.displayName || user.username}
    >
      {shouldShowImage ? (
        <>
          {/* Loading placeholder */}
          {isLoading && (
            <div className="absolute inset-0 bg-gray-200 rounded-full animate-pulse flex items-center justify-center">
              <User className={`${iconSizes[size]} text-gray-400`} />
            </div>
          )}
          
          {/* Actual image */}
          <img
            src={optimizedImageUrl}
            alt={user.displayName || user.username}
            className={`w-full h-full rounded-full object-cover border border-gray-200 ${
              isLoading ? 'opacity-0' : 'opacity-100'
            } transition-opacity`}
            onLoad={handleImageLoad}
            onError={handleImageError}
            loading="lazy"
          />
        </>
      ) : (
        /* Fallback with initials */
        <div className="w-full h-full rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-medium border border-gray-200">
          {getInitials()}
        </div>
      )}

      {/* Online status indicator */}
      {showOnlineStatus && (
        <div
          className={`absolute ${onlineStatusSizes[size]} rounded-full border-2 border-white ${
            isOnline ? 'bg-green-400' : 'bg-gray-400'
          }`}
          title={isOnline ? 'Online' : 'Offline'}
        />
      )}
    </div>
  )
}

export default UserAvatar