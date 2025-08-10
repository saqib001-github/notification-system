import twilio from 'twilio';
import { BaseNotificationProvider, ProcessedNotification, ProviderResult } from './BaseProvider';
import { Channel, NotificationStatus } from '../../types';
import { config } from '../../config/environment';
import { Logger } from '../../utils/Logger';

export class SMSProvider extends BaseNotificationProvider {
  readonly type = Channel.SMS;
  readonly name = 'sms';
  
  private client: twilio.Twilio;
  private logger: Logger;

  constructor() {
    super();
    this.logger = Logger.getInstance();
    this.client = twilio(
      config.sms.twilio.accountSid, 
      config.sms.twilio.authToken
    );
  }

  async send(notification: ProcessedNotification): Promise<ProviderResult> {
    try {
      if (!notification.recipient.phone) {
        throw new Error('Phone number is required');
      }

      const message = await this.client.messages.create({
        body: notification.content,
        from: config.sms.twilio.fromNumber,
        to: notification.recipient.phone
      });

      this.logger.info(`SMS sent successfully: ${message.sid}`, {
        to: notification.recipient.phone,
        notificationId: notification.id
      });

      return this.createResult(true, message.sid, undefined, {
        status: message.status,
        dateCreated: message.dateCreated,
        price: message.price,
        priceUnit: message.priceUnit
      });

    } catch (error) {
      this.logger.error('Failed to send SMS', error as Error);
      return this.createResult(false, undefined, (error as Error).message);
    }
  }

  validateConfig(): boolean {
    return !!(
      config.sms.twilio.accountSid &&
      config.sms.twilio.authToken &&
      config.sms.twilio.fromNumber
    );
  }

  async getDeliveryStatus(messageId: string): Promise<NotificationStatus> {
    try {
      const message = await this.client.messages(messageId).fetch();
      
      switch (message.status) {
        case 'delivered':
          return NotificationStatus.DELIVERED;
        case 'failed':
        case 'undelivered':
          return NotificationStatus.FAILED;
        case 'sent':
          return NotificationStatus.SENT;
        default:
          return NotificationStatus.PROCESSING;
      }
    } catch (error) {
      this.logger.error(`Failed to get SMS delivery status: ${messageId}`, error as Error);
      return NotificationStatus.FAILED;
    }
  }
}
