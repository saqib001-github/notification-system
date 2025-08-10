import nodemailer from 'nodemailer';
import { BaseNotificationProvider, ProcessedNotification, ProviderResult } from './BaseProvider';
import { Channel, NotificationStatus } from '../../types';
import { config } from '../../config/environment';
import { Logger } from '../../utils/Logger';

export class EmailProvider extends BaseNotificationProvider {
  readonly type = Channel.EMAIL;
  readonly name = 'email';
  
  private transporter: nodemailer.Transporter;
  private logger: Logger;

  constructor() {
    super();
    this.logger = Logger.getInstance();
    this.transporter = nodemailer.createTransport({
      host: config.email.smtp.host,
      port: config.email.smtp.port,
      secure: config.email.smtp.secure,
      auth: {
        user: config.email.smtp.auth.user,
        pass: config.email.smtp.auth.pass
      }
    });
  }

  async send(notification: ProcessedNotification): Promise<ProviderResult> {
    try {
      if (!notification.recipient.email) {
        throw new Error('Email address is required');
      }

      const mailOptions = {
        from: config.email.smtp.auth.user,
        to: notification.recipient.email,
        subject: notification.subject,
        html: notification.content,
        attachments: notification.attachments || []
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      this.logger.info(`Email sent successfully: ${info.messageId}`, {
        to: notification.recipient.email,
        notificationId: notification.id
      });

      return this.createResult(true, info.messageId, undefined, {
        response: info.response,
        accepted: info.accepted,
        rejected: info.rejected
      });

    } catch (error) {
      this.logger.error('Failed to send email', error as Error);
      return this.createResult(false, undefined, (error as Error).message);
    }
  }

  validateConfig(): boolean {
    return !!(
      config.email.smtp.host &&
      config.email.smtp.auth.user &&
      config.email.smtp.auth.pass
    );
  }

  async getDeliveryStatus(messageId: string): Promise<NotificationStatus> {
    // In a real implementation, you would check with your email service provider
    // For now, we'll return a default status
    return NotificationStatus.DELIVERED;
  }
}
