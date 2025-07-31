import { RedisManager } from "@/config/redis";
import { EventHandler, NotificationEvents } from "@/types";
import { Logger } from "@/utils/Logger";

export class EventBus {
  private redis: RedisManager;
  private localHandlers: Map<string, Set<EventHandler>> = new Map();
  private logger: Logger;

  constructor() {
    this.redis = RedisManager.getInstance();
    this.logger = Logger.getInstance();
    this.setupRedisSubscriber();
  }

  async publish(event: string, data: any): Promise<void> {
    try {
      await this.redis.getPublisher().publish(
        event,
        JSON.stringify({
          event,
          data,
          timestamp: new Date().toISOString(),
          nodeId: process.env.NODE_ID || "unknown",
        })
      );

      const handlers = this.localHandlers.get(event);
      if (handlers) {
        handlers.forEach((handler) => {
          setImmediate(async () => {
            try {
              await handler(data);
            } catch (error: any) {
              this.logger.error(
                `Error in local event handler for ${event}`,
                error
              );
            }
          });
        });
      }
      this.logger.info(`Published event: ${event}`, { data });
    } catch (error: any) {
      this.logger.error(`Failed to publish event: ${event}`, error);
    }
  }

  subscribe(event: string, handler: EventHandler): void {
    if (!this.localHandlers.has(event)) {
      this.localHandlers.set(event, new Set());
    }
    this.localHandlers.get(event)!.add(handler);
    this.logger.info(`Subscribed to event: ${event}`);
  }

  unsubscribe(event: string, handler: EventHandler): void {
    const handlers = this.localHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.localHandlers.delete(event);
      }
    }
  }

  private setupRedisSubscriber(): void {
    const subscriber = this.redis.getSubscriber();

    Object.values(NotificationEvents).forEach((event) => {
      subscriber.subscribe(event);
    });

    subscriber.on("message", async (channel, message) => {
      try {
        const { event, data, timestamp, nodeId } = JSON.parse(message);
        if (nodeId === (process.env.NODE_ID || "unknown")) return;

        const handlers = this.localHandlers.get(channel);
        if (handlers) {
          handlers.forEach(async (handler) => {
            try {
              await handler(data);
            } catch (error: any) {
              this.logger.error(
                `Error in Redis event handler for ${channel}`,
                error
              );
            }
          });
        }
        this.logger.info(`Recieved Redis event: ${channel}`, {
          data,
          timestamp,
          nodeId,
        });
      } catch (error: any) {
        this.logger.error(
          `Failed to process Redis message for channel: ${channel}`,
          error
        );
      }
    });
  }
}
