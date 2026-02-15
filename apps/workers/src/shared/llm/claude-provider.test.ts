import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClaudeProvider } from './claude-provider.js';

const mockFetch = vi.fn();

describe('ClaudeProvider', () => {
  let provider: ClaudeProvider;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = mockFetch;
    provider = new ClaudeProvider('test-api-key', 'https://api.anthropic.com');
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('complete', () => {
    it('sends correct request to Claude API', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: 'Hello!' }],
          model: 'claude-sonnet-4-20250514',
          usage: { input_tokens: 10, output_tokens: 5 },
        }),
      });

      await provider.complete('Hello world');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-api-key': 'test-api-key',
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          }),
        }),
      );
    });

    it('parses response correctly', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: 'Response text' }],
          model: 'claude-sonnet-4-20250514',
          usage: { input_tokens: 100, output_tokens: 50 },
        }),
      });

      const result = await provider.complete('Test prompt');

      expect(result.content).toBe('Response text');
      expect(result.usage.promptTokens).toBe(100);
      expect(result.usage.completionTokens).toBe(50);
      expect(result.usage.totalTokens).toBe(150);
      expect(result.model).toBe('claude-sonnet-4-20250514');
      expect(result.provider).toBe('claude');
      expect(result.cached).toBe(false);
    });

    it('includes system prompt when provided', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: 'OK' }],
          model: 'claude-sonnet-4-20250514',
          usage: { input_tokens: 10, output_tokens: 5 },
        }),
      });

      await provider.complete('Test', { systemPrompt: 'Be helpful' });

      const callBody = JSON.parse(mockFetch.mock.calls[0]![1].body);
      expect(callBody.system).toBe('Be helpful');
    });

    it('includes temperature when provided', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: 'OK' }],
          model: 'claude-sonnet-4-20250514',
          usage: { input_tokens: 10, output_tokens: 5 },
        }),
      });

      await provider.complete('Test', { temperature: 0.5 });

      const callBody = JSON.parse(mockFetch.mock.calls[0]![1].body);
      expect(callBody.temperature).toBe(0.5);
    });

    it('uses specified model', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: 'OK' }],
          model: 'claude-haiku-4-20250414',
          usage: { input_tokens: 10, output_tokens: 5 },
        }),
      });

      await provider.complete('Test', { model: 'claude-haiku-4-20250414' });

      const callBody = JSON.parse(mockFetch.mock.calls[0]![1].body);
      expect(callBody.model).toBe('claude-haiku-4-20250414');
    });

    it('throws on API error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => 'Rate limited',
      });

      await expect(provider.complete('Test')).rejects.toThrow('Claude API error 429: Rate limited');
    });

    it('handles multiple text blocks', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [
            { type: 'text', text: 'Part 1' },
            { type: 'text', text: ' Part 2' },
          ],
          model: 'claude-sonnet-4-20250514',
          usage: { input_tokens: 10, output_tokens: 5 },
        }),
      });

      const result = await provider.complete('Test');
      expect(result.content).toBe('Part 1 Part 2');
    });
  });

  describe('estimateCost', () => {
    it('estimates cost for sonnet model', () => {
      const cost = provider.estimateCost('Hello world', { model: 'claude-sonnet-4-20250514' });
      expect(cost).toBeGreaterThan(0);
    });

    it('estimates cost for haiku model (cheaper)', () => {
      const sonnetCost = provider.estimateCost('Hello world', { model: 'claude-sonnet-4-20250514' });
      const haikuCost = provider.estimateCost('Hello world', { model: 'claude-haiku-4-20250414' });
      expect(haikuCost).toBeLessThan(sonnetCost);
    });
  });

  describe('isAvailable', () => {
    it('returns true when API key is set', async () => {
      const result = await provider.isAvailable();
      expect(result).toBe(true);
    });

    it('returns false when API key is empty', async () => {
      const emptyProvider = new ClaudeProvider('', undefined);
      // Also clear env
      const origEnv = process.env['ANTHROPIC_API_KEY'];
      delete process.env['ANTHROPIC_API_KEY'];
      const result = await emptyProvider.isAvailable();
      expect(result).toBe(false);
      if (origEnv) process.env['ANTHROPIC_API_KEY'] = origEnv;
    });
  });

  describe('cost calculation', () => {
    it('calculates correct cost for haiku', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: 'OK' }],
          model: 'claude-haiku-4-20250414',
          usage: { input_tokens: 1_000_000, output_tokens: 1_000_000 },
        }),
      });

      const result = await provider.complete('Test', { model: 'claude-haiku-4-20250414' });
      // Haiku: input $0.25/MTok, output $1.25/MTok
      // 1M input + 1M output = $0.25 + $1.25 = $1.50
      expect(result.cost).toBeCloseTo(1.50, 2);
    });

    it('calculates correct cost for sonnet', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: 'OK' }],
          model: 'claude-sonnet-4-20250514',
          usage: { input_tokens: 1_000_000, output_tokens: 1_000_000 },
        }),
      });

      const result = await provider.complete('Test', { model: 'claude-sonnet-4-20250514' });
      // Sonnet: input $3/MTok, output $15/MTok
      // 1M input + 1M output = $3 + $15 = $18
      expect(result.cost).toBeCloseTo(18.0, 2);
    });
  });
});
