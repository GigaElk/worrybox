import { Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { UserService } from '../services/userService';
import { LikeService } from '../services/likeService';
import { UpdateProfileRequest, UserSearchQuery } from '../types/user';

const userService = new UserService();
const likeService = new LikeService();

// Validation rules
export const updateProfileValidation = [
  body('displayName')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Display name must be between 1 and 100 characters'),
  body('bio')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Bio must be less than 500 characters'),
  body('avatarUrl')
    .optional()
    .isURL()
    .withMessage('Avatar URL must be a valid URL'),
  // Location validation
  body('country')
    .optional()
    .isLength({ min: 2, max: 2 })
    .isAlpha()
    .withMessage('Country must be a valid 2-letter ISO country code'),
  body('region')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Region must be between 1 and 100 characters'),
  body('city')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('City must be between 1 and 100 characters'),
  body('locationSharing')
    .optional()
    .isBoolean()
    .withMessage('Location sharing must be a boolean value'),
];

export const searchUsersValidation = [
  query('query')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer'),
];

export class UserController {
  async updateProfile(req: Request, res: Response) {
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

      const updateData: UpdateProfileRequest = req.body;
      const updatedProfile = await userService.updateProfile(req.user.userId, updateData);

      res.json({
        message: 'Profile updated successfully',
        data: updatedProfile,
      });
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'PROFILE_UPDATE_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  async getProfile(req: Request, res: Response) {
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

      const profile = await userService.getUserProfile(req.user.userId);

      if (!profile) {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User profile not found',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      res.json({
        data: profile,
      });
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'PROFILE_FETCH_FAILED',
          message: 'Failed to fetch user profile',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  async getUserByUsername(req: Request, res: Response) {
    try {
      const { username } = req.params;

      if (!username) {
        return res.status(400).json({
          error: {
            code: 'MISSING_USERNAME',
            message: 'Username is required',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      const profile = await userService.getUserProfileByUsername(username);

      if (!profile) {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      // Don't expose email to other users
      const publicProfile = {
        ...profile,
        email: undefined,
      };

      res.json({
        data: publicProfile,
      });
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'PROFILE_FETCH_FAILED',
          message: 'Failed to fetch user profile',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  async searchUsers(req: Request, res: Response) {
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

      const searchQuery: UserSearchQuery = {
        query: req.query.query as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      };

      const results = await userService.searchUsers(searchQuery);

      res.json({
        data: results,
      });
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'USER_SEARCH_FAILED',
          message: 'Failed to search users',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  async checkUsernameAvailability(req: Request, res: Response) {
    try {
      const { username } = req.params;

      if (!username) {
        return res.status(400).json({
          error: {
            code: 'MISSING_USERNAME',
            message: 'Username is required',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      // Basic username validation
      if (!/^[a-zA-Z0-9_]+$/.test(username) || username.length < 3 || username.length > 30) {
        return res.status(400).json({
          error: {
            code: 'INVALID_USERNAME',
            message: 'Username must be 3-30 characters and contain only letters, numbers, and underscores',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      const isAvailable = await userService.checkUsernameAvailability(
        username,
        req.user?.userId
      );

      res.json({
        data: {
          username,
          available: isAvailable,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'USERNAME_CHECK_FAILED',
          message: 'Failed to check username availability',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  async getUserLikes(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      if (!userId) {
        return res.status(400).json({
          error: {
            code: 'MISSING_USER_ID',
            message: 'User ID is required',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      // For now, return empty array since this is a complex query
      // TODO: Implement in LikeService to get posts liked by user
      res.json({
        data: [],
        message: 'User likes endpoint - to be implemented'
      });
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'USER_LIKES_FETCH_FAILED',
          message: 'Failed to fetch user likes',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }
}
