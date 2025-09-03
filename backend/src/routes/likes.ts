import { Router } from 'express';
import { LikeController, getLikesValidation } from '../controllers/likeController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const likeController = new LikeController();

// Protected routes (require authentication)
router.post('/:postId', authenticateToken, likeController.likePost);
router.delete('/:postId', authenticateToken, likeController.unlikePost);
router.get('/:postId/check', authenticateToken, likeController.isLiked);

// Public routes (no authentication required)
router.get('/:postId', getLikesValidation, likeController.getLikes);
router.get('/:postId/stats', likeController.getLikeCount);

export default router;