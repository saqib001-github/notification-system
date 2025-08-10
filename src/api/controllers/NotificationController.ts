import { Request, Response } from 'express';
import { NotificationService } from '../../services/notification/NotificationService';
import { SocketManager } from '../../services/socket/SocketManager';
import { Logger } from '../../utils/Logger';
import { NotificationRequest, Priority, NotificationType, Channel } from '../../types';
import Joi from 'joi';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export class NotificationController {
  private notificationService: NotificationService;
  private socketManager: SocketManager;
  private logger: Logger;

  constructor(notificationService: NotificationService, socketManager: SocketManager) {
    this.notificationService = notificationService;
    this.socketManager = socketManager;
    this.logger = Logger.getInstance();
  }

  async sendNotification(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Validate request
      const { error, value } = this.validateNotificationRequest(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: error.details[0].message
        });
        return;
      }

      const request: NotificationRequest = value;
      const result = await this.notificationService.send(request);

      // Send real-time update to user
      await this.socketManager.sendToUser(request.userId, 'notification_queued', {
        notificationId: result.id,
        status: result.status
      });

      res.status(200).json({
        success: true,
        data: result
      });

      this.logger.info(`Notification request processed`, { 
        notificationId: result.id,
        userId: request.userId
      });

    } catch (error) {
      this.logger.error('Failed to send notification', error as Error);
      res.status(400).json({
        success: false,
        error: (error as Error).message
      });
    }
  }

  async getNotificationHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

      // Authorization check
      if (req.user?.id !== userId) {
        res.status(403).json({
          success: false,
          error: 'Access denied'
        });
        return;
      }

      const result = await this.notificationService.getHistory(userId, page, limit);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      this.logger.error('Failed to get notification history', error as Error);
      res.status(500).json({
        success: false,
        error: (error as Error).message
      });
    }
  }

  async getNotificationStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const notification = await this.notificationService.getStatus(id);

      if (!notification) {
        res.status(404).json({
          success: false,
          error: 'Notification not found'
        });
        return;
      }

      // Authorization check
      if (req.user?.id !== notification.userId) {
        res.status(403).json({
          success: false,
          error: 'Access denied'
        });
        return;
      }

      res.json({
        success: true,
        data: notification
      });

    } catch (error) {
      this.logger.error('Failed to get notification status', error as Error);
      res.status(500).json({
        success: false,
        error: (error as Error).message
      });
    }
  }

  async cancelNotification(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      // First check if notification exists and user has permission
      const notification = await this.notificationService.getStatus(id);
      if (!notification) {
        res.status(404).json({
          success: false,
          error: 'Notification not found'
        });
        return;
      }

      if (req.user?.id !== notification.userId) {
        res.status(403).json({
          success: false,
          error: 'Access denied'
        });
        return;
      }

      const cancelled = await this.notificationService.cancel(id);

      if (cancelled) {
        // Send real-time update
        await this.socketManager.sendToUser(notification.userId, 'notification_cancelled', {
          notificationId: id
        });

        res.json({
          success: true,
          message: 'Notification cancelled successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Cannot cancel notification'
        });
      }

    } catch (error) {
      this.logger.error('Failed to cancel notification', error as Error);
      res.status(500).json({
        success: false,
        error: (error as Error).message
      });
    }
  }

  private validateNotificationRequest(data: any): Joi.ValidationResult {
    const schema = Joi.object({
      userId: Joi.string().uuid().required(),
      type: Joi.string().valid(...Object.values(NotificationType)).required(),
      priority: Joi.number().valid(...Object.values(Priority)).required(),
      channels: Joi.array().items(
        Joi.string().valid(...Object.values(Channel))
      ).min(1).required(),
      template: Joi.string().required(),
      data: Joi.object().required(),
      scheduling: Joi.object({
        scheduledAt: Joi.date().greater('now'),
        delay: Joi.number().min(0),
        recurring: Joi.object({
          pattern: Joi.string().valid('daily', 'weekly', 'monthly'),
          interval: Joi.number().min(1),
          endDate: Joi.date().greater('now')
        })
      }).optional(),
      metadata: Joi.object().optional()
    });

    return schema.validate(data);
  }
}
