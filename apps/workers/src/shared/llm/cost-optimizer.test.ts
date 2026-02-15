import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CostOptimizer } from './cost-optimizer.js';
import { ManualRequiredError } from './llm-abstraction.js';
import type { LlmProvider } from './llm-abstraction.js';

function createMockProvider(name: string): LlmProvider {
  return {
    name,
    complete: vi.fn(),
    estimateCost: vi.fn().mockReturnValue(0),
    isAvailable: vi.fn().mockResolvedValue(true),
  };
}

describe('CostOptimizer', () => {
  let optimizer: CostOptimizer;

  beforeEach(() => {
    optimizer = new CostOptimizer();
  });

  describe('selectProvider', () => {
    it('returns explicit config when provider is available', () => {
      const providers = new Map([
        ['claude', createMockProvider('claude')],
        ['openai', createMockProvider('openai')],
      ]);

      const result = optimizer.selectProvider('scoring', providers, {
        provider: 'openai',
        model: 'gpt-4o',
      });

      expect(result).toEqual({ provider: 'openai', model: 'gpt-4o' });
    });

    it('falls back to recommendation when config provider is unavailable', () => {
      const providers = new Map([
        ['claude', createMockProvider('claude')],
      ]);

      const result = optimizer.selectProvider('scoring', providers, {
        provider: 'openai', // not available
        model: 'gpt-4o',
      });

      // Should fall to recommendation primary (claude haiku for scoring)
      expect(result.provider).toBe('claude');
      expect(result.model).toBe('claude-haiku-4-20250414');
    });

    it('selects primary recommendation for scoring (cheapest)', () => {
      const providers = new Map([
        ['claude', createMockProvider('claude')],
        ['openai', createMockProvider('openai')],
      ]);

      const result = optimizer.selectProvider('scoring', providers);
      expect(result).toEqual({ provider: 'claude', model: 'claude-haiku-4-20250414' });
    });

    it('selects primary recommendation for extraction', () => {
      const providers = new Map([
        ['claude', createMockProvider('claude')],
        ['openai', createMockProvider('openai')],
      ]);

      const result = optimizer.selectProvider('extraction', providers);
      expect(result).toEqual({ provider: 'claude', model: 'claude-sonnet-4-20250514' });
    });

    it('selects primary recommendation for drafting', () => {
      const providers = new Map([
        ['claude', createMockProvider('claude')],
      ]);

      const result = optimizer.selectProvider('drafting', providers);
      expect(result).toEqual({ provider: 'claude', model: 'claude-sonnet-4-20250514' });
    });

    it('falls back to secondary when primary is unavailable', () => {
      const providers = new Map([
        ['openai', createMockProvider('openai')],
      ]);

      const result = optimizer.selectProvider('scoring', providers);
      expect(result).toEqual({ provider: 'openai', model: 'gpt-4o-mini' });
    });

    it('falls back to ollama when primary and secondary are unavailable', () => {
      const providers = new Map([
        ['ollama', createMockProvider('ollama')],
      ]);

      const result = optimizer.selectProvider('extraction', providers);
      expect(result).toEqual({ provider: 'ollama', model: 'llama3' });
    });

    it('throws ManualRequiredError when no providers are available', () => {
      const providers = new Map<string, LlmProvider>();

      expect(() => optimizer.selectProvider('scoring', providers)).toThrow(ManualRequiredError);
    });
  });

  describe('getRecommendation', () => {
    it('returns recommendation for scoring', () => {
      const rec = optimizer.getRecommendation('scoring');
      expect(rec.primary.provider).toBe('claude');
      expect(rec.secondary.provider).toBe('openai');
    });

    it('returns recommendation for metadata_extraction', () => {
      const rec = optimizer.getRecommendation('metadata_extraction');
      expect(rec.primary.model).toBe('claude-haiku-4-20250414');
      expect(rec.secondary.model).toBe('gpt-4o-mini');
    });

    it('throws for invalid task type', () => {
      expect(() => optimizer.getRecommendation('invalid' as any)).toThrow();
    });
  });
});
