import React from 'react'
import { AlertTriangle, RefreshCw, Wifi, Lock, Clock, AlertCircle } from 'lucide-react'
import { WorryAnalysisErrorType } from '../services/worryAnalysisService'

interface ErrorDisplayProps {
  error?: Error | null
  errorType?: string
  message?: string
  canRetry?: boolean
  onRetry?: () => void
  size?: 'small' | 'medium' | 'large'
  variant?: 'inline' | 'card' | 'banner'
  showIcon?: boolean
}

const getErrorIcon = (errorType: string) => {
  switch (errorType) {
    case WorryAnalysisErrorType.NETWORK_ERROR:
    case 'network':
      return Wifi
    case WorryAnalysisErrorType.PRIVACY_VIOLATION:
      return Lock
    case WorryAnalysisErrorType.RATE_LIMITED:
    case 'timeout':
      return Clock
    case WorryAnalysisErrorType.NOT_FOUND:
      return AlertCircle
    default:
      return AlertTriangle
  }
}

const getErrorColor = (errorType: string) => {
  switch (errorType) {
    case WorryAnalysisErrorType.PRIVACY_VIOLATION:
      return 'yellow'
    case WorryAnalysisErrorType.NETWORK_ERROR:
    case 'network':
      return 'blue'
    case WorryAnalysisErrorType.NOT_FOUND:
      return 'gray'
    default:
      return 'red'
  }
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  errorType = 'unknown',
  message = 'An error occurred',
  canRetry = false,
  onRetry,
  size = 'medium',
  variant = 'card',
  showIcon = true
}) => {
  const Icon = getErrorIcon(errorType)
  const color = getErrorColor(errorType)
  
  const sizeClasses = {
    small: 'p-2 text-sm',
    medium: 'p-4 text-base',
    large: 'p-6 text-lg'
  }
  
  const iconSizes = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6',
    large: 'w-8 h-8'
  }
  
  const variantClasses = {
    inline: 'inline-flex items-center gap-2',
    card: `rounded-lg border`,
    banner: 'rounded-md border-l-4'
  }
  
  const colorClasses = {
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: 'text-red-500',
      button: 'bg-red-600 hover:bg-red-700 text-white'
    },
    yellow: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      icon: 'text-yellow-500',
      button: 'bg-yellow-600 hover:bg-yellow-700 text-white'
    },
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: 'text-blue-500',
      button: 'bg-blue-600 hover:bg-blue-700 text-white'
    },
    gray: {
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      text: 'text-gray-800',
      icon: 'text-gray-500',
      button: 'bg-gray-600 hover:bg-gray-700 text-white'
    }
  }
  
  const colors = colorClasses[color as keyof typeof colorClasses]
  
  const baseClasses = `
    ${sizeClasses[size]}
    ${variantClasses[variant]}
    ${colors.bg}
    ${colors.border}
    ${colors.text}
  `.trim()

  if (variant === 'inline') {
    return (
      <div className={baseClasses}>
        {showIcon && <Icon className={`${iconSizes[size]} ${colors.icon}`} />}
        <span>{message}</span>
        {canRetry && onRetry && (
          <button
            onClick={onRetry}
            className={`ml-2 px-2 py-1 text-xs rounded ${colors.button} transition-colors`}
          >
            Retry
          </button>
        )}
      </div>
    )
  }

  return (
    <div className={baseClasses}>
      <div className="flex items-start gap-3">
        {showIcon && (
          <Icon className={`${iconSizes[size]} ${colors.icon} flex-shrink-0 mt-0.5`} />
        )}
        <div className="flex-1">
          <p className="font-medium">{message}</p>
          {canRetry && onRetry && (
            <button
              onClick={onRetry}
              className={`mt-2 inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded ${colors.button} transition-colors`}
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Specialized error components for different contexts
export const SimilarWorriesError: React.FC<{
  onRetry?: () => void
  canRetry?: boolean
}> = ({ onRetry, canRetry = true }) => (
  <ErrorDisplay
    message="Unable to load similar worries. Other features are still available."
    errorType="network"
    canRetry={canRetry}
    onRetry={onRetry}
    size="small"
    variant="card"
  />
)

export const CountError: React.FC<{
  type?: 'metoo' | 'similar'
  onRetry?: () => void
}> = ({ type = 'similar', onRetry }) => (
  <ErrorDisplay
    message={`${type === 'metoo' ? 'Me Too' : 'Similar worries'} count unavailable`}
    errorType="network"
    canRetry={!!onRetry}
    onRetry={onRetry}
    size="small"
    variant="inline"
    showIcon={false}
  />
)

export const PrivacyError: React.FC = () => (
  <ErrorDisplay
    message="You don't have permission to view this content"
    errorType={WorryAnalysisErrorType.PRIVACY_VIOLATION}
    canRetry={false}
    size="medium"
    variant="card"
  />
)

export const NetworkError: React.FC<{
  onRetry?: () => void
  message?: string
}> = ({ onRetry, message = "Network error. Please check your connection and try again." }) => (
  <ErrorDisplay
    message={message}
    errorType="network"
    canRetry={!!onRetry}
    onRetry={onRetry}
    size="medium"
    variant="card"
  />
)