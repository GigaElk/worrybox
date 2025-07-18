import React, { useState, useEffect } from 'react'
import { notificationService, Notification } from '../services/notificationService'
import { useAuth } from '../contexts/AuthContext'
import { Bell, Heart, MessageCircle, CheckCircle, Clock, Loader2, AlertCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface NotificationListProps {
  limit?: number
  showMarkAllRead?: boolean
  className?: string
}

const NotificationList: React.FC<NotificationListProps> = ({ 
  limit = 20, 
  showMarkAllRead = true,
  className = '' 
}) => {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [markingAsRead, setMarkingAsRead] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      loadNotifications()
    }
  }, [user, limit])

  const loadNotifications = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await notificationService.getUserNotifications(limit)
      setNotifications(data)
    } catch (error: any) {
      console.error('Failed to load notifications:', error)
      setError(error.response?.data?.error?.message || 'Failed to load notifications')
    } finally {
      setIsLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      setMarkingAsRead(notificationId)
      await notificationService.markNotificationAsRead(notificationId)
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, isRead: true }
            : notification
        )
      )
    } catch (error: any) {
      console.error('Failed to mark notification as read:', error)
    } finally {
      setMarkingAsRead(null)
    }
  }

  const markAllAsRead = async () => {
    try {
      setMarkingAsRead('all')
      await notificationService.markAllNotificationsAsRead()
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, isRead: true }))
      )
    } catch (error: any) {
      console.error('Failed to mark all notifications as read:', error)
    } finally {
      setMarkingAsRead(null)
    }
  }

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'check_in':
        return <Heart className="w-5 h-5 text-blue-500" />
      case 'support':
        return <Heart className="w-5 h-5 text-pink-500" />
      case 'encouragement':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'community':
        return <MessageCircle className="w-5 h-5 text-purple-500" />
      case 'reminder':
        return <Clock className="w-5 h-5 text-orange-500" />
      default:
        return <Bell className="w-5 h-5 text-gray-500" />
    }
  }

  const getNotificationTypeLabel = (type: Notification['type']) => {
    switch (type) {
      case 'check_in': return 'Check-in'
      case 'support': return 'Support'
      case 'encouragement': return 'Encouragement'
      case 'community': return 'Community'
      case 'reminder': return 'Reminder'
      default: return 'Notification'
    }
  }

  const unreadCount = notifications.filter(n => !n.isRead).length

  if (isLoading) {
    return (
      <div className={`flex justify-center items-center py-8 ${className}`}>
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center space-x-2 text-red-600 mb-2">
          <AlertCircle className="w-5 h-5" />
          <h3 className="font-medium">Error Loading Notifications</h3>
        </div>
        <p className="text-red-700 mb-4">{error}</p>
        <button
          onClick={loadNotifications}
          className="text-sm text-red-600 hover:text-red-800 underline"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (notifications.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-600 mb-2">No notifications yet</p>
        <p className="text-sm text-gray-500">
          You'll receive gentle check-ins and supportive messages here
        </p>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Header */}
      {showMarkAllRead && unreadCount > 0 && (
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-600">
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </p>
          <button
            onClick={markAllAsRead}
            disabled={markingAsRead === 'all'}
            className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {markingAsRead === 'all' ? 'Marking...' : 'Mark all as read'}
          </button>
        </div>
      )}

      {/* Notifications List */}
      <div className="space-y-3">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`bg-white rounded-lg border p-4 transition-colors ${
              notification.isRead 
                ? 'border-gray-200 bg-gray-50' 
                : 'border-blue-200 bg-blue-50'
            }`}
          >
            <div className="flex items-start space-x-3">
              {/* Icon */}
              <div className="flex-shrink-0 mt-1">
                {getNotificationIcon(notification.type)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {notification.title}
                  </h4>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </span>
                    {!notification.isRead && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        disabled={markingAsRead === notification.id}
                        className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Mark as read"
                      >
                        {markingAsRead === notification.id ? '...' : '✓'}
                      </button>
                    )}
                  </div>
                </div>
                
                <p className="text-sm text-gray-700 mb-2">
                  {notification.message}
                </p>
                
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
                    {getNotificationTypeLabel(notification.type)}
                  </span>
                  {!notification.isRead && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-600">
                      New
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Load More */}
      {notifications.length >= limit && (
        <div className="text-center mt-6">
          <button
            onClick={() => loadNotifications()}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Load more notifications
          </button>
        </div>
      )}
    </div>
  )
}

export default NotificationList