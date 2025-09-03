import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface LikeResponse {
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

export interface SupportResponse {
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

export class LikeService {
  async likePost(userId: string, postId: string): Promise<SupportResponse> {
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

      // Check if already liked
      const existingLike = await prisma.like.findFirst({
        where: {
          userId,
          postId
        }
      });

      if (existingLike) {
        throw new Error('Already liked this post');
      }

      // Create like
      const like = await prisma.like.create({
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
        id: like.id,
        userId: like.userId,
        postId: like.postId,
        createdAt: like.createdAt.toISOString(),
        user: {
          id: like.user.id,
          username: like.user.username,
          displayName: like.user.displayName || undefined,
          avatarUrl: like.user.avatarUrl || undefined
        }
      };
    } catch (error: any) {
      // Re-throw known errors, wrap unknown errors
      if (error.message === 'Post not found' || error.message === 'Already liked this post') {
        throw error;
      }
      
      console.error('Error creating like:', { userId, postId }, error);
      throw new Error('Failed to show support for post');
    }
  }

  async unlikePost(userId: string, postId: string): Promise<void> {
    const like = await prisma.like.findFirst({
      where: {
        userId,
        postId
      }
    });

    if (!like) {
      throw new Error('Not liked this post');
    }

    await prisma.like.delete({
      where: {
        id: like.id
      }
    });
  }

  async getLikes(postId: string, limit = 20, offset = 0): Promise<{ 
    supporters: SupportResponse[], 
    supportCount: number, 
    total: number, 
    hasMore: boolean,
    // Backward compatibility
    likes: LikeResponse[]
  }> {
    try {
      // Check if post exists - return empty results instead of throwing error
      const post = await prisma.post.findUnique({
        where: { id: postId }
      });

      if (!post) {
        // Return empty results instead of throwing error for better UX
        return {
          supporters: [],
          supportCount: 0,
          total: 0,
          hasMore: false,
          likes: []
        };
      }

      const [likes, total] = await Promise.all([
        prisma.like.findMany({
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
        prisma.like.count({
          where: {
            postId
          }
        }).catch(() => 0) // Handle database errors gracefully
      ]);

      // Safely handle null/undefined likes array
      const safeLikes = likes || [];
      const safeTotal = total || 0;

      const formattedLikes = safeLikes.map(like => ({
        id: like.id,
        userId: like.userId,
        postId: like.postId,
        createdAt: like.createdAt.toISOString(),
        user: {
          id: like.user.id,
          username: like.user.username,
          displayName: like.user.displayName || undefined,
          avatarUrl: like.user.avatarUrl || undefined
        }
      }));

      return {
        supporters: formattedLikes,
        supportCount: safeTotal,
        total: safeTotal,
        hasMore: offset + safeLikes.length < safeTotal,
        // Backward compatibility
        likes: formattedLikes
      };
    } catch (error) {
      // Log error but return empty results instead of throwing
      console.error('Error fetching likes for post:', postId, error);
      return {
        supporters: [],
        supportCount: 0,
        total: 0,
        hasMore: false,
        likes: []
      };
    }
  }

  async isLiked(userId: string, postId: string): Promise<boolean> {
    try {
      // Handle null/undefined parameters
      if (!userId || !postId) {
        return false;
      }

      const like = await prisma.like.findFirst({
        where: {
          userId,
          postId
        }
      });

      return !!like;
    } catch (error) {
      // Log error but return false instead of throwing
      console.error('Error checking like status:', { userId, postId }, error);
      return false;
    }
  }

  async getLikeCount(postId: string): Promise<number> {
    try {
      // Handle null/undefined postId
      if (!postId) {
        return 0;
      }

      const count = await prisma.like.count({
        where: {
          postId
        }
      });

      return count || 0; // Ensure we always return a number
    } catch (error) {
      // Log error but return 0 instead of throwing
      console.error('Error getting like count for post:', postId, error);
      return 0;
    }
  }

  // New methods with support terminology
  async showSupport(userId: string, postId: string): Promise<SupportResponse> {
    return this.likePost(userId, postId);
  }

  async removeSupport(userId: string, postId: string): Promise<void> {
    return this.unlikePost(userId, postId);
  }

  async isShowingSupport(userId: string, postId: string): Promise<boolean> {
    return this.isLiked(userId, postId);
  }

  async getSupportCount(postId: string): Promise<number> {
    return this.getLikeCount(postId);
  }

  async getSupport(postId: string, limit = 20, offset = 0): Promise<{ 
    supporters: SupportResponse[], 
    supportCount: number, 
    total: number, 
    hasMore: boolean,
    // Backward compatibility
    likes: LikeResponse[]
  }> {
    return this.getLikes(postId, limit, offset);
  }
}