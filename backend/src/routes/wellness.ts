import { Router } from 'express';
import { WellnessController } from '../controllers/wellnessController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const wellnessController = new WellnessController();

// All wellness routes require authentication
router.use(authenticateToken);

// Exercise recommendations
router.get('/recommendations', wellnessController.getRecommendations);

// Popular exercises
router.get('/exercises/popular', wellnessController.getPopularExercises);

// Coping techniques
router.get('/techniques', wellnessController.getCopingTechniques);

export default router;