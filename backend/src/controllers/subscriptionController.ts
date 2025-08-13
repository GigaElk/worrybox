import { Request, Response } from 'express';
import { PayPalService } from '../services/paypalService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const paypalService = PayPalService.getInstance();

export class SubscriptionController {
  /**
   * Get available subscription tiers
   */
  async getSubscriptionTiers(req: Request, res: Response) {
    try {
      const tiers = paypalService.getSubscriptionTiers();
      
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

      const subscription = await paypalService.getUserSubscription(req.user.userId);
      
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
   * Create PayPal subscription
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

      const { planId } = req.body;

      if (!planId) {
        return res.status(400).json({
          error: {
            code: 'MISSING_PLAN_ID',
            message: 'PayPal plan ID is required',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      const result = await paypalService.createSubscription(req.user.userId, planId);

      res.json({
        data: {
          subscriptionId: result.subscriptionId,
          approvalUrl: result.approvalUrl,
        },
      });
    } catch (error: any) {
      console.error('Failed to create PayPal subscription:', error);
      res.status(500).json({
        error: {
          code: 'SUBSCRIPTION_CREATION_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  /**
   * Cancel PayPal subscription
   */
  async cancelSubscription(req: Request, res: Response) {
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

      const subscription = await paypalService.getUserSubscription(req.user.userId);
      
      if (!subscription || !subscription.paypalSubscriptionId) {
        return res.status(404).json({
          error: {
            code: 'NO_SUBSCRIPTION',
            message: 'No active subscription found',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      const { reason } = req.body;
      await paypalService.cancelSubscription(
        subscription.paypalSubscriptionId, 
        reason || 'User requested cancellation'
      );

      res.json({
        message: 'Subscription cancelled successfully',
      });
    } catch (error: any) {
      console.error('Failed to cancel subscription:', error);
      res.status(500).json({
        error: {
          code: 'CANCELLATION_FAILED',
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

      const hasAccess = await paypalService.hasFeatureAccess(req.user.userId, feature);

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
   * Handle PayPal webhooks
   */
  async handleWebhook(req: Request, res: Response) {
    try {
      const headers = req.headers as Record<string, string>;
      const payload = JSON.stringify(req.body);

      // Verify webhook signature
      const isValid = await paypalService.verifyWebhookSignature(headers, payload);
      if (!isValid) {
        console.error('Invalid PayPal webhook signature');
        return res.status(401).json({
          error: {
            code: 'INVALID_SIGNATURE',
            message: 'Invalid webhook signature',
          },
        });
      }

      // Process the webhook
      await paypalService.handleWebhook(req.body);

      res.json({ received: true });
    } catch (error: any) {
      console.error('Failed to handle PayPal webhook:', error);
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

      const trialStatus = await paypalService.getTrialStatus(req.user.userId);
      
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

  /**
   * Update user role (Admin only)
   */
  async updateUserRole(req: Request, res: Response) {
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

      // Check if current user is admin
      const currentUser = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { role: true }
      });

      if (currentUser?.role !== 'ADMIN') {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Admin access required',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      const { userId, role } = req.body;

      if (!userId || !role) {
        return res.status(400).json({
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'userId and role are required',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      // Validate role
      const validRoles = ['USER', 'ADMIN', 'LIFETIME_PREMIUM'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_ROLE',
            message: `Role must be one of: ${validRoles.join(', ')}`,
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      // Update user role
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { role },
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          role: true,
        }
      });

      res.json({
        data: updatedUser,
        message: `User role updated to ${role}`,
      });
    } catch (error: any) {
      console.error('Failed to update user role:', error);
      res.status(500).json({
        error: {
          code: 'ROLE_UPDATE_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }
}