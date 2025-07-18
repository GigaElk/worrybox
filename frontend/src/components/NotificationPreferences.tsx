import React, { useState, useEffect } from 'react'
import { notificationService, NotificationPreferences } from '../services/notificationService'
import { useAuth } from '../contexts/AuthContext'
import { Bell, Clock, Mail, Smartphone, Volume2, VolumeX, Loader2, AlertCircle, CheckCircle } from 'lucide-react'

const NotificationPreferencesComponent: React.FC = () => {
  const { user } = useAuth()
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      loadPreferences()
    }
  }, [user])

  const loadPreferences = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await notificationService.getNotificationPreferences()
      setPreferences(data)
    } catch (error: any) {
      console.error('Failed to load notification preferences:', error)
      setError(error.response?.data?.error?.message || 'Failed to load preferences')
    } finally {
      setIsLoading(false)
    }
  }

  const updatePreferences = async (updates: Partial<NotificationPreferences>) => {
    try {
      setIsSaving(true)
      setError(null)
      setSuccessMessage(null)
      
      const updatedPreferences = await notificationService.updateNotificationPreferences(updates)
      setPreferences(updatedPreferences)
      setSuccessMessage('Preferences updated successfully!')
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error: any) {
      console.error('Failed to update notification preferences:', error)
      setError(error.response?.data?.error?.message || 'Failed to update preferences')
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggle = (field: keyof NotificationPreferences, value: boolean) => {
    updatePreferences({ [field]: value })
  }

  const handleFrequencyChange = (frequency: NotificationPreferences['checkInFrequency']) => {
    updatePreferences({ checkInFrequency: frequency })
  }

  const handleQuietHoursChange = (field: 'quietHoursStart' | 'quietHoursEnd', value: string) => {
    updatePreferences({ [field]: value })
  }

  const handleTimezoneChange = (timezone: string) => {
    updatePreferences({ timezone })
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error && !preferences) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center space-x-2 text-red-600 mb-2">
          <AlertCircle className="w-5 h-5" />
          <h3 className="font-medium">Error Loading Preferences</h3>
        </div>
        <p className="text-red-700 mb-4">{error}</p>
        <button
          onClick={loadPreferences}
          className="text-sm text-red-600 hover:text-red-800 underline"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <Bell className="w-5 h-5 text-blue-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Notification Preferences</h2>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Customize how and when you receive notifications from Worrybox
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="px-6 py-3 bg-green-50 border-b border-green-200">
            <div className="flex items-center text-green-600">
              <CheckCircle className="w-4 h-4 mr-2" />
              <span className="text-sm">{successMessage}</span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="px-6 py-3 bg-red-50 border-b border-red-200">
            <div className="flex items-center text-red-600">
              <AlertCircle className="w-4 h-4 mr-2" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        <div className="p-6 space-y-6">
          {/* Notification Types */}
          <div>
            <h3 className="text-md font-medium text-gray-900 mb-4">Notification Types</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Mail className="w-4 h-4 text-gray-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Email Notifications</p>
                    <p className="text-xs text-gray-500">Receive notifications via email</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences?.emailNotifications || false}
                    onChange={(e) => handleToggle('emailNotifications', e.target.checked)}
                    disabled={isSaving}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Smartphone className="w-4 h-4 text-gray-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Push Notifications</p>
                    <p className="text-xs text-gray-500">Receive browser push notifications</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences?.pushNotifications || false}
                    onChange={(e) => handleToggle('pushNotifications', e.target.checked)}
                    disabled={isSaving}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Volume2 className="w-4 h-4 text-gray-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Support Notifications</p>
                    <p className="text-xs text-gray-500">Get notified about community support and interactions</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences?.supportNotifications || false}
                    onChange={(e) => handleToggle('supportNotifications', e.target.checked)}
                    disabled={isSaving}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Check-in Frequency */}
          <div>
            <h3 className="text-md font-medium text-gray-900 mb-4">Check-in Frequency</h3>
            <p className="text-sm text-gray-600 mb-4">How often would you like to receive gentle check-ins?</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { value: 'daily', label: 'Daily' },
                { value: 'weekly', label: 'Weekly' },
                { value: 'biweekly', label: 'Bi-weekly' },
                { value: 'monthly', label: 'Monthly' },
                { value: 'never', label: 'Never' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleFrequencyChange(option.value as NotificationPreferences['checkInFrequency'])}
                  disabled={isSaving}
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                    preferences?.checkInFrequency === option.value
                      ? 'bg-blue-100 text-blue-800 border-blue-300'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quiet Hours */}
          <div>
            <h3 className="text-md font-medium text-gray-900 mb-4">
              <Clock className="w-4 h-4 inline mr-2" />
              Quiet Hours
            </h3>
            <p className="text-sm text-gray-600 mb-4">Set times when you don't want to receive notifications</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <input
                  type="time"
                  value={preferences?.quietHoursStart || '22:00'}
                  onChange={(e) => handleQuietHoursChange('quietHoursStart', e.target.value)}
                  disabled={isSaving}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <input
                  type="time"
                  value={preferences?.quietHoursEnd || '08:00'}
                  onChange={(e) => handleQuietHoursChange('quietHoursEnd', e.target.value)}
                  disabled={isSaving}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Timezone */}
          <div>
            <h3 className="text-md font-medium text-gray-900 mb-4">Timezone</h3>
            <select
              value={preferences?.timezone || 'UTC'}
              onChange={(e) => handleTimezoneChange(e.target.value)}
              disabled={isSaving}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="Europe/London">London</option>
              <option value="Europe/Paris">Paris</option>
              <option value="Asia/Tokyo">Tokyo</option>
              <option value="Australia/Sydney">Sydney</option>
            </select>
          </div>
        </div>

        {/* Loading Overlay */}
        {isSaving && (
          <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center">
            <div className="flex items-center space-x-2 text-blue-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Saving...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default NotificationPreferencesComponent