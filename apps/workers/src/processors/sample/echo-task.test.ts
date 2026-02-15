import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Job } from 'bullmq';
import { EchoProcessor } from './echo-task.js';
import type { TaskJobData } from '../../shared/base-processor.js';

function createMockJob(overrides?: Partial<TaskJobData>): Job<TaskJobData> {
  return {
    data: {
      taskId: 'task-001',
      type: 'sample:echo',
      metadata: { hello: 'world' },
      createdBy: 'user-123',
      ...overrides,
    },
    updateProgress: vi.fn().mockResolvedValue(undefined),
  } as unknown as Job<TaskJobData>;
}

describe('EchoProcessor', () => {
  let processor: EchoProcessor;
  let mockRedis: { publish: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRedis = {
      publish: vi.fn().mockResolvedValue(1),
      get: vi.fn().mockResolvedValue(null), // Not cancelled
    };
    processor = new EchoProcessor(mockRedis as never);
  });

  it('returns echo of job metadata', async () => {
    const job = createMockJob();
    const result = await processor.process(job);
    expect(result).toEqual({ echo: { hello: 'world' } });
  });

  it('reports progress 5 times', async () => {
    const job = createMockJob();
    await processor.process(job);
    expect(job.updateProgress).toHaveBeenCalledTimes(5);
  });

  it('publishes progress events to Redis', async () => {
    const job = createMockJob();
    await processor.process(job);
    expect(mockRedis.publish).toHaveBeenCalledTimes(5);
  });

  it('throws when task is cancelled during processing', async () => {
    // Cancel after first progress check
    mockRedis.get
      .mockResolvedValueOnce('1'); // First check returns cancelled

    const job = createMockJob();

    await expect(processor.process(job)).rejects.toThrow('Task was cancelled');
  });

  it('reports progress with correct step messages', async () => {
    const job = createMockJob();
    await processor.process(job);

    const calls = mockRedis.publish.mock.calls;
    const firstEvent = JSON.parse(calls[0]![1] as string);
    expect(firstEvent.message).toBe('Echo step 1 of 5');
    expect(firstEvent.progress).toBe(20);

    const lastEvent = JSON.parse(calls[4]![1] as string);
    expect(lastEvent.message).toBe('Echo step 5 of 5');
    expect(lastEvent.progress).toBe(100);
  });
});
