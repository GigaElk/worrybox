import { Router } from 'express';
import { DashboardController } from '../controllers/dashboardController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const dashboardController = new DashboardController();

// All dashboard routes require authentication
router.get('/', authenticateToken, dashboardController.getDashboardData);
router.get('/stats', authenticateToken, dashboardController.getBasicStats);
router.get('/recent-worries', authenticateToken, dashboardController.getRecentWorries);

export default router;