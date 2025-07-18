import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { LanguageService } from '../services/languageService';

const languageService = LanguageService.getInstance();

export class LanguageController {
  /**
   * Get all supported languages
   */
  async getSupportedLanguages(req: Request, res: Response) {
    try {
      const languages = await languageService.getSupportedLanguages();

      res.json({
        data: languages
      });
    } catch (error: any) {
      console.error('Failed to get supported languages:', error);
      res.status(500).json({
        error: {
          code: 'LANGUAGES_FETCH_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  /**
   * Get user's language preference
   */
  async getUserLanguagePreference(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      const preference = await languageService.getUserLanguagePreference(req.user.userId);

      res.json({
        data: preference
      });
    } catch (error: any) {
      console.error('Failed to get user language preference:', error);
      res.status(500).json({
        error: {
          code: 'PREFERENCE_FETCH_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  /**
   * Set user's language preference
   */
  async setUserLanguagePreference(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: errors.array()
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      if (!req.user) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      const { languageCode } = req.body;
      const preference = await languageService.setUserLanguagePreference(req.user.userId, languageCode);

      res.json({
        data: preference
      });
    } catch (error: any) {
      console.error('Failed to set user language preference:', error);
      
      if (error.message.includes('not supported')) {
        return res.status(400).json({
          error: {
            code: 'UNSUPPORTED_LANGUAGE',
            message: error.message,
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      res.status(500).json({
        error: {
          code: 'PREFERENCE_UPDATE_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  /**
   * Detect language from browser header
   */
  async detectLanguage(req: Request, res: Response) {
    try {
      const acceptLanguage = req.headers['accept-language'] as string;
      const detectedLanguage = languageService.detectLanguageFromHeader(acceptLanguage);

      res.json({
        data: {
          detectedLanguage,
          acceptLanguageHeader: acceptLanguage
        }
      });
    } catch (error: any) {
      console.error('Failed to detect language:', error);
      res.status(500).json({
        error: {
          code: 'LANGUAGE_DETECTION_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  /**
   * Detect language from text content
   */
  async detectContentLanguage(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: errors.array()
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      const { text } = req.body;
      const detectedLanguage = await languageService.detectContentLanguage(text);

      res.json({
        data: {
          detectedLanguage,
          text: text.substring(0, 100) + (text.length > 100 ? '...' : '') // Return first 100 chars for confirmation
        }
      });
    } catch (error: any) {
      console.error('Failed to detect content language:', error);
      res.status(500).json({
        error: {
          code: 'CONTENT_LANGUAGE_DETECTION_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }
}

// Validation middleware
export const setLanguagePreferenceValidation = [
  body('languageCode')
    .isString()
    .isLength({ min: 2, max: 5 })
    .withMessage('Language code must be 2-5 characters')
];

export const detectContentLanguageValidation = [
  body('text')
    .isString()
    .isLength({ min: 1, max: 10000 })
    .withMessage('Text must be between 1 and 10000 characters')
];