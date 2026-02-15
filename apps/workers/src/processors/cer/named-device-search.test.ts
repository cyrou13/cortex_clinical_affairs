import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Job } from 'bullmq';
import { NamedDeviceSearchProcessor } from './named-device-search.js';
import type { TaskJobData } from '../../shared/base-processor.js';

function createMockJob(overrides?: Partial<TaskJobData>): Job<TaskJobData> {
  return {
    data: {
      taskId: 'task-001',
      type: 'cer:named-device-search',
      metadata: {
        searchId: 'search-1',
        cerVersionId: 'cer-1',
        deviceName: 'CardioValve Pro',
        keywords: ['heart valve'],
        databases: ['MAUDE'],
      },
      createdBy: 'user-1',
      ...overrides,
    },
    updateProgress: vi.fn().mockResolvedValue(undefined),
  } as unknown as Job<TaskJobData>;
}

function makeDeps(overrides?: {
  findings?: Array<Record<string, unknown>>;
  errors?: Array<{ source: string; error: string }>;
  searchFails?: boolean;
}) {
  return {
    aggregateSearch: overrides?.searchFails
      ? vi.fn().mockRejectedValue(new Error('Search failed'))
      : vi.fn().mockResolvedValue({
          findings: overrides?.findings ?? [
            {
              sourceDatabase: 'MAUDE',
              reportNumber: 'MDR-001',
              eventDate: '2024-01-15',
              deviceName: 'CardioValve Pro',
              eventType: 'MALFUNCTION',
              description: 'Device malfunction',
              outcome: 'No harm',
            },
          ],
          stats: [{ source: 'MAUDE', count: 1, durationMs: 100 }],
          errors: overrides?.errors ?? [],
        }),
    storeFinding: vi.fn().mockResolvedValue(undefined),
    updateSearchStatus: vi.fn().mockResolvedValue(undefined),
  };
}

describe('NamedDeviceSearchProcessor', () => {
  let mockRedis: { publish: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRedis = {
      publish: vi.fn().mockResolvedValue(1),
      get: vi.fn().mockResolvedValue(null),
    };
  });

  it('processes search job and stores findings', async () => {
    const deps = makeDeps();
    const processor = new NamedDeviceSearchProcessor(mockRedis as never, deps);
    const job = createMockJob();

    const result = await processor.process(job);

    expect(result.searchId).toBe('search-1');
    expect(result.totalFindings).toBe(1);
    expect(deps.aggregateSearch).toHaveBeenCalledWith('CardioValve Pro', ['heart valve'], ['MAUDE']);
    expect(deps.storeFinding).toHaveBeenCalledTimes(1);
  });

  it('marks search as RUNNING initially', async () => {
    const deps = makeDeps();
    const processor = new NamedDeviceSearchProcessor(mockRedis as never, deps);
    const job = createMockJob();

    await processor.process(job);

    expect(deps.updateSearchStatus).toHaveBeenCalledWith('search-1', 'RUNNING');
  });

  it('marks search as COMPLETED when no errors', async () => {
    const deps = makeDeps();
    const processor = new NamedDeviceSearchProcessor(mockRedis as never, deps);
    const job = createMockJob();

    await processor.process(job);

    expect(deps.updateSearchStatus).toHaveBeenCalledWith('search-1', 'COMPLETED', {
      totalFindings: 1,
      errorMessage: undefined,
    });
  });

  it('marks search as PARTIAL when some sources fail', async () => {
    const deps = makeDeps({
      errors: [{ source: 'ANSM', error: 'Timeout' }],
    });
    const processor = new NamedDeviceSearchProcessor(mockRedis as never, deps);
    const job = createMockJob();

    await processor.process(job);

    expect(deps.updateSearchStatus).toHaveBeenCalledWith('search-1', 'PARTIAL', {
      totalFindings: 1,
      errorMessage: 'ANSM: Timeout',
    });
  });

  it('marks search as FAILED when aggregateSearch throws', async () => {
    const deps = makeDeps({ searchFails: true });
    const processor = new NamedDeviceSearchProcessor(mockRedis as never, deps);
    const job = createMockJob();

    await expect(processor.process(job)).rejects.toThrow('Search failed');
    expect(deps.updateSearchStatus).toHaveBeenCalledWith('search-1', 'FAILED', {
      errorMessage: 'Search failed',
    });
  });

  it('reports progress during processing', async () => {
    const deps = makeDeps();
    const processor = new NamedDeviceSearchProcessor(mockRedis as never, deps);
    const job = createMockJob();

    await processor.process(job);

    expect(job.updateProgress).toHaveBeenCalled();
    expect(mockRedis.publish).toHaveBeenCalled();
  });

  it('handles cancellation during finding storage', async () => {
    const deps = makeDeps({
      findings: [
        { sourceDatabase: 'MAUDE', reportNumber: 'MDR-001', eventDate: '', deviceName: 'D', eventType: 'OTHER', description: 'D', outcome: 'O' },
        { sourceDatabase: 'MAUDE', reportNumber: 'MDR-002', eventDate: '', deviceName: 'D', eventType: 'OTHER', description: 'D', outcome: 'O' },
      ],
    });

    // Cancel after first finding
    mockRedis.get
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('1');

    const processor = new NamedDeviceSearchProcessor(mockRedis as never, deps);
    const job = createMockJob();

    const result = await processor.process(job);

    expect(result.totalFindings).toBe(1);
    expect(deps.updateSearchStatus).toHaveBeenCalledWith('search-1', 'PARTIAL', {
      totalFindings: 1,
    });
  });

  it('continues on individual storage failures', async () => {
    const deps = makeDeps({
      findings: [
        { sourceDatabase: 'MAUDE', reportNumber: 'MDR-001', eventDate: '', deviceName: 'D', eventType: 'OTHER', description: 'D', outcome: 'O' },
        { sourceDatabase: 'MAUDE', reportNumber: 'MDR-002', eventDate: '', deviceName: 'D', eventType: 'OTHER', description: 'D', outcome: 'O' },
      ],
    });

    deps.storeFinding
      .mockRejectedValueOnce(new Error('Storage failed'))
      .mockResolvedValueOnce(undefined);

    const processor = new NamedDeviceSearchProcessor(mockRedis as never, deps);
    const job = createMockJob();

    const result = await processor.process(job);

    // Only 1 stored successfully
    expect(result.totalFindings).toBe(1);
  });
});
