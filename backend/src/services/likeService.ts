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

export class LikeService {
  async likePost(userId: string, postId: string): Promise<LikeResponse> {
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

  async getLikes(postId: string, limit = 20, offset = 0): Promise<{ likes: LikeResponse[], total: number, hasMore: boolean }> {
    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId }
    });

    if (!post) {
      throw new Error('Post not found');
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
      }),
      prisma.like.count({
        where: {
          postId
        }
      })
    ]);

    return {
      likes: likes.map(like => ({
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
      })),
      total,
      hasMore: offset + likes.length < total
    };
  }

  async isLiked(userId: string, postId: string): Promise<boolean> {
    const like = await prisma.like.findFirst({
      where: {
        userId,
        postId
      }
    });

    return !!like;
  }

  async getLikeCount(postId: string): Promise<number> {
    return prisma.like.count({
      where: {
        postId
      }
    });
  }
}