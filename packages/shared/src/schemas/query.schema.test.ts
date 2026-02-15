import { describe, it, expect } from 'vitest';
import { CreateQueryInput, UpdateQueryInput } from './query.schema.js';

describe('CreateQueryInput schema', () => {
  const validInput = {
    name: 'PubMed Search',
    queryString: '(spinal fusion) AND (outcomes)',
    sessionId: '550e8400-e29b-41d4-a716-446655440000',
  };

  it('accepts valid input', () => {
    const result = CreateQueryInput.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = CreateQueryInput.safeParse({ ...validInput, name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing name', () => {
    const { name, ...rest } = validInput;
    const result = CreateQueryInput.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects empty queryString', () => {
    const result = CreateQueryInput.safeParse({ ...validInput, queryString: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing queryString', () => {
    const { queryString, ...rest } = validInput;
    const result = CreateQueryInput.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects invalid sessionId format', () => {
    const result = CreateQueryInput.safeParse({ ...validInput, sessionId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects missing sessionId', () => {
    const { sessionId, ...rest } = validInput;
    const result = CreateQueryInput.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('accepts minimal valid name', () => {
    const result = CreateQueryInput.safeParse({ ...validInput, name: 'A' });
    expect(result.success).toBe(true);
  });
});

describe('UpdateQueryInput schema', () => {
  it('accepts valid queryString', () => {
    const result = UpdateQueryInput.safeParse({ queryString: '(spinal fusion) OR (outcomes)' });
    expect(result.success).toBe(true);
  });

  it('rejects empty queryString', () => {
    const result = UpdateQueryInput.safeParse({ queryString: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing queryString', () => {
    const result = UpdateQueryInput.safeParse({});
    expect(result.success).toBe(false);
  });

  it('strips unknown properties', () => {
    const result = UpdateQueryInput.safeParse({
      queryString: 'valid query',
      name: 'should be stripped',
    });
    expect(result.success).toBe(true);
  });
});
