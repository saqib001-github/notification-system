import Bull from "bull";
import { RedisManager } from "@/config/redis";
import { Logger } from "@/utils/Logger";
import { JobOptions } from "@/types";

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export class QueueManager {
  private queues: Map<string, Bull.Queue> = new Map();
  private redis: RedisManager;
  private logger: Logger;

  constructor() {
    this.redis = RedisManager.getInstance();
    this.logger = Logger.getInstance();
  }

  getQueue(name: string): Bull.Queue {
    if (!this.queues.has(name)) {
      const queue = new Bull(name, {
        redis: {
          host: this.redis.getClient().options.host,
          port: this.redis.getClient().options.port,
          password: this.redis.getClient().options.password,
          db: this.redis.getClient().options.db,
        },
        defaultJobOptions: {
          removeOnComplete: 10,
          removeOnFail: 5,
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 2000,
          },
        },
      });

      queue.on("completed", (job) => {
        this.logger.info(`Job completed: ${job.id} in queue: ${name}`);
      });

      queue.on("failed", (job, err) => {
        this.logger.error(`Job failed: ${job.id} in queue: ${name}`, err);
      });

      queue.on("stalled", (job) => {
        this.logger.warn(`Job stalled: ${job.id} in queue: ${name}`);
      });

      this.queues.set(name, queue);
    }
    return this.queues.get(name)!;
  }

  async addJob(
    queueName: string,
    jobData: any,
    options?: JobOptions
  ): Promise<Bull.Job> {
    const queue = this.getQueue(queueName);
    const job = await queue.add(jobData, {
      priority: options?.priority || 0,
      delay: options?.delay || 0,
      attempts: options?.attempts || 3,
      backoff: options?.backoff || { type: "exponential", delay: 2000 },
      removeOnComplete: options?.removeOnComplete || 10,
      removeOnFail: options?.removeOnFail || 5,
    });

    this.logger.info(`Job added: ${job.id} to queue: ${queueName}`);
    return job;
  }

  processQueue(
    queueName: string,
    processor: Bull.ProcessCallbackFunction<any>
  ): void {
    const queue = this.getQueue(queueName);
    queue.process(processor);
    this.logger.info(`Started processing queue: ${queueName}`);
  }

  async getQueueStats(queueName: string): Promise<QueueStats> {
    const queue = this.getQueue(queueName);
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
      queue.getDelayed(),
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
    };
  }

  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.pause();
    this.logger.info(`Paused queue: ${queueName}`);
  }

  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.resume();
    this.logger.info(`Resumed queue: ${queueName}`);
  }

  async closeAllQueues(): Promise<void> {
    await Promise.all(
      Array.from(this.queues.values()).map((queue) => queue.close())
    );
    this.queues.clear();
    this.logger.info("All queues closed");
  }
}
