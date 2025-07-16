import { Router } from 'express';
import { CommentController, createCommentValidation, updateCommentValidation, getCommentsValidation } from '../controllers/commentController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const commentController = new CommentController();

// Post-specific comment routes
router.post('/post/:postId', authenticateToken, createCommentValidation, commentController.createComment);
router.get('/post/:postId', getCommentsValidation, commentController.getCommentsByPost);
router.get('/post/:postId/count', commentController.getCommentCount);

// Comment-specific routes
router.get('/:commentId', commentController.getComment);
router.put('/:commentId', authenticateToken, updateCommentValidation, commentController.updateComment);
router.delete('/:commentId', authenticateToken, commentController.deleteComment);

export default router;