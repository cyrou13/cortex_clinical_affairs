import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { CreateCerUpdateDecisionUseCase } from '../create-cer-update-decision.js';

function makePrisma(overrides: Record<string, unknown> = {}): PrismaClient {
  return {
    pmsCycle: {
      findUnique: vi.fn().mockResolvedValue({ id: 'cycle-1' }),
    },
    cerUpdateDecision: {
      create: vi.fn().mockResolvedValue({
        id: 'decision-1',
        pmsCycleId: 'cycle-1',
        conclusion: 'CER_UPDATE_NOT_REQUIRED',
        status: 'DRAFT',
      }),
    },
    ...overrides,
  } as unknown as PrismaClient;
}

describe('CreateCerUpdateDecisionUseCase', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let useCase: CreateCerUpdateDecisionUseCase;

  const validInput = {
    pmsCycleId: 'cycle-1',
    benefitRiskReAssessment: 'Benefit-risk ratio remains favorable',
    conclusion: 'CER_UPDATE_NOT_REQUIRED',
    justification: 'No material changes detected in PMS data',
    materialChangesIdentified: false,
    userId: 'user-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrisma();
    useCase = new CreateCerUpdateDecisionUseCase(prisma);
  });

  it('creates a CER update decision in DRAFT status', async () => {
    const result = await useCase.execute(validInput);

    expect(result.pmsCycleId).toBe('cycle-1');
    expect(result.conclusion).toBe('CER_UPDATE_NOT_REQUIRED');
    expect(result.status).toBe('DRAFT');
    expect(result.materialChangesIdentified).toBe(false);
    expect(prisma.cerUpdateDecision.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          pmsCycleId: 'cycle-1',
          conclusion: 'CER_UPDATE_NOT_REQUIRED',
          status: 'DRAFT',
          decidedBy: 'user-1',
        }),
      }),
    );
  });

  it('throws ValidationError for invalid conclusion value', async () => {
    await expect(
      useCase.execute({ ...validInput, conclusion: 'INVALID_CONCLUSION' }),
    ).rejects.toThrow('Invalid CER update conclusion');
  });

  it('throws ValidationError when justification is empty', async () => {
    await expect(
      useCase.execute({ ...validInput, justification: '   ' }),
    ).rejects.toThrow('Justification is required');
  });

  it('throws ValidationError when benefit-risk re-assessment is empty', async () => {
    await expect(
      useCase.execute({ ...validInput, benefitRiskReAssessment: '   ' }),
    ).rejects.toThrow('Benefit-risk re-assessment is required');
  });

  it('throws NotFoundError when cycle does not exist', async () => {
    prisma = makePrisma({
      pmsCycle: { findUnique: vi.fn().mockResolvedValue(null) },
    });
    useCase = new CreateCerUpdateDecisionUseCase(prisma);

    await expect(useCase.execute(validInput)).rejects.toThrow('not found');
  });
});
