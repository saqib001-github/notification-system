import { Request, Response, NextFunction } from 'express';
import { RedisManager } from '../../config/redis';
import { Logger } from '../../utils/Logger';

export class RateLimiter {
  private redis: RedisManager;
  private logger: Logger;

  constructor() {
    this.redis = RedisManager.getInstance();
    this.logger = Logger.getInstance();
  }

  async checkLimit(key: string, limit: number, windowMs: number): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
  }> {
    const client = this.redis.getClient();
    const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
    const windowKey = `rate_limit:${key}:${windowStart}`;

    try {
      const current = await client.incr(windowKey);
      
      if (current === 1) {
        await client.expire(windowKey, Math.ceil(windowMs / 1000));
      }

      const remaining = Math.max(0, limit - current);
      const resetTime = windowStart + windowMs;

      return {
        allowed: current <= limit,
        remaining,
        resetTime
      };

    } catch (error) {
      this.logger.error('Rate limiter error', error as Error);
      // Allow request if Redis is down
      return {
        allowed: true,
        remaining: limit,
        resetTime: Date.now() + windowMs
      };
    }
  }

  createMiddleware(limit: number, windowMs: number) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const identifier = req.ip || 'unknown';
      const key = `${req.method}:${req.route?.path || req.path}:${identifier}`;
      
      const result = await this.checkLimit(key, limit, windowMs);

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
      });

      if (!result.allowed) {
        this.logger.warn(`Rate limit exceeded for ${identifier}`, {
          method: req.method,
          path: req.path,
          limit,
          windowMs
        });

        res.status(429).json({
          success: false,
          error: 'Too many requests',
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
        });
        return;
      }

      next();
    };
  }
}

export const rateLimiter = new RateLimiter();
