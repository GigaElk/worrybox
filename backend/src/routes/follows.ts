import { Router } from 'express';
import { FollowController } from '../controllers/followController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const followController = new FollowController();

// Protected routes (require authentication)

// TODO: Re-enable these routes when the corresponding controller methods are fully implemented
// router.post('/:userId', authenticateToken, followController.followUser);
// router.delete('/:userId', authenticateToken, followController.unfollowUser);
// router.get('/:userId/check', authenticateToken, followController.isFollowing);
// router.get('/:userId/followers', getFollowersValidation, followController.getFollowers);
// router.get('/:userId/following', getFollowingValidation, followController.getFollowing);
// router.get('/:userId/stats', followController.getFollowStats);

export default router;