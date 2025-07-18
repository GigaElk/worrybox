import { Router } from 'express';
// import {
//   MentalHealthResourceController,
//   getResourcesValidation,
//   getCrisisResourcesValidation,
//   getRecommendedResourcesValidation
// } from '../controllers/mentalHealthResourceController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
// const mentalHealthResourceController = new MentalHealthResourceController();

// Public routes (no authentication required)
// router.get('/', getResourcesValidation, mentalHealthResourceController.getResources);
// router.get('/crisis', getCrisisResourcesValidation, mentalHealthResourceController.getCrisisResources);
// router.get('/categories', mentalHealthResourceController.getResourceCategories);
// router.get('/tags', mentalHealthResourceController.getResourceTags);
// router.get('/countries', mentalHealthResourceController.getAvailableCountries);
// router.get('/languages', mentalHealthResourceController.getAvailableLanguages);

// Protected routes (authentication required)
// router.get('/recommended', authenticateToken, getRecommendedResourcesValidation, mentalHealthResourceController.getRecommendedResources);

// ID route must come last to avoid conflicts
// router.get('/:id', mentalHealthResourceController.getResourceById);

export default router;