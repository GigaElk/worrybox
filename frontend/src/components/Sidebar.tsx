import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, PlusCircle, Users, Settings, BarChart3, Heart, CheckCircle, BookOpen, Bell, X, Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { dashboardService, DashboardStats } from '../services/dashboardService'

interface SidebarProps {
  sidebarOpen?: boolean
  setSidebarOpen?: (open: boolean) => void
}

const Sidebar: React.FC<SidebarProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(false)

  useEffect(() => {
    if (isAuthenticated && user) {
      loadStats()
    }
  }, [isAuthenticated, user])

  const loadStats = async () => {
    try {
      setIsLoadingStats(true)
      const statsData = await dashboardService.getBasicStats()
      setStats(statsData)
    } catch (error) {
      console.error('Failed to load dashboard stats:', error)
      // Set default stats on error
      setStats({
        totalWorries: 0,
        worriesThisWeek: 0,
        resolvedWorries: 0,
        followersCount: 0,
        followingCount: 0
      })
    } finally {
      setIsLoadingStats(false)
    }
  }

  if (!isAuthenticated) {
    return null
  }

  const navigation = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Feed', href: '/feed', icon: PlusCircle },
    { name: 'Wellness', href: '/wellness', icon: Heart },
    { name: 'Resources', href: '/resources', icon: BookOpen },
    { name: 'Resolution Stories', href: '/resolution-stories', icon: CheckCircle },
    { name: 'Notifications', href: '/notifications', icon: Bell },
    { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
    { name: 'Community', href: '/community', icon: Users },
    { name: 'Settings', href: '/settings', icon: Settings },
  ]

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen?.(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white shadow-sm border-r border-gray-200 min-h-screen
        transform transition-transform duration-300 ease-in-out lg:transform-none
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Mobile close button */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-200">
          <span className="text-lg font-semibold text-gray-900">Menu</span>
          <button
            onClick={() => setSidebarOpen?.(false)}
            className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="p-4 space-y-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen?.(false)} // Close sidebar on mobile when clicking a link
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>
      
        {/* Quick Stats */}
        <div className="p-4 mt-8">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Quick Stats</h3>
            {isLoadingStats ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Total Worries:</span>
                  <span className="font-medium">{stats?.totalWorries || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Resolved:</span>
                  <span className="font-medium text-green-600">{stats?.resolvedWorries || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Followers:</span>
                  <span className="font-medium">{stats?.followersCount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Following:</span>
                  <span className="font-medium">{stats?.followingCount || 0}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}

export default Sidebar