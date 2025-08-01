import { BaseRepository } from './BaseRepository';
import { NotificationType } from '../types';
import { Template } from '@/models/Template';

export class TemplateRepository extends BaseRepository<Template> {
  constructor() {
    super('templates');
  }

  protected mapRow(row: any): Template {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      subject: row.subject,
      body: row.body,
      variables: JSON.parse(row.variables || '[]'),
      isActive: row.is_active,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async findByName(name: string): Promise<Template | null> {
    const query = `SELECT * FROM ${this.tableName} WHERE name = $1 AND is_active = true`;
    const result = await this.db.query(query, [name]);
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async findByType(type: NotificationType): Promise<Template[]> {
    const query = `SELECT * FROM ${this.tableName} WHERE type = $1 AND is_active = true`;
    const result = await this.db.query(query, [type]);
    return result.rows.map((row: Template) => this.mapRow(row));
  }

  async findActive(): Promise<Template[]> {
    const query = `SELECT * FROM ${this.tableName} WHERE is_active = true ORDER BY name`;
    const result = await this.db.query(query);
    return result.rows.map((row: Template) => this.mapRow(row));
  }
}
