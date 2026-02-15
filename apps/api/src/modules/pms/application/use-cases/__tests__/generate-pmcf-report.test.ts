import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { GeneratePmcfReportUseCase } from '../generate-pmcf-report.js';

function makePrisma(overrides: Record<string, unknown> = {}): PrismaClient {
  return {
    pmsCycle: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'cycle-1',
        status: 'ACTIVE',
      }),
    },
    ...overrides,
  } as unknown as PrismaClient;
}

const mockTaskService = { enqueueTask: vi.fn().mockResolvedValue({ id: 'task-1' }) };

describe('GeneratePmcfReportUseCase', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let useCase: GeneratePmcfReportUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrisma();
    useCase = new GeneratePmcfReportUseCase(prisma, mockTaskService);
  });

  it('enqueues a PMCF report generation task and returns task ID', async () => {
    const result = await useCase.execute('cycle-1', 'user-1');

    expect(result.taskId).toBe('task-1');
    expect(result.pmsCycleId).toBe('cycle-1');
    expect(result.status).toBe('GENERATING');
    expect(mockTaskService.enqueueTask).toHaveBeenCalledWith(
      'pms:generate-pmcf-report',
      { pmsCycleId: 'cycle-1' },
      'user-1',
    );
  });

  it('throws NotFoundError when cycle does not exist', async () => {
    prisma = makePrisma({
      pmsCycle: { findUnique: vi.fn().mockResolvedValue(null) },
    });
    useCase = new GeneratePmcfReportUseCase(prisma, mockTaskService);

    await expect(useCase.execute('missing-id', 'user-1')).rejects.toThrow('not found');
  });

  it('passes the correct task type to task service', async () => {
    await useCase.execute('cycle-1', 'user-1');

    expect(mockTaskService.enqueueTask).toHaveBeenCalledWith(
      'pms:generate-pmcf-report',
      expect.any(Object),
      'user-1',
    );
  });
});
