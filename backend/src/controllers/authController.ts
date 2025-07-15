import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthService } from '../services/authService';
import { RegisterRequest, LoginRequest, RefreshTokenRequest, ForgotPasswordRequest, ResetPasswordRequest } from '../types/auth';

const authService = new AuthService();

// Validation rules
export const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('username')
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username must be 3-30 characters and contain only letters, numbers, and underscores'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must be at least 8 characters with at least one lowercase letter, one uppercase letter, and one number'),
];

export const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

export const forgotPasswordValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
];

export const resetPasswordValidation = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must be at least 8 characters with at least one lowercase letter, one uppercase letter, and one number'),
];

export class AuthController {
  async register(req: Request, res: Response) {
    try {
      // Check validation results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array(),
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      const registerData: RegisterRequest = req.body;
      const result = await authService.register(registerData);

      res.status(201).json({
        message: 'Registration successful',
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({
        error: {
          code: 'REGISTRATION_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  async login(req: Request, res: Response) {
    try {
      // Check validation results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array(),
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      const loginData: LoginRequest = req.body;
      const result = await authService.login(loginData);

      res.json({
        message: 'Login successful',
        data: result,
      });
    } catch (error: any) {
      res.status(401).json({
        error: {
          code: 'LOGIN_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken }: RefreshTokenRequest = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          error: {
            code: 'MISSING_REFRESH_TOKEN',
            message: 'Refresh token is required',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      const result = await authService.refreshToken(refreshToken);

      res.json({
        message: 'Token refreshed successfully',
        data: result,
      });
    } catch (error: any) {
      res.status(401).json({
        error: {
          code: 'REFRESH_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  async forgotPassword(req: Request, res: Response) {
    try {
      // Check validation results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array(),
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      const { email }: ForgotPasswordRequest = req.body;
      await authService.forgotPassword(email);

      // Always return success to prevent email enumeration
      res.json({
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'FORGOT_PASSWORD_FAILED',
          message: 'Failed to process password reset request',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  async resetPassword(req: Request, res: Response) {
    try {
      // Check validation results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array(),
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      const { token, password }: ResetPasswordRequest = req.body;
      await authService.resetPassword(token, password);

      res.json({
        message: 'Password reset successful',
      });
    } catch (error: any) {
      res.status(400).json({
        error: {
          code: 'RESET_PASSWORD_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  async verifyEmail(req: Request, res: Response) {
    try {
      const { token } = req.query;

      if (!token || typeof token !== 'string') {
        return res.status(400).json({
          error: {
            code: 'MISSING_TOKEN',
            message: 'Verification token is required',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      await authService.verifyEmail(token);

      res.json({
        message: 'Email verified successfully',
      });
    } catch (error: any) {
      res.status(400).json({
        error: {
          code: 'EMAIL_VERIFICATION_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  async logout(req: Request, res: Response) {
    // For JWT tokens, logout is handled client-side by removing the token
    // In a more complex setup, you might maintain a blacklist of tokens
    res.json({
      message: 'Logout successful',
    });
  }

  async getProfile(req: Request, res: Response) {
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

      const user = await authService.getUserById(req.user.userId);

      if (!user) {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      res.json({
        data: user,
      });
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'PROFILE_FETCH_FAILED',
          message: 'Failed to fetch user profile',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }
}