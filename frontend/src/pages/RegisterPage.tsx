import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { authService } from '../services/authService'
import { useDebounce } from '../hooks/useDebounce'
import toast from 'react-hot-toast'
import WorryBoxLogoSquare from '../assets/WorryBoxLogoSquare.png'

const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be less than 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
})

type RegisterFormData = z.infer<typeof registerSchema>

const RegisterPage: React.FC = () => {
  const navigate = useNavigate()
  const { register: registerUser, isAuthenticated } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Real-time validation states
  const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle')
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle')
  const [emailSuggestion, setEmailSuggestion] = useState<string>('')
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const watchedEmail = watch('email')
  const watchedUsername = watch('username')
  const debouncedEmail = useDebounce(watchedEmail, 500)
  const debouncedUsername = useDebounce(watchedUsername, 500)

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/feed')
    }
  }, [isAuthenticated, navigate])

  // Check email availability
  useEffect(() => {
    const checkEmail = async () => {
      if (!debouncedEmail || errors.email) {
        setEmailStatus('idle')
        return
      }

      setEmailStatus('checking')
      try {
        const result = await authService.checkEmailAvailability(debouncedEmail)
        setEmailStatus(result.available ? 'available' : 'taken')
        setEmailSuggestion(result.suggestion || '')
      } catch (error) {
        setEmailStatus('invalid')
      }
    }

    checkEmail()
  }, [debouncedEmail, errors.email])

  // Check username availability
  useEffect(() => {
    const checkUsername = async () => {
      if (!debouncedUsername || errors.username) {
        setUsernameStatus('idle')
        return
      }

      setUsernameStatus('checking')
      try {
        const result = await authService.checkUsernameAvailability(debouncedUsername)
        setUsernameStatus(result.available ? 'available' : 'taken')
        setUsernameSuggestions(result.suggestions)
      } catch (error) {
        setUsernameStatus('invalid')
      }
    }

    checkUsername()
  }, [debouncedUsername, errors.username])

  const onSubmit = async (data: RegisterFormData) => {
    if (emailStatus === 'taken' || usernameStatus === 'taken') {
      toast.error('Please fix the validation errors before submitting')
      return
    }

    setIsSubmitting(true)
    try {
      await registerUser(data.email, data.username, data.password)
      toast.success('Account created successfully!')
      navigate('/feed')
    } catch (error: any) {
      toast.error(error.message || 'Registration failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSuggestionClick = (suggestion: string, field: 'email' | 'username') => {
    setValue(field, suggestion)
  }

  const getEmailStatusIcon = () => {
    switch (emailStatus) {
      case 'checking':
        return <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
      case 'available':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'taken':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'invalid':
        return <AlertCircle className="w-5 h-5 text-red-500" />
      default:
        return null
    }
  }

  const getUsernameStatusIcon = () => {
    switch (usernameStatus) {
      case 'checking':
        return <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
      case 'available':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'taken':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'invalid':
        return <AlertCircle className="w-5 h-5 text-red-500" />
      default:
        return null
    }
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
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Join our supportive community
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1 relative">
                <input
                  {...register('email')}
                  type="email"
                  autoComplete="email"
                  className="appearance-none block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="Enter your email"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  {getEmailStatusIcon()}
                </div>
              </div>
              
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
              
              {emailStatus === 'available' && (
                <p className="mt-1 text-sm text-green-600">✓ Email is available</p>
              )}
              
              {emailStatus === 'taken' && (
                <div className="mt-1">
                  <p className="text-sm text-red-600">✗ This email is already registered</p>
                  {emailSuggestion && (
                    <p className="text-sm text-blue-600 mt-1">
                      {emailSuggestion}{' '}
                      <Link to="/login" className="font-medium underline hover:text-blue-500">
                        Log in instead
                      </Link>
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Username Field */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <div className="mt-1 relative">
                <input
                  {...register('username')}
                  type="text"
                  autoComplete="username"
                  className="appearance-none block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="Choose a username"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  {getUsernameStatusIcon()}
                </div>
              </div>
              
              {errors.username && (
                <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
              )}
              
              {usernameStatus === 'available' && (
                <p className="mt-1 text-sm text-green-600">✓ Username is available</p>
              )}
              
              {usernameStatus === 'taken' && (
                <div className="mt-1">
                  <p className="text-sm text-red-600">✗ Username is already taken</p>
                  {usernameSuggestions.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-600">Try these alternatives:</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {usernameSuggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => handleSuggestionClick(suggestion, 'username')}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="appearance-none block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="Create a password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Must be at least 8 characters with uppercase, lowercase, and number
              </p>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isSubmitting || emailStatus === 'taken' || usernameStatus === 'taken'}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />
                    Creating account...
                  </>
                ) : (
                  'Create account'
                )}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="text-center">
              <span className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="font-medium text-primary-600 hover:text-primary-500"
                >
                  Sign in
                </Link>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage