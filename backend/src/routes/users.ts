import { Router } from 'express';
import { UserController, updateProfileValidation, searchUsersValidation } from '../controllers/userController';
import { authenticateToken, optionalAuth } from '../middleware/auth';

const router = Router();
const userController = new UserController();

// Protected routes (require authentication)
router.put('/profile', authenticateToken, updateProfileValidation, userController.updateProfile);
router.get('/profile', authenticateToken, userController.getProfile);

// Public routes (no authentication required)
router.get('/search', searchUsersValidation, userController.searchUsers);
router.get('/username/:username', userController.getUserByUsername);

// Semi-protected routes (optional authentication)
router.get('/username-available/:username', optionalAuth, userController.checkUsernameAvailability);

export default router;