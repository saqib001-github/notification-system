import { NotificationPreferences } from "@/types";

export interface User {
id: string;
email: string;
phoneNumber?: string;
firstName: string;
lastName: string;
preferences: NotificationPreferences;
isActive: boolean;
lastLoginAt?: Date;
createdAt: Date;
updatedAt: Date;
}
