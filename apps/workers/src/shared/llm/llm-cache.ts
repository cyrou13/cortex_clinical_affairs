import { createHash } from 'node:crypto';
import type { Redis } from 'ioredis';
import type { LlmResponse } from './llm-abstraction.js';

const DEFAULT_TTL_SECONDS = 24 * 60 * 60; // 24 hours
const CACHE_PREFIX = 'llm:cache:';

export class LlmCache {
  constructor(private readonly redis: Redis) {}

  async get(prompt: string, model: string, systemPrompt?: string): Promise<LlmResponse | null> {
    const key = this.buildKey(prompt, model, systemPrompt);
    const cached = await this.redis.get(key);

    if (!cached) {
      return null;
    }

    try {
      return JSON.parse(cached) as LlmResponse;
    } catch {
      return null;
    }
  }

  async set(
    prompt: string,
    model: string,
    systemPrompt: string | undefined,
    response: LlmResponse,
    ttlSeconds: number = DEFAULT_TTL_SECONDS,
  ): Promise<void> {
    const key = this.buildKey(prompt, model, systemPrompt);
    await this.redis.set(key, JSON.stringify(response), 'EX', ttlSeconds);
  }

  async invalidate(prompt: string, model: string, systemPrompt?: string): Promise<void> {
    const key = this.buildKey(prompt, model, systemPrompt);
    await this.redis.del(key);
  }

  private buildKey(prompt: string, model: string, systemPrompt?: string): string {
    const input = `${prompt}|${model}|${systemPrompt ?? ''}`;
    const hash = createHash('sha256').update(input).digest('hex');
    return `${CACHE_PREFIX}${hash}`;
  }
}
