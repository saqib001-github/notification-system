import { v4 as uuidv4 } from "uuid";
import { NotificationRepository } from "../../repositories/NotificationRepository";
import { UserRepository } from "../../repositories/UserRepository";
import { EventBus } from "../../core/events/EventBus";
import { QueueManager } from "../../core/queue/QueueManager";
import { Logger } from "../../utils/Logger";
import {
  NotificationRequest,
  NotificationResult,
  NotificationStatus,
  Channel,
  Priority,
  NotificationEvents,
} from "../../types";
import { Notification } from "@/models/Notification";
import { TemplateService } from "../template/TemplateService";

export class NotificationService {
  private notificationRepo: NotificationRepository;
  private userRepo: UserRepository;
  private templateService: TemplateService;
  private eventBus: EventBus;
  private queueManager: QueueManager;
  private logger: Logger;

  constructor() {
    this.notificationRepo = new NotificationRepository();
    this.userRepo = new UserRepository();
    this.templateService = new TemplateService();
    this.eventBus = new EventBus();
    this.queueManager = new QueueManager();
    this.logger = Logger.getInstance();

    this.setupEventHandlers();
    this.setupQueueProcessors();
  }

  async send(request: NotificationRequest): Promise<NotificationResult> {
    try {
      // Validate user and get preferences
      const user = await this.userRepo.findById(request.userId);
      if (!user) {
        throw new Error("User not found");
      }

      if (!user.isActive) {
        throw new Error("User account is inactive");
      }

      // Filter channels based on user preferences
      const allowedChannels = this.filterChannelsByPreferences(
        request.channels,
        user.preferences
      );

      if (allowedChannels.length === 0) {
        throw new Error("No allowed channels for user preferences");
      }

      // Create notification record
      const notification = await this.notificationRepo.create({
        userId: request.userId,
        type: request.type,
        title: request.template,
        content: JSON.stringify(request.data),
        channels: allowedChannels,
        priority: request.priority,
        status: NotificationStatus.PENDING,
        scheduledAt: request.scheduling?.scheduledAt,
        metadata: request.metadata || {},
        attempts: 0,
        maxAttempts: 3,
      });

      // Publish event for processing
      await this.eventBus.publish(NotificationEvents.NOTIFICATION_REQUESTED, {
        notificationId: notification.id,
        request: {
          ...request,
          channels: allowedChannels,
        },
      });

      this.logger.info(`Notification created: ${notification.id}`, {
        userId: request.userId,
        type: request.type,
      });

      return {
        id: notification.id,
        status: NotificationStatus.PENDING,
        estimatedDelivery: this.calculateDeliveryTime(request.priority),
      };
    } catch (error) {
      this.logger.error(
        "Failed to process notification request",
        error as Error
      );
      throw error;
    }
  }

  async getHistory(
    userId: string,
    page = 1,
    limit = 20
  ): Promise<{
    notifications: Notification[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const offset = (page - 1) * limit;
    const notifications = await this.notificationRepo.findByUserId(
      userId,
      limit,
      offset
    );

    // Get total count for pagination
    const totalQuery = await this.notificationRepo["db"].query(
      "SELECT COUNT(*) FROM notifications WHERE user_id = $1",
      [userId]
    );
    const total = parseInt(totalQuery.rows[0].count);
    const totalPages = Math.ceil(total / limit);

    return {
      notifications,
      total,
      page,
      totalPages,
    };
  }

  async getStatus(notificationId: string): Promise<Notification | null> {
    return await this.notificationRepo.findById(notificationId);
  }

  async cancel(notificationId: string): Promise<boolean> {
    try {
      const notification = await this.notificationRepo.findById(notificationId);
      if (!notification) {
        return false;
      }

      if (notification.status !== NotificationStatus.PENDING) {
        return false;
      }

      await this.notificationRepo.updateStatus(
        notificationId,
        NotificationStatus.CANCELLED
      );

      this.logger.info(`Notification cancelled: ${notificationId}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to cancel notification: ${notificationId}`,
        error as Error
      );
      return false;
    }
  }

  private filterChannelsByPreferences(
    requestedChannels: Channel[],
    preferences: any
  ): Channel[] {
    if (!preferences || !preferences.channels) {
      return requestedChannels;
    }

    return requestedChannels.filter((channel) => {
      const channelPrefs = preferences.channels[channel];
      return channelPrefs && channelPrefs.enabled;
    });
  }

  private calculateDeliveryTime(priority: Priority): Date {
    const now = new Date();
    const delays = {
      [Priority.URGENT]: 1, // 1 minute
      [Priority.HIGH]: 5, // 5 minutes
      [Priority.MEDIUM]: 15, // 15 minutes
      [Priority.LOW]: 60, // 1 hour
    };

    now.setMinutes(now.getMinutes() + delays[priority]);
    return now;
  }

  private setupEventHandlers(): void {
    this.eventBus.subscribe(
      NotificationEvents.NOTIFICATION_REQUESTED,
      this.handleNotificationRequested.bind(this)
    );
  }

  private setupQueueProcessors(): void {
    this.queueManager.processQueue("notifications", async (job) => {
      const { notificationId } = job.data;
      await this.processNotification(notificationId);
    });
  }

  private async handleNotificationRequested(data: any): Promise<void> {
    const { notificationId, request } = data;

    try {
      // Update status to processing
      await this.notificationRepo.updateStatus(
        notificationId,
        NotificationStatus.PROCESSING
      );

      // Add to processing queue
      await this.queueManager.addJob(
        "notifications",
        {
          notificationId,
          request,
        },
        {
          priority: request.priority,
          delay: request.scheduling?.delay || 0,
        }
      );

      this.logger.info(`Notification queued for processing: ${notificationId}`);
    } catch (error) {
      this.logger.error(
        `Failed to queue notification: ${notificationId}`,
        error as Error
      );
      await this.notificationRepo.updateStatus(
        notificationId,
        NotificationStatus.FAILED
      );
    }
  }

  private async processNotification(notificationId: string): Promise<void> {
    try {
      const notification = await this.notificationRepo.findById(notificationId);
      if (!notification) {
        throw new Error("Notification not found");
      }

      // Render template with data
      const templateData = JSON.parse(notification.content);
      const renderedContent = await this.templateService.render(
        notification.title,
        templateData
      );

      // Process each channel
      const results = await Promise.allSettled(
        notification.channels.map((channel) =>
          this.processChannel(notification, channel, renderedContent)
        )
      );

      // Check if all channels failed
      const allFailed = results.every((result) => result.status === "rejected");

      if (allFailed) {
        await this.notificationRepo.updateStatus(
          notificationId,
          NotificationStatus.FAILED
        );
        await this.eventBus.publish(NotificationEvents.NOTIFICATION_FAILED, {
          notificationId,
          error: "All channels failed",
        });
      } else {
        await this.notificationRepo.updateStatus(
          notificationId,
          NotificationStatus.SENT
        );
        await this.eventBus.publish(NotificationEvents.NOTIFICATION_SENT, {
          notificationId,
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to process notification: ${notificationId}`,
        error as Error
      );

      // Increment attempts
      await this.notificationRepo.incrementAttempts(notificationId);

      const notification = await this.notificationRepo.findById(notificationId);
      if (notification && notification.attempts >= notification.maxAttempts) {
        await this.notificationRepo.updateStatus(
          notificationId,
          NotificationStatus.FAILED
        );
      }
    }
  }

  private async processChannel(
    notification: Notification,
    channel: Channel,
    content: any
  ): Promise<void> {
    // This would integrate with specific providers
    // For now, we'll simulate success
    this.logger.info(
      `Processing channel ${channel} for notification ${notification.id}`
    );

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 100));

    // In real implementation, this would call the appropriate provider
    // e.g., EmailProvider, SMSProvider, PushProvider, etc.
  }
}
