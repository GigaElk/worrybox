// Utility functions to detect and handle service cold starts

export interface WakeupState {
  isWakingUp: boolean
  retryCount: number
  maxRetries: number
}

// Detect if an error is likely due to cold start
export const isColdStartError = (error: any): boolean => {
  // Network timeout errors
  if (error.code === 'ERR_NETWORK' || error.code === 'NETWORK_ERROR') {
    return true
  }
  
  // Timeout errors
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return true
  }
  
  // 502/503/504 errors (service unavailable)
  if (error.response?.status === 502 || error.response?.status === 503 || error.response?.status === 504) {
    return true
  }
  
  // Connection refused
  if (error.message?.includes('ECONNREFUSED') || error.message?.includes('connect ECONNREFUSED')) {
    return true
  }
  
  // Render-specific cold start indicators
  if (error.message?.includes('Service Unavailable') || error.message?.includes('Bad Gateway')) {
    return true
  }
  
  return false
}

// Retry with exponential backoff
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 2000,
  onRetry?: (attempt: number) => void
): Promise<T> => {
  let lastError: any
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      // Don't retry if it's not a cold start error
      if (!isColdStartError(error)) {
        throw error
      }
      
      // Don't retry if we've reached max attempts
      if (attempt === maxRetries) {
        throw error
      }
      
      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt)
      
      // Notify about retry
      if (onRetry) {
        onRetry(attempt + 1)
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError
}

// Wake up services by making a simple health check
export const wakeupServices = async (): Promise<boolean> => {
  try {
    const response = await fetch('/api/health', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    return response.ok
  } catch (error) {
    console.log('Service wakeup attempt failed:', error)
    return false
  }
}

// Ping services to keep them awake
export const keepServicesAwake = () => {
  const pingInterval = 10 * 60 * 1000 // 10 minutes
  
  const ping = async () => {
    try {
      await fetch('/api/health', { method: 'GET' })
    } catch (error) {
      // Ignore ping errors
    }
  }
  
  // Initial ping
  ping()
  
  // Set up interval
  const intervalId = setInterval(ping, pingInterval)
  
  // Return cleanup function
  return () => clearInterval(intervalId)
}