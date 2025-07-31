import { Channel, NotificationStatus } from "@/types";

export interface NotificationLog {
id: string;
notificationId: string;
channel: Channel;
provider: string;
status: NotificationStatus;
response?: Record<string, any>;
error?: string;
sentAt?: Date;
deliveredAt?: Date;
createdAt: Date;
}
