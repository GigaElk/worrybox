import { PrismaClient } from '@prisma/client';
import { stringToArrayOrUndefined } from '../utils/arrayHelpers';
import { GoogleAIService } from './googleAIService';
import logger from './logger';

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
   * Mark content for reprocessing when AI is unavailable
   */
  private async markForReprocessing(content: string, reason: string): Promise<void> {
    try {
      await prisma.aIReprocessingQueue.create({
        data: {
          contentType: 'comment',
          content,
          reason,
          status: 'pending',
          retryCount: 0
        }
      });
      logger.info('📝 Content marked for AI reprocessing:', { reason, contentLength: content.length });
    } catch (error) {
      logger.error('❌ Failed to mark content for reprocessing:', error);
    }
  }

  /**
   * Reprocess pending items when AI becomes available again
   */
  async reprocessPendingItems(batchSize = 10): Promise<{ processed: number; failed: number }> {
    const googleAI = GoogleAIService.getInstance();
    
    if (!googleAI.isAvailable()) {
      logger.warn('🤖 Google AI still not available for reprocessing');
      return { processed: 0, failed: 0 };
    }

    logger.info('🔄 Starting AI reprocessing batch...');

    const pendingItems = await prisma.aIReprocessingQueue.findMany({
      where: {
        status: 'pending',
        contentType: 'comment'
      },
      orderBy: {
        createdAt: 'asc'
      },
      take: batchSize
    });

    if (pendingItems.length === 0) {
      logger.info('✅ No pending items to reprocess');
      return { processed: 0, failed: 0 };
    }

    let processed = 0;
    let failed = 0;

    for (const item of pendingItems) {
      try {
        // Find the comment that needs reprocessing
        const comment = await prisma.comment.findFirst({
          where: {
            content: item.content,
            moderationStatus: { in: ['pending', 'flagged'] }
          }
        });

        if (!comment) {
          // Comment might have been deleted or already processed
          await prisma.aIReprocessingQueue.update({
            where: { id: item.id },
            data: { status: 'completed', processedAt: new Date() }
          });
          processed++;
          continue;
        }

        // Reprocess with AI
        const aiResult = await googleAI.moderateContent(item.content);
        
        if (aiResult) {
          // Update comment with AI results
          let status: 'approved' | 'flagged' | 'rejected';
          
          if (!aiResult.isSafe) {
            status = aiResult.confidence > 0.8 ? 'rejected' : 'flagged';
          } else {
            status = 'approved';
          }

          await this.updateCommentModerationStatus(
            comment.id,
            status,
            aiResult.isSafe ? 0.1 : 0.8,
            aiResult.reason ? [aiResult.reason] : undefined
          );

          // Mark as completed
          await prisma.aIReprocessingQueue.update({
            where: { id: item.id },
            data: { 
              status: 'completed', 
              processedAt: new Date(),
              result: JSON.stringify(aiResult)
            }
          });

          processed++;
          logger.info('✅ Reprocessed comment:', { commentId: comment.id, status });
        } else {
          throw new Error('AI returned null result');
        }

      } catch (error: any) {
        logger.error('❌ Failed to reprocess item:', { itemId: item.id, error: error.message });
        
        // Increment retry count
        const newRetryCount = item.retryCount + 1;
        const maxRetries = 3;

        if (newRetryCount >= maxRetries) {
          // Mark as failed after max retries
          await prisma.aIReprocessingQueue.update({
            where: { id: item.id },
            data: { 
              status: 'failed', 
              retryCount: newRetryCount,
              lastError: error.message,
              processedAt: new Date()
            }
          });
        } else {
          // Increment retry count for next attempt
          await prisma.aIReprocessingQueue.update({
            where: { id: item.id },
            data: { 
              retryCount: newRetryCount,
              lastError: error.message
            }
          });
        }

        failed++;
      }

      // Small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    logger.info('🔄 Reprocessing batch completed:', { processed, failed, total: pendingItems.length });
    return { processed, failed };
  }
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
   * AI-powered moderation using Google AI (gracefully handles rate limits)
   */
  private async performAIModeration(content: string): Promise<ModerationResult | null> {
    const googleAI = GoogleAIService.getInstance();
    
    if (!googleAI.isAvailable()) {
      logger.info('🤖 Google AI not available - using rule-based moderation');
      return null; // Will fall back to rule-based moderation
    }

    try {
      logger.info('🤖 Moderating comment with Google AI:', content.substring(0, 50) + '...');
      
      const aiResult = await googleAI.moderateContent(content);
      
      if (!aiResult) {
        logger.warn('🤖 Google AI moderation returned null - using fallback');
        return null;
      }

      // Convert Google AI result to our ModerationResult format
      let status: 'approved' | 'flagged' | 'rejected';
      
      if (!aiResult.isSafe) {
        // If AI says it's unsafe, determine severity
        if (aiResult.confidence > 0.8) {
          status = 'rejected'; // High confidence it's unsafe
        } else {
          status = 'flagged'; // Lower confidence, flag for review
        }
      } else {
        status = 'approved';
      }

      const result: ModerationResult = {
        status,
        score: aiResult.isSafe ? 0.1 : 0.8,
        reasons: aiResult.reason ? [aiResult.reason] : undefined,
        confidence: aiResult.confidence
      };

      logger.info('✅ Google AI moderation completed:', {
        status: result.status,
        score: result.score,
        confidence: result.confidence
      });

      return result;
    } catch (error) {
      logger.error('❌ Google AI moderation failed:', error);
      
      // Check if it's a rate limit error
      if ((error as any).message?.includes('quota') || (error as any).message?.includes('rate limit')) {
        logger.warn('🚫 Google AI rate limit reached - marking for reprocessing');
        await this.markForReprocessing(content, 'rate_limit');
      }
      
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
        flaggedReasons: stringToArrayOrUndefined(item.flaggedReasons),
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

  /**
   * Get reprocessing queue statistics
   */
  async getReprocessingQueueStats(): Promise<{
    totalPending: number;
    totalProcessing: number;
    totalCompleted: number;
    totalFailed: number;
    oldestPending?: string;
    recentlyCompleted: number;
  }> {
    try {
      const [
        totalPending,
        totalProcessing,
        totalCompleted,
        totalFailed,
        oldestPendingItem,
        recentlyCompleted
      ] = await Promise.all([
        prisma.aIReprocessingQueue.count({ where: { status: 'pending' } }),
        prisma.aIReprocessingQueue.count({ where: { status: 'processing' } }),
        prisma.aIReprocessingQueue.count({ where: { status: 'completed' } }),
        prisma.aIReprocessingQueue.count({ where: { status: 'failed' } }),
        prisma.aIReprocessingQueue.findFirst({
          where: { status: 'pending' },
          orderBy: { createdAt: 'asc' },
          select: { createdAt: true }
        }),
        prisma.aIReprocessingQueue.count({
          where: {
            status: 'completed',
            processedAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
          }
        })
      ]);

      return {
        totalPending,
        totalProcessing,
        totalCompleted,
        totalFailed,
        oldestPending: oldestPendingItem?.createdAt.toISOString(),
        recentlyCompleted
      };
    } catch (error) {
      logger.error('❌ Failed to get reprocessing queue stats:', error);
      return {
        totalPending: 0,
        totalProcessing: 0,
        totalCompleted: 0,
        totalFailed: 0,
        recentlyCompleted: 0
      };
    }
  }
}