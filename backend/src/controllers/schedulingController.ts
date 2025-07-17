import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { SchedulingService } from '../services/schedulingService';

const schedulingService = SchedulingService.getInstance();

export const updateScheduledPostValidation = [
  body('shortContent')
    .optional()
    .isLength({ min: 1, max: 280 })
    .withMessage('Short content must be between 1 and 280 characters'),
  body('longContent')
    .optional()
    .isLength({ max: 10000 })
    .withMessage('Long content must be less than 10,000 characters'),
  body('worryPrompt')
    .optional()
    .isLength({ min: 1 })
    .withMessage('Worry prompt is required'),
  body('privacyLevel')
    .optional()
    .isIn(['public', 'friends', 'private'])
    .withMessage('Privacy level must be public, friends, or private'),
  body('scheduledFor')
    .optional()
    .isISO8601()
    .withMessage('scheduledFor must be a valid ISO date'),
];

export class SchedulingController {
  async getScheduledPosts(req: Request, res: Response) {
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

      const scheduledPosts = await schedulingService.getScheduledPosts(req.user.userId);

      res.json({
        data: {
          posts: scheduledPosts.map(post => ({
            id: post.id,
            userId: post.userId,
            shortContent: post.shortContent,
            longContent: post.longContent || undefined,
            worryPrompt: post.worryPrompt,
            privacyLevel: post.privacyLevel,
            isScheduled: post.isScheduled,
            scheduledFor: post.scheduledFor?.toISOString(),
            createdAt: post.createdAt.toISOString(),
            updatedAt: post.updatedAt.toISOString(),
            user: post.user
          })),
          total: scheduledPosts.length
        }
      });
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'SCHEDULED_POSTS_FETCH_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  async updateScheduledPost(req: Request, res: Response) {
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

      const { postId } = req.params;
      const updateData = req.body;

      // Convert scheduledFor to Date if provided
      if (updateData.scheduledFor) {
        const scheduledDate = new Date(updateData.scheduledFor);
        if (scheduledDate <= new Date()) {
          return res.status(400).json({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'scheduledFor must be in the future',
            },
            timestamp: new Date().toISOString(),
            path: req.path,
          });
        }
        updateData.scheduledFor = scheduledDate;
      }

      const updatedPost = await schedulingService.updateScheduledPost(
        postId,
        req.user.userId,
        updateData
      );

      res.json({
        message: 'Scheduled post updated successfully',
        data: updatedPost,
      });
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('permission')) {
        return res.status(404).json({
          error: {
            code: 'SCHEDULED_POST_NOT_FOUND',
            message: error.message,
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      res.status(500).json({
        error: {
          code: 'SCHEDULED_POST_UPDATE_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  async cancelScheduledPost(req: Request, res: Response) {
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

      const { postId } = req.params;

      await schedulingService.cancelScheduledPost(postId, req.user.userId);

      res.json({
        message: 'Scheduled post cancelled successfully',
      });
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('permission')) {
        return res.status(404).json({
          error: {
            code: 'SCHEDULED_POST_NOT_FOUND',
            message: error.message,
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      res.status(500).json({
        error: {
          code: 'SCHEDULED_POST_CANCEL_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  async getSchedulingStats(req: Request, res: Response) {
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

      const stats = await schedulingService.getSchedulingStats();

      res.json({
        data: stats,
      });
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'SCHEDULING_STATS_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }
}