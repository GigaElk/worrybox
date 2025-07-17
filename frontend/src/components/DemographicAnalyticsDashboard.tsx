import React, { useState, useEffect } from 'react'
import { demographicAnalyticsService, DemographicAnalytics } from '../services/demographicAnalyticsService'
import { useAuth } from '../contexts/AuthContext'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Globe, 
  Clock, 
  Shield,
  Activity,
  Heart,
  AlertCircle,
  Loader2,
  Info
} from 'lucide-react'
import FeatureGate from './FeatureGate'

interface DemographicAnalyticsDashboardProps {
  className?: string
}

const DemographicAnalyticsDashboard: React.FC<DemographicAnalyticsDashboardProps> = ({ className = '' }) => {
  const { user } = useAuth()
  const [analytics, setAnalytics] = useState<DemographicAnalytics | null>(null)
  const [timeRange, setTimeRange] = useState<'30d' | '90d' | '1y'>('90d')
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
      const data = await demographicAnalyticsService.getDemographicAnalytics(timeRange)
      setAnalytics(data)
    } catch (error: any) {
      console.error('Failed to load demographic analytics:', error)
      if (error.response?.status === 403) {
        setError('upgrade_required')
      } else {
        setError(error.response?.data?.error?.message || 'Failed to load analytics')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const getTimeRangeLabel = (range: string) => {
    switch (range) {
      case '30d': return 'Last 30 Days'
      case '90d': return 'Last 3 Months'
      case '1y': return 'Last Year'
      default: return 'Last 3 Months'
    }
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-600" />
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-600" />
    return <div className="w-4 h-4 bg-gray-400 rounded-full"></div>
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
        feature="demographic_analytics"
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
          <h3 className="font-medium">Error Loading Demographics</h3>
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
        <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Demographics Data</h3>
        <p className="text-gray-600">Demographic analytics will be available once there's sufficient community data.</p>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <BarChart3 className="w-6 h-6 mr-2 text-blue-600" />
            Community Demographics
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Anonymized insights about the WorryBox community
          </p>
        </div>
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

      {/* Privacy Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900">Privacy Protected</h4>
            <p className="text-sm text-blue-700 mt-1">
              All demographic data is anonymized and aggregated. Individual users cannot be identified, 
              and minimum sample sizes are enforced to protect privacy.
            </p>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.overview.totalUsers.toLocaleString()}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.overview.activeUsers.toLocaleString()}</p>
            </div>
            <Activity className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Worries</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.overview.totalWorries.toLocaleString()}</p>
            </div>
            <Heart className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg per User</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.overview.averageWorriesPerUser}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Category Trends */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Trending Worry Categories</h3>
        <div className="space-y-4">
          {analytics.categoryTrends.trending.slice(0, 8).map((category, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getTrendIcon(category.trend)}
                <span className="text-sm font-medium text-gray-900">{category.category}</span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">{category.count.toLocaleString()} posts</span>
                <div className={`text-sm font-medium ${
                  category.change > 0 ? 'text-green-600' : 
                  category.change < 0 ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {category.change > 0 ? '+' : ''}{category.change}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sentiment Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Global Sentiment</h3>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Average Sentiment</h4>
              <div className="flex items-center space-x-3">
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="h-3 rounded-full bg-blue-600" 
                    style={{ 
                      width: `${((analytics.sentimentAnalysis.globalAverage + 1) / 2) * 100}%`,
                      backgroundColor: analytics.sentimentAnalysis.globalAverage < 0 ? '#f87171' : '#60a5fa'
                    }}
                  ></div>
                </div>
                <span className={`font-medium ${getSentimentColor(analytics.sentimentAnalysis.globalAverage)}`}>
                  {getSentimentLabel(analytics.sentimentAnalysis.globalAverage)}
                </span>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Distribution</h4>
              <div className="space-y-2">
                {Object.entries(analytics.sentimentAnalysis.distribution).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <span className="font-medium">{value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Privacy Insights */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Privacy Preferences</h3>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Post Privacy Distribution</h4>
              <div className="space-y-2">
                {Object.entries(analytics.privacyInsights.privacyDistribution).map(([level, count]) => (
                  <div key={level} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {level === 'public' && <Globe className="w-4 h-4 text-green-600" />}
                      {level === 'friends' && <Users className="w-4 h-4 text-blue-600" />}
                      {level === 'private' && <Shield className="w-4 h-4 text-gray-600" />}
                      <span className="text-sm capitalize">{level}</span>
                    </div>
                    <span className="text-sm font-medium">{count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Temporal Patterns */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Activity Patterns</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Daily Activity</h4>
            <div className="space-y-2">
              {analytics.temporalPatterns.dailyActivity.map((day, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{day.dayOfWeek}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${(day.averageActivity / 15) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium w-8 text-right">
                      {day.averageActivity.toFixed(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Peak Hours</h4>
            <div className="grid grid-cols-6 gap-1">
              {analytics.temporalPatterns.hourlyActivity.map((hour, index) => (
                <div key={index} className="text-center">
                  <div 
                    className="bg-blue-600 rounded mb-1" 
                    style={{ 
                      height: `${Math.max(4, (hour.averageActivity / 10) * 40)}px`,
                      opacity: 0.3 + (hour.averageActivity / 10) * 0.7
                    }}
                  ></div>
                  <span className="text-xs text-gray-500">{hour.hour}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Community Health */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Community Health</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {analytics.communityHealth.engagementMetrics.averagePostsPerUser}
            </p>
            <p className="text-sm text-gray-600">Avg Posts per User</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Heart className="w-6 h-6 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {analytics.communityHealth.supportMetrics.postsWithSimilarWorries.toLocaleString()}
            </p>
            <p className="text-sm text-gray-600">Posts with Similar Worries</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {analytics.communityHealth.supportMetrics.communityInteractionRate}%
            </p>
            <p className="text-sm text-gray-600">Community Interaction Rate</p>
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <Info className="w-4 h-4 text-gray-500 mt-0.5" />
          <p className="text-sm text-gray-600">
            These demographics help us understand community patterns while protecting individual privacy. 
            All data is aggregated and anonymized according to strict privacy standards.
          </p>
        </div>
      </div>
    </div>
  )
}

export default DemographicAnalyticsDashboard