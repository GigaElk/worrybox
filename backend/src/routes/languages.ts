import { Router } from 'express';
import {
  LanguageController,
  setLanguagePreferenceValidation,
  detectContentLanguageValidation
} from '../controllers/languageController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const languageController = new LanguageController();

// Public routes
router.get('/supported', languageController.getSupportedLanguages);
router.get('/detect', languageController.detectLanguage);
router.post('/detect-content', detectContentLanguageValidation, languageController.detectContentLanguage);

// Protected routes (require authentication)
router.get('/preference', authenticateToken, languageController.getUserLanguagePreference);
router.put('/preference', authenticateToken, setLanguagePreferenceValidation, languageController.setUserLanguagePreference);

export default router;