// src/api/routes/notifications.ts
import express from 'express';
import { NotificationController } from '../controllers/NotificationController';
import { authenticate } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimmiter';

export function createNotificationRoutes(
  notificationController: NotificationController
): express.Router {
  const router = express.Router();

  // Apply authentication to all routes
  router.use(authenticate);

  // Send notification
  router.post('/send', 
    rateLimiter.createMiddleware(10, 60000), // 10 requests per minute
    notificationController.sendNotification.bind(notificationController)
  );

  // Get notification history
  router.get('/history/:userId', 
    rateLimiter.createMiddleware(30, 60000), // 30 requests per minute
    notificationController.getNotificationHistory.bind(notificationController)
  );

  // Get notification status
  router.get('/:id', 
    rateLimiter.createMiddleware(60, 60000), // 60 requests per minute
    notificationController.getNotificationStatus.bind(notificationController)
  );

  // Cancel notification
  router.delete('/:id', 
    rateLimiter.createMiddleware(5, 60000), // 5 requests per minute
    notificationController.cancelNotification.bind(notificationController)
  );

  return router;
}
