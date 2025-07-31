import { Request, Response } from 'express';
import { LemonSqueezyService } from '../services/lemonSqueezyService';

const lemonSqueezyService = LemonSqueezyService.getInstance();

export class SubscriptionController {
  /**
   * Get available subscription tiers
   */
  async getSubscriptionTiers(req: Request, res: Response) {
    try {
      const tiers = lemonSqueezyService.getSubscriptionTiers();
      
      res.json({
        data: tiers,
      });
    } catch (error: any) {
      console.error('Failed to get subscription tiers:', error);
      res.status(500).json({
        error: {
          code: 'TIERS_FETCH_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  /**
   * Get user's current subscription
   */
  async getUserSubscription(req: Request, res: Response) {
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

      const subscription = await lemonSqueezyService.getUserSubscription(req.user.userId);
      
      res.json({
        data: subscription,
      });
    } catch (error: any) {
      console.error('Failed to get user subscription:', error);
      res.status(500).json({
        error: {
          code: 'SUBSCRIPTION_FETCH_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  /**
   * Create checkout URL for subscription upgrade
   */
  async createCheckout(req: Request, res: Response) {
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

      const { variantId, customData } = req.body;

      if (!variantId) {
        return res.status(400).json({
          error: {
            code: 'MISSING_VARIANT_ID',
            message: 'Variant ID is required',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      const checkoutUrl = await lemonSqueezyService.createCheckoutUrl(
        req.user.userId,
        variantId,
        customData
      );

      res.json({
        data: {
          checkoutUrl,
        },
      });
    } catch (error: any) {
      console.error('Failed to create checkout:', error);
      res.status(500).json({
        error: {
          code: 'CHECKOUT_CREATION_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  /**
   * Get customer portal URL for subscription management
   */
  async getCustomerPortal(req: Request, res: Response) {
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

      const subscription = await lemonSqueezyService.getUserSubscription(req.user.userId);
      
      if (!subscription || !subscription.lemonSqueezyId) {
        return res.status(404).json({
          error: {
            code: 'NO_SUBSCRIPTION',
            message: 'No active subscription found',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      const portalUrl = await lemonSqueezyService.getCustomerPortalUrl(subscription.lemonSqueezyId);

      res.json({
        data: {
          portalUrl,
        },
      });
    } catch (error: any) {
      console.error('Failed to get customer portal:', error);
      res.status(500).json({
        error: {
          code: 'PORTAL_FETCH_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  /**
   * Check feature access for current user
   */
  async checkFeatureAccess(req: Request, res: Response) {
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

      const { feature } = req.params;

      if (!feature) {
        return res.status(400).json({
          error: {
            code: 'MISSING_FEATURE',
            message: 'Feature name is required',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      const hasAccess = await lemonSqueezyService.hasFeatureAccess(req.user.userId, feature);

      res.json({
        data: {
          feature,
          hasAccess,
        },
      });
    } catch (error: any) {
      console.error('Failed to check feature access:', error);
      res.status(500).json({
        error: {
          code: 'FEATURE_ACCESS_CHECK_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  /**
   * Handle LemonSqueezy webhooks
   */
  async handleWebhook(req: Request, res: Response) {
    try {
      const signature = req.headers['x-signature'] as string;
      const payload = JSON.stringify(req.body);

      // Verify webhook signature
      if (!lemonSqueezyService.verifyWebhookSignature(payload, signature)) {
        console.error('Invalid webhook signature');
        return res.status(401).json({
          error: {
            code: 'INVALID_SIGNATURE',
            message: 'Invalid webhook signature',
          },
        });
      }

      // Process the webhook
      await lemonSqueezyService.handleWebhook(req.body);

      res.json({ received: true });
    } catch (error: any) {
      console.error('Failed to handle webhook:', error);
      res.status(500).json({
        error: {
          code: 'WEBHOOK_PROCESSING_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  /**
   * Get user's trial status
   */
  async getTrialStatus(req: Request, res: Response) {
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

      const trialStatus = await lemonSqueezyService.getTrialStatus(req.user.userId);
      
      res.json({
        data: trialStatus,
      });
    } catch (error: any) {
      console.error('Failed to get trial status:', error);
      res.status(500).json({
        error: {
          code: 'TRIAL_STATUS_FETCH_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }
}