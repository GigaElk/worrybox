import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle, XCircle } from 'lucide-react'
import { authService } from '../services/authService'
import { useAuth } from '../contexts/AuthContext'
import WorryBoxLogoSquare from '../assets/WorryBoxLogoSquare.png'

const VerifyEmailPage = () => {
  const [isLoading, setIsLoading] = useState(true)
  const [isVerified, setIsVerified] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchParams] = useSearchParams()
  const { refreshUser } = useAuth()
  const token = searchParams.get('token')

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setError('Invalid verification link')
        setIsLoading(false)
        return
      }

      try {
        await authService.verifyEmail(token)
        setIsVerified(true)
        // Refresh user data to update email verification status
        await refreshUser()
      } catch (error: any) {
        const message = error.response?.data?.error?.message || 'Email verification failed'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    verifyEmail()
  }, [token, refreshUser])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <img 
              src={WorryBoxLogoSquare} 
              alt="Worrybox" 
              className="h-16 w-auto"
            />
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            Verifying your email...
          </h2>
          <div className="flex justify-center mt-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <img 
            src={WorryBoxLogoSquare} 
            alt="Worrybox" 
            className="h-16 w-auto"
          />
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
          Email Verification
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            {isVerified ? (
              <>
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Email Verified Successfully!
                </h3>
                <p className="text-gray-600 mb-6">
                  Your email has been verified. You can now access all features of Worrybox.
                </p>
                <Link
                  to="/dashboard"
                  className="btn-primary"
                >
                  Go to Dashboard
                </Link>
              </>
            ) : (
              <>
                <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Verification Failed
                </h3>
                <p className="text-gray-600 mb-6">
                  {error || 'The verification link is invalid or has expired.'}
                </p>
                <div className="space-y-3">
                  <Link
                    to="/dashboard"
                    className="btn-primary block"
                  >
                    Go to Dashboard
                  </Link>
                  <Link
                    to="/login"
                    className="btn-outline block"
                  >
                    Back to Login
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default VerifyEmailPage