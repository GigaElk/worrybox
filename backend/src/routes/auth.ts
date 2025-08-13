import { Router } from 'express';
import { AuthController, registerValidation, loginValidation, forgotPasswordValidation, resetPasswordValidation } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const authController = new AuthController();

// Public routes
router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/forgot-password', forgotPasswordValidation, authController.forgotPassword);
router.post('/reset-password', resetPasswordValidation, authController.resetPassword);
router.get('/verify-email', authController.verifyEmail);

// Protected routes
router.post('/logout', authenticateToken, authController.logout);
router.get('/profile', authenticateToken, authController.getProfile);
router.post('/resend-verification', authenticateToken, authController.resendVerificationEmail);

// Debug routes
router.get('/check-token', authController.checkToken);

// Availability check routes (public)
router.get('/check-email/:email', authController.checkEmailAvailability);
router.get('/check-username/:username', authController.checkUsernameAvailability);

export default router;