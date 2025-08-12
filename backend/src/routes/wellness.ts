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

// Get specific exercise by ID
router.get('/exercises/:id', wellnessController.getExerciseById);

// Coping techniques
router.get('/techniques', wellnessController.getCopingTechniques);

// Get specific coping technique by ID
router.get('/techniques/:id', wellnessController.getCopingTechniqueById);

export default router;