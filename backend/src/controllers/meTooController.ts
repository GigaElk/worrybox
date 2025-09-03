import { Request, Response } from 'express';
import { query, validationResult } from 'express-validator';
import { MeTooService } from '../services/meTooService';

const meTooService = new MeTooService();

export const getMeToosValidation = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer')
];

export class MeTooController {
  async addMeToo(req: Request, res: Response) {
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
      const meToo = await meTooService.addMeToo(req.user.userId, postId);

      res.status(201).json({
        message: 'Successfully added MeToo response',
        data: meToo,
      });
    } catch (error: any) {
      if (error.message === 'Already indicated MeToo for this post') {
        return res.status(400).json({
          error: {
            code: 'ALREADY_METOO',
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
          code: 'METOO_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  async removeMeToo(req: Request, res: Response) {
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
      await meTooService.removeMeToo(req.user.userId, postId);

      res.json({
        message: 'Successfully removed MeToo response',
      });
    } catch (error: any) {
      if (error.message === 'MeToo not found for this post') {
        return res.status(400).json({
          error: {
            code: 'NOT_METOO',
            message: error.message,
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      res.status(500).json({
        error: {
          code: 'METOO_REMOVE_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  async getMeToos(req: Request, res: Response) {
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

      const meToos = await meTooService.getMeToos(postId, limit, offset);

      res.json({
        data: meToos,
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
          code: 'METOOS_FETCH_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  async hasMeToo(req: Request, res: Response) {
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
      const hasMeToo = await meTooService.hasMeToo(req.user.userId, postId);

      res.json({
        data: {
          hasMeToo,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'METOO_CHECK_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  async getMeTooCount(req: Request, res: Response) {
    try {
      const { postId } = req.params;
      const count = await meTooService.getMeTooCount(postId);

      res.json({
        data: {
          count,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'METOO_COUNT_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  async getSimilarWorryCount(req: Request, res: Response) {
    try {
      const { postId } = req.params;
      const count = await meTooService.getSimilarWorryCount(postId);

      res.json({
        data: {
          similarWorryCount: count,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'SIMILAR_WORRY_COUNT_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }
}