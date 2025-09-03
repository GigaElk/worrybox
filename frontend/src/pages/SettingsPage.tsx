import React, { useState, useEffect } from 'react'
import { User, Bell, Shield, CreditCard, Globe, Save, Mail, CheckCircle, AlertCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { userService } from '../services/userService'
import { authService } from '../services/authService'
import { profilePictureService } from '../services/profilePictureService'
import ProfilePictureUpload from '../components/ProfilePictureUpload'
import UserAvatar from '../components/UserAvatar'
import { toast } from 'react-hot-toast'

interface UserSettings {
  displayName: string
  bio: string
  language: string
  emailNotifications: boolean
  pushNotifications: boolean
  privacyLevel: 'public' | 'friends' | 'private'
  // Location fields
  country: string
  region: string
  city: string
  locationSharing: boolean
  // Avatar field
  avatarUrl: string | null
}

const SettingsPage: React.FC = () => {
  const { user, refreshUser } = useAuth()
  const { subscription } = useSubscription()
  const [settings, setSettings] = useState<UserSettings>({
    displayName: '',
    bio: '',
    language: 'en',
    emailNotifications: true,
    pushNotifications: true,
    privacyLevel: 'public',
    // Location fields
    country: '',
    region: '',
    city: '',
    locationSharing: false,
    // Avatar field
    avatarUrl: null
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isResendingEmail, setIsResendingEmail] = useState(false)

  useEffect(() => {
    if (user) {
      setSettings({
        displayName: user.displayName || '',
        bio: user.bio || '',
        language: 'en', // TODO: Get from user preferences
        emailNotifications: true, // TODO: Get from user preferences
        pushNotifications: true, // TODO: Get from user preferences
        privacyLevel: 'public', // TODO: Get from user preferences
        // Location fields
        country: user.country || '',
        region: user.region || '',
        city: user.city || '',
        locationSharing: user.locationSharing || false,
        // Avatar field
        avatarUrl: user.avatarUrl || null
      })
    }
  }, [user])

  const handleSave = async () => {
    if (!user) return

    setIsSaving(true)
    try {
      // Update profile information
      await userService.updateProfile({
        displayName: settings.displayName,
        bio: settings.bio,
        // Location fields
        country: settings.country,
        region: settings.region,
        city: settings.city,
        locationSharing: settings.locationSharing
      })

      // TODO: Update notification preferences
      // TODO: Update privacy settings
      // TODO: Update language preference

      await refreshUser()
      toast.success('Settings saved successfully!')
    } catch (error) {
      console.error('Failed to save settings:', error)
      toast.error('Failed to save settings. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleInputChange = (field: keyof UserSettings, value: string | boolean) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleResendVerificationEmail = async () => {
    setIsResendingEmail(true)
    try {
      await authService.resendVerificationEmail()
      toast.success('Verification email sent! Check your inbox.')
    } catch (error: any) {
      console.error('Failed to resend verification email:', error)
      toast.error(error.response?.data?.error?.message || 'Failed to send verification email. Please try again.')
    } finally {
      setIsResendingEmail(false)
    }
  }

  const handleAvatarUploadSuccess = (avatarUrl: string) => {
    setSettings(prev => ({
      ...prev,
      avatarUrl: avatarUrl
    }))
    // Refresh user context to update avatar across app
    refreshUser()
    toast.success('Profile picture updated successfully!')
  }

  const handleAvatarUploadError = (error: string) => {
    console.error('Avatar upload failed:', error)
    toast.error(`Failed to upload profile picture: ${error}`)
  }

  const handleAvatarRemove = async () => {
    try {
      await profilePictureService.deleteProfilePicture()
      setSettings(prev => ({
        ...prev,
        avatarUrl: null
      }))
      refreshUser()
      toast.success('Profile picture removed successfully!')
    } catch (error: any) {
      console.error('Avatar removal failed:', error)
      toast.error('Failed to remove profile picture. Please try again.')
    }
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <p className="text-gray-600">Please log in to access settings.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">
          Manage your account preferences and privacy settings.
        </p>
      </div>

      <div className="space-y-8">
        {/* Profile Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <User className="h-5 w-5 text-gray-500 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Profile Information</h2>
          </div>
          
          <div className="space-y-6">
            {/* Profile Picture Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Profile Picture
              </label>
              <div className="flex items-start space-x-4">
                {/* Current Avatar Display */}
                <div className="flex-shrink-0">
                  <UserAvatar 
                    user={{ 
                      id: user.id,
                      username: user.username, 
                      avatarUrl: settings.avatarUrl 
                    }} 
                    size="lg" 
                  />
                </div>
                
                {/* Upload Component */}
                <div className="flex-1">
                  <ProfilePictureUpload
                    currentAvatarUrl={settings.avatarUrl}
                    onUploadSuccess={handleAvatarUploadSuccess}
                    onUploadError={handleAvatarUploadError}
                    className="w-full"
                  />
                  
                  {/* Remove Button (if avatar exists) */}
                  {settings.avatarUrl && (
                    <button
                      onClick={handleAvatarRemove}
                      className="mt-2 text-sm text-red-600 hover:text-red-800 focus:outline-none focus:underline"
                    >
                      Remove profile picture
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
                Display Name
              </label>
              <input
                type="text"
                id="displayName"
                value={settings.displayName}
                onChange={(e) => handleInputChange('displayName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="How should others see your name?"
              />
            </div>

            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                Bio
              </label>
              <textarea
                id="bio"
                value={settings.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Tell others a bit about yourself..."
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={user.email}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed at this time</p>
            </div>
          </div>
        </div>

        {/* Email Verification */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <Mail className="h-5 w-5 text-gray-500 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Email Verification</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                {user.emailVerified ? (
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-500 mr-3" />
                )}
                <div>
                  <h3 className="text-sm font-medium text-gray-900">
                    {user.emailVerified ? 'Email Verified' : 'Email Not Verified'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {user.emailVerified 
                      ? 'Your email address has been verified and you have full access to all features.'
                      : 'Please verify your email address to access all features and receive important updates.'
                    }
                  </p>
                </div>
              </div>
              
              {!user.emailVerified && (
                <button
                  onClick={handleResendVerificationEmail}
                  disabled={isResendingEmail}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isResendingEmail ? 'Sending...' : 'Resend Email'}
                </button>
              )}
            </div>

            {!user.emailVerified && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-amber-900 mb-2">Why verify your email?</h3>
                <ul className="text-sm text-amber-800 space-y-1">
                  <li>• Access all premium features</li>
                  <li>• Receive important account notifications</li>
                  <li>• Reset your password if needed</li>
                  <li>• Get community updates and support</li>
                </ul>
                <p className="text-xs text-amber-700 mt-3">
                  Check your spam folder if you don't see the email. Verification links are valid for 24 hours.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <Bell className="h-5 w-5 text-gray-500 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Notifications</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Email Notifications</h3>
                <p className="text-sm text-gray-500">Receive updates and reminders via email</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.emailNotifications}
                  onChange={(e) => handleInputChange('emailNotifications', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Push Notifications</h3>
                <p className="text-sm text-gray-500">Receive notifications in your browser</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.pushNotifications}
                  onChange={(e) => handleInputChange('pushNotifications', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Privacy Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <Shield className="h-5 w-5 text-gray-500 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Privacy</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="privacyLevel" className="block text-sm font-medium text-gray-700 mb-1">
                Default Post Privacy
              </label>
              <select
                id="privacyLevel"
                value={settings.privacyLevel}
                onChange={(e) => handleInputChange('privacyLevel', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="public">Public - Anyone can see</option>
                <option value="friends">Friends Only - Only people you follow</option>
                <option value="private">Private - Only you can see</option>
              </select>
            </div>
          </div>
        </div>

        {/* Subscription Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <CreditCard className="h-5 w-5 text-gray-500 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Subscription</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Current Plan</h3>
                <p className="text-sm text-gray-500 capitalize">
                  {subscription?.tier || 'Free'} Plan
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {subscription?.tier === 'free' ? 'Free' : 
                   subscription?.tier === 'supporter' ? '$5/month' : 
                   subscription?.tier === 'premium' ? '$12/month' : 'Free'}
                </p>
                <p className="text-xs text-gray-500">
                  {subscription?.trialEndsAt && new Date() < new Date(subscription.trialEndsAt) 
                    ? `Free Trial - ${Math.ceil((new Date(subscription.trialEndsAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days remaining`
                    : subscription?.status || 'Active'}
                </p>
              </div>
            </div>
            
            {subscription?.tier === 'free' && (
              <div className="text-center">
                <a
                  href="/pricing"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Upgrade Plan
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Location Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <Globe className="h-5 w-5 text-gray-500 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Location & Privacy</h2>
          </div>
          
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Help Improve Community Insights</h3>
              <p className="text-sm text-blue-800 mb-3">
                By sharing your location, you help us provide anonymous, aggregated insights about regional mental health patterns. 
                This data helps researchers and organizations better understand community needs.
              </p>
              <p className="text-xs text-blue-700">
                Your location is never shared individually and is only used in anonymous, aggregated statistics with strict privacy protections.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Share Location for Community Insights</h3>
                <p className="text-sm text-gray-500">Allow anonymous use of your location for aggregated mental health research</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.locationSharing || false}
                  onChange={(e) => handleInputChange('locationSharing', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            {settings.locationSharing && (
              <div className="space-y-4 pl-4 border-l-2 border-gray-200">
                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                    Country
                  </label>
                  <select
                    id="country"
                    value={settings.country || ''}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Select Country</option>
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="GB">United Kingdom</option>
                    <option value="AU">Australia</option>
                    <option value="DE">Germany</option>
                    <option value="FR">France</option>
                    <option value="ES">Spain</option>
                    <option value="IT">Italy</option>
                    <option value="JP">Japan</option>
                    <option value="KR">South Korea</option>
                    <option value="BR">Brazil</option>
                    <option value="MX">Mexico</option>
                    <option value="IN">India</option>
                    <option value="CN">China</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="region" className="block text-sm font-medium text-gray-700 mb-1">
                    State/Province/Region (Optional)
                  </label>
                  <input
                    type="text"
                    id="region"
                    value={settings.region || ''}
                    onChange={(e) => handleInputChange('region', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g., California, Ontario, England"
                  />
                </div>

                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                    City (Optional)
                  </label>
                  <input
                    type="text"
                    id="city"
                    value={settings.city || ''}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g., Los Angeles, Toronto, London"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Language Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <Globe className="h-5 w-5 text-gray-500 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Language</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1">
                Display Language
              </label>
              <select
                id="language"
                value={settings.language}
                onChange={(e) => handleInputChange('language', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="it">Italiano</option>
                <option value="pt">Português</option>
                <option value="ja">日本語</option>
                <option value="ko">한국어</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Language changes will take effect after page refresh</p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-5 w-5 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage