import { Request, Response } from 'express';
import { mockPrisma } from '../setup';

/**
 * Test utilities for mocking Express request/response objects
 */
export const createMockRequest = (overrides: Partial<Request> = {}): Partial<Request> => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  user: undefined,
  ...overrides,
});

export const createMockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
  };
  return res;
};

/**
 * Database test utilities
 */
export const resetDatabase = async () => {
  // In a real scenario, this would reset the test database
  // For mocked tests, we clear all mocks
  Object.values(mockPrisma).forEach((model: any) => {
    if (typeof model === 'object') {
      Object.values(model).forEach((method: any) => {
        if (jest.isMockFunction(method)) {
          method.mockClear();
        }
      });
    }
  });
};

/**
 * Authentication test utilities
 */
export const createAuthenticatedRequest = (userId: string = 'test-user-id') => ({
  user: {
    userId,
    email: 'test@example.com',
    username: 'testuser',
  },
});

export const createValidJWT = (payload: any = {}) => {
  // In real tests, this would create a valid JWT
  // For mocked tests, we return a mock token
  return 'mock-jwt-token';
};

/**
 * Validation test utilities
 */
export const createValidUserData = (overrides = {}) => ({
  email: 'test@example.com',
  username: 'testuser',
  password: 'SecurePassword123!',
  ...overrides,
});

export const createValidPostData = (overrides = {}) => ({
  shortContent: 'Test worry content',
  worryPrompt: 'What is worrying you today?',
  privacyLevel: 'public' as const,
  ...overrides,
});

/**
 * Error testing utilities
 */
export const expectValidationError = (response: any, field?: string) => {
  expect(response.status).toBe(400);
  expect(response.body.error.code).toBe('VALIDATION_ERROR');
  if (field) {
    expect(response.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: field,
        }),
      ])
    );
  }
};

export const expectAuthenticationError = (response: any) => {
  expect(response.status).toBe(401);
  expect(response.body.error.code).toBe('UNAUTHORIZED');
};

export const expectAuthorizationError = (response: any) => {
  expect(response.status).toBe(403);
  expect(response.body.error.code).toBe('FORBIDDEN');
};

export const expectNotFoundError = (response: any) => {
  expect(response.status).toBe(404);
  expect(response.body.error.code).toBe('NOT_FOUND');
};

/**
 * Performance testing utilities
 */
export const measureAsyncOperation = async <T>(
  operation: () => Promise<T>
): Promise<{ result: T; duration: number; memoryUsage: NodeJS.MemoryUsage }> => {
  const startTime = process.hrtime.bigint();
  const startMemory = process.memoryUsage();
  
  const result = await operation();
  
  const endTime = process.hrtime.bigint();
  const endMemory = process.memoryUsage();
  
  const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
  
  return {
    result,
    duration,
    memoryUsage: {
      rss: endMemory.rss - startMemory.rss,
      heapTotal: endMemory.heapTotal - startMemory.heapTotal,
      heapUsed: endMemory.heapUsed - startMemory.heapUsed,
      external: endMemory.external - startMemory.external,
      arrayBuffers: endMemory.arrayBuffers - startMemory.arrayBuffers,
    },
  };
};

export const expectPerformanceThreshold = (duration: number, maxDuration: number) => {
  expect(duration).toBeLessThan(maxDuration);
};

export const expectMemoryThreshold = (memoryUsage: NodeJS.MemoryUsage, maxHeapUsed: number) => {
  expect(memoryUsage.heapUsed).toBeLessThan(maxHeapUsed);
};

/**
 * Security testing utilities
 */
export const createMaliciousInputs = () => ({
  xss: [
    '<script>alert("xss")</script>',
    'javascript:alert("xss")',
    '<img src="x" onerror="alert(\'xss\')" />',
    '"><script>alert("xss")</script>',
  ],
  sqlInjection: [
    "'; DROP TABLE users; --",
    "' OR '1'='1",
    "' UNION SELECT * FROM users --",
    "admin'--",
  ],
  pathTraversal: [
    '../../../etc/passwd',
    '..\\..\\..\\windows\\system32\\config\\sam',
    '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
  ],
  commandInjection: [
    '; cat /etc/passwd',
    '| whoami',
    '`whoami`',
    '$(whoami)',
  ],
});

export const expectSecurityHeaders = (response: any) => {
  expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
  expect(response.headers).toHaveProperty('x-frame-options');
  expect(response.headers).toHaveProperty('x-xss-protection');
};

/**
 * Load testing utilities
 */
export const createConcurrentRequests = async <T>(
  requestFunction: () => Promise<T>,
  concurrency: number
): Promise<T[]> => {
  const requests = Array.from({ length: concurrency }, () => requestFunction());
  return Promise.all(requests);
};

export const measureConcurrentPerformance = async <T>(
  requestFunction: () => Promise<T>,
  concurrency: number
) => {
  const startTime = Date.now();
  const results = await createConcurrentRequests(requestFunction, concurrency);
  const endTime = Date.now();
  
  const totalTime = endTime - startTime;
  const averageTime = totalTime / concurrency;
  
  return {
    results,
    totalTime,
    averageTime,
    successCount: results.length,
    concurrency,
  };
};

/**
 * Data generation utilities
 */
export const generateRandomString = (length: number): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const generateRandomEmail = (): string => {
  const username = generateRandomString(8);
  const domain = generateRandomString(6);
  return `${username}@${domain}.com`;
};

export const generateLargeDataset = <T>(
  factory: (index: number) => T,
  size: number
): T[] => {
  return Array.from({ length: size }, (_, index) => factory(index));
};

/**
 * Test environment utilities
 */
export const isCI = (): boolean => {
  return process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
};

export const skipIfCI = (reason: string = 'Skipped in CI environment') => {
  if (isCI()) {
    return { skip: true, reason };
  }
  return { skip: false };
};

export const runOnlyInCI = (reason: string = 'Only runs in CI environment') => {
  if (!isCI()) {
    return { skip: true, reason };
  }
  return { skip: false };
};

/**
 * Cleanup utilities
 */
export const cleanupTestData = async () => {
  // In real tests, this would clean up test data from the database
  // For mocked tests, we reset all mocks
  await resetDatabase();
};

export const withCleanup = <T>(testFunction: () => Promise<T>) => {
  return async () => {
    try {
      return await testFunction();
    } finally {
      await cleanupTestData();
    }
  };
};