import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Job } from 'bullmq';
import { BaseProcessor, type TaskJobData } from './base-processor.js';

// Concrete implementation for testing
class TestProcessor extends BaseProcessor {
  async process(job: Job<TaskJobData>): Promise<string> {
    return `processed: ${job.data.taskId}`;
  }
}

function createMockJob(overrides?: Partial<TaskJobData>): Job<TaskJobData> {
  return {
    data: {
      taskId: 'task-001',
      type: 'test:task',
      metadata: { foo: 'bar' },
      createdBy: 'user-123',
      ...overrides,
    },
    updateProgress: vi.fn().mockResolvedValue(undefined),
  } as unknown as Job<TaskJobData>;
}

describe('BaseProcessor', () => {
  let processor: TestProcessor;
  let mockRedis: { publish: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRedis = {
      publish: vi.fn().mockResolvedValue(1),
      get: vi.fn().mockResolvedValue(null),
    };
    processor = new TestProcessor(mockRedis as never);
  });

  describe('process', () => {
    it('processes a job successfully', async () => {
      const job = createMockJob();
      const result = await processor.process(job);
      expect(result).toBe('processed: task-001');
    });
  });

  describe('reportProgress', () => {
    it('updates job progress and publishes to Redis', async () => {
      const job = createMockJob();

      await processor.reportProgress(job, 50, {
        total: 100,
        current: 50,
        message: 'Halfway done',
      });

      expect(job.updateProgress).toHaveBeenCalledWith(50);
      expect(mockRedis.publish).toHaveBeenCalledWith(
        'task:progress:user-123',
        expect.stringContaining('"progress":50'),
      );
    });

    it('publishes event with all optional fields', async () => {
      const job = createMockJob();

      await processor.reportProgress(job, 75, {
        total: 200,
        current: 150,
        eta: 60,
        message: 'Almost there',
      });

      const publishCall = mockRedis.publish.mock.calls[0]!;
      const event = JSON.parse(publishCall[1] as string);
      expect(event).toEqual({
        taskId: 'task-001',
        type: 'test:task',
        status: 'RUNNING',
        progress: 75,
        total: 200,
        current: 150,
        eta: 60,
        message: 'Almost there',
      });
    });

    it('publishes event without optional fields', async () => {
      const job = createMockJob();

      await processor.reportProgress(job, 25);

      const publishCall = mockRedis.publish.mock.calls[0]!;
      const event = JSON.parse(publishCall[1] as string);
      expect(event.progress).toBe(25);
      expect(event.total).toBeUndefined();
      expect(event.current).toBeUndefined();
      expect(event.eta).toBeUndefined();
      expect(event.message).toBeUndefined();
    });

    it('uses createdBy from job data for channel name', async () => {
      const job = createMockJob({ createdBy: 'user-456' });

      await processor.reportProgress(job, 10);

      expect(mockRedis.publish).toHaveBeenCalledWith(
        'task:progress:user-456',
        expect.any(String),
      );
    });
  });

  describe('checkCancellation', () => {
    it('returns false when task is not cancelled', async () => {
      mockRedis.get.mockResolvedValue(null);
      const job = createMockJob();

      const cancelled = await processor.checkCancellation(job);

      expect(cancelled).toBe(false);
      expect(mockRedis.get).toHaveBeenCalledWith('task:cancelled:task-001');
    });

    it('returns true when task is cancelled', async () => {
      mockRedis.get.mockResolvedValue('1');
      const job = createMockJob();

      const cancelled = await processor.checkCancellation(job);

      expect(cancelled).toBe(true);
    });

    it('returns false for non-"1" values', async () => {
      mockRedis.get.mockResolvedValue('0');
      const job = createMockJob();

      const cancelled = await processor.checkCancellation(job);

      expect(cancelled).toBe(false);
    });
  });
});
