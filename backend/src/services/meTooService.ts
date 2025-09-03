import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface MeTooResponse {
  id: string;
  userId: string;
  postId: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
  };
}

export class MeTooService {
  async addMeToo(userId: string, postId: string): Promise<MeTooResponse> {
    // Validate input parameters
    if (!userId || !postId) {
      throw new Error('User ID and Post ID are required');
    }

    try {
      // Check if post exists
      const post = await prisma.post.findUnique({
        where: { id: postId }
      });

      if (!post) {
        throw new Error('Post not found');
      }

      // Check if already has MeToo
      const existingMeToo = await prisma.meToo.findFirst({
        where: {
          userId,
          postId
        }
      });

      if (existingMeToo) {
        throw new Error('Already indicated MeToo for this post');
      }

      // Create MeToo
      const meToo = await prisma.meToo.create({
        data: {
          userId,
          postId
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true
            }
          }
        }
      });

      return {
        id: meToo.id,
        userId: meToo.userId,
        postId: meToo.postId,
        createdAt: meToo.createdAt.toISOString(),
        user: {
          id: meToo.user.id,
          username: meToo.user.username,
          displayName: meToo.user.displayName || undefined,
          avatarUrl: meToo.user.avatarUrl || undefined
        }
      };
    } catch (error: any) {
      // Re-throw known errors, wrap unknown errors
      if (error.message === 'Post not found' || error.message === 'Already indicated MeToo for this post') {
        throw error;
      }
      
      console.error('Error creating MeToo:', { userId, postId }, error);
      throw new Error('Failed to indicate MeToo for post');
    }
  }

  async removeMeToo(userId: string, postId: string): Promise<void> {
    // Validate input parameters
    if (!userId || !postId) {
      throw new Error('User ID and Post ID are required');
    }

    try {
      const meToo = await prisma.meToo.findFirst({
        where: {
          userId,
          postId
        }
      });

      if (!meToo) {
        throw new Error('MeToo not found for this post');
      }

      await prisma.meToo.delete({
        where: {
          id: meToo.id
        }
      });
    } catch (error: any) {
      // Re-throw known errors, wrap unknown errors
      if (error.message === 'MeToo not found for this post') {
        throw error;
      }
      
      console.error('Error removing MeToo:', { userId, postId }, error);
      throw new Error('Failed to remove MeToo from post');
    }
  }

  async getMeToos(postId: string, limit = 20, offset = 0): Promise<{ meToos: MeTooResponse[], total: number, hasMore: boolean }> {
    try {
      // Handle null/undefined postId
      if (!postId) {
        return {
          meToos: [],
          total: 0,
          hasMore: false
        };
      }

      // Check if post exists - return empty results instead of throwing error
      const post = await prisma.post.findUnique({
        where: { id: postId }
      });

      if (!post) {
        // Return empty results instead of throwing error for better UX
        return {
          meToos: [],
          total: 0,
          hasMore: false
        };
      }

      const [meToos, total] = await Promise.all([
        prisma.meToo.findMany({
          where: {
            postId
          },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: limit,
          skip: offset
        }).catch(() => []), // Handle database errors gracefully
        prisma.meToo.count({
          where: {
            postId
          }
        }).catch(() => 0) // Handle database errors gracefully
      ]);

      // Safely handle null/undefined meToos array
      const safeMeToos = meToos || [];
      const safeTotal = total || 0;

      return {
        meToos: safeMeToos.map(meToo => ({
          id: meToo.id,
          userId: meToo.userId,
          postId: meToo.postId,
          createdAt: meToo.createdAt.toISOString(),
          user: {
            id: meToo.user.id,
            username: meToo.user.username,
            displayName: meToo.user.displayName || undefined,
            avatarUrl: meToo.user.avatarUrl || undefined
          }
        })),
        total: safeTotal,
        hasMore: offset + safeMeToos.length < safeTotal
      };
    } catch (error) {
      // Log error but return empty results instead of throwing
      console.error('Error fetching MeToos for post:', postId, error);
      return {
        meToos: [],
        total: 0,
        hasMore: false
      };
    }
  }

  async hasMeToo(userId: string, postId: string): Promise<boolean> {
    try {
      // Handle null/undefined parameters
      if (!userId || !postId) {
        return false;
      }

      const meToo = await prisma.meToo.findFirst({
        where: {
          userId,
          postId
        }
      });

      return !!meToo;
    } catch (error) {
      // Log error but return false instead of throwing
      console.error('Error checking MeToo status:', { userId, postId }, error);
      return false;
    }
  }

  async getMeTooCount(postId: string): Promise<number> {
    try {
      // Handle null/undefined postId
      if (!postId) {
        return 0;
      }

      const count = await prisma.meToo.count({
        where: {
          postId
        }
      });

      return count || 0; // Ensure we always return a number
    } catch (error) {
      // Log error but return 0 instead of throwing
      console.error('Error getting MeToo count for post:', postId, error);
      return 0;
    }
  }

  /**
   * Get combined similar worry count (AI-detected + MeToo responses)
   * This integrates with the existing AI similarity system
   */
  async getSimilarWorryCount(postId: string): Promise<number> {
    try {
      // Handle null/undefined postId
      if (!postId) {
        return 0;
      }

      // Get MeToo count with error handling
      const meTooCount = await this.getMeTooCount(postId);
      
      // Get AI-detected similar worry count from WorryAnalysis with error handling
      const worryAnalysis = await prisma.worryAnalysis.findUnique({
        where: { postId },
        select: { similarWorryCount: true }
      }).catch(() => null);

      const aiSimilarCount = worryAnalysis?.similarWorryCount || 0;
      
      // Return combined count with safe defaults
      return (aiSimilarCount || 0) + (meTooCount || 0);
    } catch (error) {
      // Log error but return 0 instead of throwing
      console.error('Error getting similar worry count for post:', postId, error);
      return 0;
    }
  }
}