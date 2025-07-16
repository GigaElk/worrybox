import { Router } from 'express';
import { FollowController, getFollowersValidation, getFollowingValidation } from '../controllers/followController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const followController = new FollowController();

// Protected routes (require authentication)
router.post('/:userId', authenticateToken, followController.followUser);
router.delete('/:userId', authenticateToken, followController.unfollowUser);
router.get('/:userId/check', authenticateToken, followController.isFollowing);

// Public routes (no authentication required)
router.get('/:userId/followers', getFollowersValidation, followController.getFollowers);
router.get('/:userId/following', getFollowingValidation, followController.getFollowing);
router.get('/:userId/stats', followController.getFollowStats);

export default router;