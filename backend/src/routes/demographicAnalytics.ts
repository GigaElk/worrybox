import { Router } from 'express';
import { DemographicAnalyticsController } from '../controllers/demographicAnalyticsController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const demographicAnalyticsController = new DemographicAnalyticsController();

// All demographic analytics routes require authentication and Premium subscription
router.use(authenticateToken);

// Demographic analytics endpoints
router.get('/overview', demographicAnalyticsController.getDemographicAnalytics);
router.get('/heatmap', demographicAnalyticsController.getWorryHeatMapData);
router.get('/trending', demographicAnalyticsController.getTrendingTopics);
router.get('/categories/trends', demographicAnalyticsController.getCategoryTrends);
router.get('/community/health', demographicAnalyticsController.getCommunityHealth);

export default router;