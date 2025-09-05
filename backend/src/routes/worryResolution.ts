import { Router } from 'express';
import { 
  WorryResolutionController,
  resolveWorryValidation,
  updateResolutionValidation,
  getResolutionValidation,
  getUserResolvedWorriesValidation,
  getResolutionSuggestionsValidation,
  getPublicResolutionStoriesValidation
} from '../controllers/worryResolutionController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const worryResolutionController = new WorryResolutionController();



// Public routes (no authentication required)
router.get('/stories', getPublicResolutionStoriesValidation, worryResolutionController.getPublicResolutionStories);
// Allow public access to check if a resolution exists for a post
router.get('/posts/:postId', worryResolutionController.getResolution);

// Protected routes (authentication required)
router.use(authenticateToken);

// Resolution management
router.post('/posts/:postId/resolve', resolveWorryValidation, worryResolutionController.resolveWorry);
router.put('/posts/:postId/resolve', updateResolutionValidation, worryResolutionController.updateResolution);
router.delete('/posts/:postId/resolve', getResolutionValidation, worryResolutionController.unresolveWorry);
router.get('/users/:userId/resolved', getUserResolvedWorriesValidation, worryResolutionController.getUserResolvedWorries);
router.get('/stats', worryResolutionController.getResolutionStats);

// Resolution suggestions
router.get('/posts/:postId/suggestions', getResolutionSuggestionsValidation, worryResolutionController.getResolutionSuggestions);

export { router as worryResolutionRoutes };