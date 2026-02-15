import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OllamaProvider } from './ollama-provider.js';

const mockFetch = vi.fn();

describe('OllamaProvider', () => {
  let provider: OllamaProvider;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = mockFetch;
    provider = new OllamaProvider('http://localhost:11434');
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('complete', () => {
    it('sends correct request to Ollama API', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          response: 'Hello from Ollama!',
          model: 'llama3',
          prompt_eval_count: 10,
          eval_count: 20,
        }),
      });

      await provider.complete('Hello world');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/generate',
        expect.objectContaining({
          method: 'POST',
          headers: { 'content-type': 'application/json' },
        }),
      );

      const callBody = JSON.parse(mockFetch.mock.calls[0]![1].body);
      expect(callBody.model).toBe('llama3');
      expect(callBody.stream).toBe(false);
    });

    it('parses response correctly', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          response: 'Test response',
          model: 'llama3',
          prompt_eval_count: 15,
          eval_count: 25,
        }),
      });

      const result = await provider.complete('Test');

      expect(result.content).toBe('Test response');
      expect(result.usage.promptTokens).toBe(15);
      expect(result.usage.completionTokens).toBe(25);
      expect(result.usage.totalTokens).toBe(40);
      expect(result.cost).toBe(0);
      expect(result.provider).toBe('ollama');
    });

    it('prepends system prompt to prompt', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          response: 'OK',
          model: 'llama3',
          prompt_eval_count: 10,
          eval_count: 5,
        }),
      });

      await provider.complete('Test', { systemPrompt: 'Be helpful' });

      const callBody = JSON.parse(mockFetch.mock.calls[0]![1].body);
      expect(callBody.prompt).toContain('Be helpful');
      expect(callBody.prompt).toContain('Test');
    });

    it('sets json format when requested', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          response: '{"key": "value"}',
          model: 'llama3',
        }),
      });

      await provider.complete('Test', { responseFormat: 'json' });

      const callBody = JSON.parse(mockFetch.mock.calls[0]![1].body);
      expect(callBody.format).toBe('json');
    });

    it('throws on API error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal server error',
      });

      await expect(provider.complete('Test')).rejects.toThrow('Ollama API error 500');
    });

    it('estimates tokens when not provided by API', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          response: 'Short response',
          model: 'llama3',
          // No token counts provided
        }),
      });

      const result = await provider.complete('Test prompt');
      expect(result.usage.promptTokens).toBeGreaterThan(0);
      expect(result.usage.completionTokens).toBeGreaterThan(0);
    });
  });

  describe('estimateCost', () => {
    it('always returns 0', () => {
      const cost = provider.estimateCost('Hello world', { model: 'llama3' });
      expect(cost).toBe(0);
    });
  });

  describe('isAvailable', () => {
    it('returns true when Ollama endpoint responds', async () => {
      mockFetch.mockResolvedValue({ ok: true });
      const result = await provider.isAvailable();
      expect(result).toBe(true);
    });

    it('returns false when Ollama endpoint fails', async () => {
      mockFetch.mockRejectedValue(new Error('Connection refused'));
      const result = await provider.isAvailable();
      expect(result).toBe(false);
    });
  });
});
