import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { User, Edit, Mail, Calendar } from 'lucide-react'
import { userService, UserProfile } from '../services/userService'
import { useAuth } from '../contexts/AuthContext'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import UserProfileComponent from '../components/UserProfile'
import FollowList from '../components/FollowList'

const ProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>()
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'posts' | 'followers' | 'following'>('posts')

  const isOwnProfile = currentUser?.username === username

  useEffect(() => {
    const fetchProfile = async () => {
      if (!username) {
        setError('Username is required')
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        if (isOwnProfile && currentUser) {
          // For own profile, get full profile data including email
          const fullProfile = await userService.getProfile()
          setProfile(fullProfile)
        } else {
          // For other users, get public profile data
          const publicProfile = await userService.getUserByUsername(username)
          setProfile(publicProfile as UserProfile) // Type assertion since we know the structure
        }
      } catch (err: any) {
        const message = err.response?.data?.error?.message || 'Failed to load profile'
        setError(message)
        toast.error(message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [username, isOwnProfile, currentUser])

  const handleEditProfile = () => {
    navigate('/profile/edit')
  }

  const handleFollowStatsClick = (type: 'followers' | 'following') => {
    setActiveTab(type)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Profile Not Found</h1>
          <p className="text-gray-600 mb-4">{error || 'The requested profile could not be found.'}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Go Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Profile Header */}
          <div className="flex items-start justify-between">
            <UserProfileComponent 
              user={profile} 
              onFollowStatsClick={handleFollowStatsClick}
            />
            
            {/* Edit Button */}
            {isOwnProfile && (
              <button
                onClick={handleEditProfile}
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Profile
              </button>
            )}
          </div>

          {/* Email Info for Own Profile */}
          {isOwnProfile && profile.email && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center text-sm text-gray-600">
                <Mail className="w-4 h-4 mr-2" />
                <span>{profile.email}</span>
                {!profile.emailVerified && (
                  <span className="ml-2 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                    Unverified
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="bg-white rounded-lg border border-gray-200">
            <nav className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('posts')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'posts'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Posts
              </button>
              <button
                onClick={() => setActiveTab('followers')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'followers'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Followers
              </button>
              <button
                onClick={() => setActiveTab('following')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'following'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Following
              </button>
            </nav>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'posts' && (
                <div className="text-center text-gray-500 py-8">
                  <p>Posts and activity will appear here once the worry posting system is implemented.</p>
                </div>
              )}

              {activeTab === 'followers' && (
                <FollowList userId={profile.id} type="followers" />
              )}

              {activeTab === 'following' && (
                <FollowList userId={profile.id} type="following" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage