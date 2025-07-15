import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { userService, UserProfile } from '../services/userService'
import ProfileForm from '../components/ProfileForm'
import toast from 'react-hot-toast'

const EditProfilePage: React.FC = () => {
  const navigate = useNavigate()
  const { user: currentUser, refreshUser } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchProfile = async () => {
      if (!currentUser) {
        navigate('/login')
        return
      }

      try {
        setIsLoading(true)
        const userProfile = await userService.getProfile()
        setProfile(userProfile)
      } catch (error: any) {
        const message = error.response?.data?.error?.message || 'Failed to load profile'
        toast.error(message)
        navigate('/profile/' + currentUser.username)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [currentUser, navigate])

  const handleProfileUpdate = async (updatedProfile: UserProfile) => {
    setProfile(updatedProfile)
    // Refresh the auth context to update the user data
    await refreshUser()
    navigate('/profile/' + updatedProfile.username)
  }

  const handleCancel = () => {
    navigate('/profile/' + currentUser?.username)
  }

  if (!currentUser) {
    return null // Will redirect to login
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

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Profile Not Found</h1>
          <p className="text-gray-600 mb-4">Unable to load your profile for editing.</p>
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
      <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <button
                onClick={handleCancel}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-semibold text-gray-900">Edit Profile</h1>
            </div>
          </div>

          {/* Form */}
          <div className="px-6 py-6">
            <ProfileForm
              user={profile}
              onUpdate={handleProfileUpdate}
              onCancel={handleCancel}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default EditProfilePage