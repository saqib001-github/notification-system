import { BaseRepository } from './BaseRepository';
import { NotificationPreferences } from '../types';
import { User } from '@/models/User';

export class UserRepository extends BaseRepository<User> {
  constructor() {
    super('users');
  }

  protected mapRow(row: any): User {
    return {
      id: row.id,
      email: row.email,
      phoneNumber: row.phone_number,
      firstName: row.first_name,
      lastName: row.last_name,
      preferences: JSON.parse(row.preferences || '{}'),
      isActive: row.is_active,
      lastLoginAt: row.last_login_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async findByEmail(email: string): Promise<User | null> {
    const query = `SELECT * FROM ${this.tableName} WHERE email = $1`;
    const result = await this.db.query(query, [email]);
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async updatePreferences(userId: string, preferences: NotificationPreferences): Promise<void> {
    const query = `
      UPDATE ${this.tableName} 
      SET preferences = $1, updated_at = NOW()
      WHERE id = $2
    `;
    await this.db.query(query, [JSON.stringify(preferences), userId]);
  }

  async updateLastLogin(userId: string): Promise<void> {
    const query = `
      UPDATE ${this.tableName} 
      SET last_login_at = NOW(), updated_at = NOW()
      WHERE id = $1
    `;
    await this.db.query(query, [userId]);
  }
}
