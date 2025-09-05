import { Router } from 'express';
import { UserController, updateProfileValidation, searchUsersValidation } from '../controllers/userController';
import { FollowController } from '../controllers/followController'; // Import FollowController
import { authenticateToken, optionalAuth } from '../middleware/auth';

const router = Router();
const userController = new UserController();
const followController = new FollowController(); // Instantiate FollowController

// Follow/Unfollow Toggle
router.post('/:userId/follow', authenticateToken, followController.toggleFollow);

// Protected routes (require authentication)
router.put('/profile', authenticateToken, updateProfileValidation, userController.updateProfile);
router.get('/profile', authenticateToken, userController.getProfile);

// Public routes (no authentication required)
router.get('/search', searchUsersValidation, userController.searchUsers);
router.get('/username/:username', userController.getUserByUsername);
router.get('/:userId/likes', userController.getUserLikes);

// Semi-protected routes (optional authentication)
router.get('/username-available/:username', optionalAuth, userController.checkUsernameAvailability);

export default router;