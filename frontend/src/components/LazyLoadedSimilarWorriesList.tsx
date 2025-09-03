import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { EnhancedSimilarWorry, SimilarWorriesResponse } from '../services/worryAnalysisService'
import { privacyFilteringService } from '../services/privacyFilteringService'
import { Loader2, AlertTriangle, Lock, Users, TrendingUp, Shield, RefreshCw, ChevronDown } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useErrorHandler } from '../hooks/useErrorHandler'
import { ErrorDisplay, SimilarWorriesError } from './ErrorDisplay'
import { SimilarWorriesErrorBoundary } from './ErrorBoundary'
import { withRetry, similarWorriesCircuitBreaker } from '../utils/retryUtils'
import { useIntersectionObserver } from '../hooks/useIntersectionObserver'

interface LazyLoadedSimilarWorriesListProps {
  postId: string
  initialLimit?: number
  loadMoreLimit?: number
  className?: string
}

const LazyLoadedSimilarWorriesList: React.FC<LazyLoadedSimilarWorriesListProps> = ({ 
  postId, 
  initialLimit = 5,
  loadMoreLimit = 5,
  className = ''
}) => {
  const { user } = useAuth()
  const [data, setData] = useState<SimilarWorriesResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [currentLimit, setCurrentLimit] = useState(initialLimit)
  const [retryCount, setRetryCount] = useState(0)
  const { errorState, handleError, clearError, retry } = useErrorHandler({
    showToast: false,
    logError: true,
    fallbackMessage: 'Unable to load similar worries'
  })

  // Intersection observer for lazy loading trigger
  const { ref: loadMoreRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '100px'
  })

  const loadSimilarWorries = useCallback(async (limit: number, isLoadMore = false) => {
    try {
      if (isLoadMore) {
        setIsLoadingMore(true)
      } else {
        setIsLoading(true)
        clearError()
      }
      
      const response = await similarWorriesCircuitBreaker.execute(async () => {
        return await withRetry(
          () => privacyFilteringService.getSimilarWorries(postId, user?.id, limit),
          {
            maxAttempts: 3,
            baseDelay: 1000,
            onRetry: (attempt, error) => {
              console.log(`Retrying similar worries load (attempt ${attempt}):`, error.message)
              if (!isLoadMore) setRetryCount(attempt)
            }
          }
        )
      })
      
      setData(response)
      setRetryCount(0)
    } catch (error: any) {
      console.error('Failed to load similar worries:', error)
      if (!isLoadMore) {
        handleError(error, 'Loading similar worries')
      }
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [postId, user?.id, handleError, clearError])

  // Initial load
  useEffect(() => {
    loadSimilarWorries(currentLimit)
  }, [postId, user?.id])

  // Load more when intersection observer triggers
  useEffect(() => {
    if (isIntersecting && data?.hasMore && !isLoadingMore && !isLoading) {
      const newLimit = currentLimit + loadMoreLimit
      setCurrentLimit(newLimit)
      loadSimilarWorries(newLimit, true)
    }
  }, [isIntersecting, data?.hasMore, isLoadingMore, isLoading, currentLimit, loadMoreLimit, loadSimilarWorries])

  // Handle authentication changes
  useEffect(() => {
    privacyFilteringService.onAuthenticationChange(user?.id)
  }, [user?.id])

  const handleRetry = useCallback(() => {
    setCurrentLimit(initialLimit)
    retry(() => loadSimilarWorries(initialLimit))
  }, [retry, loadSimilarWorries, initialLimit])

  // Memoized helper functions for performance
  const formatSimilarityPercentage = useMemo(() => (similarity: number): string => {
    return `${Math.round(similarity * 100)}% similar`
  }, [])

  const formatTimeAgo = useMemo(() => (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffInDays === 0) return 'Today'
    if (diffInDays === 1) return '1 day ago'
    if (diffInDays < 7) return `${diffInDays} days ago`
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} week${Math.floor(diffInDays / 7) > 1 ? 's' : ''} ago`
    return `${Math.floor(diffInDays / 30)} month${Math.floor(diffInDays / 30) > 1 ? 's' : ''} ago`
  }, [])

  const getCategoryColor = useMemo(() => (category: string): string => {
    const colors: { [key: string]: string } = {
      'Health & Wellness': 'text-green-600 bg-green-50',
      'Work & Career': 'text-blue-600 bg-blue-50',
      'Relationships': 'text-pink-600 bg-pink-50',
      'Financial': 'text-yellow-600 bg-yellow-50',
      'Family': 'text-purple-600 bg-purple-50',
      'Personal Growth': 'text-indigo-600 bg-indigo-50',
      'Education': 'text-orange-600 bg-orange-50',
      'Social': 'text-teal-600 bg-teal-50'
    }
    return colors[category] || 'text-gray-600 bg-gray-50'
  }, [])

  // Memoized worry items for performance
  const worryItems = useMemo(() => {
    if (!data?.similarWorries) return []
    
    return data.similarWorries.map((worry: EnhancedSimilarWorry) => (
      <div 
        key={worry.id}
        className={`p-4 rounded-lg border transition-colors hover:bg-gray-50 ${
          worry.isOwnPost 
            ? 'border-blue-200 bg-blue-50/50' 
            : 'border-gray-200'
        }`}
      >
        {/* Privacy indicator and content */}
        <div className="flex items-start space-x-2 mb-2">
          {worry.isOwnPost && worry.privacyLevel === 'private' && (
            <Lock className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
          )}
          <p className="text-gray-800 text-sm leading-relaxed flex-1">
            {worry.isOwnPost && worry.privacyLevel === 'private' && (
              <span className="text-blue-600 font-medium text-xs mr-1">
                (Your private post)
              </span>
            )}
            "{worry.shortContent}"
          </p>
        </div>

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-3">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(worry.category)}`}>
              {worry.category}
            </span>
            <div className="flex items-center space-x-1">
              <TrendingUp className="w-3 h-3" />
              <span className="font-medium">
                {formatSimilarityPercentage(worry.similarity)}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {worry.user && !worry.isOwnPost && (
              <span>by @{worry.user.username}</span>
            )}
            <span>{formatTimeAgo(worry.createdAt)}</span>
          </div>
        </div>
      </div>
    ))
  }, [data?.similarWorries, getCategoryColor, formatSimilarityPercentage, formatTimeAgo])

  if (isLoading) {
    return (
      <div className={`${className}`}>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Similar Worries
          </h3>
          <div className="flex justify-center items-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">
              {retryCount > 0 ? `Retrying... (${retryCount}/3)` : 'Loading similar worries...'}
            </span>
          </div>
        </div>
      </div>
    )
  }

  if (errorState.isError) {
    return (
      <div className={`${className}`}>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Similar Worries
          </h3>
          <ErrorDisplay
            errorType={errorState.errorType}
            message={errorState.errorMessage}
            canRetry={errorState.canRetry}
            onRetry={handleRetry}
            size="medium"
            variant="card"
          />
        </div>
      </div>
    )
  }

  if (!data || data.similarWorries.length === 0) {
    return (
      <div className={`${className}`}>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Similar Worries
          </h3>
          <div className="text-center py-8">
            <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No similar worries found</p>
            <p className="text-gray-400 text-xs mt-1">
              This worry appears to be unique
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`${className}`}>
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Similar Worries
          </h3>
          <div className="text-sm text-gray-500">
            {data.visibleCount} of {data.totalCount}
          </div>
        </div>

        <div className="space-y-4">
          {worryItems}
        </div>

        {/* Load more trigger */}
        {data.hasMore && (
          <div ref={loadMoreRef} className="mt-4 text-center">
            {isLoadingMore ? (
              <div className="flex justify-center items-center py-2">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                <span className="ml-2 text-sm text-gray-500">Loading more...</span>
              </div>
            ) : (
              <div className="flex justify-center items-center py-2 text-blue-600">
                <ChevronDown className="w-4 h-4 mr-1" />
                <span className="text-sm">Scroll to load more</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Wrap the component with error boundary for additional protection
const LazyLoadedSimilarWorriesListWithErrorBoundary: React.FC<LazyLoadedSimilarWorriesListProps> = (props) => (
  <SimilarWorriesErrorBoundary>
    <LazyLoadedSimilarWorriesList {...props} />
  </SimilarWorriesErrorBoundary>
)

export default LazyLoadedSimilarWorriesListWithErrorBoundary