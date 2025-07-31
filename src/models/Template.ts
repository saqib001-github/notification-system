import { NotificationType } from "@/types";

export interface Template {
id: string;
name: string;
type: NotificationType;
subject: string;
body: string;
variables: string[];
isActive: boolean;
createdBy: string;
createdAt: Date;
updatedAt: Date;
}
