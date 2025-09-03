import { Router } from 'express';
import { MeTooController, getMeToosValidation } from '../controllers/meTooController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const meTooController = new MeTooController();

// Protected routes (require authentication)
router.post('/:postId', authenticateToken, meTooController.addMeToo);
router.delete('/:postId', authenticateToken, meTooController.removeMeToo);
router.get('/:postId/check', authenticateToken, meTooController.hasMeToo);

// Public routes (no authentication required)
router.get('/:postId', getMeToosValidation, meTooController.getMeToos);
router.get('/:postId/count', meTooController.getMeTooCount);
router.get('/:postId/similar-worry-count', meTooController.getSimilarWorryCount);

export default router;