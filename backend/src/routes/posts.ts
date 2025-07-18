import { Router } from 'express';
import { PostController, createPostValidation, updatePostValidation, getPostsValidation, addBlogContentValidation } from '../controllers/postController';
import { authenticateToken, optionalAuth } from '../middleware/auth';

const router = Router();
const postController = new PostController();

// Public routes (no authentication required)
router.get('/prompts', postController.getWorryPrompts);

// Semi-protected routes (optional authentication)
router.get('/', optionalAuth, getPostsValidation, postController.getPosts);
router.get('/feed/personalized', authenticateToken, getPostsValidation, postController.getPersonalizedFeed);
router.get('/feed/discovery', optionalAuth, getPostsValidation, postController.getDiscoveryFeed);
router.get('/:postId', optionalAuth, postController.getPost);
router.get('/user/:userId', optionalAuth, getPostsValidation, postController.getUserPosts);

// Protected routes (require authentication)
router.post('/', authenticateToken, createPostValidation, postController.createPost);
router.put('/:postId', authenticateToken, updatePostValidation, postController.updatePost);
router.delete('/:postId', authenticateToken, postController.deletePost);

// Blog content management routes
router.post('/:postId/blog', authenticateToken, addBlogContentValidation, postController.addBlogContent);
router.delete('/:postId/blog', authenticateToken, postController.removeBlogContent);

export default router;