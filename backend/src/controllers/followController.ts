import { Request, Response } from 'express';
import { query, validationResult } from 'express-validator';
import { FollowService } from '../services/followService';

const followService = new FollowService();

export const getFollowersValidation = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer')
];

export const getFollowingValidation = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer')
];

export class FollowController {
  async followUser(req: Request, res: Response) {
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

      const { userId } = req.params;
      
      // Prevent self-following
      if (userId === req.user.userId) {
        return res.status(400).json({
          error: {
            code: 'INVALID_OPERATION',
            message: 'You cannot follow yourself',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      const follow = await followService.followUser(req.user.userId, userId);

      res.status(201).json({
        message: 'Successfully followed user',
        data: follow,
      });
    } catch (error: any) {
      if (error.message === 'Already following this user') {
        return res.status(400).json({
          error: {
            code: 'ALREADY_FOLLOWING',
            message: error.message,
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      if (error.message === 'User to follow not found') {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: error.message,
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      res.status(500).json({
        error: {
          code: 'FOLLOW_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  async unfollowUser(req: Request, res: Response) {
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

      const { userId } = req.params;
      
      await followService.unfollowUser(req.user.userId, userId);

      res.json({
        message: 'Successfully unfollowed user',
      });
    } catch (error: any) {
      if (error.message === 'Not following this user') {
        return res.status(400).json({
          error: {
            code: 'NOT_FOLLOWING',
            message: error.message,
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      res.status(500).json({
        error: {
          code: 'UNFOLLOW_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  async getFollowers(req: Request, res: Response) {
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

      const { userId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const followers = await followService.getFollowers(userId, limit, offset);

      res.json({
        data: followers,
      });
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'FOLLOWERS_FETCH_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  async getFollowing(req: Request, res: Response) {
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

      const { userId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const following = await followService.getFollowing(userId, limit, offset);

      res.json({
        data: following,
      });
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'FOLLOWING_FETCH_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  async isFollowing(req: Request, res: Response) {
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

      const { userId } = req.params;
      const isFollowing = await followService.isFollowing(req.user.userId, userId);

      res.json({
        data: {
          isFollowing,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'FOLLOW_CHECK_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  async getFollowStats(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const stats = await followService.getFollowStats(userId);

      res.json({
        data: stats,
      });
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'FOLLOW_STATS_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }
}