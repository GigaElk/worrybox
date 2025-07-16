import React, { useState, useEffect } from 'react'
import { User, Mail, Calendar, MapPin, Link as LinkIcon } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import FollowButton from './FollowButton'
import FollowStats from './FollowStats'

interface UserProfileData {
  id: string
  username: string
  email: string
  displayName?: string
  bio?: string
  location?: string
  website?: string
  avatarUrl?: string
  createdAt: string
}

interface UserProfileProps {
  user: UserProfileData
  className?: string
  onFollowStatsClick?: (type: 'followers' | 'following') => void
}

const UserProfile: React.FC<UserProfileProps> = ({ user, className = '', onFollowStatsClick }) => {
  const { user: currentUser } = useAuth()
  const [followStats, setFollowStats] = useState({ followersCount: 0, followingCount: 0 })

  const isOwnProfile = currentUser?.id === user.id

  const formatJoinDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    })
  }

  const handleFollowChange = (isFollowing: boolean) => {
    // Update local follow stats when follow status changes
    setFollowStats(prev => ({
      ...prev,
      followersCount: isFollowing ? prev.followersCount + 1 : prev.followersCount - 1
    }))
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start space-x-4">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.displayName || user.username}
                className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  target.nextElementSibling?.classList.remove('hidden')
                }}
              />
            ) : null}
            <div
              className={`w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-200 ${
                user.avatarUrl ? 'hidden' : ''
              }`}
            >
              <User className="w-8 h-8 text-gray-400" />
            </div>
          </div>

          {/* User Info */}
          <div className="flex-1">
            <div className="mb-2">
              <h1 className="text-2xl font-bold text-gray-900">
                {user.displayName || user.username}
              </h1>
              {user.displayName && (
                <p className="text-gray-600">@{user.username}</p>
              )}
            </div>

            {user.bio && (
              <p className="text-gray-700 mb-3 leading-relaxed">{user.bio}</p>
            )}

            {/* User Details */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              {user.location && (
                <div className="flex items-center space-x-1">
                  <MapPin className="w-4 h-4" />
                  <span>{user.location}</span>
                </div>
              )}
              
              {user.website && (
                <div className="flex items-center space-x-1">
                  <LinkIcon className="w-4 h-4" />
                  <a
                    href={user.website.startsWith('http') ? user.website : `https://${user.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    {user.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
              
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>Joined {formatJoinDate(user.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Follow Button */}
        {!isOwnProfile && (
          <FollowButton 
            userId={user.id} 
            onFollowChange={handleFollowChange}
            className="ml-4"
          />
        )}
      </div>

      {/* Follow Stats */}
      <div className="border-t border-gray-200 pt-4">
        <FollowStats 
          userId={user.id} 
          onStatsClick={onFollowStatsClick}
        />
      </div>
    </div>
  )
}

export default UserProfile