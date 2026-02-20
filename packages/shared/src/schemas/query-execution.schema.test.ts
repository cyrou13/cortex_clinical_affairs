import { describe, it, expect } from 'vitest';
import { DatabaseSource, ExecutionStatus, ExecuteQueryInput } from './query-execution.schema.js';

describe('DatabaseSource enum', () => {
  it.each(['PUBMED', 'PMC', 'GOOGLE_SCHOLAR', 'CLINICAL_TRIALS'])('accepts %s', (value) => {
    expect(DatabaseSource.safeParse(value).success).toBe(true);
  });

  it('rejects invalid value', () => {
    expect(DatabaseSource.safeParse('SCOPUS').success).toBe(false);
  });

  it('rejects empty string', () => {
    expect(DatabaseSource.safeParse('').success).toBe(false);
  });
});

describe('ExecutionStatus enum', () => {
  it.each(['RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED', 'CANCELLED'])('accepts %s', (value) => {
    expect(ExecutionStatus.safeParse(value).success).toBe(true);
  });

  it('rejects invalid value', () => {
    expect(ExecutionStatus.safeParse('PENDING').success).toBe(false);
  });

  it('rejects empty string', () => {
    expect(ExecutionStatus.safeParse('').success).toBe(false);
  });
});

describe('ExecuteQueryInput schema', () => {
  const validInput = {
    queryId: '550e8400-e29b-41d4-a716-446655440000',
    databases: ['PUBMED'],
    sessionId: '660e8400-e29b-41d4-a716-446655440000',
  };

  it('accepts valid input with single database', () => {
    const result = ExecuteQueryInput.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('accepts valid input with multiple databases', () => {
    const result = ExecuteQueryInput.safeParse({
      ...validInput,
      databases: ['PUBMED', 'PMC', 'GOOGLE_SCHOLAR', 'CLINICAL_TRIALS'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty databases array', () => {
    const result = ExecuteQueryInput.safeParse({
      ...validInput,
      databases: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid database source', () => {
    const result = ExecuteQueryInput.safeParse({
      ...validInput,
      databases: ['SCOPUS'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-uuid queryId', () => {
    const result = ExecuteQueryInput.safeParse({
      ...validInput,
      queryId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-uuid sessionId', () => {
    const result = ExecuteQueryInput.safeParse({
      ...validInput,
      sessionId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing queryId', () => {
    const { queryId: _, ...rest } = validInput;
    const result = ExecuteQueryInput.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects missing databases', () => {
    const { databases: _, ...rest } = validInput;
    const result = ExecuteQueryInput.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects missing sessionId', () => {
    const { sessionId: _, ...rest } = validInput;
    const result = ExecuteQueryInput.safeParse(rest);
    expect(result.success).toBe(false);
  });
});
