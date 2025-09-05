/**
 * Request Queue Utility
 * 
 * This utility helps manage API request throttling to prevent browser resource exhaustion
 * by limiting the number of concurrent requests and queuing others.
 */

interface QueuedRequest<T> {
  id: string
  execute: () => Promise<T>
  resolve: (value: T | PromiseLike<T>) => void
  reject: (reason?: any) => void
  priority: number
  timestamp: number
}

class RequestQueue {
  private queue: QueuedRequest<any>[] = []
  private activeRequests = 0
  private readonly maxConcurrentRequests: number
  private readonly requestDelay: number
  private nextId = 0

  constructor(maxConcurrentRequests = 6, requestDelay = 100) {
    this.maxConcurrentRequests = maxConcurrentRequests
    this.requestDelay = requestDelay
  }

  /**
   * Add a request to the queue with optional priority
   * Higher priority numbers execute first
   */
  async enqueue<T>(
    requestFn: () => Promise<T>, 
    priority: number = 0,
    requestId?: string
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = requestId || `req_${++this.nextId}`
      
      // Check if this request is already queued/active (for deduplication)
      const existingIndex = this.queue.findIndex(req => req.id === id)
      if (existingIndex !== -1) {
        // Replace with newer request
        this.queue.splice(existingIndex, 1)
      }

      const queuedRequest: QueuedRequest<T> = {
        id,
        execute: requestFn,
        resolve,
        reject,
        priority,
        timestamp: Date.now()
      }

      this.queue.push(queuedRequest)
      this.sortQueue()
      this.processQueue()
    })
  }

  /**
   * Process the queue by executing requests up to the concurrency limit
   */
  private async processQueue(): Promise<void> {
    if (this.activeRequests >= this.maxConcurrentRequests || this.queue.length === 0) {
      return
    }

    const request = this.queue.shift()!
    this.activeRequests++

    try {
      // Add small delay to prevent overwhelming the browser
      if (this.activeRequests > 1) {
        await new Promise(resolve => setTimeout(resolve, this.requestDelay))
      }

      const result = await request.execute()
      request.resolve(result)
    } catch (error) {
      request.reject(error)
    } finally {
      this.activeRequests--
      // Process next request
      setTimeout(() => this.processQueue(), 0)
    }
  }

  /**
   * Sort queue by priority (higher first) then by timestamp (older first)
   */
  private sortQueue(): void {
    this.queue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority // Higher priority first
      }
      return a.timestamp - b.timestamp // Older requests first
    })
  }

  /**
   * Clear all pending requests
   */
  clear(): void {
    this.queue.forEach(request => {
      request.reject(new Error('Request queue cleared'))
    })
    this.queue = []
  }

  /**
   * Get queue status for debugging
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      activeRequests: this.activeRequests,
      maxConcurrent: this.maxConcurrentRequests
    }
  }
}

// Create a global request queue instance
export const globalRequestQueue = new RequestQueue(6, 50) // Max 6 concurrent, 50ms delay

/**
 * Wrapper function to easily queue API requests
 */
export function queueRequest<T>(
  requestFn: () => Promise<T>,
  options: {
    priority?: number
    requestId?: string
  } = {}
): Promise<T> {
  return globalRequestQueue.enqueue(
    requestFn, 
    options.priority || 0,
    options.requestId
  )
}

/**
 * Higher-level wrapper for common API patterns
 */
export const apiRequest = {
  /**
   * High priority requests (user interactions)
   */
  high<T>(requestFn: () => Promise<T>, requestId?: string): Promise<T> {
    return queueRequest(requestFn, { priority: 10, requestId })
  },

  /**
   * Normal priority requests (initial data loading)
   */
  normal<T>(requestFn: () => Promise<T>, requestId?: string): Promise<T> {
    return queueRequest(requestFn, { priority: 5, requestId })
  },

  /**
   * Low priority requests (background data, analytics, etc.)
   */
  low<T>(requestFn: () => Promise<T>, requestId?: string): Promise<T> {
    return queueRequest(requestFn, { priority: 1, requestId })
  }
}

export default RequestQueue
