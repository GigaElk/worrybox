import React, { useState, useEffect, useCallback, Suspense } from 'react'
import { useParams, Link } from 'react-router-dom'
import { postService } from '../services/postService'
import { ArrowLeft, Loader2, AlertTriangle, RefreshCw } from 'lucide-react'
import { useErrorHandler } from '../hooks/useErrorHandler'
import { ErrorDisplay, NetworkError } from '../components/ErrorDisplay'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { withRetry } from '../utils/retryUtils'

// Lazy load components for better performance
const LazyWorryAnalysis = React.lazy(() => import('../components/WorryAnalysis'))
const LazyOptimizedMeTooCount = React.lazy(() => import('../components/OptimizedMeTooCount'))
const LazyOptimizedSimilarWorriesCount = React.lazy(() => import('../components/OptimizedSimilarWorriesCount'))
const LazyLoadedSimilarWorriesList = React.lazy(() => import('../components/LazyLoadedSimilarWorriesList'))

// Loading spinner component
const LoadingSpinner: React.FC<{ text?: string }> = React.memo(({ text = 'Loading...' }) => (
  <div className="flex justify-center items-center py-4">
    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
    <span className="ml-2 text-sm text-gray-500">{text}</span>
  </div>
))

LoadingSpinner.displayName = 'LoadingSpinner'

const OptimizedWorryAnalysisPage: React.FC = () => {
  const { postId } = useParams<{ postId: string }>()
  const [post, setPost] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [retryCount, setRetryCount] = useState(0)
  const { errorState, handleError, clearError, retry } = useErrorHandler({
    showToast: true,
    logError: true,
    fallbackMessage: 'Unable to load post'
  })

  const loadPost = useCallback(async (id: string) => {
    try {
      setIsLoading(true)
      clearError()
      
      const postData = await withRetry(
        () => postService.getPost(id),
        {
          maxAttempts: 3,
          baseDelay: 1000,
          onRetry: (attempt, error) => {
            console.log(`Retrying post load (attempt ${attempt}):`, error.message)
            setRetryCount(attempt)
          }
        }
      )
      
      setPost(postData)
      setRetryCount(0)
    } catch (error: any) {
      console.error('Failed to load post:', error)
      handleError(error, 'Loading post')
    } finally {
      setIsLoading(false)
    }
  }, [handleError, clearError])

  useEffect(() => {
    if (postId) {
      loadPost(postId)
    }
  }, [postId, loadPost])

  const handleRetry = useCallback(() => {
    if (postId) {
      retry(() => loadPost(postId))
    }
  }, [retry, loadPost, postId])

  // Memoized post summary to prevent unnecessary re-renders
  const postSummary = React.useMemo(() => {
    if (!post) return null
    
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8 mb-8">
        <div className="mb-6">
          <p className="text-sm text-gray-600 italic mb-3 font-medium">
            "{post.worryPrompt}"
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
            {post.shortContent}
          </h1>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-gray-600">
          <div className="mb-2 sm:mb-0">
            <p className="font-medium">
              Posted by {post.user.displayName || post.user.username}
            </p>
          </div>
          <div className="text-sm">
            <p>{new Date(post.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</p>
          </div>
        </div>
      </div>
    )
  }, [post])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            {retryCount > 0 ? `Loading post... (attempt ${retryCount + 1}/3)` : 'Loading post...'}
          </p>
        </div>
      </div>
    )
  }

  if (errorState.isError || !post) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="mb-6">
            <Link 
              to="/" 
              className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span className="font-medium">Back to Home</span>
            </Link>
          </div>
          
          <ErrorDisplay
            errorType={errorState.errorType}
            message={errorState.errorMessage || 'Post not found'}
            canRetry={errorState.canRetry}
            onRetry={handleRetry}
            size="large"
            variant="card"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Navigation */}
        <div className="mb-6">
          <Link 
            to={`/posts/${postId}`} 
            className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span className="font-medium">Back to Post</span>
          </Link>
        </div>

        {/* Post Summary */}
        {postSummary}

        {/* Main Content - Two Column Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
          {/* Main Analysis Section */}
          <div className="xl:col-span-2 order-2 xl:order-1">
            <ErrorBoundary
              fallback={
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                    <span className="w-2 h-2 bg-blue-600 rounded-full mr-3"></span>
                    Worry Analysis
                  </h2>
                  <ErrorDisplay
                    message="Unable to load worry analysis. Other features are still available."
                    errorType="network"
                    canRetry={false}
                    size="medium"
                    variant="card"
                  />
                </div>
              }
            >
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6 sm:p-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                    <span className="w-2 h-2 bg-blue-600 rounded-full mr-3"></span>
                    Worry Analysis
                  </h2>
                  <Suspense fallback={<LoadingSpinner text="Loading analysis..." />}>
                    <LazyWorryAnalysis postId={postId || ''} />
                  </Suspense>
                </div>
              </div>
            </ErrorBoundary>
          </div>

          {/* Sidebar - Metrics and Similar Worries */}
          <div className="xl:col-span-1 order-1 xl:order-2">
            <div className="space-y-6">
              {/* Metrics Section */}
              <ErrorBoundary
                fallback={
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="w-2 h-2 bg-green-600 rounded-full mr-3"></span>
                      Response Metrics
                    </h3>
                    <ErrorDisplay
                      message="Unable to load response metrics"
                      errorType="network"
                      canRetry={false}
                      size="small"
                      variant="card"
                    />
                  </div>
                }
              >
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="w-2 h-2 bg-green-600 rounded-full mr-3"></span>
                    Response Metrics
                  </h3>
                  <div className="space-y-4">
                    {/* Me Too Count - Direct interactions only */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Direct Responses</h4>
                      <Suspense fallback={<LoadingSpinner />}>
                        <LazyOptimizedMeTooCount postId={postId || ''} />
                      </Suspense>
                    </div>

                    {/* Similar Worries Count - AI + Me Too combined with breakdown */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Similar Concerns</h4>
                      <Suspense fallback={<LoadingSpinner />}>
                        <LazyOptimizedSimilarWorriesCount 
                          postId={postId || ''} 
                          showBreakdown={true}
                          enableCaching={true}
                        />
                      </Suspense>
                    </div>
                  </div>
                </div>
              </ErrorBoundary>

              {/* Similar Worries List - Only shown on analysis page */}
              <ErrorBoundary
                fallback={
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="w-2 h-2 bg-purple-600 rounded-full mr-3"></span>
                      Related Worries
                    </h3>
                    <ErrorDisplay
                      message="Unable to load related worries. Other features are still available."
                      errorType="network"
                      canRetry={false}
                      size="medium"
                      variant="card"
                    />
                  </div>
                }
              >
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="w-2 h-2 bg-purple-600 rounded-full mr-3"></span>
                      Related Worries
                    </h3>
                    <div className="-m-6">
                      <Suspense fallback={<LoadingSpinner text="Loading related worries..." />}>
                        <LazyLoadedSimilarWorriesList 
                          postId={postId || ''} 
                          initialLimit={5}
                          loadMoreLimit={5}
                        />
                      </Suspense>
                    </div>
                  </div>
                </div>
              </ErrorBoundary>
            </div>
          </div>
        </div>

        {/* Mobile-specific improvements */}
        <div className="block xl:hidden mt-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              💡 <strong>Tip:</strong> For the best analysis experience, try viewing this page on a larger screen.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default React.memo(OptimizedWorryAnalysisPage)