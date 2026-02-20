import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Job } from 'bullmq';
import { GenerateReportsProcessor, type GenerateReportJobData } from './generate-reports.js';
import type { DocumentData } from '../../shared/docx/hybrid-engine.js';

function createMockJob(overrides?: Partial<GenerateReportJobData>): Job<GenerateReportJobData> {
  return {
    data: {
      taskId: 'task-001',
      type: 'validation.generate-report',
      createdBy: 'user-1',
      metadata: {
        studyId: 'study-1',
        reportType: 'VALIDATION_REPORT',
      },
      ...overrides,
    },
    updateProgress: vi.fn().mockResolvedValue(undefined),
  } as unknown as Job<GenerateReportJobData>;
}

function createMockRedis() {
  return {
    publish: vi.fn().mockResolvedValue(1),
    get: vi.fn().mockResolvedValue(null),
  };
}

describe('GenerateReportsProcessor', () => {
  let processor: GenerateReportsProcessor;
  let mockRedis: ReturnType<typeof createMockRedis>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRedis = createMockRedis();
    processor = new GenerateReportsProcessor(mockRedis as never);
  });

  describe('process', () => {
    it('generates VALIDATION_REPORT successfully', async () => {
      const job = createMockJob();

      const result = await processor.process(job);

      expect(result.taskId).toBe('task-001');
      expect(result.reportType).toBe('VALIDATION_REPORT');
      expect(result.bufferSize).toBeGreaterThan(0);
      expect(result.generatedAt).toBeDefined();
    });

    it('generates CLINICAL_BENEFIT successfully', async () => {
      const job = createMockJob({
        metadata: { studyId: 'study-1', reportType: 'CLINICAL_BENEFIT' },
      } as Partial<GenerateReportJobData>);

      const result = await processor.process(job);

      expect(result.reportType).toBe('CLINICAL_BENEFIT');
      expect(result.bufferSize).toBeGreaterThan(0);
    });

    it('reports progress at 25%, 50%, 75%, 100%', async () => {
      const job = createMockJob();

      await processor.process(job);

      // updateProgress should have been called at 25, 50, 75, 100
      expect(job.updateProgress).toHaveBeenCalledWith(25);
      expect(job.updateProgress).toHaveBeenCalledWith(50);
      expect(job.updateProgress).toHaveBeenCalledWith(75);
      expect(job.updateProgress).toHaveBeenCalledWith(100);
    });

    it('publishes progress events to Redis', async () => {
      const job = createMockJob();

      await processor.process(job);

      // Should have published 4 progress events
      expect(mockRedis.publish).toHaveBeenCalledTimes(4);
      expect(mockRedis.publish).toHaveBeenCalledWith('task:progress:user-1', expect.any(String));
    });

    it('includes progress messages', async () => {
      const job = createMockJob();

      await processor.process(job);

      const calls = mockRedis.publish.mock.calls;
      const messages = calls.map((c) => JSON.parse(c[1] as string).message);

      expect(messages[0]).toContain('Starting');
      expect(messages[1]).toContain('Preparing data');
      expect(messages[2]).toContain('Generating DOCX');
      expect(messages[3]).toContain('complete');
    });

    it('throws on cancellation at first check', async () => {
      mockRedis.get.mockResolvedValueOnce('1'); // Cancelled
      const job = createMockJob();

      await expect(processor.process(job)).rejects.toThrow('Task cancelled');
    });

    it('throws on cancellation at second check', async () => {
      mockRedis.get
        .mockResolvedValueOnce(null) // Not cancelled first check
        .mockResolvedValueOnce('1'); // Cancelled second check
      const job = createMockJob();

      await expect(processor.process(job)).rejects.toThrow('Task cancelled');
    });

    it('uses registered data preparator when available', async () => {
      const mockPreparator = vi.fn().mockResolvedValue({
        studyId: 'study-1',
        title: 'Custom Report',
        author: 'Custom Author',
        sections: [{ heading: 'Custom', level: 1, content: 'Custom content' }],
      } satisfies DocumentData);

      processor.registerPreparator('VALIDATION_REPORT', mockPreparator);
      const job = createMockJob();

      const result = await processor.process(job);

      expect(mockPreparator).toHaveBeenCalledWith('study-1');
      expect(result.bufferSize).toBeGreaterThan(0);
    });

    it('uses fallback data when no preparator registered', async () => {
      const job = createMockJob();

      const result = await processor.process(job);

      // Should still succeed with fallback data
      expect(result.bufferSize).toBeGreaterThan(0);
    });

    it('handles different report types via metadata', async () => {
      const types = ['ALGORITHMIC_FAIRNESS', 'PATCH_VALIDATION', 'PSUR'] as const;

      for (const reportType of types) {
        const job = createMockJob({
          metadata: { studyId: 'study-1', reportType },
        } as Partial<GenerateReportJobData>);

        const result = await processor.process(job);
        expect(result.reportType).toBe(reportType);
      }
    });
  });

  describe('registerPreparator', () => {
    it('allows registering preparators for different types', () => {
      const prep1 = vi.fn();
      const prep2 = vi.fn();

      processor.registerPreparator('VALIDATION_REPORT', prep1);
      processor.registerPreparator('CLINICAL_BENEFIT', prep2);

      // No error means success
      expect(true).toBe(true);
    });
  });
});
