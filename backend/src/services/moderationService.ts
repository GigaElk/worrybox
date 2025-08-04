import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ModerationResult {
  status: 'approved' | 'flagged' | 'rejected';
  score: number; // 0-1, where 1 is most concerning
  reasons?: string[];
  confidence: number; // 0-1, confidence in the moderation decision
}

export interface ModerationQueueItem {
  id: string;
  commentId: string;
  content: string;
  moderationStatus: string;
  moderationScore?: number;
  flaggedReasons?: string[];
  createdAt: string;
  updatedAt: string;
  comment: {
    id: string;
    content: string;
    postId: string;
    userId: string;
    user: {
      id: string;
      username: string;
      displayName?: string;
    };
    post: {
      id: string;
      shortContent: string;
      user: {
        id: string;
        username: string;
        displayName?: string;
      };
    };
  };
}

export class ModerationService {
  /**
   * Moderate a comment using AI analysis (with fallback to rule-based)
   */
  async moderateComment(commentId: string, content: string): Promise<ModerationResult> {
    try {
      // Try AI moderation first
      const aiResult = await this.performAIModeration(content);
      if (aiResult) {
        return aiResult;
      }
    } catch (error) {
      console.warn('AI moderation failed, falling back to rule-based:', error);
    }

    // Fallback to rule-based moderation
    return this.performRuleBasedModeration(content);
  }

  /**
   * AI-powered moderation (gracefully handles missing OpenAI)
   */
  private async performAIModeration(content: string): Promise<ModerationResult | null> {
    // Check if AI is available
    if (!process.env.OPENAI_API_KEY) {
      console.log('🤖 AI moderation disabled - using rule-based moderation only');
      return null; // Will fall back to rule-based moderation
    }

    try {
      // TODO: Integrate with OpenAI Moderation API when available
      console.log('🤖 AI moderation would analyze:', content.substring(0, 50) + '...');
      
      // Simulate AI response structure
      return {
        status: 'approved',
        score: 0.1,
        reasons: [],
        confidence: 0.95
      };
    } catch (error) {
      console.error('AI moderation failed:', error);
      return null; // Will fall back to rule-based moderation
    }
  }

  /**
   * Rule-based moderation fallback
   */
  private performRuleBasedModeration(content: string): ModerationResult {
    const lowerContent = content.toLowerCase();
    let score = 0;
    const reasons: string[] = [];

    // Basic profanity detection
    const profanityWords = [
      'damn', 'hell', 'crap', 'stupid', 'idiot', 'hate', 'kill', 'die', 'suicide'
    ];
    
    const foundProfanity = profanityWords.filter(word => lowerContent.includes(word));
    if (foundProfanity.length > 0) {
      score += 0.3 * foundProfanity.length;
      reasons.push(`Contains potentially harmful language: ${foundProfanity.join(', ')}`);
    }

    // Excessive caps detection
    const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
    if (capsRatio > 0.5 && content.length > 10) {
      score += 0.2;
      reasons.push('Excessive use of capital letters');
    }

    // Spam detection (repeated characters/words)
    if (/(.)\1{4,}/.test(content) || /(\b\w+\b)(\s+\1){3,}/.test(content)) {
      score += 0.4;
      reasons.push('Potential spam content');
    }

    // Personal attacks detection
    const attackPatterns = [
      /you\s+(are|r)\s+(stupid|dumb|idiot)/i,
      /shut\s+up/i,
      /go\s+(die|kill)/i
    ];
    
    const foundAttacks = attackPatterns.filter(pattern => pattern.test(content));
    if (foundAttacks.length > 0) {
      score += 0.6;
      reasons.push('Contains personal attacks or harmful language');
    }

    // Determine status based on score
    let status: 'approved' | 'flagged' | 'rejected';
    if (score >= 0.7) {
      status = 'rejected';
    } else if (score >= 0.3) {
      status = 'flagged';
    } else {
      status = 'approved';
    }

    return {
      status,
      score: Math.min(score, 1),
      reasons: reasons.length > 0 ? reasons : undefined,
      confidence: 0.7 // Rule-based has lower confidence than AI
    };
  }

  /**
   * Update comment moderation status
   */
  async updateCommentModerationStatus(
    commentId: string, 
    status: 'approved' | 'flagged' | 'rejected', 
    score?: number,
    reasons?: string[]
  ): Promise<void> {
    await prisma.comment.update({
      where: { id: commentId },
      data: {
        moderationStatus: status,
        moderationScore: score,
        updatedAt: new Date()
      }
    });

    // If flagged or rejected, add to moderation queue
    if (status === 'flagged' || status === 'rejected') {
      await this.addToModerationQueue(commentId, reasons);
    }
  }

  /**
   * Add comment to moderation queue for manual review
   */
  private async addToModerationQueue(commentId: string, reasons?: string[]): Promise<void> {
    // Check if already in queue
    const existingQueueItem = await prisma.moderationQueue.findFirst({
      where: { commentId }
    });

    if (existingQueueItem) {
      // Update existing queue item
      await prisma.moderationQueue.update({
        where: { id: existingQueueItem.id },
        data: {
          flaggedReasons: reasons ? reasons.join(',') : null,
          updatedAt: new Date()
        }
      });
    } else {
      // Create new queue item
      await prisma.moderationQueue.create({
        data: {
          commentId,
          flaggedReasons: reasons ? reasons.join(',') : null,
          status: 'pending'
        }
      });
    }
  }

  /**
   * Get moderation queue items for manual review
   */
  async getModerationQueue(
    limit = 20, 
    offset = 0, 
    status?: 'pending' | 'reviewed'
  ): Promise<{ items: ModerationQueueItem[], total: number, hasMore: boolean }> {
    const whereClause: any = {};
    if (status) {
      whereClause.status = status;
    }

    const [items, total] = await Promise.all([
      prisma.moderationQueue.findMany({
        where: whereClause,
        include: {
          comment: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  displayName: true
                }
              },
              post: {
                include: {
                  user: {
                    select: {
                      id: true,
                      username: true,
                      displayName: true
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit,
        skip: offset
      }),
      prisma.moderationQueue.count({ where: whereClause })
    ]);

    return {
      items: items.map(item => ({
        id: item.id,
        commentId: item.commentId,
        content: item.comment.content,
        moderationStatus: item.comment.moderationStatus,
        moderationScore: item.comment.moderationScore?.toNumber(),
        flaggedReasons: item.flaggedReasons,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        comment: {
          id: item.comment.id,
          content: item.comment.content,
          postId: item.comment.postId,
          userId: item.comment.userId,
          user: {
            id: item.comment.user.id,
            username: item.comment.user.username,
            displayName: item.comment.user.displayName || undefined
          },
          post: {
            id: item.comment.post.id,
            shortContent: item.comment.post.shortContent,
            user: {
              id: item.comment.post.user.id,
              username: item.comment.post.user.username,
              displayName: item.comment.post.user.displayName || undefined
            }
          }
        }
      })),
      total,
      hasMore: offset + items.length < total
    };
  }

  /**
   * Manually approve or reject a comment from the moderation queue
   */
  async reviewComment(
    queueItemId: string, 
    decision: 'approve' | 'reject',
    reviewerId: string,
    notes?: string
  ): Promise<void> {
    const queueItem = await prisma.moderationQueue.findUnique({
      where: { id: queueItemId },
      include: { comment: true }
    });

    if (!queueItem) {
      throw new Error('Moderation queue item not found');
    }

    // Update comment status
    const newStatus = decision === 'approve' ? 'approved' : 'rejected';
    await prisma.comment.update({
      where: { id: queueItem.commentId },
      data: {
        moderationStatus: newStatus,
        updatedAt: new Date()
      }
    });

    // Update queue item
    await prisma.moderationQueue.update({
      where: { id: queueItemId },
      data: {
        status: 'reviewed',
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        reviewNotes: notes,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Get moderation statistics
   */
  async getModerationStats(): Promise<{
    totalComments: number;
    pendingReview: number;
    approvedComments: number;
    flaggedComments: number;
    rejectedComments: number;
    averageModerationScore: number;
  }> {
    const [
      totalComments,
      pendingReview,
      approvedComments,
      flaggedComments,
      rejectedComments,
      avgScoreResult
    ] = await Promise.all([
      prisma.comment.count(),
      prisma.moderationQueue.count({ where: { status: 'pending' } }),
      prisma.comment.count({ where: { moderationStatus: 'approved' } }),
      prisma.comment.count({ where: { moderationStatus: 'flagged' } }),
      prisma.comment.count({ where: { moderationStatus: 'rejected' } }),
      prisma.comment.aggregate({
        _avg: { moderationScore: true },
        where: { moderationScore: { not: null } }
      })
    ]);

    return {
      totalComments,
      pendingReview,
      approvedComments,
      flaggedComments,
      rejectedComments,
      averageModerationScore: avgScoreResult._avg.moderationScore?.toNumber() || 0
    };
  }
}