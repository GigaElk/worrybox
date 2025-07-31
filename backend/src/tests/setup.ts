import { PrismaClient } from '@prisma/client';
import request from 'supertest';

// Global test setup
export const mockPrisma = {
  user: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  post: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  comment: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  follow: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  like: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  subscription: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  notificationPreferences: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
  },
  notification: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  worryAnalysis: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  worryResolution: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  worryPrompt: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  moderationQueue: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  commentReport: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  analyticsCache: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    upsert: jest.fn(),
  },
  $transaction: jest.fn(),
  $connect: jest.fn(),
  $disconnect: jest.fn(),
};

// Mock Prisma Client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrisma),
}));

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword'),
  compare: jest.fn().mockResolvedValue(true),
}));

// Mock JWT utils
jest.mock('../utils/jwt', () => ({
  generateTokens: jest.fn().mockReturnValue({
    token: 'mock-token',
    refreshToken: 'mock-refresh-token',
  }),
  verifyToken: jest.fn().mockImplementation((token: string) => {
    // Extract user info from token for e2e tests
    if (token === 'token-user-1') {
      return {
        userId: 'user-1',
        email: 'user1@example.com',
        username: 'user1',
      };
    }
    if (token === 'token-user-2') {
      return {
        userId: 'user-2',
        email: 'user2@example.com',
        username: 'user2',
      };
    }
    // Default mock for other tests
    return {
      userId: 'user-id',
      email: 'test@example.com',
      username: 'testuser',
    };
  }),
  generatePasswordResetToken: jest.fn().mockReturnValue('mock-reset-token'),
  verifyPasswordResetToken: jest.fn().mockReturnValue({
    userId: 'user-id',
    email: 'test@example.com',
  }),
}));

// Mock email utils
jest.mock('../utils/email', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

// Mock OpenAI (if used)
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'Mock AI response' } }],
        }),
      },
    },
  })),
}));

// Mock FollowService
jest.mock('../services/followService', () => ({
  FollowService: jest.fn().mockImplementation(() => ({
    followUser: jest.fn().mockResolvedValue({
      id: 'follow-123',
      followerId: 'user-1',
      followingId: 'user-2',
      createdAt: new Date(),
    }),
    unfollowUser: jest.fn().mockResolvedValue(undefined),
    isFollowing: jest.fn().mockResolvedValue(false),
    getFollowers: jest.fn().mockResolvedValue([]),
    getFollowing: jest.fn().mockResolvedValue([]),
    getFollowStats: jest.fn().mockResolvedValue({
      followersCount: 0,
      followingCount: 0,
    }),
  })),
}));

// Mock PostService
jest.mock('../services/postService', () => ({
  PostService: jest.fn().mockImplementation(() => ({
    createPost: jest.fn().mockResolvedValue(createMockPost()),
    getPost: jest.fn().mockResolvedValue(createMockPost()),
    updatePost: jest.fn().mockResolvedValue(createMockPost()),
    deletePost: jest.fn().mockResolvedValue(undefined),
    getPosts: jest.fn().mockResolvedValue({
      posts: [createMockPost()],
      total: 1,
      hasMore: false,
    }),
  })),
}));

// Mock LemonSqueezy
jest.mock('@lemonsqueezy/lemonsqueezy.js', () => ({
  lemonSqueezySetup: jest.fn(),
  getSubscription: jest.fn().mockResolvedValue({
    data: {
      id: 'sub-123',
      attributes: {
        status: 'active',
        product_id: 'prod-123',
        variant_id: 'var-123',
      },
    },
  }),
  createCheckout: jest.fn().mockResolvedValue({
    data: {
      attributes: {
        url: 'https://checkout.lemonsqueezy.com/test',
      },
    },
  }),
}));

// Test data factories
export const createMockUser = (overrides = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  username: 'testuser',
  displayName: 'Test User',
  passwordHash: 'hashedPassword',
  emailVerified: true,
  avatarUrl: null,
  bio: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockPost = (overrides = {}) => ({
  id: 'post-123',
  userId: 'user-123',
  shortContent: 'Test worry content',
  longContent: null,
  worryPrompt: 'What is worrying you today?',
  privacyLevel: 'public',
  isScheduled: false,
  scheduledFor: null,
  publishedAt: new Date(),
  detectedLanguage: 'en',
  createdAt: new Date(),
  updatedAt: new Date(),
  user: createMockUser(),
  ...overrides,
});

export const createMockComment = (overrides = {}) => ({
  id: 'comment-123',
  postId: 'post-123',
  userId: 'user-123',
  content: 'Test comment content',
  moderationStatus: 'approved',
  moderationScore: null,
  parentCommentId: null,
  detectedLanguage: 'en',
  createdAt: new Date(),
  updatedAt: new Date(),
  user: createMockUser(),
  ...overrides,
});

export const createMockFollow = (overrides = {}) => ({
  id: 'follow-123',
  followerId: 'user-123',
  followingId: 'user-456',
  createdAt: new Date(),
  follower: createMockUser({ id: 'user-123' }),
  following: createMockUser({ id: 'user-456' }),
  ...overrides,
});

// Helper functions for tests
export const clearAllMocks = () => {
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

export const setupAuthenticatedRequest = () => ({
  user: {
    userId: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
  },
});

// Performance testing helpers
export const measureExecutionTime = async (fn: () => Promise<any>) => {
  const start = Date.now();
  const result = await fn();
  const end = Date.now();
  return {
    result,
    executionTime: end - start,
  };
};

// Security testing helpers
export const createMaliciousPayload = (type: 'xss' | 'sql' | 'nosql') => {
  switch (type) {
    case 'xss':
      return '<script>alert("XSS")</script>';
    case 'sql':
      return "'; DROP TABLE users; --";
    case 'nosql':
      return { $ne: null };
    default:
      return '';
  }
};

export const testRateLimiting = async (
  app: any,
  endpoint: string,
  method: 'get' | 'post' | 'put' | 'delete' = 'get',
  maxRequests: number = 100,
  authToken?: string
) => {
  const requests = [];
  for (let i = 0; i < maxRequests + 1; i++) {
    const req = request(app)[method](endpoint);
    if (authToken) {
      req.set('Authorization', authToken);
    }
    requests.push(req);
  }
  
  const responses = await Promise.all(requests);
  const rateLimitedResponses = responses.filter(res => res.status === 429);
  
  return {
    totalRequests: responses.length,
    rateLimitedCount: rateLimitedResponses.length,
    wasRateLimited: rateLimitedResponses.length > 0,
  };
};