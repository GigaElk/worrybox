import { Router } from 'express';
import { CommentController, createCommentValidation, updateCommentValidation, getCommentsValidation, reportCommentValidation } from '../controllers/commentController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const commentController = new CommentController();

// Post-specific comment routes
router.post('/post/:postId', authenticateToken, createCommentValidation, commentController.createComment);
router.get('/post/:postId', getCommentsValidation, commentController.getCommentsByPost);
router.get('/post/:postId/threaded', getCommentsValidation, commentController.getCommentsWithReplies);
router.get('/post/:postId/count', commentController.getCommentCount);

// Comment-specific routes
router.get('/:commentId', commentController.getComment);
router.put('/:commentId', authenticateToken, updateCommentValidation, commentController.updateComment);
router.delete('/:commentId', authenticateToken, commentController.deleteComment);

// Safety features
router.post('/:commentId/report', authenticateToken, reportCommentValidation, commentController.reportComment);
router.get('/:commentId/reports', authenticateToken, commentController.getCommentReports);
router.get('/:commentId/replies/count', commentController.getReplyCount);

export default router;