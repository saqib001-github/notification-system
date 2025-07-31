export enum NotificationType {
    INFO = 'info',
    WARNING = 'warning',
    ERROR = 'error',
    SUCCESS = 'success',
    MARKETING = 'marketing',
    TRANSACTIONAL = 'transactional',
}

export enum Channel {
    EMAIL = 'email',
    SMS = 'sms',
    PUSH = 'push',
    WEBSOCKET = 'websocket',
}

export enum Priority {
    LOW = 1,
    MEDIUM = 2,
    HIGH = 3,
    URGENT = 4,
}

export enum NotificationStatus {
    PENDING = 'pending',
    SENT = 'sent',
    FAILED = 'failed',
    DELIVERED = 'delivered',
    CANCELLED = 'cancelled',
    PROCESSING = 'processing'
}

export interface NotificationRequest {
    userid: string;
    typw: NotificationType;
    priority: Priority;
    channel: Channel[];
    template: string;
    data: Record<string, any>;
    scheduling?: ScheduleConfig;
    metadata?: Record<string, any>;
}

export interface ScheduleConfig {
    scheduleAt?: Date;
    delay?: number;
    recurring?: RecurringConfig;

}
export interface RecurringConfig {
    pattern: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: Date;
}

export interface NotificationResult {
    id: string;
    status: NotificationStatus;
    estimatedDelivery?: Date;
}

export interface NotificationPreferences {
    channels: Record<Channel, ChannelPreference>;
    quiteHours?: QuietHours;
    frequency?: FrequencySettings;
}


export interface ChannelPreference {
  enabled: boolean;
  types: NotificationType[];
}

export interface QuietHours {
  enabled: boolean;
  start: string;
  end: string;
  timezone: string;
}

export interface FrequencySettings {
  maxPerHour: number;
  maxPerDay: number;
}

export interface EventHandler {
  (data: any): void | Promise<void>;
}

export interface JobOptions {
  priority?: number;
  delay?: number;
  attempts?: number;
  backoff?: BackoffOptions;
  removeOnComplete?: number;
  removeOnFail?: number;
}

export interface BackoffOptions {
  type: 'fixed' | 'exponential';
  delay: number;
}

export enum NotificationEvents {
  NOTIFICATION_REQUESTED='notification.requested',
  NOTIFICATION_PROCESSING='notification.processing',
  NOTIFICATION_SENT='notification.sent',
  NOTIFICATION_DELIVERED='notification.delivered',
  NOTIFICATION_FAILED='notification.failed',
  USER_PREFERENCES_UPDATED='user.preferences.updated',
  TEMPLATE_UPDATED='template.updated'
}