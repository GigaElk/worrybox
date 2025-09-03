import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { worryAnalysisService, SimilarWorryCountResponse } from '../services/worryAnalysisService'
import { similarWorriesCache } from '../services/cacheService'
import { Loader2, TrendingUp, BarChart3, Info } from 'lucide-react'
import { useErrorHandler } from '../hooks/useErrorHandler'
import { CountError } from './ErrorDisplay'
import { CountErrorBoundary } from './ErrorBoundary'
import { withRetry, analysisCircuitBreaker } from '../utils/retryUtils'

interface OptimizedSimilarWorriesCountProps {
  postId: string
  showBreakdown?: boolean
  className?: string
  onCountChange?: (count: number) => void
  enableCaching?: boolean
  cacheTTL?: number // Cache time-to-live in seconds
  enableRealTimeUpdates?: boolean
  animateChanges?: boolean
  compact?: boolean
  label?: string
  fallbackValue?: number
}

const OptimizedSimilarWorriesCount: React.FC<OptimizedSimilarWorriesCountProps> = React.memo(({ 
  postId, 
  showBreakdown = false,
  className = '',
  onCountChange,
  enableCaching = true,
  cacheTTL = 300, // 5 minutes default
  enableRealTimeUpdates = true,
  animateChanges = false,
  compact = false,
  label,
  fallbackValue
}) => {
  const [countData, setCountData] = useState<SimilarWorryCountResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [retryCount, setRetryCount] = useState(0)
  const [previousCount, setPreviousCount] = useState<number | null>(null)
  const { errorState, handleError, clearError, retry } = useErrorHandler({
    showToast: false,
    logError: true,
    fallbackMessage: 'Unable to load similar worries count'
  })

  const loadSimilarWorriesCount = useCallback(async () => {
    try {
      setIsLoading(true)
      clearError()
      
      // Check cache first if enabled
      if (enableCaching) {
        const cached = similarWorriesCache.getSimilarWorryCount(postId, showBreakdown)
        if (cached) {
          setCountData(cached)
          setIsLoading(false)
          onCountChange?.(cached.count)
          return
        }
      }
      
      // Use circuit breaker and retry logic for resilience
      const data = await analysisCircuitBreaker.execute(async () => {
        return await withRetry(
          () => worryAnalysisService.getSimilarWorryCount(postId, showBreakdown),
          {
            maxAttempts: 3,
            baseDelay: 500,
            onRetry: (attempt, error) => {
              console.log(`Retrying similar worries count load (attempt ${attempt}):`, error.message)
              setRetryCount(attempt)
            }
          }
        )
      })
      
      // Track previous count for animations
      if (animateChanges && countData) {
        setPreviousCount(countData.count)
      }
      
      setCountData(data)
      setRetryCount(0)
      onCountChange?.(data.count)
      
      // Cache the result if enabled
      if (enableCaching) {
        similarWorriesCache.setSimilarWorryCount(postId, data, showBreakdown)
      }
    } catch (error: any) {
      console.error('Failed to load similar worries count:', error)
      handleError(error, 'Loading similar worries count')
      
      // Set fallback count to prevent UI breaking
      const fallbackData = { count: fallbackValue || 0 }
      setCountData(fallbackData)
      onCountChange?.(fallbackValue || 0)
    } finally {
      setIsLoading(false)
    }
  }, [postId, showBreakdown, handleError, clearError, onCountChange, enableCaching, animateChanges, countData, fallbackValue])

  useEffect(() => {
    loadSimilarWorriesCount()
  }, [loadSimilarWorriesCount])

  // Listen for external count updates (e.g., from MeTooButton)
  useEffect(() => {
    if (!enableRealTimeUpdates) return

    const handleMeTooUpdate = (event: CustomEvent) => {
      if (event.detail.postId === postId && event.detail.similarWorryCount !== undefined) {
        const newCount = event.detail.similarWorryCount
        
        // Track previous count for animations
        if (animateChanges && countData) {
          setPreviousCount(countData.count)
        }
        
        const newCountData = {
          ...countData,
          count: newCount,
          breakdown: countData?.breakdown ? {
            ...countData.breakdown,
            meTooResponses: event.detail.meTooCount || countData.breakdown.meTooResponses
          } : undefined
        }
        
        setCountData(newCountData)
        onCountChange?.(newCount)
        
        // Update cache
        if (enableCaching) {
          similarWorriesCache.setSimilarWorryCount(postId, newCountData, showBreakdown)
        }
      }
    }

    const handleSimilarWorriesUpdate = (event: CustomEvent) => {
      if (event.detail.postId === postId) {
        // Invalidate cache and reload
        if (enableCaching) {
          similarWorriesCache.delete(`similar_count:${postId}:breakdown_${showBreakdown}`)
        }
        loadSimilarWorriesCount()
      }
    }

    window.addEventListener('meTooUpdated', handleMeTooUpdate as EventListener)
    window.addEventListener('similarWorriesUpdated', handleSimilarWorriesUpdate as EventListener)
    
    return () => {
      window.removeEventListener('meTooUpdated', handleMeTooUpdate as EventListener)
      window.removeEventListener('similarWorriesUpdated', handleSimilarWorriesUpdate as EventListener)
    }
  }, [postId, countData, onCountChange, enableCaching, showBreakdown, loadSimilarWorriesCount, enableRealTimeUpdates, animateChanges])

  const handleRetry = useCallback(() => {
    // Clear cache on retry
    if (enableCaching) {
      similarWorriesCache.delete(`similar_count:${postId}:breakdown_${showBreakdown}`)
    }
    retry(loadSimilarWorriesCount)
  }, [retry, loadSimilarWorriesCount, enableCaching, postId, showBreakdown])

  // Memoized text to prevent unnecessary recalculations
  const similarWorriesText = useMemo(() => {
    if (!countData || countData.count === 0) return 'No similar worries found'
    if (countData.count === 1) return '1 person has a similar worry'
    return `${countData.count} people have similar worries`
  }, [countData])

  // Memoized compact format for large numbers
  const formatCompactNumber = useMemo(() => (num: number): string => {
    if (num < 1000) return num.toString()
    if (num < 1000000) return `${(num / 1000).toFixed(1)}K`
    return `${(num / 1000000).toFixed(1)}M`
  }, [])

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
          type="similar" 
          onRetry={errorState.canRetry ? handleRetry : undefined}
        />
      </div>
    )
  }

  if (!countData || countData.count === 0) {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>
        <div className="flex items-center space-x-1">
          <TrendingUp className="w-4 h-4" />
          <span>No similar worries found</span>
        </div>
      </div>
    )
  }

  const displayCount = compact ? formatCompactNumber(countData.count) : countData.count.toString()
  const displayLabel = label || (compact ? 'Similar' : similarWorriesText)

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-center p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
        <div className="text-center w-full">
          <div className="flex items-center justify-center space-x-2 mb-1">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span 
              className={`text-xl font-bold text-blue-600 ${
                animateChanges && previousCount !== null && previousCount !== countData.count 
                  ? 'animate-pulse' 
                  : ''
              }`}
              aria-label={`${countData.count} similar worries`}
            >
              {displayCount}
            </span>
          </div>
          <p className="text-xs text-gray-600 mb-2">
            {displayLabel}
          </p>
          
          {/* Optional breakdown display */}
          {showBreakdown && countData.breakdown && !compact && (
            <div className="mt-2 pt-2 border-t border-blue-200">
              <div className="flex items-center justify-center space-x-1 mb-1">
                <BarChart3 className="w-3 h-3 text-gray-500" />
                <span className="text-xs font-medium text-gray-600">Breakdown</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-center">
                  <div className="font-semibold text-blue-600">
                    {countData.breakdown.aiDetectedSimilar}
                  </div>
                  <div className="text-gray-500">AI Detected</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-pink-600">
                    {countData.breakdown.meTooResponses}
                  </div>
                  <div className="text-gray-500">Me Too</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

OptimizedSimilarWorriesCount.displayName = 'OptimizedSimilarWorriesCount'

// Wrap the component with error boundary for additional protection
const OptimizedSimilarWorriesCountWithErrorBoundary: React.FC<OptimizedSimilarWorriesCountProps> = React.memo((props) => (
  <CountErrorBoundary>
    <OptimizedSimilarWorriesCount {...props} />
  </CountErrorBoundary>
))

OptimizedSimilarWorriesCountWithErrorBoundary.displayName = 'OptimizedSimilarWorriesCountWithErrorBoundary'

export default OptimizedSimilarWorriesCountWithErrorBoundary