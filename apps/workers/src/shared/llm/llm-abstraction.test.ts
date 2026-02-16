import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LlmService, ManualRequiredError } from './llm-abstraction.js';
import type { LlmProvider, LlmResponse, ConfigResolver } from './llm-abstraction.js';

function createMockProvider(name: string, overrides?: Partial<LlmProvider>): LlmProvider {
  return {
    name,
    complete: vi.fn().mockResolvedValue({
      content: `Response from ${name}`,
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      cost: 0.001,
      model: 'test-model',
      provider: name,
      cached: false,
      latencyMs: 100,
    } satisfies LlmResponse),
    estimateCost: vi.fn().mockReturnValue(0.001),
    isAvailable: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function createMockRedis() {
  return {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    lpush: vi.fn().mockResolvedValue(1),
    publish: vi.fn().mockResolvedValue(1),
    del: vi.fn().mockResolvedValue(1),
    lrange: vi.fn().mockResolvedValue([]),
  } as any;
}

describe('LlmService', () => {
  let mockRedis: ReturnType<typeof createMockRedis>;
  let claudeProvider: LlmProvider;
  let openaiProvider: LlmProvider;
  let providers: Map<string, LlmProvider>;
  let configResolver: ConfigResolver;
  let service: LlmService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRedis = createMockRedis();
    claudeProvider = createMockProvider('claude');
    openaiProvider = createMockProvider('openai');
    providers = new Map([
      ['claude', claudeProvider],
      ['openai', openaiProvider],
    ]);
    configResolver = vi
      .fn()
      .mockResolvedValue({ provider: 'claude', model: 'claude-sonnet-4-20250514' });
    service = new LlmService(providers, mockRedis, configResolver);
  });

  describe('complete', () => {
    it('resolves config and calls provider', async () => {
      const result = await service.complete('scoring', 'Test prompt');
      expect(configResolver).toHaveBeenCalledWith('scoring', undefined);
      expect(claudeProvider.complete).toHaveBeenCalledWith(
        'Test prompt',
        expect.objectContaining({
          model: 'claude-sonnet-4-20250514',
        }),
      );
      expect(result.provider).toBe('claude');
    });

    it('uses project-specific config when projectId is provided', async () => {
      (configResolver as any).mockResolvedValue({ provider: 'openai', model: 'gpt-4o' });
      const result = await service.complete('extraction', 'Extract data', {}, 'project-123');
      expect(configResolver).toHaveBeenCalledWith('extraction', 'project-123');
      expect(openaiProvider.complete).toHaveBeenCalled();
      expect(result.provider).toBe('openai');
    });

    it('returns cached response when available', async () => {
      const cachedResponse: LlmResponse = {
        content: 'Cached content',
        usage: { promptTokens: 50, completionTokens: 25, totalTokens: 75 },
        cost: 0.0005,
        model: 'claude-sonnet-4-20250514',
        provider: 'claude',
        cached: false,
        latencyMs: 50,
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedResponse));

      const result = await service.complete('scoring', 'Test prompt');
      expect(result.cached).toBe(true);
      expect(result.content).toBe('Cached content');
      expect(claudeProvider.complete).not.toHaveBeenCalled();
    });

    it('calls provider when cache misses', async () => {
      mockRedis.get.mockResolvedValue(null);
      const result = await service.complete('scoring', 'Test prompt');
      expect(result.cached).toBe(false);
      expect(claudeProvider.complete).toHaveBeenCalled();
    });

    it('caches response after provider call', async () => {
      mockRedis.get.mockResolvedValue(null);
      await service.complete('scoring', 'Test prompt');
      expect(mockRedis.set).toHaveBeenCalled();
    });

    it('tracks cost after provider call', async () => {
      mockRedis.get.mockResolvedValue(null);
      await service.complete('scoring', 'Test prompt', {}, 'project-123');
      expect(mockRedis.lpush).toHaveBeenCalled();
    });

    it('throws ManualRequiredError when provider is not configured', async () => {
      (configResolver as any).mockResolvedValue({ provider: 'unknown', model: 'test' });
      await expect(service.complete('scoring', 'Test')).rejects.toThrow(ManualRequiredError);
    });

    it('throws error when rate limited and timeout expires', async () => {
      // incr always returns over-limit so tryAcquire fails
      mockRedis.incr.mockResolvedValue(999);
      // Mock get to return null for cache keys but over-limit for rate limiter keys
      mockRedis.get.mockImplementation(async (key: string) => {
        if (key.startsWith('llm:ratelimit:')) return '999';
        return null; // cache miss
      });

      // Use a short wait timeout to keep the test fast
      const fastService = new LlmService(providers, mockRedis, configResolver, {
        rateLimitWaitTimeoutMs: 600,
      });
      await expect(fastService.complete('scoring', 'Test prompt')).rejects.toThrow(
        'Rate limit exceeded',
      );
    }, 5000);

    it('uses options.model when provided, overriding config', async () => {
      await service.complete('scoring', 'Test prompt', { model: 'custom-model' });
      expect(claudeProvider.complete).toHaveBeenCalledWith(
        'Test prompt',
        expect.objectContaining({
          model: 'custom-model',
        }),
      );
    });

    it('passes systemPrompt to provider', async () => {
      await service.complete('scoring', 'Test prompt', {
        systemPrompt: 'You are a helpful assistant',
      });
      expect(claudeProvider.complete).toHaveBeenCalledWith(
        'Test prompt',
        expect.objectContaining({
          systemPrompt: 'You are a helpful assistant',
        }),
      );
    });

    it('passes temperature to provider', async () => {
      await service.complete('drafting', 'Draft this', { temperature: 0.7 });
      expect(claudeProvider.complete).toHaveBeenCalledWith(
        'Draft this',
        expect.objectContaining({
          temperature: 0.7,
        }),
      );
    });

    it('passes responseFormat to provider', async () => {
      await service.complete('extraction', 'Extract JSON', { responseFormat: 'json' });
      expect(claudeProvider.complete).toHaveBeenCalledWith(
        'Extract JSON',
        expect.objectContaining({
          responseFormat: 'json',
        }),
      );
    });
  });

  describe('getAvailableProviders', () => {
    it('returns list of available providers', async () => {
      const available = await service.getAvailableProviders();
      expect(available).toContain('claude');
      expect(available).toContain('openai');
    });

    it('excludes unavailable providers', async () => {
      (openaiProvider.isAvailable as any).mockResolvedValue(false);
      const available = await service.getAvailableProviders();
      expect(available).toContain('claude');
      expect(available).not.toContain('openai');
    });

    it('handles provider availability check errors gracefully', async () => {
      (openaiProvider.isAvailable as any).mockRejectedValue(new Error('Network error'));
      const available = await service.getAvailableProviders();
      expect(available).toEqual(['claude']);
    });
  });
});
