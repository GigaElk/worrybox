import React, { useState, useEffect } from 'react'
import { analyticsService, AnalyticsSummary as AnalyticsSummaryType } from '../services/analyticsService'
import { useAuth } from '../contexts/AuthContext'
import { BarChart2, TrendingUp, Calendar, Target, ArrowRight, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import FeatureGate from './FeatureGate'

interface AnalyticsSummaryProps {
  className?: string
}

const AnalyticsSummary: React.FC<AnalyticsSummaryProps> = ({ className = '' }) => {
  const { user } = useAuth()
  const [summary, setSummary] = useState<AnalyticsSummaryType | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      loadSummary()
    }
  }, [user])

  const loadSummary = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await analyticsService.getAnalyticsSummary()
      setSummary(data)
    } catch (error: any) {
      console.error('Failed to load analytics summary:', error)
      if (error.response?.status === 403) {
        setError('upgrade_required')
      } else {
        setError(error.response?.data?.error?.message || 'Failed to load summary')
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

  const getSentimentLabel = (score: number) => {
    if (score <= -0.7) return 'Very Negative'
    if (score <= -0.3) return 'Negative'
    if (score < 0.3) return 'Neutral'
    if (score < 0.7) return 'Positive'
    return 'Very Positive'
  }

  if (error === 'upgrade_required') {
    return (
      <FeatureGate 
        feature="personal_analytics"
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

  if (error || !summary) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="text-center py-8">
          <BarChart2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics Unavailable</h3>
          <p className="text-gray-600 mb-4">
            {error || 'Unable to load your analytics summary.'}
          </p>
          <button
            onClick={loadSummary}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <BarChart2 className="w-5 h-5 mr-2 text-blue-600" />
          Your Analytics
        </h3>
        <Link 
          to="/analytics" 
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
        >
          View Details
          <ArrowRight className="w-4 h-4 ml-1" />
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <Target className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-xl font-bold text-gray-900">{summary.overview.totalWorries}</p>
          <p className="text-xs text-gray-600">Total Worries</p>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <Calendar className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-xl font-bold text-gray-900">{summary.overview.worriesThisWeek}</p>
          <p className="text-xs text-gray-600">This Week</p>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-xl font-bold text-gray-900">{summary.overview.averageWorriesPerWeek}</p>
          <p className="text-xs text-gray-600">Weekly Avg</p>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <div className={`w-3 h-3 rounded-full ${getSentimentColor(summary.sentimentSummary.average).replace('text-', 'bg-')}`}></div>
          </div>
          <p className="text-sm font-bold text-gray-900">
            {getSentimentLabel(summary.sentimentSummary.average)}
          </p>
          <p className="text-xs text-gray-600">Avg Sentiment</p>
        </div>
      </div>

      {/* Top Categories */}
      {summary.topCategories.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Top Worry Categories</h4>
          <div className="space-y-2">
            {summary.topCategories.slice(0, 3).map((category, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-900">{category.category}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-16 bg-gray-200 rounded-full h-1.5">
                    <div 
                      className="bg-blue-600 h-1.5 rounded-full" 
                      style={{ width: `${category.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-500 w-8 text-right">
                    {category.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Insights */}
      {summary.recentInsights.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Insights</h4>
          <div className="space-y-2">
            {summary.recentInsights.slice(0, 2).map((insight, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg">
                <h5 className="text-sm font-medium text-gray-900">{insight.title}</h5>
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">{insight.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Call to Action */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <Link
          to="/analytics"
          className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
        >
          <BarChart2 className="w-4 h-4 mr-2" />
          View Full Analytics
        </Link>
      </div>
    </div>
  )
}

export default AnalyticsSummary