import { PrismaClient } from '@prisma/client';
import { ModerationService } from './moderationService';

const prisma = new PrismaClient();
const moderationService = new ModerationService();

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
  moderationStatus: string;
  moderationScore?: number;
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

    // Create comment with pending moderation status
    const comment = await prisma.comment.create({
      data: {
        content: data.content,
        userId,
        postId,
        moderationStatus: 'pending' // All new comments start as pending
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

    // Trigger AI moderation in the background (don't await to avoid blocking)
    moderationService.moderateComment(comment.id, comment.content)
      .then(result => {
        // Update comment with moderation results
        moderationService.updateCommentModerationStatus(
          comment.id,
          result.status,
          result.score,
          result.reasons
        );
      })
      .catch(error => {
        console.error(`Failed to moderate comment ${comment.id}:`, error);
      });

    return this.formatCommentResponse(comment);
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

    // Update comment and reset moderation status to pending
    const comment = await prisma.comment.update({
      where: {
        id: commentId
      },
      data: {
        content: data.content,
        moderationStatus: 'pending', // Reset to pending after edit
        moderationScore: null,
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

    // Trigger AI moderation for updated comment
    moderationService.moderateComment(comment.id, comment.content)
      .then(result => {
        // Update comment with moderation results
        moderationService.updateCommentModerationStatus(
          comment.id,
          result.status,
          result.score,
          result.reasons
        );
      })
      .catch(error => {
        console.error(`Failed to moderate updated comment ${comment.id}:`, error);
      });

    return this.formatCommentResponse(comment);
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

    return this.formatCommentResponse(comment);
  }

  async getCommentsByPost(
    postId: string, 
    limit = 20, 
    offset = 0,
    includeModerated = false // Option to include pending/flagged comments for moderators
  ): Promise<{ comments: CommentResponse[], total: number, hasMore: boolean }> {
    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId }
    });

    if (!post) {
      throw new Error('Post not found');
    }

    // Filter out rejected comments by default, optionally include pending/flagged
    const whereClause: any = {
      postId,
      moderationStatus: includeModerated 
        ? { not: 'rejected' } // Show all except rejected
        : 'approved' // Only show approved
    };

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: whereClause,
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
        where: whereClause
      })
    ]);

    return {
      comments: comments.map(comment => this.formatCommentResponse(comment)),
      total,
      hasMore: offset + comments.length < total
    };
  }

  async getCommentCount(postId: string, includeModerated = false): Promise<number> {
    const whereClause: any = {
      postId,
      moderationStatus: includeModerated 
        ? { not: 'rejected' } 
        : 'approved'
    };

    return prisma.comment.count({
      where: whereClause
    });
  }

  /**
   * Helper method to format comment response consistently
   */
  private formatCommentResponse(comment: any): CommentResponse {
    return {
      id: comment.id,
      content: comment.content,
      userId: comment.userId,
      postId: comment.postId,
      moderationStatus: comment.moderationStatus,
      moderationScore: comment.moderationScore ? parseFloat(comment.moderationScore.toString()) : undefined,
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
}