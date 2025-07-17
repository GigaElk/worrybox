import React, { useState, useEffect } from 'react'
import { moderationService, ModerationStats as StatsType } from '../services/moderationService'
import { MessageSquare, AlertTriangle, CheckCircle, XCircle, Clock, TrendingUp, Loader2 } from 'lucide-react'

const ModerationStats: React.FC = () => {
  const [stats, setStats] = useState<StatsType | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setIsLoading(true)
      const statsData = await moderationService.getModerationStats()
      setStats(statsData)
    } catch (error) {
      console.error('Failed to load moderation stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!stats) {
    return null
  }

  const getApprovalRate = () => {
    const total = stats.approvedComments + stats.rejectedComments
    return total > 0 ? Math.round((stats.approvedComments / total) * 100) : 0
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <MessageSquare className="w-8 h-8 text-blue-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Total Comments</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalComments.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Pending Review</p>
            <p className="text-2xl font-bold text-gray-900">{stats.pendingReview}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Approved</p>
            <p className="text-2xl font-bold text-gray-900">{stats.approvedComments.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <AlertTriangle className="w-8 h-8 text-orange-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Flagged</p>
            <p className="text-2xl font-bold text-gray-900">{stats.flaggedComments}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Rejected</p>
            <p className="text-2xl font-bold text-gray-900">{stats.rejectedComments}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <TrendingUp className="w-8 h-8 text-purple-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Approval Rate</p>
            <p className="text-2xl font-bold text-gray-900">{getApprovalRate()}%</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ModerationStats