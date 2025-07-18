import { Router } from 'express';
import {
  NotificationController,
  updateNotificationPreferencesValidation,
  getUserNotificationsValidation
} from '../controllers/notificationController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const notificationController = new NotificationController();

// All notification routes require authentication
router.use(authenticateToken);

// Notification preferences
router.get('/preferences', notificationController.getNotificationPreferences);
router.put('/preferences', updateNotificationPreferencesValidation, notificationController.updateNotificationPreferences);

// User notifications
router.get('/', getUserNotificationsValidation, notificationController.getUserNotifications);
router.put('/:notificationId/read', notificationController.markNotificationAsRead);
router.put('/read-all', notificationController.markAllNotificationsAsRead);

// Smart notifications (admin/testing)
router.post('/trigger-smart', notificationController.triggerSmartNotifications);
router.get('/context', notificationController.getUserNotificationContext);

export default router;