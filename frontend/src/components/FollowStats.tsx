import React, { useState, useEffect } from 'react'
import { followService, FollowStatsResponse } from '../services/followService'
import { Users, Loader2 } from 'lucide-react'

interface FollowStatsProps {
  userId: string
  className?: string
  onStatsClick?: (type: 'followers' | 'following') => void
}

const FollowStats: React.FC<FollowStatsProps> = ({ userId, className = '', onStatsClick }) => {
  const [stats, setStats] = useState<FollowStatsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      try {
        setIsLoading(true)
        const followStats = await followService.getFollowStats(userId)
        setStats(followStats)
      } catch (error) {
        console.error('Failed to load follow stats:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadStats()
  }, [userId])

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-4 ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    )
  }

  if (!stats) {
    return null
  }

  return (
    <div className={`flex items-center space-x-6 ${className}`}>
      <button
        onClick={() => onStatsClick?.('followers')}
        className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
        disabled={!onStatsClick}
      >
        <Users className="w-4 h-4" />
        <div className="text-left">
          <div className="font-semibold text-sm">{stats.followersCount}</div>
          <div className="text-xs text-gray-500">
            {stats.followersCount === 1 ? 'Follower' : 'Followers'}
          </div>
        </div>
      </button>

      <button
        onClick={() => onStatsClick?.('following')}
        className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
        disabled={!onStatsClick}
      >
        <Users className="w-4 h-4" />
        <div className="text-left">
          <div className="font-semibold text-sm">{stats.followingCount}</div>
          <div className="text-xs text-gray-500">Following</div>
        </div>
      </button>
    </div>
  )
}

export default FollowStats