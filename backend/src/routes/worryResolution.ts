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

router.get('/test', (req, res) => res.send('Worry resolution route is working!'));

// Public routes (no authentication required)
router.get('/stories', getPublicResolutionStoriesValidation, worryResolutionController.getPublicResolutionStories);

// Protected routes (authentication required)
router.use(authenticateToken);

// Resolution management
router.post('/posts/:postId/resolve', resolveWorryValidation, worryResolutionController.resolveWorry);
router.put('/posts/:postId/resolve', updateResolutionValidation, worryResolutionController.updateResolution);
router.delete('/posts/:postId/resolve', getResolutionValidation, worryResolutionController.unresolveWorry);

// Get resolution data
router.get('/posts/:postId', getResolutionValidation, worryResolutionController.getResolution);
router.get('/users/:userId/resolved', getUserResolvedWorriesValidation, worryResolutionController.getUserResolvedWorries);
router.get('/stats', worryResolutionController.getResolutionStats);

// Resolution suggestions
router.get('/posts/:postId/suggestions', getResolutionSuggestionsValidation, worryResolutionController.getResolutionSuggestions);

export default router;