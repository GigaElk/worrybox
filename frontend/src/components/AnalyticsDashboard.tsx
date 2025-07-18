import React, { useState, useEffect } from 'react'
import { analyticsService, PersonalAnalytics } from '../services/analyticsService'
import { useAuth } from '../contexts/AuthContext'
import { 
  BarChart2, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Clock, 
  Target,
  AlertCircle,
  CheckCircle,
  Info,
  Loader2
} from 'lucide-react'
import FeatureGate from './FeatureGate'

interface AnalyticsDashboardProps {
  className?: string
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ className = '' }) => {
  const { user } = useAuth()
  const [analytics, setAnalytics] = useState<PersonalAnalytics | null>(null)
  const [timeRange, setTimeRange] = useState<'30d' | '90d' | '1y'>('30d')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      loadAnalytics()
    }
  }, [user, timeRange])

  const loadAnalytics = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await analyticsService.getPersonalAnalytics(timeRange)
      setAnalytics(data)
    } catch (error: any) {
      console.error('Failed to load analytics:', error)
      if (error.response?.status === 403) {
        setError('upgrade_required')
      } else {
        setError(error.response?.data?.error?.message || 'Failed to load analytics')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // const getTimeRangeLabel = (range: string) => {
  //   switch (range) {
  //     case '30d': return 'Last 30 Days'
  //     case '90d': return 'Last 3 Months'
  //     case '1y': return 'Last Year'
  //     default: return 'Last 30 Days'
  //   }
  // }

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

  const getInsightIcon = (_type: string, severity: string) => {
    if (severity === 'positive') return <CheckCircle className="w-5 h-5 text-green-600" />
    if (severity === 'warning') return <AlertCircle className="w-5 h-5 text-orange-600" />
    return <Info className="w-5 h-5 text-blue-600" />
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-600" />
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-600" />
    return <div className="w-4 h-4 bg-gray-400 rounded-full"></div>
  }

  if (error === 'upgrade_required') {
    return (
      <FeatureGate 
        feature="personal_analytics"
        className={className}
      >
        <div>This content is not accessible</div>
      </FeatureGate>
    )
  }

  if (isLoading) {
    return (
      <div className={`flex justify-center items-center py-12 ${className}`}>
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center space-x-2 text-red-600 mb-2">
          <AlertCircle className="w-5 h-5" />
          <h3 className="font-medium">Error Loading Analytics</h3>
        </div>
        <p className="text-red-700 mb-4">{error}</p>
        <button
          onClick={loadAnalytics}
          className="text-sm text-red-600 hover:text-red-800 underline"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <BarChart2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Data</h3>
        <p className="text-gray-600">Start sharing worries to see your personal analytics.</p>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <BarChart2 className="w-6 h-6 mr-2 text-blue-600" />
          Personal Analytics
        </h2>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as '30d' | '90d' | '1y')}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 3 Months</option>
          <option value="1y">Last Year</option>
        </select>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Worries</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.overview.totalWorries}</p>
            </div>
            <Target className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">This Week</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.overview.worriesThisWeek}</p>
            </div>
            <Calendar className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Weekly Average</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.overview.averageWorriesPerWeek}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Most Active</p>
              <p className="text-lg font-bold text-gray-900">{analytics.overview.mostActiveDay}</p>
              <p className="text-sm text-gray-500">{analytics.overview.mostActiveHour}:00</p>
            </div>
            <Clock className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Insights */}
      {analytics.insights.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Insights & Recommendations</h3>
          <div className="space-y-4">
            {analytics.insights.map((insight, index) => (
              <div key={index} className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                {getInsightIcon(insight.type, insight.severity)}
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{insight.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                  {insight.actionable && (
                    <button className="text-sm text-blue-600 hover:text-blue-800 mt-2">
                      Learn More →
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Categories Breakdown */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Worry Categories</h3>
        <div className="space-y-3">
          {analytics.categories.breakdown.map((category, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getTrendIcon(category.trend)}
                <span className="text-sm font-medium text-gray-900">{category.category}</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${category.percentage}%` }}
                  ></div>
                </div>
                <span className="text-sm text-gray-600 w-12 text-right">
                  {category.percentage}%
                </span>
                <span className="text-sm text-gray-500 w-8 text-right">
                  {category.count}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sentiment Analysis */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Sentiment Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Average Sentiment</h4>
            <div className="flex items-center space-x-3">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="h-3 rounded-full bg-blue-600" 
                  style={{ 
                    width: `${((analytics.sentiment.averageSentiment + 1) / 2) * 100}%`,
                    backgroundColor: analytics.sentiment.averageSentiment < 0 ? '#f87171' : '#60a5fa'
                  }}
                ></div>
              </div>
              <span className={`font-medium ${getSentimentColor(analytics.sentiment.averageSentiment)}`}>
                {getSentimentLabel(analytics.sentiment.averageSentiment)}
              </span>
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Distribution</h4>
            <div className="space-y-1">
              {Object.entries(analytics.sentiment.sentimentDistribution).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <span className="font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Engagement Stats */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Engagement Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{analytics.engagement.totalPosts}</p>
            <p className="text-sm text-gray-600">Total Posts</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{analytics.engagement.postsWithBlogContent}</p>
            <p className="text-sm text-gray-600">Extended Posts</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">{analytics.engagement.averagePostLength}</p>
            <p className="text-sm text-gray-600">Avg Length</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600">{analytics.engagement.scheduledPosts}</p>
            <p className="text-sm text-gray-600">Scheduled</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AnalyticsDashboard