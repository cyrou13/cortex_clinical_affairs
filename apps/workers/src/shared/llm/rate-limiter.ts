import type { Redis } from 'ioredis';

interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

const DEFAULT_LIMITS: Record<string, RateLimitConfig> = {
  claude: { maxRequests: 50, windowSeconds: 60 },
  openai: { maxRequests: 60, windowSeconds: 60 },
  ollama: { maxRequests: Number.MAX_SAFE_INTEGER, windowSeconds: 60 },
};

const WAIT_TIMEOUT_MS = 30_000;
const WAIT_POLL_INTERVAL_MS = 500;

export class RateLimiter {
  private readonly limits: Record<string, RateLimitConfig>;

  constructor(
    private readonly redis: Redis,
    limits?: Record<string, RateLimitConfig>,
  ) {
    this.limits = limits ?? DEFAULT_LIMITS;
  }

  async tryAcquire(provider: string): Promise<boolean> {
    const config = this.limits[provider];
    if (!config || config.maxRequests === Number.MAX_SAFE_INTEGER) {
      return true; // No limit configured or unlimited
    }

    const key = `llm:ratelimit:${provider}`;
    const current = await this.redis.incr(key);

    if (current === 1) {
      // First request in window, set expiry
      await this.redis.expire(key, config.windowSeconds);
    }

    if (current > config.maxRequests) {
      return false;
    }

    return true;
  }

  async waitForSlot(provider: string, timeoutMs: number = WAIT_TIMEOUT_MS): Promise<boolean> {
    const config = this.limits[provider];
    if (!config || config.maxRequests === Number.MAX_SAFE_INTEGER) {
      return true;
    }

    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const key = `llm:ratelimit:${provider}`;
      const current = await this.redis.get(key);
      const count = current ? parseInt(current, 10) : 0;

      if (count < config.maxRequests) {
        return this.tryAcquire(provider);
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, WAIT_POLL_INTERVAL_MS));
    }

    return false;
  }

  async getRemainingRequests(provider: string): Promise<number> {
    const config = this.limits[provider];
    if (!config || config.maxRequests === Number.MAX_SAFE_INTEGER) {
      return Number.MAX_SAFE_INTEGER;
    }

    const key = `llm:ratelimit:${provider}`;
    const current = await this.redis.get(key);
    const count = current ? parseInt(current, 10) : 0;

    return Math.max(0, config.maxRequests - count);
  }
}
