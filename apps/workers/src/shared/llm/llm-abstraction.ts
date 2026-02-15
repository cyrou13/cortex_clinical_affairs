import type { Redis } from 'ioredis';
import { LlmCache } from './llm-cache.js';
import { RateLimiter } from './rate-limiter.js';
import { CostTracker } from './cost-tracker.js';
import type { TaskType } from './types.js';

export interface LlmProvider {
  name: string;
  complete(prompt: string, options: LlmOptions): Promise<LlmResponse>;
  estimateCost(prompt: string, options: LlmOptions): number;
  isAvailable(): Promise<boolean>;
}

export interface LlmOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  responseFormat?: 'text' | 'json';
}

export interface LlmResponse {
  content: string;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  cost: number;
  model: string;
  provider: string;
  cached: boolean;
  latencyMs: number;
}

export interface LlmConfig {
  provider: string;
  model: string;
}

export type ConfigResolver = (taskType: TaskType, projectId?: string) => Promise<LlmConfig>;

export class ManualRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ManualRequiredError';
  }
}

export class LlmService {
  private cache: LlmCache;
  private rateLimiter: RateLimiter;
  private costTracker: CostTracker;
  private rateLimitWaitTimeoutMs: number;

  constructor(
    private readonly providers: Map<string, LlmProvider>,
    redis: Redis,
    private readonly configResolver: ConfigResolver,
    options?: { rateLimitWaitTimeoutMs?: number },
  ) {
    this.cache = new LlmCache(redis);
    this.rateLimiter = new RateLimiter(redis);
    this.costTracker = new CostTracker(redis);
    this.rateLimitWaitTimeoutMs = options?.rateLimitWaitTimeoutMs ?? 30_000;
  }

  async complete(
    taskType: TaskType,
    prompt: string,
    options: LlmOptions = {},
    projectId?: string,
  ): Promise<LlmResponse> {
    // Resolve config (task level -> project level -> system default)
    const config = await this.configResolver(taskType, projectId);
    const model = options.model ?? config.model;
    const providerName = config.provider;

    // Check cache
    const cached = await this.cache.get(prompt, model, options.systemPrompt);
    if (cached) {
      return { ...cached, cached: true };
    }

    // Get provider
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new ManualRequiredError(`Provider '${providerName}' is not configured`);
    }

    // Check rate limit
    const allowed = await this.rateLimiter.tryAcquire(providerName);
    if (!allowed) {
      // Try to wait for a slot
      const acquired = await this.rateLimiter.waitForSlot(providerName, this.rateLimitWaitTimeoutMs);
      if (!acquired) {
        throw new Error(`Rate limit exceeded for provider '${providerName}'`);
      }
    }

    // Call provider
    const start = Date.now();
    const response = await provider.complete(prompt, { ...options, model });
    const latencyMs = Date.now() - start;

    const result: LlmResponse = {
      ...response,
      latencyMs,
      cached: false,
    };

    // Cache result
    await this.cache.set(prompt, model, options.systemPrompt, result);

    // Track cost
    await this.costTracker.trackCost(
      projectId ?? null,
      taskType,
      providerName,
      model,
      result.usage,
      result.cost,
    );

    return result;
  }

  async getAvailableProviders(): Promise<string[]> {
    const available: string[] = [];
    for (const [name, provider] of this.providers) {
      try {
        if (await provider.isAvailable()) {
          available.push(name);
        }
      } catch {
        // Provider not available
      }
    }
    return available;
  }
}
