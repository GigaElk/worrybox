import { Router } from 'express';
import { 
  AnalyticsController, 
  getGeographicAnalyticsValidation, 
  exportAnalyticsValidation 
} from '../controllers/analyticsController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const analyticsController = new AnalyticsController();

// All analytics routes require authentication and premium access
router.use(authenticateToken);

// Geographic analytics endpoints
router.get('/geographic', getGeographicAnalyticsValidation, analyticsController.getGeographicAnalytics);
router.get('/regions/summaries', analyticsController.getRegionSummaries);
router.get('/regions/available', analyticsController.getAvailableRegions);
router.get('/categories/trends', analyticsController.getCategoryTrends);

// Data export endpoints
router.get('/export', exportAnalyticsValidation, analyticsController.exportAnalytics);

export default router;