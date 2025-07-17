import React, { useState, useEffect } from 'react'
import { TrendingUp, CheckCircle, Target, Star, Loader2, AlertCircle } from 'lucide-react'
import { worryResolutionService, ResolutionStats } from '../services/worryResolutionService'
import ResolutionDisplay from './ResolutionDisplay'

interface ResolutionStatsProps {
  className?: string
}

const ResolutionStatsComponent: React.FC<ResolutionStatsProps> = ({ className = '' }) => {
  const [stats, setStats] = useState<ResolutionStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await worryResolutionService.getResolutionStats()
      setStats(data)
    } catch (error: any) {
      console.error('Failed to load resolution stats:', error)
      setError(error.response?.data?.error?.message || 'Failed to load resolution statistics')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className={`flex justify-center items-center py-8 ${className}`}>
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2 text-red-600 mb-2">
          <AlertCircle className="w-5 h-5" />
          <h3 className="font-medium">Error Loading Statistics</h3>
        </div>
        <p className="text-red-700 text-sm mb-4">{error}</p>
        <button
          onClick={loadStats}
          className="text-sm text-red-600 hover:text-red-800 underline"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-gray-600">No resolution statistics available.</p>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Total Resolved */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-2xl font-bold text-green-900">{stats.totalResolved}</h3>
              <p className="text-green-700 text-sm">Worries Resolved</p>
            </div>
          </div>
        </div>

        {/* Resolution Rate */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Target className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-2xl font-bold text-blue-900">{stats.resolutionRate}%</h3>
              <p className="text-blue-700 text-sm">Resolution Rate</p>
            </div>
          </div>
        </div>

        {/* Average Rating */}
        {stats.averageHelpfulnessRating && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Star className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-2xl font-bold text-yellow-900">
                  {stats.averageHelpfulnessRating}/5
                </h3>
                <p className="text-yellow-700 text-sm">Avg. Helpfulness</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Progress Indicator */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Resolution Progress</h3>
          <div className="text-sm text-gray-600">
            {stats.totalResolved} of {stats.totalWorries} worries resolved
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-green-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(stats.resolutionRate, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-sm text-gray-600 mt-2">
          <span>0%</span>
          <span className="font-medium">{stats.resolutionRate}%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Most Common Coping Methods */}
      {stats.mostCommonCopingMethods.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Your Most Effective Coping Methods
          </h3>
          <div className="space-y-3">
            {stats.mostCommonCopingMethods.map((method, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-medium text-sm">{index + 1}</span>
                  </div>
                  <span className="text-gray-800">{method.method}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${(method.count / stats.mostCommonCopingMethods[0].count) * 100}%`
                      }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-8 text-right">{method.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Resolutions */}
      {stats.recentResolutions.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Resolutions</h3>
          <div className="space-y-4">
            {stats.recentResolutions.map((resolution) => (
              <ResolutionDisplay
                key={resolution.id}
                resolution={resolution}
                showPost={true}
                className="border border-gray-100"
              />
            ))}
          </div>
        </div>
      )}

      {/* Encouragement Message */}
      {stats.totalResolved === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <TrendingUp className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Start Your Resolution Journey</h3>
          <p className="text-blue-700 mb-4">
            When you overcome a worry, mark it as resolved to track your progress and help others.
          </p>
          <p className="text-blue-600 text-sm">
            Every resolution is a step forward in your mental health journey.
          </p>
        </div>
      )}
    </div>
  )
}

export default ResolutionStatsComponent