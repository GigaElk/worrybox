import React, { useState, useEffect, useCallback } from 'react'
import { meTooService } from '../services/meTooService'
import { Loader2, AlertTriangle, Users, Heart, RefreshCw } from 'lucide-react'
import { useErrorHandler } from '../hooks/useErrorHandler'
import { CountError } from './ErrorDisplay'
import { CountErrorBoundary } from './ErrorBoundary'
import { withRetry, meTooCircuitBreaker } from '../utils/retryUtils'

interface MeTooCountProps {
  postId: string
  showButton?: boolean
  className?: string
  onCountChange?: (count: number) => void
}

const MeTooCount: React.FC<MeTooCountProps> = React.memo(({ 
  postId, 
  showButton = false,
  className = '',
  onCountChange
}) => {
  const [meTooCount, setMeTooCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [retryCount, setRetryCount] = useState(0)
  const { errorState, handleError, clearError, retry } = useErrorHandler({
    showToast: false, // Handle errors inline for count components
    logError: true,
    fallbackMessage: 'Unable to load Me Too count'
  })

  const loadMeTooCount = useCallback(async () => {
    try {
      setIsLoading(true)
      clearError()
      
      // Use circuit breaker and retry logic for resilience
      const count = await meTooCircuitBreaker.execute(async () => {
        return await withRetry(
          () => meTooService.getMeTooCount(postId),
          {
            maxAttempts: 3,
            baseDelay: 500,
            onRetry: (attempt, error) => {
              console.log(`Retrying Me Too count load (attempt ${attempt}):`, error.message)
              setRetryCount(attempt)
            }
          }
        )
      })
      
      setMeTooCount(count)
      setRetryCount(0)
      onCountChange?.(count)
    } catch (error: any) {
      console.error('Failed to load Me Too count:', error)
      handleError(error, 'Loading Me Too count')
      
      // Set fallback count to prevent UI breaking
      setMeTooCount(0)
      onCountChange?.(0)
    } finally {
      setIsLoading(false)
    }
  }, [postId, handleError, clearError, onCountChange])

  useEffect(() => {
    loadMeTooCount()
  }, [loadMeTooCount])

  const handleRetry = useCallback(() => {
    retry(loadMeTooCount)
  }, [retry, loadMeTooCount])

  // Listen for external count updates (e.g., from MeTooButton)
  useEffect(() => {
    const handleMeTooUpdate = (event: CustomEvent) => {
      if (event.detail.postId === postId) {
        setMeTooCount(event.detail.meTooCount)
        onCountChange?.(event.detail.meTooCount)
      }
    }

    window.addEventListener('meTooUpdated', handleMeTooUpdate as EventListener)
    return () => {
      window.removeEventListener('meTooUpdated', handleMeTooUpdate as EventListener)
    }
  }, [postId, onCountChange])

  const getMeTooText = () => {
    if (meTooCount === 0) return 'No one said "Me Too" yet'
    if (meTooCount === 1) return '1 person said "Me Too"'
    return `${meTooCount} people said "Me Too"`
  }

  if (isLoading) {
    return (
      <div className={`flex justify-center items-center py-2 ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">
          {retryCount > 0 ? `Retrying... (${retryCount}/3)` : 'Loading...'}
        </span>
      </div>
    )
  }

  if (errorState.isError) {
    return (
      <div className={className}>
        <CountError 
          type="metoo" 
          onRetry={errorState.canRetry ? handleRetry : undefined}
        />
      </div>
    )
  }

  if (meTooCount === 0) {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>
        <div className="flex items-center space-x-1">
          <Heart className="w-4 h-4" />
          <span>No "Me Too" responses yet</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-center p-3 bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg border border-pink-100">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-1">
            <Heart className="w-4 h-4 text-pink-600" />
            <span className="text-xl font-bold text-pink-600">
              {meTooCount}
            </span>
          </div>
          <p className="text-xs text-gray-600">
            {getMeTooText()}
          </p>
        </div>
      </div>
    </div>
  )
})

// Wrap the component with error boundary for additional protection
const MeTooCountWithErrorBoundary: React.FC<MeTooCountProps> = React.memo((props) => (
  <CountErrorBoundary>
    <MeTooCount {...props} />
  </CountErrorBoundary>
))

MeTooCountWithErrorBoundary.displayName = 'MeTooCountWithErrorBoundary'

export default MeTooCountWithErrorBoundary