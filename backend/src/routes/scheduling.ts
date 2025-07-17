import { Router } from 'express';
import { SchedulingController, updateScheduledPostValidation } from '../controllers/schedulingController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const schedulingController = new SchedulingController();

// All scheduling routes require authentication
router.get('/posts', authenticateToken, schedulingController.getScheduledPosts);
router.put('/posts/:postId', authenticateToken, updateScheduledPostValidation, schedulingController.updateScheduledPost);
router.delete('/posts/:postId', authenticateToken, schedulingController.cancelScheduledPost);
router.get('/stats', authenticateToken, schedulingController.getSchedulingStats);

export default router;