import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { meTooService } from '../services/meTooService'
import { similarWorriesCache } from '../services/cacheService'
import { Loader2, AlertTriangle, Users, Heart, RefreshCw } from 'lucide-react'
import { useErrorHandler } from '../hooks/useErrorHandler'
import { CountError } from './ErrorDisplay'
import { CountErrorBoundary } from './ErrorBoundary'
import { withRetry, meTooCircuitBreaker } from '../utils/retryUtils'

interface OptimizedMeTooCountProps {
  postId: string
  showButton?: boolean
  className?: string
  onCountChange?: (count: number) => void
  enableCaching?: boolean
  cacheTTL?: number // Cache time-to-live in seconds
}

const OptimizedMeTooCount: React.FC<OptimizedMeTooCountProps> = React.memo(({ 
  postId, 
  showButton = false,
  className = '',
  onCountChange,
  enableCaching = true,
  cacheTTL = 300 // 5 minutes default
}) => {
  const [meTooCount, setMeTooCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [retryCount, setRetryCount] = useState(0)
  const { errorState, handleError, clearError, retry } = useErrorHandler({
    showToast: false,
    logError: true,
    fallbackMessage: 'Unable to load Me Too count'
  })

  const loadMeTooCount = useCallback(async () => {
    try {
      setIsLoading(true)
      clearError()
      
      // Check cache first if enabled
      if (enableCaching) {
        const cached = similarWorriesCache.getMeTooCount(postId)
        if (cached) {
          setMeTooCount(cached.count)
          setIsLoading(false)
          onCountChange?.(cached.count)
          return
        }
      }
      
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
      
      // Cache the result if enabled
      if (enableCaching) {
        similarWorriesCache.setMeTooCount(postId, count)
      }
    } catch (error: any) {
      console.error('Failed to load Me Too count:', error)
      handleError(error, 'Loading Me Too count')
      
      // Set fallback count to prevent UI breaking
      setMeTooCount(0)
      onCountChange?.(0)
    } finally {
      setIsLoading(false)
    }
  }, [postId, handleError, clearError, onCountChange, enableCaching])

  useEffect(() => {
    loadMeTooCount()
  }, [loadMeTooCount])

  const handleRetry = useCallback(() => {
    // Clear cache on retry
    if (enableCaching) {
      similarWorriesCache.delete(`metoo_count:${postId}`)
    }
    retry(loadMeTooCount)
  }, [retry, loadMeTooCount, enableCaching, postId])

  // Listen for external count updates (e.g., from MeTooButton)
  useEffect(() => {
    const handleMeTooUpdate = (event: CustomEvent) => {
      if (event.detail.postId === postId) {
        const newCount = event.detail.meTooCount
        setMeTooCount(newCount)
        onCountChange?.(newCount)
        
        // Update cache
        if (enableCaching) {
          similarWorriesCache.setMeTooCount(postId, newCount)
        }
      }
    }

    window.addEventListener('meTooUpdated', handleMeTooUpdate as EventListener)
    return () => {
      window.removeEventListener('meTooUpdated', handleMeTooUpdate as EventListener)
    }
  }, [postId, onCountChange, enableCaching])

  // Memoized text to prevent unnecessary recalculations
  const meTooText = useMemo(() => {
    if (meTooCount === 0) return 'No one said "Me Too" yet'
    if (meTooCount === 1) return '1 person said "Me Too"'
    return `${meTooCount} people said "Me Too"`
  }, [meTooCount])

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
            {meTooText}
          </p>
        </div>
      </div>
    </div>
  )
})

OptimizedMeTooCount.displayName = 'OptimizedMeTooCount'

// Wrap the component with error boundary for additional protection
const OptimizedMeTooCountWithErrorBoundary: React.FC<OptimizedMeTooCountProps> = React.memo((props) => (
  <CountErrorBoundary>
    <OptimizedMeTooCount {...props} />
  </CountErrorBoundary>
))

OptimizedMeTooCountWithErrorBoundary.displayName = 'OptimizedMeTooCountWithErrorBoundary'

export default OptimizedMeTooCountWithErrorBoundary