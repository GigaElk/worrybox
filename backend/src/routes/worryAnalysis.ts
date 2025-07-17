import { Router } from 'express';
import { WorryAnalysisController } from '../controllers/worryAnalysisController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const worryAnalysisController = new WorryAnalysisController();

// Analyze a worry post (requires authentication)
router.post('/posts/:postId/analyze', authenticateToken, worryAnalysisController.analyzeWorry);

// Get analysis for a worry post (public)
router.get('/posts/:postId', worryAnalysisController.getWorryAnalysis);

// Find similar worries (public)
router.get('/posts/:postId/similar', worryAnalysisController.findSimilarWorries);

// Get worry categories and statistics (public)
router.get('/categories', worryAnalysisController.getWorryCategories);

// Update similar worry counts (admin/background task)
router.post('/update-counts', authenticateToken, worryAnalysisController.updateSimilarWorryCounts);

export default router;