import { Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { PostService } from '../services/postService';
import { CreatePostRequest, UpdatePostRequest, PostsQuery, AddBlogContentRequest } from '../types/post';

const postService = new PostService();

// Validation rules
export const createPostValidation = [
  body('shortContent')
    .isLength({ min: 1, max: 280 })
    .withMessage('Short content must be between 1 and 280 characters'),
  body('worryPrompt')
    .isLength({ min: 1, max: 500 })
    .withMessage('Worry prompt is required and must be less than 500 characters'),
  body('privacyLevel')
    .isIn(['public', 'friends', 'private'])
    .withMessage('Privacy level must be public, friends, or private'),
  body('commentsEnabled')
    .optional()
    .isBoolean()
    .withMessage('commentsEnabled must be a boolean'),
  body('longContent')
    .optional()
    .isLength({ max: 10000 })
    .withMessage('Long content must be less than 10,000 characters'),
  body('isScheduled')
    .optional()
    .isBoolean()
    .withMessage('isScheduled must be a boolean'),
  body('scheduledFor')
    .optional()
    .isISO8601()
    .withMessage('scheduledFor must be a valid ISO date'),
];

export const updatePostValidation = [
  body('shortContent')
    .optional()
    .isLength({ min: 1, max: 280 })
    .withMessage('Short content must be between 1 and 280 characters'),
  body('worryPrompt')
    .optional()
    .isLength({ min: 1, max: 500 })
    .withMessage('Worry prompt must be less than 500 characters'),
  body('privacyLevel')
    .optional()
    .isIn(['public', 'friends', 'private'])
    .withMessage('Privacy level must be public, friends, or private'),
  body('commentsEnabled')
    .optional()
    .isBoolean()
    .withMessage('commentsEnabled must be a boolean'),
  body('longContent')
    .optional()
    .isLength({ max: 10000 })
    .withMessage('Long content must be less than 10,000 characters'),
];

export const getPostsValidation = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer'),
  query('privacyLevel')
    .optional()
    .isIn(['public', 'friends', 'private'])
    .withMessage('Privacy level must be public, friends, or private'),
  query('includeScheduled')
    .optional()
    .isBoolean()
    .withMessage('includeScheduled must be a boolean'),
];

export const addBlogContentValidation = [
  body('longContent')
    .isLength({ min: 1, max: 10000 })
    .withMessage('Blog content must be between 1 and 10,000 characters'),
];

export class PostController {
  async createPost(req: Request, res: Response) {
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

      const postData: CreatePostRequest = req.body;
      
      // Validate scheduled post logic
      if (postData.isScheduled && !postData.scheduledFor) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'scheduledFor is required when isScheduled is true',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      if (postData.scheduledFor && new Date(postData.scheduledFor) <= new Date()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'scheduledFor must be in the future',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      const post = await postService.createPost(req.user.userId, postData);

      res.status(201).json({
        message: 'Post created successfully',
        data: post,
      });
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'POST_CREATION_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  async updatePost(req: Request, res: Response) {
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
      const updateData: UpdatePostRequest = req.body;

      const post = await postService.updatePost(postId, req.user.userId, updateData);

      res.json({
        message: 'Post updated successfully',
        data: post,
      });
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('permission')) {
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
          code: 'POST_UPDATE_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  async deletePost(req: Request, res: Response) {
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

      await postService.deletePost(postId, req.user.userId);

      res.json({
        message: 'Post deleted successfully',
      });
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('permission')) {
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
          code: 'POST_DELETION_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  async getPost(req: Request, res: Response) {
    try {
      const { postId } = req.params;
      const requestingUserId = req.user?.userId;

      const post = await postService.getPost(postId, requestingUserId);

      if (!post) {
        return res.status(404).json({
          error: {
            code: 'POST_NOT_FOUND',
            message: 'Post not found',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      res.json({
        data: post,
      });
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'POST_FETCH_FAILED',
          message: 'Failed to fetch post',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  async getPosts(req: Request, res: Response) {
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

      const query: PostsQuery = {
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
        privacyLevel: req.query.privacyLevel as any,
        includeScheduled: req.query.includeScheduled === 'true',
      };

      const requestingUserId = req.user?.userId;
      const posts = await postService.getPosts(query, requestingUserId);

      res.json({
        data: posts,
      });
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'POSTS_FETCH_FAILED',
          message: 'Failed to fetch posts',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  async getUserPosts(req: Request, res: Response) {
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

      const { userId } = req.params;
      const query: Omit<PostsQuery, 'userId'> = {
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
        privacyLevel: req.query.privacyLevel as any,
        includeScheduled: req.query.includeScheduled === 'true',
      };

      const requestingUserId = req.user?.userId;
      const posts = await postService.getUserPosts(userId, requestingUserId, query);

      res.json({
        data: posts,
      });
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'USER_POSTS_FETCH_FAILED',
          message: 'Failed to fetch user posts',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  async addBlogContent(req: Request, res: Response) {
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
      const { longContent }: AddBlogContentRequest = req.body;

      const post = await postService.addBlogContent(postId, req.user.userId, longContent);

      res.json({
        message: 'Blog content added successfully',
        data: post,
      });
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('permission')) {
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
          code: 'BLOG_CONTENT_ADD_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  async removeBlogContent(req: Request, res: Response) {
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

      const post = await postService.removeBlogContent(postId, req.user.userId);

      res.json({
        message: 'Blog content removed successfully',
        data: post,
      });
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('permission')) {
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
          code: 'BLOG_CONTENT_REMOVE_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  async getPersonalizedFeed(req: Request, res: Response) {
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

      const query: Omit<PostsQuery, 'userId'> = {
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      };

      const posts = await postService.getPersonalizedFeed(req.user.userId, query);

      res.json({
        data: posts,
      });
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'PERSONALIZED_FEED_FAILED',
          message: 'Failed to fetch personalized feed',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  async getDiscoveryFeed(req: Request, res: Response) {
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

      const query: Omit<PostsQuery, 'userId'> = {
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      };

      const requestingUserId = req.user?.userId;
      const posts = await postService.getDiscoveryFeed(requestingUserId, query);

      res.json({
        data: posts,
      });
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'DISCOVERY_FEED_FAILED',
          message: 'Failed to fetch discovery feed',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  async getWorryPrompts(req: Request, res: Response) {
    try {
      const prompts = await postService.getWorryPrompts();
      res.json({
        data: {
          prompts: prompts.map(p => p.text),
        },
      });
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'PROMPTS_FETCH_FAILED',
          message: 'Failed to fetch worry prompts',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }
}