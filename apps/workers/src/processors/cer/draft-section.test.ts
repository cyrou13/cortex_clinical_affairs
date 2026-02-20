import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Job } from 'bullmq';
import { DraftSectionProcessor } from './draft-section.js';
import type { TaskJobData } from '../../shared/base-processor.js';

function createMockJob(overrides?: Partial<TaskJobData>): Job<TaskJobData> {
  return {
    data: {
      taskId: 'task-001',
      type: 'cer.draft-section',
      metadata: {
        cerVersionId: 'cer-1',
        cerSectionId: 'sec-1',
        sectionNumber: '1',
        sectionTitle: 'Scope of the Clinical Evaluation',
        requiredUpstreamData: [
          { moduleType: 'SOA', dataType: 'device-description', description: 'Device desc' },
        ],
      },
      createdBy: 'user-1',
      ...overrides,
    },
    updateProgress: vi.fn().mockResolvedValue(undefined),
  } as unknown as Job<TaskJobData>;
}

function makeDeps(overrides?: {
  upstreamData?: Array<Record<string, unknown>>;
  llmContent?: string;
  llmReferences?: Array<{ sourceId: string; excerpt: string }>;
  claimTraceCount?: number;
  generateDraftFails?: boolean;
}) {
  return {
    gatherUpstreamData: vi.fn().mockResolvedValue(
      overrides?.upstreamData ?? [
        {
          moduleType: 'SOA',
          moduleId: 'soa-1',
          dataType: 'device-description',
          content: 'CardioValve Pro is a transcatheter heart valve replacement device.',
        },
      ],
    ),
    generateDraft: overrides?.generateDraftFails
      ? vi.fn().mockRejectedValue(new Error('LLM service unavailable'))
      : vi.fn().mockResolvedValue({
          content:
            overrides?.llmContent ?? 'This section describes the scope of the clinical evaluation.',
          references: overrides?.llmReferences ?? [
            { sourceId: 'soa-1', excerpt: 'CardioValve Pro device description' },
          ],
        }),
    storeContent: vi.fn().mockResolvedValue(undefined),
    createClaimTraces: vi.fn().mockResolvedValue(overrides?.claimTraceCount ?? 1),
  };
}

describe('DraftSectionProcessor', () => {
  let mockRedis: { publish: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRedis = {
      publish: vi.fn().mockResolvedValue(1),
      get: vi.fn().mockResolvedValue(null),
    };
  });

  it('processes a section drafting job', async () => {
    const deps = makeDeps();
    const processor = new DraftSectionProcessor(mockRedis as never, deps);
    const job = createMockJob();

    const result = await processor.process(job);

    expect(result.cerSectionId).toBe('sec-1');
    expect(result.wordCount).toBeGreaterThan(0);
    expect(result.claimTraceCount).toBe(1);
  });

  it('gathers upstream data first', async () => {
    const deps = makeDeps();
    const processor = new DraftSectionProcessor(mockRedis as never, deps);
    const job = createMockJob();

    await processor.process(job);

    expect(deps.gatherUpstreamData).toHaveBeenCalledWith('cer-1', [
      { moduleType: 'SOA', dataType: 'device-description', description: 'Device desc' },
    ]);
  });

  it('calls LLM to generate draft', async () => {
    const deps = makeDeps();
    const processor = new DraftSectionProcessor(mockRedis as never, deps);
    const job = createMockJob();

    await processor.process(job);

    expect(deps.generateDraft).toHaveBeenCalledWith(expect.stringContaining('Section 1'));
  });

  it('stores the generated content', async () => {
    const deps = makeDeps({ llmContent: 'Generated CER content for section 1.' });
    const processor = new DraftSectionProcessor(mockRedis as never, deps);
    const job = createMockJob();

    await processor.process(job);

    expect(deps.storeContent).toHaveBeenCalledWith(
      'sec-1',
      'Generated CER content for section 1.',
      expect.any(Number),
    );
  });

  it('creates claim traces from references', async () => {
    const deps = makeDeps({
      llmReferences: [
        { sourceId: 'soa-1', excerpt: 'Source 1' },
        { sourceId: 'sls-1', excerpt: 'Source 2' },
      ],
      claimTraceCount: 2,
    });
    const processor = new DraftSectionProcessor(mockRedis as never, deps);
    const job = createMockJob();

    const result = await processor.process(job);

    expect(deps.createClaimTraces).toHaveBeenCalledWith('sec-1', [
      { sourceId: 'soa-1', excerpt: 'Source 1' },
      { sourceId: 'sls-1', excerpt: 'Source 2' },
    ]);
    expect(result.claimTraceCount).toBe(2);
  });

  it('reports progress during processing', async () => {
    const deps = makeDeps();
    const processor = new DraftSectionProcessor(mockRedis as never, deps);
    const job = createMockJob();

    await processor.process(job);

    expect(job.updateProgress).toHaveBeenCalled();
    // Should report at least start and end progress
    expect(mockRedis.publish).toHaveBeenCalled();
  });

  it('throws when LLM generation fails', async () => {
    const deps = makeDeps({ generateDraftFails: true });
    const processor = new DraftSectionProcessor(mockRedis as never, deps);
    const job = createMockJob();

    await expect(processor.process(job)).rejects.toThrow('LLM service unavailable');
  });

  it('handles cancellation during processing', async () => {
    mockRedis.get.mockResolvedValue('1'); // cancelled immediately

    const deps = makeDeps();
    const processor = new DraftSectionProcessor(mockRedis as never, deps);
    const job = createMockJob();

    const result = await processor.process(job);

    expect(result.wordCount).toBe(0);
    expect(result.claimTraceCount).toBe(0);
    expect(deps.generateDraft).not.toHaveBeenCalled();
  });
});
