import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RateLimiter } from './rate-limiter.js';

function createMockRedis() {
  return {
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    get: vi.fn().mockResolvedValue(null),
  } as any;
}

describe('RateLimiter', () => {
  let limiter: RateLimiter;
  let mockRedis: ReturnType<typeof createMockRedis>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRedis = createMockRedis();
    limiter = new RateLimiter(mockRedis);
  });

  describe('tryAcquire', () => {
    it('allows first request', async () => {
      mockRedis.incr.mockResolvedValue(1);
      const result = await limiter.tryAcquire('claude');
      expect(result).toBe(true);
    });

    it('sets expiry on first request', async () => {
      mockRedis.incr.mockResolvedValue(1);
      await limiter.tryAcquire('claude');
      expect(mockRedis.expire).toHaveBeenCalledWith('llm:ratelimit:claude', 60);
    });

    it('allows request within limit', async () => {
      mockRedis.incr.mockResolvedValue(50); // Claude limit is 50
      const result = await limiter.tryAcquire('claude');
      expect(result).toBe(true);
    });

    it('rejects request exceeding limit', async () => {
      mockRedis.incr.mockResolvedValue(51); // Over Claude limit of 50
      const result = await limiter.tryAcquire('claude');
      expect(result).toBe(false);
    });

    it('allows unlimited requests for ollama', async () => {
      mockRedis.incr.mockResolvedValue(999999);
      const result = await limiter.tryAcquire('ollama');
      expect(result).toBe(true);
    });

    it('allows requests for unknown provider (no limit)', async () => {
      const result = await limiter.tryAcquire('unknown-provider');
      expect(result).toBe(true);
    });

    it('uses correct key per provider', async () => {
      mockRedis.incr.mockResolvedValue(1);
      await limiter.tryAcquire('openai');
      expect(mockRedis.incr).toHaveBeenCalledWith('llm:ratelimit:openai');
    });

    it('does not set expiry on subsequent requests', async () => {
      mockRedis.incr.mockResolvedValue(2);
      await limiter.tryAcquire('claude');
      expect(mockRedis.expire).not.toHaveBeenCalled();
    });
  });

  describe('waitForSlot', () => {
    it('returns true immediately when under limit', async () => {
      mockRedis.get.mockResolvedValue('10');
      mockRedis.incr.mockResolvedValue(11);
      const result = await limiter.waitForSlot('claude', 1000);
      expect(result).toBe(true);
    });

    it('returns true for unlimited providers', async () => {
      const result = await limiter.waitForSlot('ollama', 100);
      expect(result).toBe(true);
    });

    it('returns false when timeout expires', async () => {
      mockRedis.get.mockResolvedValue('999');
      const result = await limiter.waitForSlot('claude', 600);
      expect(result).toBe(false);
    }, 5000);
  });

  describe('getRemainingRequests', () => {
    it('returns full capacity when no requests made', async () => {
      mockRedis.get.mockResolvedValue(null);
      const remaining = await limiter.getRemainingRequests('claude');
      expect(remaining).toBe(50);
    });

    it('returns correct remaining count', async () => {
      mockRedis.get.mockResolvedValue('30');
      const remaining = await limiter.getRemainingRequests('claude');
      expect(remaining).toBe(20);
    });

    it('returns 0 when at limit', async () => {
      mockRedis.get.mockResolvedValue('50');
      const remaining = await limiter.getRemainingRequests('claude');
      expect(remaining).toBe(0);
    });

    it('returns MAX_SAFE_INTEGER for unlimited providers', async () => {
      const remaining = await limiter.getRemainingRequests('ollama');
      expect(remaining).toBe(Number.MAX_SAFE_INTEGER);
    });
  });

  describe('custom limits', () => {
    it('uses custom limits when provided', async () => {
      const customLimiter = new RateLimiter(mockRedis, {
        claude: { maxRequests: 10, windowSeconds: 30 },
      });

      mockRedis.incr.mockResolvedValue(11);
      const result = await customLimiter.tryAcquire('claude');
      expect(result).toBe(false);
    });
  });
});
