import {
  Channel,
  NotificationStatus,
  NotificationType,
  Priority,
} from "@/types";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  channels: Channel[];
  priority: Priority;
  status: NotificationStatus;
  templateId?: string;
  scheduledAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  metadata: Record<string, any>;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  updatedAt: Date;
}
