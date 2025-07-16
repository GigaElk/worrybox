import React, { useState, useEffect } from 'react'
import { followService, FollowResponse } from '../services/followService'
import { User, Loader2 } from 'lucide-react'
import FollowButton from './FollowButton'
import toast from 'react-hot-toast'

interface FollowListProps {
  userId: string
  type: 'followers' | 'following'
  className?: string
}

const FollowList: React.FC<FollowListProps> = ({ userId, type, className = '' }) => {
  const [follows, setFollows] = useState<FollowResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [offset, setOffset] = useState(0)

  const limit = 20

  useEffect(() => {
    loadFollows(true)
  }, [userId, type])

  const loadFollows = async (reset = false) => {
    try {
      if (reset) {
        setIsLoading(true)
        setOffset(0)
      } else {
        setIsLoadingMore(true)
      }

      const currentOffset = reset ? 0 : offset
      const response = type === 'followers' 
        ? await followService.getFollowers(userId, limit, currentOffset)
        : await followService.getFollowing(userId, limit, currentOffset)

      const newFollows = type === 'followers' ? response.followers : response.following

      if (reset) {
        setFollows(newFollows)
      } else {
        setFollows(prev => [...prev, ...newFollows])
      }

      setHasMore(response.hasMore)
      setOffset(currentOffset + newFollows.length)
    } catch (error) {
      console.error(`Failed to load ${type}:`, error)
      toast.error(`Failed to load ${type}`)
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      loadFollows(false)
    }
  }

  const handleFollowChange = (targetUserId: string, isFollowing: boolean) => {
    // If we're viewing following list and user unfollowed someone, remove from list
    if (type === 'following' && !isFollowing) {
      setFollows(prev => prev.filter(follow => follow.followingId !== targetUserId))
    }
  }

  const getDisplayUser = (follow: FollowResponse) => {
    return type === 'followers' ? follow.follower : follow.following
  }

  if (isLoading) {
    return (
      <div className={`flex justify-center py-8 ${className}`}>
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (follows.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        <p>No {type} yet.</p>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="space-y-4">
        {follows.map((follow) => {
          const displayUser = getDisplayUser(follow)
          return (
            <div key={follow.id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
              <div className="flex items-center space-x-3">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {displayUser.avatarUrl ? (
                    <img
                      src={displayUser.avatarUrl}
                      alt={displayUser.displayName || displayUser.username}
                      className="w-12 h-12 rounded-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        target.nextElementSibling?.classList.remove('hidden')
                      }}
                    />
                  ) : null}
                  <div
                    className={`w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center ${
                      displayUser.avatarUrl ? 'hidden' : ''
                    }`}
                  >
                    <User className="w-6 h-6 text-gray-400" />
                  </div>
                </div>

                {/* User Info */}
                <div>
                  <h3 className="font-medium text-gray-900">
                    {displayUser.displayName || displayUser.username}
                  </h3>
                  {displayUser.displayName && (
                    <p className="text-sm text-gray-600">@{displayUser.username}</p>
                  )}
                </div>
              </div>

              {/* Follow Button */}
              <FollowButton 
                userId={displayUser.id}
                onFollowChange={(isFollowing) => handleFollowChange(displayUser.id, isFollowing)}
              />
            </div>
          )
        })}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center mt-6">
          <button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading...</span>
              </>
            ) : (
              <span>Load More</span>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

export default FollowList