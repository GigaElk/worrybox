import { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { WorryResolutionService } from '../services/worryResolutionService';

const worryResolutionService = WorryResolutionService.getInstance();

export class WorryResolutionController {
  /**
   * Mark a worry as resolved
   */
  async resolveWorry(req: Request, res: Response) {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
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
      const { resolutionStory, copingMethods, helpfulnessRating } = req.body;

      const resolution = await worryResolutionService.resolveWorry(
        req.user.userId,
        postId,
        {
          resolutionStory,
          copingMethods,
          helpfulnessRating
        }
      );

      res.status(201).json({
        data: resolution,
        message: 'Worry marked as resolved successfully'
      });
    } catch (error: any) {
      console.error('Failed to resolve worry:', error);
      
      if (error.message === 'Post not found or not owned by user') {
        return res.status(404).json({
          error: {
            code: 'POST_NOT_FOUND',
            message: error.message,
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      if (error.message === 'This worry has already been resolved') {
        return res.status(409).json({
          error: {
            code: 'ALREADY_RESOLVED',
            message: error.message,
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      res.status(500).json({
        error: {
          code: 'RESOLUTION_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  /**
   * Update an existing resolution
   */
  async updateResolution(req: Request, res: Response) {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
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
      const { resolutionStory, copingMethods, helpfulnessRating } = req.body;

      const resolution = await worryResolutionService.updateResolution(
        req.user.userId,
        postId,
        {
          resolutionStory,
          copingMethods,
          helpfulnessRating
        }
      );

      res.json({
        data: resolution,
        message: 'Resolution updated successfully'
      });
    } catch (error: any) {
      console.error('Failed to update resolution:', error);
      
      if (error.message === 'Resolution not found or not owned by user') {
        return res.status(404).json({
          error: {
            code: 'RESOLUTION_NOT_FOUND',
            message: error.message,
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      res.status(500).json({
        error: {
          code: 'UPDATE_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  /**
   * Remove resolution (mark as unresolved)
   */
  async unresolveWorry(req: Request, res: Response) {
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

      await worryResolutionService.unresolveWorry(req.user.userId, postId);

      res.json({
        message: 'Worry marked as unresolved successfully'
      });
    } catch (error: any) {
      console.error('Failed to unresolve worry:', error);
      
      if (error.message === 'Resolution not found or not owned by user') {
        return res.status(404).json({
          error: {
            code: 'RESOLUTION_NOT_FOUND',
            message: error.message,
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      res.status(500).json({
        error: {
          code: 'UNRESOLVE_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  /**
   * Get resolution for a specific post
   */
  async getResolution(req: Request, res: Response) {
    try {
      const { postId } = req.params;
      const requestingUserId = req.user?.userId;

      const resolution = await worryResolutionService.getResolutionByPostId(postId, requestingUserId);

      if (!resolution) {
        return res.status(404).json({
          error: {
            code: 'RESOLUTION_NOT_FOUND',
            message: 'Resolution not found or not accessible',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      res.json({
        data: resolution
      });
    } catch (error: any) {
      console.error('Failed to get resolution:', error);
      res.status(500).json({
        error: {
          code: 'GET_RESOLUTION_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  /**
   * Get all resolved worries for a user
   */
  async getUserResolvedWorries(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const requestingUserId = req.user?.userId;

      const resolutions = await worryResolutionService.getUserResolvedWorries(userId, requestingUserId);

      res.json({
        data: resolutions
      });
    } catch (error: any) {
      console.error('Failed to get user resolved worries:', error);
      res.status(500).json({
        error: {
          code: 'GET_RESOLVED_WORRIES_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  /**
   * Get resolution statistics for the authenticated user
   */
  async getResolutionStats(req: Request, res: Response) {
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

      const stats = await worryResolutionService.getUserResolutionStats(req.user.userId);

      res.json({
        data: stats
      });
    } catch (error: any) {
      console.error('Failed to get resolution stats:', error);
      res.status(500).json({
        error: {
          code: 'GET_STATS_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  /**
   * Get public resolution stories for inspiration
   */
  async getPublicResolutionStories(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const category = req.query.category as string;

      const stories = await worryResolutionService.getPublicResolutionStories(limit, category);

      res.json({
        data: stories
      });
    } catch (error: any) {
      console.error('Failed to get public resolution stories:', error);
      res.status(500).json({
        error: {
          code: 'GET_STORIES_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  /**
   * Get resolution suggestions based on similar worries
   */
  async getResolutionSuggestions(req: Request, res: Response) {
    try {
      const { postId } = req.params;
      const limit = parseInt(req.query.limit as string) || 5;

      const suggestions = await worryResolutionService.getResolutionSuggestions(postId, limit);

      res.json({
        data: suggestions
      });
    } catch (error: any) {
      console.error('Failed to get resolution suggestions:', error);
      res.status(500).json({
        error: {
          code: 'GET_SUGGESTIONS_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }
}

// Validation middleware
export const resolveWorryValidation = [
  param('postId').isUUID().withMessage('Invalid post ID'),
  body('resolutionStory').optional().isString().isLength({ max: 2000 }).withMessage('Resolution story must be a string with max 2000 characters'),
  body('copingMethods').isArray({ min: 1 }).withMessage('At least one coping method is required'),
  body('copingMethods.*').isString().isLength({ min: 1, max: 200 }).withMessage('Each coping method must be a non-empty string with max 200 characters'),
  body('helpfulnessRating').optional().isInt({ min: 1, max: 5 }).withMessage('Helpfulness rating must be between 1 and 5')
];

export const updateResolutionValidation = [
  param('postId').isUUID().withMessage('Invalid post ID'),
  body('resolutionStory').optional().isString().isLength({ max: 2000 }).withMessage('Resolution story must be a string with max 2000 characters'),
  body('copingMethods').optional().isArray({ min: 1 }).withMessage('At least one coping method is required if provided'),
  body('copingMethods.*').optional().isString().isLength({ min: 1, max: 200 }).withMessage('Each coping method must be a non-empty string with max 200 characters'),
  body('helpfulnessRating').optional().isInt({ min: 1, max: 5 }).withMessage('Helpfulness rating must be between 1 and 5')
];

export const getResolutionValidation = [
  param('postId').isUUID().withMessage('Invalid post ID')
];

export const getUserResolvedWorriesValidation = [
  param('userId').isUUID().withMessage('Invalid user ID')
];

export const getResolutionSuggestionsValidation = [
  param('postId').isUUID().withMessage('Invalid post ID'),
  query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('Limit must be between 1 and 20')
];

export const getPublicResolutionStoriesValidation = [
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('category').optional().isString().isLength({ min: 1, max: 100 }).withMessage('Category must be a non-empty string with max 100 characters')
];