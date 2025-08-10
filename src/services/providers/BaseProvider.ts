import { Channel, NotificationStatus } from '../../types';

export interface ProviderResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ProcessedNotification {
  id: string;
  recipient: {
    email?: string;
    phone?: string;
    deviceToken?: string;
  };
  subject: string;
  content: string;
  attachments?: any[];
  metadata: Record<string, any>;
}

export abstract class BaseNotificationProvider {
  abstract readonly type: Channel;
  abstract readonly name: string;

  abstract send(notification: ProcessedNotification): Promise<ProviderResult>;
  abstract validateConfig(): boolean;
  abstract getDeliveryStatus(messageId: string): Promise<NotificationStatus>;

  protected createResult(
    success: boolean, 
    messageId?: string, 
    error?: string, 
    metadata?: Record<string, any>
  ): ProviderResult {
    return {
      success,
      messageId,
      error,
      provider: this.name,
      timestamp: new Date(),
      metadata
    };
  }
}
