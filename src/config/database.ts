import { Pool } from 'pg';
import { config } from './environment';

export class Database {
	private static instance: Database;
	private pool: Pool;

	private constructor(){
		this.pool = new Pool(config.database);
	}

	public static getInstance():Database {
		if(!Database.instance) {
			Database.instance = new Database();
		}
		return Database.instance;
	}
	
	public async query(text: string, params?:any[]):Promise<any>{
		const client = await this.pool.connect();
		try{
			const result = await client.query(text, params);
			return result;
		} finally {
			client.release();
		}
	}

	public async transaction(callback: (client:any) => Promise<any>):Promise<any>{
		const client = await this.pool.connect();
		try{
			await client.query('BEGIN');
			const result = await callback(client);
			return result;
		}catch(error){
			await client.query('ROLLBACK');
			throw error;
		}finally{
			client.release();
		}
	}

	public async close():Promise<void>{
		await this.pool.end();
	}
}
