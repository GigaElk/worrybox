import { Router } from 'express';
import { ModerationController, reviewCommentValidation, getModerationQueueValidation } from '../controllers/moderationController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const moderationController = new ModerationController();

// All moderation routes require authentication
router.get('/queue', authenticateToken, getModerationQueueValidation, moderationController.getModerationQueue);
router.post('/review/:queueItemId', authenticateToken, reviewCommentValidation, moderationController.reviewComment);
router.get('/stats', authenticateToken, moderationController.getModerationStats);
router.post('/moderate/:commentId', authenticateToken, moderationController.moderateComment);

export default router;