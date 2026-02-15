import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenAIProvider } from './openai-provider.js';

const mockFetch = vi.fn();

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = mockFetch;
    provider = new OpenAIProvider('test-api-key', 'https://api.openai.com');
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('complete', () => {
    it('sends correct request to OpenAI API', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Hello!' } }],
          model: 'gpt-4o',
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        }),
      });

      await provider.complete('Hello world');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key',
            'content-type': 'application/json',
          }),
        }),
      );
    });

    it('parses response correctly', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Response text' } }],
          model: 'gpt-4o',
          usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
        }),
      });

      const result = await provider.complete('Test prompt');

      expect(result.content).toBe('Response text');
      expect(result.usage.promptTokens).toBe(100);
      expect(result.usage.completionTokens).toBe(50);
      expect(result.usage.totalTokens).toBe(150);
      expect(result.model).toBe('gpt-4o');
      expect(result.provider).toBe('openai');
      expect(result.cached).toBe(false);
    });

    it('includes system message when systemPrompt provided', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'OK' } }],
          model: 'gpt-4o',
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        }),
      });

      await provider.complete('Test', { systemPrompt: 'Be helpful' });

      const callBody = JSON.parse(mockFetch.mock.calls[0]![1].body);
      expect(callBody.messages[0]).toEqual({ role: 'system', content: 'Be helpful' });
      expect(callBody.messages[1]).toEqual({ role: 'user', content: 'Test' });
    });

    it('includes temperature when provided', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'OK' } }],
          model: 'gpt-4o',
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        }),
      });

      await provider.complete('Test', { temperature: 0.7 });

      const callBody = JSON.parse(mockFetch.mock.calls[0]![1].body);
      expect(callBody.temperature).toBe(0.7);
    });

    it('sets response_format for json mode', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '{"key": "value"}' } }],
          model: 'gpt-4o',
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        }),
      });

      await provider.complete('Test', { responseFormat: 'json' });

      const callBody = JSON.parse(mockFetch.mock.calls[0]![1].body);
      expect(callBody.response_format).toEqual({ type: 'json_object' });
    });

    it('uses specified model', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'OK' } }],
          model: 'gpt-4o-mini',
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        }),
      });

      await provider.complete('Test', { model: 'gpt-4o-mini' });

      const callBody = JSON.parse(mockFetch.mock.calls[0]![1].body);
      expect(callBody.model).toBe('gpt-4o-mini');
    });

    it('throws on API error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      await expect(provider.complete('Test')).rejects.toThrow('OpenAI API error 401: Unauthorized');
    });

    it('handles empty choices gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [],
          model: 'gpt-4o',
          usage: { prompt_tokens: 10, completion_tokens: 0, total_tokens: 10 },
        }),
      });

      const result = await provider.complete('Test');
      expect(result.content).toBe('');
    });
  });

  describe('estimateCost', () => {
    it('estimates cost for gpt-4o model', () => {
      const cost = provider.estimateCost('Hello world', { model: 'gpt-4o' });
      expect(cost).toBeGreaterThan(0);
    });

    it('estimates gpt-4o-mini as cheaper than gpt-4o', () => {
      const gpt4oCost = provider.estimateCost('Hello world', { model: 'gpt-4o' });
      const miniCost = provider.estimateCost('Hello world', { model: 'gpt-4o-mini' });
      expect(miniCost).toBeLessThan(gpt4oCost);
    });
  });

  describe('isAvailable', () => {
    it('returns true when API key is set', async () => {
      const result = await provider.isAvailable();
      expect(result).toBe(true);
    });

    it('returns false when API key is empty', async () => {
      const emptyProvider = new OpenAIProvider('', undefined);
      const origEnv = process.env['OPENAI_API_KEY'];
      delete process.env['OPENAI_API_KEY'];
      const result = await emptyProvider.isAvailable();
      expect(result).toBe(false);
      if (origEnv) process.env['OPENAI_API_KEY'] = origEnv;
    });
  });

  describe('cost calculation', () => {
    it('calculates correct cost for gpt-4o', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'OK' } }],
          model: 'gpt-4o',
          usage: { prompt_tokens: 1_000_000, completion_tokens: 1_000_000, total_tokens: 2_000_000 },
        }),
      });

      const result = await provider.complete('Test', { model: 'gpt-4o' });
      // gpt-4o: input $2.50/MTok, output $10/MTok
      // 1M input + 1M output = $2.50 + $10 = $12.50
      expect(result.cost).toBeCloseTo(12.50, 2);
    });

    it('calculates correct cost for gpt-4o-mini', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'OK' } }],
          model: 'gpt-4o-mini',
          usage: { prompt_tokens: 1_000_000, completion_tokens: 1_000_000, total_tokens: 2_000_000 },
        }),
      });

      const result = await provider.complete('Test', { model: 'gpt-4o-mini' });
      // gpt-4o-mini: input $0.15/MTok, output $0.60/MTok
      // 1M input + 1M output = $0.15 + $0.60 = $0.75
      expect(result.cost).toBeCloseTo(0.75, 2);
    });
  });
});
