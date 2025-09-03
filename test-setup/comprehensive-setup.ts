import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'

// Global test configuration for comprehensive tests
beforeAll(() => {
  console.log('🧪 Starting Comprehensive Test Suite')
  
  // Set up global test environment
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }))

  // Mock IntersectionObserver for lazy loading tests
  global.IntersectionObserver = vi.fn().mockImplementation((callback) => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
    trigger: (entries: any[]) => callback(entries)
  }))

  // Mock window.matchMedia for responsive design tests
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })

  // Mock window.scrollTo for scroll behavior tests
  Object.defineProperty(window, 'scrollTo', {
    writable: true,
    value: vi.fn()
  })

  // Mock localStorage for caching tests
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn()
  }
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
  })

  // Mock sessionStorage
  Object.defineProperty(window, 'sessionStorage', {
    value: localStorageMock
  })

  // Mock fetch for API tests
  global.fetch = vi.fn()

  // Mock console methods to reduce noise in tests
  const originalConsoleError = console.error
  console.error = (...args: any[]) => {
    // Only log actual errors, not React warnings in tests
    if (typeof args[0] === 'string' && args[0].includes('Warning:')) {
      return
    }
    originalConsoleError(...args)
  }

  // Set up performance monitoring mock
  global.performance = {
    ...global.performance,
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByName: vi.fn().mockReturnValue([]),
    getEntriesByType: vi.fn().mockReturnValue([]),
    clearMarks: vi.fn(),
    clearMeasures: vi.fn(),
    now: vi.fn(() => Date.now())
  }

  // Mock crypto for UUID generation in tests
  Object.defineProperty(global, 'crypto', {
    value: {
      randomUUID: vi.fn(() => 'test-uuid-' + Math.random().toString(36).substr(2, 9))
    }
  })
})

beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks()
  
  // Reset DOM
  document.body.innerHTML = ''
  
  // Reset window location
  delete (window as any).location
  window.location = {
    ...window.location,
    href: 'http://localhost:3000/',
    pathname: '/',
    search: '',
    hash: ''
  }

  // Reset window size for responsive tests
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 1024
  })
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: 768
  })

  // Clear any custom event listeners
  const eventListeners = (window as any)._eventListeners || {}
  Object.keys(eventListeners).forEach(event => {
    eventListeners[event].forEach((listener: any) => {
      window.removeEventListener(event, listener)
    })
  })
  ;(window as any)._eventListeners = {}

  // Reset timers
  vi.useFakeTimers()
})

afterEach(() => {
  // Cleanup React Testing Library
  cleanup()
  
  // Restore real timers
  vi.useRealTimers()
  
  // Clear any remaining timeouts/intervals
  vi.clearAllTimers()
  
  // Reset modules to ensure clean state
  vi.resetModules()
})

afterAll(() => {
  console.log('✅ Comprehensive Test Suite Completed')
  
  // Cleanup global mocks
  vi.restoreAllMocks()
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc()
  }
})

// Custom test utilities for comprehensive tests
export const testUtils = {
  // Wait for async operations to complete
  waitForAsync: async (timeout = 1000) => {
    return new Promise(resolve => setTimeout(resolve, timeout))
  },

  // Simulate user interaction delays
  simulateUserDelay: async (ms = 100) => {
    await new Promise(resolve => setTimeout(resolve, ms))
  },

  // Mock API responses with realistic delays
  mockApiResponse: <T>(data: T, delay = 100) => {
    return new Promise<T>(resolve => {
      setTimeout(() => resolve(data), delay)
    })
  },

  // Create mock error with specific properties
  createMockError: (message: string, code?: string, status?: number) => {
    const error = new Error(message)
    if (code) (error as any).code = code
    if (status) (error as any).status = status
    return error
  },

  // Generate mock data for tests
  generateMockWorries: (count: number) => {
    return Array.from({ length: count }, (_, i) => ({
      id: `worry-${i}`,
      shortContent: `Mock worry content ${i}`,
      category: ['Health & Wellness', 'Work & Career', 'Relationships'][i % 3],
      subcategory: 'Test Subcategory',
      similarity: Math.random() * 0.5 + 0.5, // 0.5 to 1.0
      anonymousCount: Math.floor(Math.random() * 10),
      isOwnPost: i % 5 === 0, // Every 5th post is own post
      privacyLevel: ['public', 'private', 'friends'][i % 3],
      createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
      user: {
        id: `user-${i}`,
        username: `user${i}`,
        displayName: `User ${i}`
      }
    }))
  },

  // Performance testing utilities
  measurePerformance: async <T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> => {
    const start = performance.now()
    const result = await fn()
    const end = performance.now()
    return { result, duration: end - start }
  },

  // Memory usage testing
  getMemoryUsage: () => {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage()
    }
    return { heapUsed: 0, heapTotal: 0, external: 0, rss: 0 }
  }
}

// Export test configuration
export const testConfig = {
  defaultTimeout: 5000,
  longTimeout: 10000,
  apiTimeout: 3000,
  animationTimeout: 500,
  debounceTimeout: 300
}

// Privacy test utilities
export const privacyTestUtils = {
  createPrivatePost: (userId: string, postId: string) => ({
    id: postId,
    shortContent: 'Private post content',
    privacyLevel: 'private',
    userId,
    isOwnPost: false,
    user: { id: userId, username: `user_${userId}`, displayName: `User ${userId}` }
  }),

  createPublicPost: (userId: string, postId: string) => ({
    id: postId,
    shortContent: 'Public post content',
    privacyLevel: 'public',
    userId,
    isOwnPost: false,
    user: { id: userId, username: `user_${userId}`, displayName: `User ${userId}` }
  }),

  verifyNoPrivateDataLeakage: (results: any[], currentUserId: string) => {
    results.forEach(result => {
      if (result.privacyLevel === 'private' && result.userId !== currentUserId) {
        throw new Error(`Privacy violation: Private post ${result.id} exposed to wrong user`)
      }
    })
  }
}

// Performance benchmarks
export const performanceBenchmarks = {
  maxQueryTime: 500, // 500ms
  maxRenderTime: 100, // 100ms
  maxCacheTime: 50,   // 50ms
  maxMemoryIncrease: 10 * 1024 * 1024, // 10MB
  minCacheHitRate: 0.8 // 80%
}