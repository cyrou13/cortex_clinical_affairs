import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LlmCache } from './llm-cache.js';
import type { LlmResponse } from './llm-abstraction.js';

function createMockRedis() {
  return {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
  } as any;
}

const sampleResponse: LlmResponse = {
  content: 'Test response',
  usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
  cost: 0.001,
  model: 'claude-sonnet-4-20250514',
  provider: 'claude',
  cached: false,
  latencyMs: 200,
};

describe('LlmCache', () => {
  let cache: LlmCache;
  let mockRedis: ReturnType<typeof createMockRedis>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRedis = createMockRedis();
    cache = new LlmCache(mockRedis);
  });

  describe('get', () => {
    it('returns null on cache miss', async () => {
      mockRedis.get.mockResolvedValue(null);
      const result = await cache.get('Test prompt', 'model-1');
      expect(result).toBeNull();
    });

    it('returns cached response on cache hit', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(sampleResponse));
      const result = await cache.get('Test prompt', 'claude-sonnet-4-20250514');
      expect(result).toEqual(sampleResponse);
    });

    it('returns null for invalid cached JSON', async () => {
      mockRedis.get.mockResolvedValue('not-valid-json{{{');
      const result = await cache.get('Test prompt', 'model-1');
      expect(result).toBeNull();
    });

    it('uses consistent cache key for same inputs', async () => {
      await cache.get('prompt A', 'model-1', 'system');
      const firstKey = mockRedis.get.mock.calls[0][0];

      await cache.get('prompt A', 'model-1', 'system');
      const secondKey = mockRedis.get.mock.calls[1][0];

      expect(firstKey).toBe(secondKey);
    });

    it('uses different cache keys for different inputs', async () => {
      await cache.get('prompt A', 'model-1');
      const keyA = mockRedis.get.mock.calls[0][0];

      await cache.get('prompt B', 'model-1');
      const keyB = mockRedis.get.mock.calls[1][0];

      expect(keyA).not.toBe(keyB);
    });
  });

  describe('set', () => {
    it('stores response with default TTL (24h)', async () => {
      await cache.set('Test prompt', 'model-1', undefined, sampleResponse);

      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining('llm:cache:'),
        JSON.stringify(sampleResponse),
        'EX',
        86400, // 24 hours
      );
    });

    it('stores response with custom TTL', async () => {
      await cache.set('Test prompt', 'model-1', undefined, sampleResponse, 3600);

      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'EX',
        3600,
      );
    });

    it('uses SHA-256 hash in cache key', async () => {
      await cache.set('Test prompt', 'model-1', undefined, sampleResponse);

      const key = mockRedis.set.mock.calls[0][0] as string;
      expect(key).toMatch(/^llm:cache:[a-f0-9]{64}$/);
    });
  });

  describe('invalidate', () => {
    it('deletes cache entry', async () => {
      await cache.invalidate('Test prompt', 'model-1');
      expect(mockRedis.del).toHaveBeenCalledWith(expect.stringContaining('llm:cache:'));
    });
  });
});
