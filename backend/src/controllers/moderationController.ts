import { Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { ModerationService } from '../services/moderationService';
import { AIReprocessingService } from '../services/aiReprocessingService';

const moderationService = new ModerationService();
const aiReprocessingService = AIReprocessingService.getInstance();

export const reviewCommentValidation = [
  body('decision')
    .isIn(['approve', 'reject'])
    .withMessage('Decision must be either approve or reject'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes must be less than 500 characters')
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
    .withMessage('Status must be either pending or reviewed')
];

export class ModerationController {
  async getModerationQueue(req: Request, res: Response) {
    try {
      // Check validation results
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
      // For now, any authenticated user can view moderation queue (for demo purposes)

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const status = req.query.status as 'pending' | 'reviewed' | undefined;

      const queue = await moderationService.getModerationQueue(limit, offset, status);

      res.json({
        data: queue,
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
      // Check validation results
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

      // TODO: Add admin role check when user roles are implemented

      const { queueItemId } = req.params;
      const { decision, notes } = req.body;

      await moderationService.reviewComment(queueItemId, decision, req.user.userId, notes);

      res.json({
        message: `Comment ${decision}d successfully`,
      });
    } catch (error: any) {
      if (error.message === 'Moderation queue item not found') {
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

      // TODO: Add admin role check when user roles are implemented

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

  async reprocessPendingItems(req: Request, res: Response) {
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

      // TODO: Add admin role check when user roles are implemented

      const result = await aiReprocessingService.runReprocessingBatch();

      res.json({
        message: 'AI reprocessing batch completed',
        data: result,
      });
    } catch (error: any) {
      if (error.message === 'Reprocessing is already running') {
        return res.status(409).json({
          error: {
            code: 'REPROCESSING_IN_PROGRESS',
            message: error.message,
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      res.status(500).json({
        error: {
          code: 'REPROCESSING_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  async getReprocessingQueueStatus(req: Request, res: Response) {
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

      // TODO: Add admin role check when user roles are implemented

      // Get comprehensive reprocessing status
      const status = await aiReprocessingService.getReprocessingStatus();

      res.json({
        data: status,
      });
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'REPROCESSING_STATUS_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  async cleanupOldReprocessingItems(req: Request, res: Response) {
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

      // TODO: Add admin role check when user roles are implemented

      const daysOld = req.query.daysOld ? parseInt(req.query.daysOld as string) : 7;

      if (daysOld < 1 || daysOld > 365) {
        return res.status(400).json({
          error: {
            code: 'INVALID_DAYS_OLD',
            message: 'Days old must be between 1 and 365',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      const result = await aiReprocessingService.cleanupOldItems(daysOld);

      res.json({
        message: 'Old reprocessing items cleaned up successfully',
        data: result,
      });
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'CLEANUP_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }
}