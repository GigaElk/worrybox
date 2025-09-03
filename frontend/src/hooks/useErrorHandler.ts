import { useState, useCallback } from 'react'
import { WorryAnalysisError, WorryAnalysisErrorType } from '../services/worryAnalysisService'

export interface ErrorState {
  error: Error | null
  isError: boolean
  errorMessage: string
  errorType: string
  canRetry: boolean
}

export interface ErrorHandlerOptions {
  showToast?: boolean
  logError?: boolean
  fallbackMessage?: string
}

export const useErrorHandler = (options: ErrorHandlerOptions = {}) => {
  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isError: false,
    errorMessage: '',
    errorType: 'unknown',
    canRetry: false
  })

  const handleError = useCallback((error: Error | WorryAnalysisError, context?: string) => {
    const { showToast = true, logError = true, fallbackMessage = 'An unexpected error occurred' } = options

    // Log error if enabled
    if (logError) {
      console.error(`Error in ${context || 'unknown context'}:`, error)
    }

    let errorMessage = fallbackMessage
    let errorType = 'unknown'
    let canRetry = false

    // Handle WorryAnalysisError specifically
    if (error instanceof WorryAnalysisError) {
      errorType = error.type
      
      switch (error.type) {
        case WorryAnalysisErrorType.NOT_FOUND:
          errorMessage = 'The requested content was not found'
          canRetry = false
          break
        case WorryAnalysisErrorType.PRIVACY_VIOLATION:
          errorMessage = 'You do not have permission to view this content'
          canRetry = false
          break
        case WorryAnalysisErrorType.NETWORK_ERROR:
          errorMessage = 'Network error. Please check your connection and try again'
          canRetry = true
          break
        case WorryAnalysisErrorType.UNAUTHORIZED:
          errorMessage = 'Please log in to access this feature'
          canRetry = false
          break
        case WorryAnalysisErrorType.RATE_LIMITED:
          errorMessage = 'Too many requests. Please wait a moment and try again'
          canRetry = true
          break
        default:
          errorMessage = error.message || fallbackMessage
          canRetry = true
      }
    } else {
      // Handle generic errors
      if (error.message.includes('Network Error') || error.message.includes('fetch')) {
        errorType = 'network'
        errorMessage = 'Network error. Please check your connection and try again'
        canRetry = true
      } else if (error.message.includes('timeout')) {
        errorType = 'timeout'
        errorMessage = 'Request timed out. Please try again'
        canRetry = true
      } else {
        errorMessage = error.message || fallbackMessage
        canRetry = true
      }
    }

    setErrorState({
      error,
      isError: true,
      errorMessage,
      errorType,
      canRetry
    })

    // Show toast notification if enabled
    if (showToast && typeof window !== 'undefined') {
      // Dispatch custom event for toast notifications
      window.dispatchEvent(new CustomEvent('showToast', {
        detail: {
          type: 'error',
          message: errorMessage,
          duration: canRetry ? 5000 : 3000
        }
      }))
    }
  }, [options])

  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      isError: false,
      errorMessage: '',
      errorType: 'unknown',
      canRetry: false
    })
  }, [])

  const retry = useCallback((retryFn?: () => void | Promise<void>) => {
    clearError()
    if (retryFn) {
      try {
        const result = retryFn()
        if (result instanceof Promise) {
          result.catch(handleError)
        }
      } catch (error) {
        handleError(error as Error)
      }
    }
  }, [clearError, handleError])

  return {
    errorState,
    handleError,
    clearError,
    retry,
    isError: errorState.isError,
    errorMessage: errorState.errorMessage,
    canRetry: errorState.canRetry
  }
}

// Specialized hook for API errors
export const useApiErrorHandler = () => {
  return useErrorHandler({
    showToast: true,
    logError: true,
    fallbackMessage: 'Unable to connect to the server. Please try again later.'
  })
}

// Hook for silent error handling (no toast notifications)
export const useSilentErrorHandler = () => {
  return useErrorHandler({
    showToast: false,
    logError: true,
    fallbackMessage: 'An error occurred'
  })
}