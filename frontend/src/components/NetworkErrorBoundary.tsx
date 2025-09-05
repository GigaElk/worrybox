import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react'

interface Props {
  children: ReactNode
  fallbackComponent?: ReactNode
  onRetry?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorType: 'network' | 'resource' | 'generic'
}

class NetworkErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorType: 'generic'
  }

  public static getDerivedStateFromError(error: Error): State {
    // Determine error type based on error message/type
    let errorType: 'network' | 'resource' | 'generic' = 'generic'
    
    if (error.message.includes('ERR_INSUFFICIENT_RESOURCES') ||
        error.message.includes('insufficient resources') ||
        error.message.includes('resource exhaustion')) {
      errorType = 'resource'
    } else if (error.message.includes('ERR_NETWORK') ||
               error.message.includes('Failed to fetch') ||
               error.message.includes('Network Error') ||
               error.message.includes('timeout')) {
      errorType = 'network'
    }

    return { hasError: true, error, errorType }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Network Error Boundary caught an error:', error, errorInfo)
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorType: 'generic' })
    this.props.onRetry?.()
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallbackComponent) {
        return this.props.fallbackComponent
      }

      return (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              {this.state.errorType === 'network' ? (
                <WifiOff className="h-6 w-6 text-red-600" />
              ) : this.state.errorType === 'resource' ? (
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-red-600" />
              )}
            </div>
            
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {this.state.errorType === 'network' && 'Connection Problem'}
              {this.state.errorType === 'resource' && 'Loading Issue'}
              {this.state.errorType === 'generic' && 'Something went wrong'}
            </h3>
            
            <p className="text-sm text-gray-600 mb-4">
              {this.state.errorType === 'network' && 
                'Unable to connect to our servers. Please check your internet connection and try again.'}
              {this.state.errorType === 'resource' && 
                'The page is having trouble loading due to high activity. Please try refreshing.'}
              {this.state.errorType === 'generic' && 
                'An unexpected error occurred. Please refresh the page to try again.'}
            </p>
            
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default NetworkErrorBoundary

// Higher-order component for easier usage
export function withNetworkErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallbackComponent?: ReactNode
) {
  return function NetworkErrorBoundaryWrapper(props: P) {
    return (
      <NetworkErrorBoundary fallbackComponent={fallbackComponent}>
        <WrappedComponent {...props} />
      </NetworkErrorBoundary>
    )
  }
}

// Hook for handling network errors in function components
export function useNetworkErrorHandler() {
  const [error, setError] = React.useState<string | null>(null)
  
  const handleError = React.useCallback((error: any) => {
    let errorMessage = 'An unexpected error occurred'
    
    if (error?.message?.includes('ERR_INSUFFICIENT_RESOURCES') ||
        error?.message?.includes('insufficient resources')) {
      errorMessage = 'Loading issue due to high activity. Please refresh and try again.'
    } else if (error?.message?.includes('ERR_NETWORK') ||
               error?.message?.includes('Failed to fetch') ||
               error?.response?.status === 0) {
      errorMessage = 'Network connection problem. Please check your internet and try again.'
    } else if (error?.response?.status >= 500) {
      errorMessage = 'Server error. Please try again in a moment.'
    } else if (error?.response?.status === 429) {
      errorMessage = 'Too many requests. Please wait a moment and try again.'
    }
    
    setError(errorMessage)
    console.error('Network error:', error)
  }, [])
  
  const clearError = React.useCallback(() => {
    setError(null)
  }, [])
  
  return { error, handleError, clearError }
}
