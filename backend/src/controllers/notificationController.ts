import { Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { NotificationService } from '../services/notificationService';

const notificationService = NotificationService.getInstance();

export class NotificationController {
  /**
   * Get user's notification preferences
   */
  async getNotificationPreferences(req: Request, res: Response) {
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

      const preferences = await notificationService.getNotificationPreferences(req.user.userId);

      res.json({
        data: preferences
      });
    } catch (error: any) {
      console.error('Failed to get notification preferences:', error);
      res.status(500).json({
        error: {
          code: 'PREFERENCES_FETCH_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  /**
   * Update user's notification preferences
   */
  async updateNotificationPreferences(req: Request, res: Response) {
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

      const preferences = await notificationService.updateNotificationPreferences(
        req.user.userId,
        req.body
      );

      res.json({
        data: preferences
      });
    } catch (error: any) {
      console.error('Failed to update notification preferences:', error);
      res.status(500).json({
        error: {
          code: 'PREFERENCES_UPDATE_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  /**
   * Get user's notifications
   */
  async getUserNotifications(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
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

      const limit = parseInt(req.query.limit as string) || 20;
      const notifications = await notificationService.getUserNotifications(req.user.userId, limit);

      res.json({
        data: notifications
      });
    } catch (error: any) {
      console.error('Failed to get user notifications:', error);
      res.status(500).json({
        error: {
          code: 'NOTIFICATIONS_FETCH_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(req: Request, res: Response) {
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

      const { notificationId } = req.params;
      await notificationService.markNotificationAsRead(notificationId, req.user.userId);

      res.json({
        message: 'Notification marked as read'
      });
    } catch (error: any) {
      console.error('Failed to mark notification as read:', error);
      res.status(500).json({
        error: {
          code: 'NOTIFICATION_UPDATE_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsAsRead(req: Request, res: Response) {
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

      await notificationService.markAllNotificationsAsRead(req.user.userId);

      res.json({
        message: 'All notifications marked as read'
      });
    } catch (error: any) {
      console.error('Failed to mark all notifications as read:', error);
      res.status(500).json({
        error: {
          code: 'NOTIFICATIONS_UPDATE_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  /**
   * Trigger smart notification generation (admin/testing endpoint)
   */
  async triggerSmartNotifications(req: Request, res: Response) {
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

      // In a real app, you'd want to restrict this to admin users
      await notificationService.generateSmartNotifications();

      res.json({
        message: 'Smart notifications generation triggered'
      });
    } catch (error: any) {
      console.error('Failed to trigger smart notifications:', error);
      res.status(500).json({
        error: {
          code: 'SMART_NOTIFICATIONS_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  /**
   * Get user's notification context (for debugging/admin)
   */
  async getUserNotificationContext(req: Request, res: Response) {
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

      const context = await notificationService.analyzeUserContext(req.user.userId);

      res.json({
        data: context
      });
    } catch (error: any) {
      console.error('Failed to get user notification context:', error);
      res.status(500).json({
        error: {
          code: 'CONTEXT_FETCH_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }
}

// Validation middleware
export const updateNotificationPreferencesValidation = [
  body('emailNotifications').optional().isBoolean(),
  body('pushNotifications').optional().isBoolean(),
  body('checkInFrequency').optional().isIn(['daily', 'weekly', 'biweekly', 'monthly', 'never']),
  body('supportNotifications').optional().isBoolean(),
  body('quietHoursStart').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('quietHoursEnd').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('timezone').optional().isString().isLength({ min: 1, max: 50 })
];

export const getUserNotificationsValidation = [
  query('limit').optional().isInt({ min: 1, max: 100 })
];