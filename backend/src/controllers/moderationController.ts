import { Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { ModerationService } from '../services/moderationService';

const moderationService = new ModerationService();

export const reviewCommentValidation = [
  body('decision')
    .isIn(['approve', 'reject'])
    .withMessage('Decision must be either approve or reject'),
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notes must be less than 1000 characters')
];

export const getModerationQueueValidation = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer'),
  query('status')
    .optional()
    .isIn(['pending', 'reviewed'])
    .withMessage('Status must be pending or reviewed')
];

export class ModerationController {
  async getModerationQueue(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: errors.array(),
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      if (!req.user) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      // TODO: Add admin role check when user roles are implemented
      // For now, any authenticated user can access moderation queue

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const status = req.query.status as 'pending' | 'reviewed' | undefined;

      const queueData = await moderationService.getModerationQueue(limit, offset, status);

      res.json({
        data: queueData,
      });
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'MODERATION_QUEUE_FETCH_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  async reviewComment(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array(),
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      if (!req.user) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      const { queueItemId } = req.params;
      const { decision, notes } = req.body;

      await moderationService.reviewComment(
        queueItemId,
        decision,
        req.user.userId,
        notes
      );

      res.json({
        message: `Comment ${decision}d successfully`,
      });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: {
            code: 'QUEUE_ITEM_NOT_FOUND',
            message: error.message,
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      res.status(500).json({
        error: {
          code: 'COMMENT_REVIEW_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  async getModerationStats(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      const stats = await moderationService.getModerationStats();

      res.json({
        data: stats,
      });
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'MODERATION_STATS_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  async moderateComment(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      const { commentId } = req.params;
      const { content } = req.body;

      if (!content) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Comment content is required',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      const moderationResult = await moderationService.moderateComment(commentId, content);

      // Update comment moderation status
      await moderationService.updateCommentModerationStatus(
        commentId,
        moderationResult.status,
        moderationResult.score,
        moderationResult.reasons
      );

      res.json({
        message: 'Comment moderated successfully',
        data: {
          status: moderationResult.status,
          score: moderationResult.score,
          reasons: moderationResult.reasons,
          confidence: moderationResult.confidence
        },
      });
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'COMMENT_MODERATION_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }
}