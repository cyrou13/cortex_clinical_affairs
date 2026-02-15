import { Redis } from 'ioredis';
import { logger } from '../shared/utils/logger.js';

export interface RedisConfig {
  url: string;
}

let redisInstance: Redis | null = null;

export function getRedisUrl(): string {
  return process.env['REDIS_URL'] ?? 'redis://localhost:6379';
}

export function getRedis(): Redis {
  if (!redisInstance) {
    const url = getRedisUrl();
    redisInstance = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        if (times > 3) {
          logger.warn('Redis connection failed after 3 retries');
          return null;
        }
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });
  }
  return redisInstance;
}

export async function disconnectRedis(): Promise<void> {
  if (redisInstance) {
    await redisInstance.quit();
    redisInstance = null;
  }
}
