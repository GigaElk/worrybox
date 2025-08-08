import { Router } from 'express';
import { ModerationController, reviewCommentValidation, getModerationQueueValidation } from '../controllers/moderationController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const moderationController = new ModerationController();

// All moderation routes require authentication
router.get('/queue', authenticateToken, getModerationQueueValidation, moderationController.getModerationQueue);
router.post('/review/:queueItemId', authenticateToken, reviewCommentValidation, moderationController.reviewComment);
router.get('/stats', authenticateToken, moderationController.getModerationStats);

// AI Reprocessing endpoints
router.post('/reprocess', authenticateToken, moderationController.reprocessPendingItems);
router.get('/reprocessing-queue', authenticateToken, moderationController.getReprocessingQueueStatus);
router.delete('/reprocessing-queue/cleanup', authenticateToken, moderationController.cleanupOldReprocessingItems);

export default router;