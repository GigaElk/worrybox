import { Router } from 'express';
import { ProfilePictureController, uploadMiddleware } from '../controllers/profilePictureController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const profilePictureController = new ProfilePictureController();

// Protected routes (require authentication)
router.post('/me', authenticateToken, uploadMiddleware, profilePictureController.uploadProfilePicture);
router.delete('/me', authenticateToken, profilePictureController.deleteProfilePicture);

// Public routes (no authentication required)
router.get('/:userId', profilePictureController.getProfilePicture);

// Service status endpoint (for debugging/monitoring)
router.get('/service/status', profilePictureController.getServiceStatus);

export default router;