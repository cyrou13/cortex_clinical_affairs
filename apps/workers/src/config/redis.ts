import { Redis } from 'ioredis';

let redisInstance: Redis | null = null;

export function getRedisUrl(): string {
  return process.env['REDIS_URL'] ?? 'redis://localhost:6379';
}

export function getRedis(): Redis {
  if (!redisInstance) {
    redisInstance = new Redis(getRedisUrl(), {
      maxRetriesPerRequest: null, // Required by BullMQ
      enableReadyCheck: false,
    });
  }
  return redisInstance;
}

/**
 * Returns connection options compatible with BullMQ's ConnectionOptions (RedisOptions).
 * Uses RedisOptions format to avoid ioredis instance version mismatch issues.
 */
export function getBullMQConnection() {
  return {
    url: getRedisUrl(),
    maxRetriesPerRequest: null as null,
    enableReadyCheck: false,
  };
}

export async function disconnectRedis(): Promise<void> {
  if (redisInstance) {
    await redisInstance.quit();
    redisInstance = null;
  }
}
