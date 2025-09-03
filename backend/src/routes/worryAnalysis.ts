import { Router } from 'express';
import { WorryAnalysisController } from '../controllers/worryAnalysisController';
import { authenticateToken, optionalAuth } from '../middleware/auth';

const router = Router();
const worryAnalysisController = new WorryAnalysisController();

// Analyze a worry post (requires authentication)
router.post('/posts/:postId/analyze', authenticateToken, worryAnalysisController.analyzeWorry);

// Get analysis for a worry post (public)
router.get('/posts/:postId', worryAnalysisController.getWorryAnalysis);

// Find similar worries with optional auth for privacy filtering
router.get('/posts/:postId/similar', optionalAuth, worryAnalysisController.findSimilarWorries);

// Get similar worry count (AI + MeToo combined)
router.get('/posts/:postId/similar-count', worryAnalysisController.getSimilarWorryCount);

// Get worry categories and statistics (public)
router.get('/categories', worryAnalysisController.getWorryCategories);

// Update similar worry counts (admin/background task)
router.post('/update-counts', authenticateToken, worryAnalysisController.updateSimilarWorryCounts);

export default router;