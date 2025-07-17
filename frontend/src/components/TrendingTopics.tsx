import React, { useState, useEffect } from 'react'
import { demographicAnalyticsService, TrendingTopic } from '../services/demographicAnalyticsService'
import { useAuth } from '../contexts/AuthContext'
import { TrendingUp, Hash, ArrowUp, ArrowDown, Loader2, AlertCircle } from 'lucide-react'
import FeatureGate from './FeatureGate'

interface TrendingTopicsProps {
  className?: string
  limit?: number
}

const TrendingTopics: React.FC<TrendingTopicsProps> = ({ className = '', limit = 10 }) => {
  const { user } = useAuth()
  const [topics, setTopics] = useState<TrendingTopic[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      loadTrendingTopics()
    }
  }, [user, limit])

  const loadTrendingTopics = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await demographicAnalyticsService.getTrendingTopics(limit)
      setTopics(data)
    } catch (error: any) {
      console.error('Failed to load trending topics:', error)
      if (error.response?.status === 403) {
        setError('upgrade_required')
      } else {
        setError(error.response?.data?.error?.message || 'Failed to load trending topics')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const getSentimentColor = (score: number) => {
    if (score <= -0.5) return 'text-red-600'
    if (score < 0) return 'text-orange-600'
    if (score === 0) return 'text-gray-600'
    if (score <= 0.5) return 'text-blue-600'
    return 'text-green-600'
  }

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return <ArrowUp className="w-4 h-4 text-green-600" />
    if (growth < 0) return <ArrowDown className="w-4 h-4 text-red-600" />
    return <div className="w-4 h-4 bg-gray-400 rounded-full"></div>
  }

  if (error === 'upgrade_required') {
    return (
      <FeatureGate 
        feature="demographic_analytics"
        className={className}
        showUpgradePrompt={true}
      >
        <div>This content is not accessible</div>
      </FeatureGate>
    )
  }

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="flex justify-center items-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2 text-red-600 mb-2">
          <AlertCircle className="w-5 h-5" />
          <h3 className="font-medium">Error Loading Trending Topics</h3>
        </div>
        <p className="text-red-700 mb-4">{error}</p>
        <button
          onClick={loadTrendingTopics}
          className="text-sm text-red-600 hover:text-red-800 underline"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (topics.length === 0) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="text-center py-8">
          <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Trending Topics</h3>
          <p className="text-gray-600">Trending topics will appear as the community grows.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
          Trending Topics
        </h3>
        <span className="text-sm text-gray-500">Last 30 days</span>
      </div>

      <div className="space-y-4">
        {topics.map((topic, index) => (
          <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
              </div>
              
              <div>
                <div className="flex items-center space-x-2">
                  <Hash className="w-4 h-4 text-gray-400" />
                  <h4 className="font-medium text-gray-900">{topic.topic}</h4>
                </div>
                <div className="flex items-center space-x-3 mt-1">
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                    {topic.category}
                  </span>
                  <span className="text-xs text-gray-500">
                    {topic.count} mentions
                  </span>
                  <span className={`text-xs font-medium ${getSentimentColor(topic.sentiment)}`}>
                    {topic.sentiment > 0 ? 'Positive' : topic.sentiment < 0 ? 'Negative' : 'Neutral'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {getGrowthIcon(topic.growth)}
              <span className={`text-sm font-medium ${
                topic.growth > 0 ? 'text-green-600' : 
                topic.growth < 0 ? 'text-red-600' : 'text-gray-600'
              }`}>
                {topic.growth > 0 ? '+' : ''}{topic.growth}%
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-100">
        <button
          onClick={loadTrendingTopics}
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          Refresh Topics
        </button>
      </div>
    </div>
  )
}

export default TrendingTopics