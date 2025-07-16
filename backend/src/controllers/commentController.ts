import { Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { CommentService, CreateCommentRequest, UpdateCommentRequest } from '../services/commentService';

const commentService = new CommentService();

export const createCommentValidation = [
  body('content')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment must be between 1 and 1000 characters')
];

export const updateCommentValidation = [
  body('content')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment must be between 1 and 1000 characters')
];

export const getCommentsValidation = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer')
];

export class CommentController {
  async createComment(req: Request, res: Response) {
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

      const { postId } = req.params;
      const commentData: CreateCommentRequest = req.body;

      const comment = await commentService.createComment(req.user.userId, postId, commentData);

      res.status(201).json({
        message: 'Comment created successfully',
        data: comment,
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
          code: 'COMMENT_CREATION_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  async updateComment(req: Request, res: Response) {
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

      const { commentId } = req.params;
      const commentData: UpdateCommentRequest = req.body;

      const comment = await commentService.updateComment(commentId, req.user.userId, commentData);

      res.json({
        message: 'Comment updated successfully',
        data: comment,
      });
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('permission')) {
        return res.status(404).json({
          error: {
            code: 'COMMENT_NOT_FOUND',
            message: error.message,
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      res.status(500).json({
        error: {
          code: 'COMMENT_UPDATE_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  async deleteComment(req: Request, res: Response) {
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

      await commentService.deleteComment(commentId, req.user.userId);

      res.json({
        message: 'Comment deleted successfully',
      });
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('permission')) {
        return res.status(404).json({
          error: {
            code: 'COMMENT_NOT_FOUND',
            message: error.message,
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      res.status(500).json({
        error: {
          code: 'COMMENT_DELETION_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  async getComment(req: Request, res: Response) {
    try {
      const { commentId } = req.params;

      const comment = await commentService.getComment(commentId);

      if (!comment) {
        return res.status(404).json({
          error: {
            code: 'COMMENT_NOT_FOUND',
            message: 'Comment not found',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      res.json({
        data: comment,
      });
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'COMMENT_FETCH_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  async getCommentsByPost(req: Request, res: Response) {
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

      const { postId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const comments = await commentService.getCommentsByPost(postId, limit, offset);

      res.json({
        data: comments,
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
          code: 'COMMENTS_FETCH_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  async getCommentCount(req: Request, res: Response) {
    try {
      const { postId } = req.params;
      const count = await commentService.getCommentCount(postId);

      res.json({
        data: {
          count,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'COMMENT_COUNT_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }
}