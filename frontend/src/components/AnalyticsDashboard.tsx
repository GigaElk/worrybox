import React, { useState, useEffect } from 'react'
import { 
  BarChart3, 
  Globe, 
  TrendingUp, 
  Users, 
  Download, 
  Filter,
  AlertCircle,
  Crown,
  MapPin
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { analyticsService, GeographicAnalyticsQuery, RegionSummary } from '../services/analyticsService'
import { toast } from 'react-hot-toast'

interface AnalyticsDashboardProps {
  className?: string
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ className = '' }) => {
  const { user } = useAuth()
  const { subscription } = useSubscription()
  const [isLoading, setIsLoading] = useState(true)
  const [regionSummaries, setRegionSummaries] = useState<RegionSummary[]>([])
  const [availableRegions, setAvailableRegions] = useState<{
    countries: string[]
    regionsByCountry: Record<string, string[]>
    totalRegions: number
  } | null>(null)
  
  const [filters, setFilters] = useState<GeographicAnalyticsQuery>({
    timeRange: '30d',
    countries: [],
    regions: [],
    categories: []
  })

  const [showFilters, setShowFilters] = useState(false)

  // Check if user has premium access
  const hasPremiumAccess = subscription?.tier === 'premium' || subscription?.tier === 'supporter'

  useEffect(() => {
    if (hasPremiumAccess) {
      loadDashboardData()
    } else {
      setIsLoading(false)
    }
  }, [hasPremiumAccess, filters.timeRange])

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      
      // Load region summaries and available regions in parallel
      const [summariesResponse, regionsResponse] = await Promise.all([
        analyticsService.getRegionSummaries({ timeRange: filters.timeRange }),
        analyticsService.getAvailableRegions()
      ])

      setRegionSummaries(summariesResponse.data)
      setAvailableRegions(regionsResponse.data)
    } catch (error: any) {
      console.error('Failed to load analytics data:', error)
      if (error.response?.status === 403) {
        toast.error('Premium subscription required to access analytics')
      } else {
        toast.error('Failed to load analytics data')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const blob = await analyticsService.exportAnalytics(filters, format)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `worrybox-analytics-${Date.now()}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success(`Analytics exported as ${format.toUpperCase()}`)
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('Failed to export analytics data')
    }
  }

  const formatSentiment = (sentiment: number): string => {
    if (sentiment > 0.6) return 'Positive'
    if (sentiment < 0.4) return 'Negative'
    return 'Neutral'
  }

  const getSentimentColor = (sentiment: number): string => {
    if (sentiment > 0.6) return 'text-green-600'
    if (sentiment < 0.4) return 'text-red-600'
    return 'text-yellow-600'
  }

  if (!user) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <p className="text-gray-600">Please log in to access analytics.</p>
      </div>
    )
  }

  if (!hasPremiumAccess) {
    return (
      <div className={`text-center ${className}`}>
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-8 border border-purple-200">
          <Crown className="h-16 w-16 text-purple-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Premium Analytics Dashboard</h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Access powerful geographic insights about mental health patterns and community trends. 
            Help researchers and organizations better understand regional mental health needs.
          </p>
          
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <Globe className="h-8 w-8 text-blue-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Geographic Insights</h3>
              <p className="text-sm text-gray-600">View worry patterns by country and region</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <TrendingUp className="h-8 w-8 text-green-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Trend Analysis</h3>
              <p className="text-sm text-gray-600">Track mental health trends over time</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <Download className="h-8 w-8 text-purple-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-3">Data Export</h3>
              <p className="text-sm text-gray-600">Export anonymized data for research</p>
            </div>
          </div>

          <div className="space-y-4">
            <a
              href="/pricing"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              <Crown className="h-5 w-5 mr-2" />
              Upgrade to Premium
            </a>
            <p className="text-sm text-gray-500">
              Starting at $5/month • Cancel anytime
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <Globe className="w-6 h-6 mr-2 text-blue-600" />
          Geographic Analytics
        </h2>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </button>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleExport('json')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              JSON
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              CSV
            </button>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Filters</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Range
              </label>
              <select
                value={filters.timeRange}
                onChange={(e) => setFilters(prev => ({ ...prev, timeRange: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="1y">Last year</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Countries
              </label>
              <select
                multiple
                value={filters.countries}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  countries: Array.from(e.target.selectedOptions, option => option.value)
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {availableRegions?.countries.map(country => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categories
              </label>
              <select
                multiple
                value={filters.categories}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  categories: Array.from(e.target.selectedOptions, option => option.value)
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="work">Work & Career</option>
                <option value="relationships">Relationships</option>
                <option value="health">Health & Wellness</option>
                <option value="family">Family</option>
                <option value="finances">Finances</option>
                <option value="education">Education</option>
                <option value="social">Social Issues</option>
                <option value="personal">Personal Growth</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-blue-900 mb-1">Privacy Protection</h3>
            <p className="text-sm text-blue-800">
              All data shown is aggregated and anonymized with minimum privacy thresholds enforced. 
              Individual users cannot be identified from this data.
            </p>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading analytics data...</p>
        </div>
      )}

      {/* Dashboard Content */}
      {!isLoading && (
        <>
          {/* Summary Stats */}
          <div className="grid md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <Globe className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Regions</p>
                  <p className="text-2xl font-bold text-gray-900">{availableRegions?.totalRegions || 0}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {regionSummaries.reduce((sum, region) => sum + region.totalUsers, 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Posts</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {regionSummaries.reduce((sum, region) => sum + region.totalPosts, 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg Sentiment</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {regionSummaries.length > 0 
                      ? (regionSummaries.reduce((sum, region) => sum + region.averageSentiment, 0) / regionSummaries.length).toFixed(2)
                      : '0.00'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Regional Data Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Regional Overview</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Region
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Users
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Posts
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sentiment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Top Categories
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {regionSummaries.map((region, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {region.region || 'Unknown Region'}
                            </div>
                            <div className="text-sm text-gray-500">{region.country}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {region.totalUsers.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {region.totalPosts.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${getSentimentColor(region.averageSentiment)}`}>
                          {formatSentiment(region.averageSentiment)} ({region.averageSentiment.toFixed(2)})
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          {region.topCategories.slice(0, 3).map((category, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {category}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {regionSummaries.length === 0 && (
            <div className="text-center py-12">
              <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
              <p className="text-gray-600">
                There isn't enough data to display analytics for the selected filters. 
                Try adjusting your time range or removing filters.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default AnalyticsDashboard