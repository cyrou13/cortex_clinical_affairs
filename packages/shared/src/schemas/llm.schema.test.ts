import { describe, it, expect } from 'vitest';
import {
  LlmConfigLevel,
  LlmTaskType,
  LlmProviderName,
  CreateLlmConfigInput,
  UpdateLlmConfigInput,
  LlmCostSummary,
} from './llm.schema.js';

describe('LlmConfigLevel enum', () => {
  it.each(['SYSTEM', 'PROJECT', 'TASK'])('accepts %s', (value) => {
    expect(LlmConfigLevel.safeParse(value).success).toBe(true);
  });

  it('rejects invalid value', () => {
    expect(LlmConfigLevel.safeParse('GLOBAL').success).toBe(false);
  });

  it('rejects empty string', () => {
    expect(LlmConfigLevel.safeParse('').success).toBe(false);
  });
});

describe('LlmTaskType enum', () => {
  it.each(['scoring', 'extraction', 'drafting', 'metadata_extraction'])('accepts %s', (value) => {
    expect(LlmTaskType.safeParse(value).success).toBe(true);
  });

  it('rejects invalid value', () => {
    expect(LlmTaskType.safeParse('summarization').success).toBe(false);
  });
});

describe('LlmProviderName enum', () => {
  it.each(['claude', 'openai', 'ollama'])('accepts %s', (value) => {
    expect(LlmProviderName.safeParse(value).success).toBe(true);
  });

  it('rejects invalid value', () => {
    expect(LlmProviderName.safeParse('gemini').success).toBe(false);
  });
});

describe('CreateLlmConfigInput', () => {
  it('accepts valid SYSTEM level config', () => {
    const result = CreateLlmConfigInput.safeParse({
      level: 'SYSTEM',
      provider: 'claude',
      model: 'claude-sonnet-4-20250514',
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid PROJECT level config with projectId', () => {
    const result = CreateLlmConfigInput.safeParse({
      level: 'PROJECT',
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      provider: 'openai',
      model: 'gpt-4o',
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid TASK level config with taskType', () => {
    const result = CreateLlmConfigInput.safeParse({
      level: 'TASK',
      taskType: 'scoring',
      provider: 'claude',
      model: 'claude-haiku-4-20250414',
    });
    expect(result.success).toBe(true);
  });

  it('rejects PROJECT level without projectId', () => {
    const result = CreateLlmConfigInput.safeParse({
      level: 'PROJECT',
      provider: 'claude',
      model: 'claude-sonnet-4-20250514',
    });
    expect(result.success).toBe(false);
  });

  it('rejects TASK level without taskType', () => {
    const result = CreateLlmConfigInput.safeParse({
      level: 'TASK',
      provider: 'claude',
      model: 'claude-sonnet-4-20250514',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid provider', () => {
    const result = CreateLlmConfigInput.safeParse({
      level: 'SYSTEM',
      provider: 'gemini',
      model: 'gemini-pro',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty model name', () => {
    const result = CreateLlmConfigInput.safeParse({
      level: 'SYSTEM',
      provider: 'claude',
      model: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid projectId format', () => {
    const result = CreateLlmConfigInput.safeParse({
      level: 'PROJECT',
      projectId: 'not-a-uuid',
      provider: 'claude',
      model: 'claude-sonnet-4-20250514',
    });
    expect(result.success).toBe(false);
  });
});

describe('UpdateLlmConfigInput', () => {
  it('accepts provider-only update', () => {
    const result = UpdateLlmConfigInput.safeParse({ provider: 'openai' });
    expect(result.success).toBe(true);
  });

  it('accepts model-only update', () => {
    const result = UpdateLlmConfigInput.safeParse({ model: 'gpt-4o-mini' });
    expect(result.success).toBe(true);
  });

  it('accepts isActive-only update', () => {
    const result = UpdateLlmConfigInput.safeParse({ isActive: false });
    expect(result.success).toBe(true);
  });

  it('rejects empty update (no fields)', () => {
    const result = UpdateLlmConfigInput.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects invalid provider', () => {
    const result = UpdateLlmConfigInput.safeParse({ provider: 'gemini' });
    expect(result.success).toBe(false);
  });
});

describe('LlmCostSummary', () => {
  it('accepts valid cost summary', () => {
    const result = LlmCostSummary.safeParse({
      totalCostUsd: 1.50,
      totalPromptTokens: 10000,
      totalCompletionTokens: 5000,
      byProvider: {
        claude: { costUsd: 1.50, promptTokens: 10000, completionTokens: 5000, requestCount: 10 },
      },
      byTaskType: {
        scoring: { costUsd: 0.50, promptTokens: 5000, completionTokens: 2000, requestCount: 5 },
        extraction: { costUsd: 1.00, promptTokens: 5000, completionTokens: 3000, requestCount: 5 },
      },
      periodStart: '2026-01-01T00:00:00.000Z',
      periodEnd: '2026-02-01T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('accepts cost summary without period', () => {
    const result = LlmCostSummary.safeParse({
      totalCostUsd: 0,
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      byProvider: {},
      byTaskType: {},
    });
    expect(result.success).toBe(true);
  });
});
