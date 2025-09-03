import React, { useState, useEffect, useCallback } from 'react'
import { worryAnalysisService, SimilarWorryCountResponse } from '../services/worryAnalysisService'
import { Loader2, TrendingUp, BarChart3, Info } from 'lucide-react'
import { useErrorHandler } from '../hooks/useErrorHandler'
import { CountError } from './ErrorDisplay'
import { CountErrorBoundary } from './ErrorBoundary'
import { withRetry, analysisCircuitBreaker } from '../utils/retryUtils'

interface SimilarWorriesCountProps {
  postId: string
  showBreakdown?: boolean
  className?: string
  onCountChange?: (count: number) => void
}

const SimilarWorriesCount: React.FC<SimilarWorriesCountProps> = React.memo(({ 
  postId, 
  showBreakdown = false,
  className = '',
  onCountChange
}) => {
  const [countData, setCountData] = useState<SimilarWorryCountResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [retryCount, setRetryCount] = useState(0)
  const { errorState, handleError, clearError, retry } = useErrorHandler({
    showToast: false, // Handle errors inline for count components
    logError: true,
    fallbackMessage: 'Unable to load similar worries count'
  })

  const loadSimilarWorriesCount = useCallback(async () => {
    try {
      setIsLoading(true)
      clearError()
      
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
      
      setCountData(data)
      setRetryCount(0)
      onCountChange?.(data.count)
    } catch (error: any) {
      console.error('Failed to load similar worries count:', error)
      handleError(error, 'Loading similar worries count')
      
      // Set fallback count to prevent UI breaking
      const fallbackData = { count: 0 }
      setCountData(fallbackData)
      onCountChange?.(0)
    } finally {
      setIsLoading(false)
    }
  }, [postId, showBreakdown, handleError, clearError, onCountChange])

  useEffect(() => {
    loadSimilarWorriesCount()
  }, [loadSimilarWorriesCount])

  // Listen for external count updates (e.g., from MeTooButton)
  useEffect(() => {
    const handleMeTooUpdate = (event: CustomEvent) => {
      if (event.detail.postId === postId && event.detail.similarWorryCount !== undefined) {
        const newCount = event.detail.similarWorryCount
        setCountData(prev => ({
          ...prev,
          count: newCount,
          breakdown: prev?.breakdown ? {
            ...prev.breakdown,
            meTooResponses: event.detail.meTooCount || prev.breakdown.meTooResponses
          } : undefined
        }))
        onCountChange?.(newCount)
      }
    }

    window.addEventListener('meTooUpdated', handleMeTooUpdate as EventListener)
    return () => {
      window.removeEventListener('meTooUpdated', handleMeTooUpdate as EventListener)
    }
  }, [postId, onCountChange])

  const handleRetry = useCallback(() => {
    retry(loadSimilarWorriesCount)
  }, [retry, loadSimilarWorriesCount])

  // Memoized text to prevent unnecessary recalculations
  const getSimilarWorriesText = useMemo(() => {
    if (!countData || countData.count === 0) return 'No similar worries found'
    if (countData.count === 1) return '1 person has a similar worry'
    return `${countData.count} people have similar worries`
  }, [countData])

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

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-center p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
        <div className="text-center w-full">
          <div className="flex items-center justify-center space-x-2 mb-1">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span className="text-xl font-bold text-blue-600">
              {countData.count}
            </span>
          </div>
          <p className="text-xs text-gray-600 mb-2">
            {getSimilarWorriesText}
          </p>
          
          {showBreakdown && countData.breakdown && (
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

// Wrap the component with error boundary for additional protection
const SimilarWorriesCountWithErrorBoundary: React.FC<SimilarWorriesCountProps> = React.memo((props) => (
  <CountErrorBoundary>
    <SimilarWorriesCount {...props} />
  </CountErrorBoundary>
))

SimilarWorriesCountWithErrorBoundary.displayName = 'SimilarWorriesCountWithErrorBoundary'

export default SimilarWorriesCountWithErrorBoundary