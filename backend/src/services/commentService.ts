import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateCommentRequest {
  content: string;
}

export interface UpdateCommentRequest {
  content: string;
}

export interface CommentResponse {
  id: string;
  content: string;
  userId: string;
  postId: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
  };
}

export class CommentService {
  async createComment(userId: string, postId: string, data: CreateCommentRequest): Promise<CommentResponse> {
    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId }
    });

    if (!post) {
      throw new Error('Post not found');
    }

    // Create comment
    const comment = await prisma.comment.create({
      data: {
        content: data.content,
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
      id: comment.id,
      content: comment.content,
      userId: comment.userId,
      postId: comment.postId,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
      user: {
        id: comment.user.id,
        username: comment.user.username,
        displayName: comment.user.displayName || undefined,
        avatarUrl: comment.user.avatarUrl || undefined
      }
    };
  }

  async updateComment(commentId: string, userId: string, data: UpdateCommentRequest): Promise<CommentResponse> {
    // Check if comment exists and belongs to user
    const existingComment = await prisma.comment.findFirst({
      where: {
        id: commentId,
        userId
      }
    });

    if (!existingComment) {
      throw new Error('Comment not found or you do not have permission to edit it');
    }

    // Update comment
    const comment = await prisma.comment.update({
      where: {
        id: commentId
      },
      data: {
        content: data.content,
        updatedAt: new Date()
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
      id: comment.id,
      content: comment.content,
      userId: comment.userId,
      postId: comment.postId,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
      user: {
        id: comment.user.id,
        username: comment.user.username,
        displayName: comment.user.displayName || undefined,
        avatarUrl: comment.user.avatarUrl || undefined
      }
    };
  }

  async deleteComment(commentId: string, userId: string): Promise<void> {
    // Check if comment exists and belongs to user
    const comment = await prisma.comment.findFirst({
      where: {
        id: commentId,
        userId
      }
    });

    if (!comment) {
      throw new Error('Comment not found or you do not have permission to delete it');
    }

    await prisma.comment.delete({
      where: {
        id: commentId
      }
    });
  }

  async getComment(commentId: string): Promise<CommentResponse | null> {
    const comment = await prisma.comment.findUnique({
      where: {
        id: commentId
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

    if (!comment) {
      return null;
    }

    return {
      id: comment.id,
      content: comment.content,
      userId: comment.userId,
      postId: comment.postId,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
      user: {
        id: comment.user.id,
        username: comment.user.username,
        displayName: comment.user.displayName || undefined,
        avatarUrl: comment.user.avatarUrl || undefined
      }
    };
  }

  async getCommentsByPost(postId: string, limit = 20, offset = 0): Promise<{ comments: CommentResponse[], total: number, hasMore: boolean }> {
    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId }
    });

    if (!post) {
      throw new Error('Post not found');
    }

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
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
      prisma.comment.count({
        where: {
          postId
        }
      })
    ]);

    return {
      comments: comments.map(comment => ({
        id: comment.id,
        content: comment.content,
        userId: comment.userId,
        postId: comment.postId,
        createdAt: comment.createdAt.toISOString(),
        updatedAt: comment.updatedAt.toISOString(),
        user: {
          id: comment.user.id,
          username: comment.user.username,
          displayName: comment.user.displayName || undefined,
          avatarUrl: comment.user.avatarUrl || undefined
        }
      })),
      total,
      hasMore: offset + comments.length < total
    };
  }

  async getCommentCount(postId: string): Promise<number> {
    return prisma.comment.count({
      where: {
        postId
      }
    });
  }
}