/**
 * Database Query Optimization Utilities for Render.com Deployment
 */

// Common select fields to reduce data transfer
export const USER_SELECT_FIELDS = {
  id: true,
  username: true,
  email: true,
  displayName: true,
  bio: true,
  avatarUrl: true,
  createdAt: true,
  updatedAt: true,
  // Exclude sensitive fields like password hash
};

export const POST_SELECT_FIELDS = {
  id: true,
  content: true,
  longContent: true,
  promptId: true,
  privacyLevel: true,
  scheduledFor: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  userId: true,
  // Include user data for efficient joins
  user: {
    select: USER_SELECT_FIELDS,
  },
};

// Pagination helper
export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export function getPaginationParams(options: PaginationOptions = {}) {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(50, Math.max(1, options.limit || 10)); // Max 50 items per page
  const skip = (page - 1) * limit;

  return {
    skip,
    take: limit,
    page,
    limit,
  };
}

// Database connection optimization
export const DATABASE_CONFIG = {
  // Connection pool settings for production
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Disable query logging to reduce console output
  log: ['error'],
};

// Query performance monitoring
export function logSlowQuery(queryName: string, startTime: number) {
  const duration = Date.now() - startTime;
  if (duration > 1000) { // Log queries taking more than 1 second
    console.warn(`Slow query detected: ${queryName} took ${duration}ms`);
  }
}

// Cache key generators for Redis (when implemented)
export const CACHE_KEYS = {
  user: (userId: string) => `user:${userId}`,
  userPosts: (userId: string, page: number) => `user:${userId}:posts:${page}`,
  feed: (userId: string, page: number) => `feed:${userId}:${page}`,
  analytics: (userId: string, period: string) => `analytics:${userId}:${period}`,
  demographics: (period: string) => `demographics:${period}`,
};

// Common query patterns
export const COMMON_INCLUDES = {
  postWithUser: {
    user: {
      select: USER_SELECT_FIELDS,
    },
  },
  postWithUserAndCounts: {
    user: {
      select: USER_SELECT_FIELDS,
    },
    _count: {
      select: {
        likes: true,
        comments: true,
      },
    },
  },
};

// Database health check query
export async function checkDatabaseHealth(prisma: any): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}