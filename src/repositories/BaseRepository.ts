import { Database } from "../config/database";

export abstract class BaseRepository<T> {
    protected db:Database;
    protected tableName: string;

    constructor(tableName: string){
        this.db = Database.getInstance();
        this.tableName = tableName;
    }

    async create(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
        const keys = Object.keys(entity);
        const values = Object.values(entity);
        const placeholders = values.map((_, index)=> `$${index+1}`).join(', ');

        const query = `
            INSERT INTO ${this.tableName} (${keys.join(', ')}, created_at, updated_at)
            VALUES (${placeholders}, NOW(), NOW())
            RETURNING *
        `;

        const result = await this.db.query(query,values);
        return this.mapRow(result.rows[0]);
    }

    async findById(id: string): Promise<T | null> {
        const query = `SELECT * FROM ${this.tableName} WHERE id = $1`;
        const result = await this.db.query(query,[id]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    async update(id: string, updates: Partial<T>): Promise<T> {
        const keys = Object.keys(updates);
        const values = Object.values(updates);
        const setClause = keys.map(( key, index ) => `${key}= $${index+2}`).join(', ');

        const query = `
            UPDATE ${this.tableName}
            SET ${setClause}, updated_at = NOW()
            WHERE id = $1
            RETURNING *
        `;
        const result = await  this.db.query(query, [id, ...values]);
        return this.mapRow(result.rows[0]);
    }

    async delete(id: string): Promise<boolean> {
        const query = `DELETE FROM ${this.tableName} WHERE id = $1`;
        const result = await this.db.query(query, [id]);
        return result.rowCount > 0;
    }

    protected abstract mapRow(row: any): T;
}