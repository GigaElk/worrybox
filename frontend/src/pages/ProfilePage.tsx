import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { User, Edit, Mail, Calendar } from 'lucide-react'
import { userService, UserProfile } from '../services/userService'
import { useAuth } from '../contexts/AuthContext'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const ProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>()
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
        <div className="bg-white shadow rounded-lg">
          {/* Header */}
          <div className="px-6 py-8 border-b border-gray-200">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-6">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {profile.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={profile.displayName || profile.username}
                      className="w-24 h-24 rounded-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        target.nextElementSibling?.classList.remove('hidden')
                      }}
                    />
                  ) : null}
                  <div
                    className={`w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center ${
                      profile.avatarUrl ? 'hidden' : ''
                    }`}
                  >
                    <User className="w-12 h-12 text-gray-400" />
                  </div>
                </div>

                {/* Profile Info */}
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900">
                    {profile.displayName || profile.username}
                  </h1>
                  {profile.displayName && (
                    <p className="text-lg text-gray-600">@{profile.username}</p>
                  )}
                  
                  <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                    {isOwnProfile && profile.email && (
                      <div className="flex items-center">
                        <Mail className="w-4 h-4 mr-1" />
                        {profile.email}
                        {!profile.emailVerified && (
                          <span className="ml-2 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                            Unverified
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      Joined {format(new Date(profile.createdAt), 'MMMM yyyy')}
                    </div>
                  </div>
                </div>
              </div>

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

            {/* Bio */}
            {profile.bio && (
              <div className="mt-6">
                <p className="text-gray-700 whitespace-pre-wrap">{profile.bio}</p>
              </div>
            )}
          </div>

          {/* Content Area */}
          <div className="px-6 py-8">
            <div className="text-center text-gray-500">
              <p>Posts and activity will appear here once the worry posting system is implemented.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage