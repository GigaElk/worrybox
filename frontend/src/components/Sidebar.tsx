import { Link, useLocation } from 'react-router-dom'
import { Home, PlusCircle, Users, Settings, BarChart3, Heart, CheckCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const Sidebar = () => {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return null
  }

  const navigation = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Feed', href: '/feed', icon: PlusCircle },
    { name: 'Wellness', href: '/wellness', icon: Heart },
    { name: 'Resolution Stories', href: '/resolution-stories', icon: CheckCircle },
    { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
    { name: 'Community', href: '/community', icon: Users },
    { name: 'Settings', href: '/settings', icon: Settings },
  ]

  return (
    <aside className="w-64 bg-white shadow-sm border-r border-gray-200 min-h-screen">
      <nav className="p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href
          return (
            <Link
              key={item.name}
              to={item.href}
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
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Total Worries:</span>
              <span className="font-medium">0</span>
            </div>
            <div className="flex justify-between">
              <span>Resolved:</span>
              <span className="font-medium text-green-600">0</span>
            </div>
            <div className="flex justify-between">
              <span>Followers:</span>
              <span className="font-medium">0</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar