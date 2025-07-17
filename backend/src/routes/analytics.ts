import { Router } from 'express';
import { AnalyticsController } from '../controllers/analyticsController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const analyticsController = new AnalyticsController();

// All analytics routes require authentication
router.use(authenticateToken);

// Personal analytics endpoints
router.get('/personal', analyticsController.getPersonalAnalytics);
router.get('/summary', analyticsController.getAnalyticsSummary);
router.get('/frequency', analyticsController.getWorryFrequencyData);
router.get('/categories/trends', analyticsController.getCategoryTrendData);

export default router;