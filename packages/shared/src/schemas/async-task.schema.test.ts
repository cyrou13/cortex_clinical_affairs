import { describe, it, expect } from 'vitest';
import { TaskStatus, TaskProgressEvent, EnqueueTaskInput } from './async-task.schema.js';

describe('TaskStatus enum', () => {
  it.each(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'])(
    'accepts %s',
    (value) => {
      expect(TaskStatus.safeParse(value).success).toBe(true);
    },
  );

  it('rejects invalid value', () => {
    expect(TaskStatus.safeParse('UNKNOWN').success).toBe(false);
  });

  it('rejects empty string', () => {
    expect(TaskStatus.safeParse('').success).toBe(false);
  });
});

describe('TaskProgressEvent schema', () => {
  it('accepts valid full event', () => {
    const result = TaskProgressEvent.safeParse({
      taskId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'sls:score-articles',
      status: 'RUNNING',
      progress: 50,
      total: 100,
      current: 50,
      eta: 30,
      message: 'Processing articles...',
    });
    expect(result.success).toBe(true);
  });

  it('accepts minimal event (only required fields)', () => {
    const result = TaskProgressEvent.safeParse({
      taskId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'sls:score-articles',
      status: 'PENDING',
      progress: 0,
    });
    expect(result.success).toBe(true);
  });

  it('rejects progress below 0', () => {
    const result = TaskProgressEvent.safeParse({
      taskId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'sls:score-articles',
      status: 'RUNNING',
      progress: -1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects progress above 100', () => {
    const result = TaskProgressEvent.safeParse({
      taskId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'sls:score-articles',
      status: 'RUNNING',
      progress: 101,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid status', () => {
    const result = TaskProgressEvent.safeParse({
      taskId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'test',
      status: 'INVALID',
      progress: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing taskId', () => {
    const result = TaskProgressEvent.safeParse({
      type: 'test',
      status: 'PENDING',
      progress: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-uuid taskId', () => {
    const result = TaskProgressEvent.safeParse({
      taskId: 'not-a-uuid',
      type: 'test',
      status: 'PENDING',
      progress: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe('EnqueueTaskInput schema', () => {
  it('accepts valid input with metadata', () => {
    const result = EnqueueTaskInput.safeParse({
      type: 'sls:score-articles',
      metadata: { projectId: '123', filters: { year: 2024 } },
      userId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('accepts input without metadata', () => {
    const result = EnqueueTaskInput.safeParse({
      type: 'sls:score-articles',
      userId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty type', () => {
    const result = EnqueueTaskInput.safeParse({
      type: '',
      userId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing type', () => {
    const result = EnqueueTaskInput.safeParse({
      userId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid userId', () => {
    const result = EnqueueTaskInput.safeParse({
      type: 'test',
      userId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing userId', () => {
    const result = EnqueueTaskInput.safeParse({
      type: 'test',
    });
    expect(result.success).toBe(false);
  });
});
