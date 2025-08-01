import { Router } from 'express';
import { SubscriptionController } from '../controllers/subscriptionController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const subscriptionController = new SubscriptionController();

// Public routes
router.get('/tiers', subscriptionController.getSubscriptionTiers);

// Protected routes (require authentication)
router.get('/current', authenticateToken, subscriptionController.getUserSubscription);
router.get('/trial-status', authenticateToken, subscriptionController.getTrialStatus);
router.post('/checkout', authenticateToken, subscriptionController.createCheckout);
router.get('/portal', authenticateToken, subscriptionController.getCustomerPortal);
router.get('/features/:feature/access', authenticateToken, subscriptionController.checkFeatureAccess);

// Webhook route (no authentication needed, verified by signature)
router.post('/webhook', subscriptionController.handleWebhook);

export default router;