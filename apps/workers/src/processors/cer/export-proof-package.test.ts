import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Job } from 'bullmq';
import {
  ExportProofPackageProcessor,
  type ExportProofPackageJobData,
} from './export-proof-package.js';

function createMockJob(
  overrides?: Partial<ExportProofPackageJobData>,
): Job<ExportProofPackageJobData> {
  return {
    data: {
      taskId: 'task-001',
      type: 'cer:export-proof-package',
      createdBy: 'user-1',
      metadata: {
        claimTraceId: 'trace-1',
        claimText: 'Device demonstrates 95% sensitivity',
        refNumber: '1',
        sectionTitle: 'Clinical Performance',
        sectionNumber: '3.1',
        traceChain: [
          { level: 1, label: 'CER Claim', data: { claimText: 'Device sensitivity' } },
          { level: 2, label: 'SOA Source', data: { extractedData: '95%' } },
        ],
        auditTrail: [
          { action: 'created', userId: 'user-1', timestamp: '2026-01-01T00:00:00Z', details: null },
        ],
      },
      ...overrides,
    },
    updateProgress: vi.fn().mockResolvedValue(undefined),
  } as unknown as Job<ExportProofPackageJobData>;
}

function createMockRedis() {
  return {
    publish: vi.fn().mockResolvedValue(1),
    get: vi.fn().mockResolvedValue(null),
  };
}

describe('ExportProofPackageProcessor', () => {
  let processor: ExportProofPackageProcessor;
  let mockRedis: ReturnType<typeof createMockRedis>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRedis = createMockRedis();
    processor = new ExportProofPackageProcessor(mockRedis as never);
  });

  it('generates proof package successfully', async () => {
    const job = createMockJob();

    const result = await processor.process(job);

    expect(result.taskId).toBe('task-001');
    expect(result.claimTraceId).toBe('trace-1');
    expect(result.elementCount).toBeGreaterThan(0);
    expect(result.generatedAt).toBeDefined();
  });

  it('reports progress at 25%, 50%, 75%, 100%', async () => {
    const job = createMockJob();

    await processor.process(job);

    expect(job.updateProgress).toHaveBeenCalledWith(25);
    expect(job.updateProgress).toHaveBeenCalledWith(50);
    expect(job.updateProgress).toHaveBeenCalledWith(75);
    expect(job.updateProgress).toHaveBeenCalledWith(100);
  });

  it('publishes progress events to Redis', async () => {
    const job = createMockJob();

    await processor.process(job);

    expect(mockRedis.publish).toHaveBeenCalledTimes(4);
    expect(mockRedis.publish).toHaveBeenCalledWith(
      'task:progress:user-1',
      expect.any(String),
    );
  });

  it('throws on cancellation at first check', async () => {
    mockRedis.get.mockResolvedValueOnce('1');
    const job = createMockJob();

    await expect(processor.process(job)).rejects.toThrow('Task cancelled');
  });

  it('throws on cancellation at second check', async () => {
    mockRedis.get
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('1');
    const job = createMockJob();

    await expect(processor.process(job)).rejects.toThrow('Task cancelled');
  });

  it('handles empty audit trail', async () => {
    const job = createMockJob({
      metadata: {
        claimTraceId: 'trace-1',
        claimText: 'Claim',
        refNumber: '1',
        sectionTitle: 'Title',
        sectionNumber: '1.0',
        traceChain: [],
        auditTrail: [],
      },
    } as Partial<ExportProofPackageJobData>);

    const result = await processor.process(job);

    expect(result.elementCount).toBeGreaterThan(0);
  });
});
