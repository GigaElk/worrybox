import { Link, useNavigate } from 'react-router-dom'
import { User, LogOut } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import NotificationBell from './NotificationBell'
import LanguageSelector from './LanguageSelector'
import WorryBoxLogoLong from '../assets/WorryBoxLogoLong.png'

const Header = () => {
  const { t } = useTranslation()
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img 
              src={WorryBoxLogoLong} 
              alt="Worrybox" 
              className="h-10 w-auto"
            />
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link 
              to="/" 
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              {t('navigation.home')}
            </Link>
            <Link 
              to="/feed" 
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              {t('navigation.feed')}
            </Link>
            {isAuthenticated && (
              <Link 
                to="/dashboard" 
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                {t('navigation.dashboard')}
              </Link>
            )}
          </nav>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            <LanguageSelector compact={true} showLabel={false} />
            {isAuthenticated ? (
              <div className="flex items-center space-x-3">
                <NotificationBell />
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-700">
                    {user?.displayName || user?.username}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="text-sm">{t('navigation.logout')}</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link 
                  to="/login" 
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  {t('navigation.login')}
                </Link>
                <Link 
                  to="/register" 
                  className="btn-primary"
                >
                  {t('navigation.register')}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header