import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetCostSummaryUseCase } from './get-cost-summary.js';

function makePrisma() {
  return {
    llmCostRecord: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  } as any;
}

const sampleRecords = [
  {
    id: 'r1',
    projectId: 'proj-1',
    taskType: 'scoring',
    provider: 'claude',
    model: 'claude-haiku-4-20250414',
    promptTokens: 1000,
    completionTokens: 500,
    costUsd: 0.001,
    createdAt: new Date('2026-01-15T00:00:00Z'),
  },
  {
    id: 'r2',
    projectId: 'proj-1',
    taskType: 'extraction',
    provider: 'openai',
    model: 'gpt-4o',
    promptTokens: 2000,
    completionTokens: 1000,
    costUsd: 0.015,
    createdAt: new Date('2026-01-16T00:00:00Z'),
  },
  {
    id: 'r3',
    projectId: 'proj-1',
    taskType: 'scoring',
    provider: 'claude',
    model: 'claude-haiku-4-20250414',
    promptTokens: 500,
    completionTokens: 200,
    costUsd: 0.0005,
    createdAt: new Date('2026-01-17T00:00:00Z'),
  },
];

describe('GetCostSummaryUseCase', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let useCase: GetCostSummaryUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrisma();
    useCase = new GetCostSummaryUseCase(prisma);
  });

  it('returns empty summary when no records exist', async () => {
    prisma.llmCostRecord.findMany.mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result.totalCostUsd).toBe(0);
    expect(result.totalPromptTokens).toBe(0);
    expect(result.totalCompletionTokens).toBe(0);
    expect(result.byProvider).toHaveLength(0);
    expect(result.byTaskType).toHaveLength(0);
  });

  it('aggregates costs correctly', async () => {
    prisma.llmCostRecord.findMany.mockResolvedValue(sampleRecords);

    const result = await useCase.execute('proj-1');

    expect(result.totalCostUsd).toBeCloseTo(0.0165, 4);
    expect(result.totalPromptTokens).toBe(3500);
    expect(result.totalCompletionTokens).toBe(1700);
  });

  it('groups by provider correctly', async () => {
    prisma.llmCostRecord.findMany.mockResolvedValue(sampleRecords);

    const result = await useCase.execute('proj-1');

    const claudeEntry = result.byProvider.find((e) => e.key === 'claude');
    const openaiEntry = result.byProvider.find((e) => e.key === 'openai');

    expect(claudeEntry).toBeDefined();
    expect(claudeEntry!.requestCount).toBe(2);
    expect(openaiEntry).toBeDefined();
    expect(openaiEntry!.requestCount).toBe(1);
  });

  it('groups by task type correctly', async () => {
    prisma.llmCostRecord.findMany.mockResolvedValue(sampleRecords);

    const result = await useCase.execute('proj-1');

    const scoringEntry = result.byTaskType.find((e) => e.key === 'scoring');
    const extractionEntry = result.byTaskType.find((e) => e.key === 'extraction');

    expect(scoringEntry).toBeDefined();
    expect(scoringEntry!.requestCount).toBe(2);
    expect(extractionEntry).toBeDefined();
    expect(extractionEntry!.requestCount).toBe(1);
  });

  it('filters by projectId', async () => {
    prisma.llmCostRecord.findMany.mockResolvedValue(sampleRecords);

    await useCase.execute('proj-1');

    expect(prisma.llmCostRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          projectId: 'proj-1',
        }),
      }),
    );
  });

  it('filters by time range', async () => {
    prisma.llmCostRecord.findMany.mockResolvedValue([sampleRecords[0]]);

    const result = await useCase.execute(undefined, {
      start: '2026-01-01T00:00:00Z',
      end: '2026-01-31T00:00:00Z',
    });

    expect(prisma.llmCostRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        }),
      }),
    );
    expect(result.periodStart).toBe('2026-01-01T00:00:00Z');
    expect(result.periodEnd).toBe('2026-01-31T00:00:00Z');
  });

  it('returns null period when no time range specified', async () => {
    prisma.llmCostRecord.findMany.mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result.periodStart).toBeNull();
    expect(result.periodEnd).toBeNull();
  });
});
