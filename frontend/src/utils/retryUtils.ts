import { WorryAnalysisError, WorryAnalysisErrorType } from '../services/worryAnalysisService'

export interface RetryOptions {
  maxAttempts?: number
  baseDelay?: number
  maxDelay?: number
  backoffFactor?: number
  retryCondition?: (error: Error) => boolean
  onRetry?: (attempt: number, error: Error) => void
}

export const defaultRetryOptions: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  retryCondition: (error: Error) => {
    // Don't retry on certain error types
    if (error instanceof WorryAnalysisError) {
      return ![
        WorryAnalysisErrorType.NOT_FOUND,
        WorryAnalysisErrorType.PRIVACY_VIOLATION,
        WorryAnalysisErrorType.UNAUTHORIZED,
        WorryAnalysisErrorType.RATE_LIMITED
      ].includes(error.type)
    }
    
    // Don't retry on quota exceeded or rate limit errors
    const errorMessage = (error as any).response?.data?.error?.message || (error as any).message || ''
    if (errorMessage.toLowerCase().includes('quota') || 
        errorMessage.toLowerCase().includes('rate limit') ||
        errorMessage.toLowerCase().includes('exceeded')) {
      return false
    }
    
    // Don't retry on client errors (4xx)
    if ('response' in error && typeof error.response === 'object' && error.response !== null) {
      const status = (error.response as any).status
      if (status >= 400 && status < 500) {
        return false
      }
    }
    
    return true
  },
  onRetry: () => {}
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...defaultRetryOptions, ...options }
  let lastError: Error
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      
      // Don't retry if this is the last attempt
      if (attempt === config.maxAttempts) {
        break
      }
      
      // Check if we should retry this error
      if (!config.retryCondition(lastError)) {
        break
      }
      
      // Call retry callback
      config.onRetry(attempt, lastError)
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffFactor, attempt - 1),
        config.maxDelay
      )
      
      // Add jitter to prevent thundering herd
      const jitteredDelay = delay + Math.random() * 1000
      
      await new Promise(resolve => setTimeout(resolve, jitteredDelay))
    }
  }
  
  throw lastError!
}

// Specialized retry functions for different contexts
export const retryApiCall = <T>(operation: () => Promise<T>) =>
  withRetry(operation, {
    maxAttempts: 3,
    baseDelay: 1000,
    onRetry: (attempt, error) => {
      console.log(`API call failed (attempt ${attempt}), retrying...`, error.message)
    }
  })

export const retryNetworkCall = <T>(operation: () => Promise<T>) =>
  withRetry(operation, {
    maxAttempts: 5,
    baseDelay: 2000,
    maxDelay: 30000,
    retryCondition: (error) => {
      // Only retry network-related errors
      return error.message.includes('Network') || 
             error.message.includes('fetch') ||
             error.message.includes('timeout')
    },
    onRetry: (attempt, error) => {
      console.log(`Network call failed (attempt ${attempt}), retrying...`, error.message)
    }
  })

export const retryCriticalOperation = <T>(operation: () => Promise<T>) =>
  withRetry(operation, {
    maxAttempts: 5,
    baseDelay: 500,
    backoffFactor: 1.5,
    onRetry: (attempt, error) => {
      console.log(`Critical operation failed (attempt ${attempt}), retrying...`, error.message)
    }
  })

// Utility to create a retry-enabled version of any async function
export function createRetryableFunction<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  options: RetryOptions = {}
) {
  return (...args: T): Promise<R> => {
    return withRetry(() => fn(...args), options)
  }
}

// Circuit breaker pattern for preventing cascading failures
export class CircuitBreaker {
  private failures = 0
  private lastFailureTime = 0
  private state: 'closed' | 'open' | 'half-open' = 'closed'
  
  constructor(
    private failureThreshold = 5,
    private recoveryTimeout = 60000, // 1 minute
    private monitoringPeriod = 300000 // 5 minutes
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'half-open'
      } else {
        throw new Error('Circuit breaker is open - service temporarily unavailable')
      }
    }
    
    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }
  
  private onSuccess() {
    this.failures = 0
    this.state = 'closed'
  }
  
  private onFailure() {
    this.failures++
    this.lastFailureTime = Date.now()
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'open'
    }
  }
  
  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime
    }
  }
  
  reset() {
    this.failures = 0
    this.lastFailureTime = 0
    this.state = 'closed'
  }
}

// Global circuit breakers for different services
export const similarWorriesCircuitBreaker = new CircuitBreaker(3, 30000) // More lenient for non-critical feature
export const meTooCircuitBreaker = new CircuitBreaker(5, 60000)
export const analysisCircuitBreaker = new CircuitBreaker(3, 45000)