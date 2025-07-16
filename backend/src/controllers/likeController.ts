import { Request, Response } from 'express';
import { query, validationResult } from 'express-validator';
import { LikeService } from '../services/likeService';

const likeService = new LikeService();

export const getLikesValidation = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer')
];

export class LikeController {
  async likePost(req: Request, res: Response) {
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
      const like = await likeService.likePost(req.user.userId, postId);

      res.status(201).json({
        message: 'Successfully liked post',
        data: like,
      });
    } catch (error: any) {
      if (error.message === 'Already liked this post') {
        return res.status(400).json({
          error: {
            code: 'ALREADY_LIKED',
            message: error.message,
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      if (error.message === 'Post not found') {
        return res.status(404).json({
          error: {
            code: 'POST_NOT_FOUND',
            message: error.message,
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      res.status(500).json({
        error: {
          code: 'LIKE_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  async unlikePost(req: Request, res: Response) {
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
      await likeService.unlikePost(req.user.userId, postId);

      res.json({
        message: 'Successfully unliked post',
      });
    } catch (error: any) {
      if (error.message === 'Not liked this post') {
        return res.status(400).json({
          error: {
            code: 'NOT_LIKED',
            message: error.message,
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      res.status(500).json({
        error: {
          code: 'UNLIKE_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  async getLikes(req: Request, res: Response) {
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

      const { postId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const likes = await likeService.getLikes(postId, limit, offset);

      res.json({
        data: likes,
      });
    } catch (error: any) {
      if (error.message === 'Post not found') {
        return res.status(404).json({
          error: {
            code: 'POST_NOT_FOUND',
            message: error.message,
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      res.status(500).json({
        error: {
          code: 'LIKES_FETCH_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  async isLiked(req: Request, res: Response) {
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
      const isLiked = await likeService.isLiked(req.user.userId, postId);

      res.json({
        data: {
          isLiked,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'LIKE_CHECK_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  async getLikeCount(req: Request, res: Response) {
    try {
      const { postId } = req.params;
      const count = await likeService.getLikeCount(postId);

      res.json({
        data: {
          count,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'LIKE_COUNT_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }
}