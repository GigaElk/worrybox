import { useState, useEffect } from 'react'
import { BarChart3, Heart, Users, TrendingUp, Loader2, RefreshCw, Lock, Globe, UserCheck } from 'lucide-react'
// import CrisisResourceBanner from '../components/CrisisResourceBanner'
import WorryBoxLogoSquare from '../assets/WorryBoxLogoSquare.png'
import { dashboardService, DashboardData } from '../services/dashboardService'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

const DashboardPage = () => {
  const { isAuthenticated } = useAuth()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboardData = async () => {
    if (!isAuthenticated) {
      setIsLoading(false)
      return
    }

    try {
      setError(null)
      const data = await dashboardService.getDashboardData()
      setDashboardData(data)
    } catch (err: any) {
      const message = err.response?.data?.error?.message || 'Failed to load dashboard data'
      setError(message)
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [isAuthenticated])

  const handleRefresh = () => {
    setIsLoading(true)
    fetchDashboardData()
  }

  const getPrivacyIcon = (privacyLevel: string) => {
    switch (privacyLevel) {
      case 'public':
        return <Globe className="w-3 h-3 text-green-500" />
      case 'friends':
        return <UserCheck className="w-3 h-3 text-blue-500" />
      case 'private':
        return <Lock className="w-3 h-3 text-gray-500" />
      default:
        return null
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) {
      return 'Just now'
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`
    } else if (diffInHours < 48) {
      return 'Yesterday'
    } else {
      const diffInDays = Math.floor(diffInHours / 24)
      return `${diffInDays}d ago`
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Dashboard</h1>
        <p className="text-gray-600 mb-6">Please log in to view your dashboard</p>
        <a
          href="/login"
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700"
        >
          Log In
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Crisis Resources Banner */}
      {/* <CrisisResourceBanner /> */}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Track your journey and see how you're progressing
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="inline-flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600 mx-auto" />
            <p className="mt-2 text-sm text-gray-600">Loading your dashboard...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center space-x-2 text-red-600 mb-2">
            <p className="font-medium">Error Loading Dashboard</p>
          </div>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="text-sm text-red-600 hover:text-red-800 underline"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Stats Grid */}
      {!isLoading && !error && dashboardData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card">
            <div className="flex items-center">
              <div className="bg-primary-100 rounded-lg p-3">
                <Heart className="h-6 w-6 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Worries</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardData.stats.totalWorries}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="bg-green-100 rounded-lg p-3">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Resolved</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardData.stats.resolvedWorries}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="bg-blue-100 rounded-lg p-3">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Followers</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardData.stats.followersCount}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="bg-purple-100 rounded-lg p-3">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">This Week</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardData.stats.worriesThisWeek}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {!isLoading && !error && dashboardData && (
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Worries</h2>
            {dashboardData.recentWorries.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <img 
                  src={WorryBoxLogoSquare} 
                  alt="Worrybox" 
                  className="h-16 w-auto mx-auto mb-4 opacity-30"
                />
                <p>No worries shared yet</p>
                <p className="text-sm mt-2">Start by sharing what's on your mind</p>
              </div>
            ) : (
              <div className="space-y-4">
                {dashboardData.recentWorries.map((worry) => (
                  <div key={worry.id} className="border-l-4 border-primary-200 pl-4 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        {getPrivacyIcon(worry.privacyLevel)}
                        <span className="text-xs text-gray-500 capitalize">{worry.privacyLevel}</span>
                      </div>
                      <span className="text-xs text-gray-500">{formatDate(worry.publishedAt)}</span>
                    </div>
                    <p className="text-sm text-gray-900 font-medium mb-1">{worry.worryPrompt}</p>
                    <p className="text-sm text-gray-600 line-clamp-2">{worry.shortContent}</p>
                  </div>
                ))}
                <div className="pt-2">
                  <a
                    href="/feed"
                    className="text-sm text-primary-600 hover:text-primary-800 font-medium"
                  >
                    View all worries →
                  </a>
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Community Support</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Users className="h-5 w-5 text-blue-500" />
                  <span className="text-sm font-medium text-gray-900">Following</span>
                </div>
                <span className="text-lg font-bold text-gray-900">{dashboardData.stats.followingCount}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Heart className="h-5 w-5 text-red-500" />
                  <span className="text-sm font-medium text-gray-900">Followers</span>
                </div>
                <span className="text-lg font-bold text-gray-900">{dashboardData.stats.followersCount}</span>
              </div>
              {dashboardData.stats.followingCount === 0 && dashboardData.stats.followersCount === 0 && (
                <div className="text-center py-4 text-gray-500">
                  <p className="text-sm">Connect with others to give and receive support</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Progress Section */}
      {!isLoading && !error && dashboardData && (
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Progress</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-primary-600 mb-1">
                {dashboardData.stats.totalWorries}
              </div>
              <div className="text-sm text-gray-600">Total Shared</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {dashboardData.stats.resolvedWorries}
              </div>
              <div className="text-sm text-gray-600">Resolved</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 mb-1">
                {dashboardData.stats.worriesThisWeek}
              </div>
              <div className="text-sm text-gray-600">This Week</div>
            </div>
          </div>
          {dashboardData.stats.totalWorries === 0 && (
            <div className="text-center py-8 text-gray-500">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Progress tracking will appear here</p>
              <p className="text-sm mt-2">Share a few worries to see your patterns and growth</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default DashboardPage