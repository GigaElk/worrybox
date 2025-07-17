import React, { useState, useEffect } from 'react'
import { schedulingService, SchedulingStats as StatsType } from '../services/schedulingService'
import { Calendar, Clock, TrendingUp, Loader2 } from 'lucide-react'

const SchedulingStats: React.FC = () => {
  const [stats, setStats] = useState<StatsType | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setIsLoading(true)
      const statsData = await schedulingService.getSchedulingStats()
      setStats(statsData)
    } catch (error) {
      console.error('Failed to load scheduling stats:', error)
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Calendar className="w-8 h-8 text-blue-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Total Scheduled</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalScheduled}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Clock className="w-8 h-8 text-green-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Scheduled Today</p>
            <p className="text-2xl font-bold text-gray-900">{stats.scheduledToday}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <TrendingUp className="w-8 h-8 text-purple-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">This Week</p>
            <p className="text-2xl font-bold text-gray-900">{stats.scheduledThisWeek}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SchedulingStats