import { BaseRepository } from "./BaseRepository";
import { NotificationStatus, Channel } from "../types";
import { Notification } from "@/models/Notification";

export class NotificationRepository extends BaseRepository<Notification> {
  constructor() {
    super("notifications");
  }
  protected mapRow(row: any): Notification {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      title: row.title,
      content: row.content,
      channels: JSON.parse(row.channels),
      priority: row.priority,
      status: row.status,
      templateId: row.template_id,
      scheduledAt: row.scheduled_at,
      sentAt: row.sent_at,
      deliveredAt: row.delivered_at,
      failedAt: row.failed_at,
      metadata: JSON.parse(row.metadata || "{}"),
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findByUserId(
    userId: string,
    limit = 50,
    offset = 0
  ): Promise<Notification[]> {
    const query = `
        SELECT * FROM ${this.tableName}
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
    `;
    const result = await this.db.query(query, [userId, limit, offset]);
    return result.rows.map((row: Notification) => this.mapRow(row));
  }

  async findPendingNotifications(): Promise<Notification[]> {
    const query = `
        SELECT * FROM ${this.tableName}
        WHERE status = $1 AND (scheduled_at IS NULL OR scheduled_at < NOW())
        ORDER BY priority  DESC, created_at ASC
        LIMIT 100
    `;
    const result = await this.db.query(query, [NotificationStatus.PENDING]);
    return result.rows.map((row: Notification) => this.mapRow(row));
  }

  async updateStatus(
    id: string,
    status: NotificationStatus,
    additionalData?: Record<string, any>
  ): Promise<void> {
    let query = `UPDATE ${this.tableName} SET status = $1, updated_at = NOW()`;
    const params = [status, id];
    let paramIndex = 3;

    if (status === NotificationStatus.SENT && !additionalData?.sentAt) {
      query += `, sent_at = NOW()`;
    }
    if (
      status === NotificationStatus.DELIVERED &&
      !additionalData?.deliveredAt
    ) {
      query += `, delivered_at = NOW()`;
    }
    if (status === NotificationStatus.FAILED && !additionalData?.failedAt) {
      query += `, failed_at = NOW()`;
    }
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        query += `, ${key} = ${paramIndex}`;
        params.splice(-1, 0, value);
        paramIndex++;
      });
    }

    query += `WHERE id = $${params.length}`;
    await this.db.query(query, params);
  }

  async incrementAttempts(id: string): Promise<void> {
    const query = `
        UPDATE ${this.tableName}
        SET attempts = attempts + 1, updated_at = NOW()
        WHERE id = $1
    `;
    await this.db.query(query, [id]);
  }
}
