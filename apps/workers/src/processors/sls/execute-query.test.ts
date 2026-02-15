import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Job } from 'bullmq';
import { ExecuteQueryProcessor } from './execute-query.js';
import type { TaskJobData } from '../../shared/base-processor.js';

function createMockJob(overrides?: Partial<TaskJobData>): Job<TaskJobData> {
  return {
    data: {
      taskId: 'task-001',
      type: 'sls:execute-query',
      metadata: {
        queryId: 'query-1',
        databases: ['PUBMED', 'COCHRANE'],
        sessionId: 'session-1',
        executionIds: ['exec-1', 'exec-2'],
        queryString: '(spinal fusion) AND (outcomes)',
      },
      createdBy: 'user-123',
      ...overrides,
    },
    updateProgress: vi.fn().mockResolvedValue(undefined),
  } as unknown as Job<TaskJobData>;
}

describe('ExecuteQueryProcessor', () => {
  let processor: ExecuteQueryProcessor;
  let mockRedis: {
    publish: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRedis = {
      publish: vi.fn().mockResolvedValue(1),
      get: vi.fn().mockResolvedValue(null), // Not cancelled by default
    };
    processor = new ExecuteQueryProcessor(mockRedis as never);
  });

  it('processes a job and reports progress', async () => {
    const job = createMockJob();

    await processor.process(job);

    // Should have reported initial progress and final progress
    expect(mockRedis.publish).toHaveBeenCalled();

    // Check that final progress was 100
    const progressCalls = mockRedis.publish.mock.calls.filter((call: string[]) => {
      const parsed = JSON.parse(call[1] as string);
      return parsed.progress === 100;
    });
    expect(progressCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('publishes completion event with results', async () => {
    const job = createMockJob();

    await processor.process(job);

    // Find the completion event
    const completionCalls = mockRedis.publish.mock.calls.filter((call: string[]) => {
      const parsed = JSON.parse(call[1] as string);
      return parsed.type === 'sls:execute-query:completed';
    });

    expect(completionCalls).toHaveLength(1);
    const completionEvent = JSON.parse(completionCalls[0]![1] as string);
    expect(completionEvent.taskId).toBe('task-001');
    expect(completionEvent.results).toHaveLength(2);
    expect(completionEvent.results[0].database).toBe('PUBMED');
    expect(completionEvent.results[1].database).toBe('COCHRANE');
  });

  it('generates reproducibility statements for successful searches', async () => {
    const job = createMockJob();

    await processor.process(job);

    const completionCalls = mockRedis.publish.mock.calls.filter((call: string[]) => {
      const parsed = JSON.parse(call[1] as string);
      return parsed.type === 'sls:execute-query:completed';
    });

    const completionEvent = JSON.parse(completionCalls[0]![1] as string);
    const pubmedResult = completionEvent.results[0];
    expect(pubmedResult.reproducibilityStatement).toContain('PUBMED');
    expect(pubmedResult.reproducibilityStatement).toContain('(spinal fusion) AND (outcomes)');
    expect(pubmedResult.reproducibilityStatement).toContain('articles returned');
  });

  it('checks for cancellation before each database', async () => {
    const job = createMockJob();

    await processor.process(job);

    // Should have checked cancellation at least once per database
    expect(mockRedis.get).toHaveBeenCalled();
    expect(mockRedis.get).toHaveBeenCalledWith('task:cancelled:task-001');
  });

  it('handles cancellation', async () => {
    // Mark as cancelled from the start
    mockRedis.get.mockResolvedValue('1');

    const job = createMockJob();

    await processor.process(job);

    // Completion event should indicate cancellation
    const completionCalls = mockRedis.publish.mock.calls.filter((call: string[]) => {
      const parsed = JSON.parse(call[1] as string);
      return parsed.type === 'sls:execute-query:completed';
    });

    const completionEvent = JSON.parse(completionCalls[0]![1] as string);
    // All results should be FAILED (cancelled)
    for (const result of completionEvent.results) {
      expect(result.status).toBe('FAILED');
      expect(result.errorMessage).toContain('cancelled');
    }
  });

  it('handles single database job', async () => {
    const job = createMockJob({
      metadata: {
        queryId: 'query-1',
        databases: ['PUBMED'],
        sessionId: 'session-1',
        executionIds: ['exec-1'],
        queryString: 'test query',
      },
    });

    await processor.process(job);

    const completionCalls = mockRedis.publish.mock.calls.filter((call: string[]) => {
      const parsed = JSON.parse(call[1] as string);
      return parsed.type === 'sls:execute-query:completed';
    });

    const completionEvent = JSON.parse(completionCalls[0]![1] as string);
    expect(completionEvent.results).toHaveLength(1);
    expect(completionEvent.results[0].database).toBe('PUBMED');
  });

  it('publishes progress channel using createdBy from job data', async () => {
    const job = createMockJob({ createdBy: 'user-456' });

    await processor.process(job);

    // All publish calls should use the correct channel
    for (const call of mockRedis.publish.mock.calls) {
      expect(call[0]).toBe('task:progress:user-456');
    }
  });
});
