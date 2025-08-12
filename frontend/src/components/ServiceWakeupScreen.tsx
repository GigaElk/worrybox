import React from 'react'
import { Loader2, Coffee, Server } from 'lucide-react'
import WorryBoxLogoSquare from '../assets/WorryBoxLogoSquare.png'

interface ServiceWakeupScreenProps {
  message?: string
  onRetry?: () => void
  showRetryButton?: boolean
}

const ServiceWakeupScreen: React.FC<ServiceWakeupScreenProps> = ({ 
  message = "Waking up services...",
  onRetry,
  showRetryButton = false
}) => {
  return (
    <div className="fixed inset-0 bg-gray-50 flex flex-col items-center justify-center z-50">
      <div className="max-w-md mx-auto text-center p-8">
        {/* Logo */}
        <div className="mb-8">
          <img 
            src={WorryBoxLogoSquare} 
            alt="Worrybox" 
            className="h-20 w-auto mx-auto animate-pulse"
          />
        </div>

        {/* Loading Animation */}
        <div className="mb-6">
          <div className="relative">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Server className="w-8 h-8 text-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <Coffee className="w-8 h-8 text-amber-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
            </div>
            
            {/* Progress bar animation */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 h-2 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Main Message */}
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          {message}
        </h2>

        {/* Alpha Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>Alpha Notice:</strong> During the alpha, everything is hosted for free. 
            This means services go to sleep when not in use and may take 30-60 seconds to wake up.
          </p>
        </div>

        {/* Status Messages */}
        <div className="space-y-2 text-sm text-gray-600 mb-6">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span>Starting backend services...</span>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" style={{ animationDelay: '500ms' }}></div>
            <span>Connecting to database...</span>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '1000ms' }}></div>
            <span>Almost ready...</span>
          </div>
        </div>

        {/* Retry Button */}
        {showRetryButton && onRetry && (
          <button
            onClick={onRetry}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        )}

        {/* Encouraging Message */}
        <p className="text-xs text-gray-500 mt-4">
          Thank you for your patience! This helps us keep Worrybox free during development.
        </p>
      </div>
    </div>
  )
}

export default ServiceWakeupScreen