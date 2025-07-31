import Redis from 'ioredis';
import { config } from './environment';

export class RedisManager {
	private static instance: RedisManager;
	private client: Redis;
	private subscriber: Redis;
	private publisher: Redis;

	
	private constructor(){
		this.client = new Redis(config.redis);
		this.subscriber = new Redis(config.redis);
		this.publisher = new Redis(config.redis);
	}

	public static getInstance(): RedisManager {
		if(!RedisManager.instance){
			RedisManager.instance = new RedisManager();
		}
		return RedisManager.instance;
	}
	public getClient():Redis{
		return this.client;
	}
	public getSubscriber():Redis {
		return this.subscriber;
	}
	public getPublisher(): Redis {
		return this.publisher;
	}

	public async connect(): Promise<void> {
		await Promise.all([
			this.client.connect(),
			this.subscriber.connect(),
			this.publisher.connect()
		]);
	}

	public async disconnect(): Promise<void> {
		await Promise.all([
			this.client.disconnect(),
			this.subscriber.disconnect(),
			this.publisher.disconnect()
		]);
	}

}
