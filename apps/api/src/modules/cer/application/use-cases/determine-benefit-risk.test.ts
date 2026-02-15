import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DetermineBenefitRiskUseCase, computeRiskLevel } from './determine-benefit-risk.js';

const VERSION_ID = 'ver-1';
const PROJECT_ID = 'proj-1';
const USER_ID = 'user-1';

function makePrisma(overrides?: {
  cerVersion?: Record<string, unknown> | null;
  existingCount?: number;
  soaAnalyses?: Array<Record<string, unknown>>;
  validationStudies?: Array<Record<string, unknown>>;
  riskEntries?: Array<Record<string, unknown>>;
}) {
  return {
    cerVersion: {
      findUnique: vi
        .fn()
        .mockResolvedValue(
          overrides?.cerVersion !== undefined
            ? overrides.cerVersion
            : { id: VERSION_ID, projectId: PROJECT_ID },
        ),
    },
    benefitRiskItem: {
      count: vi.fn().mockResolvedValue(overrides?.existingCount ?? 0),
      create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: data.id })),
    },
    benefitRiskMitigation: {
      create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: data.id })),
    },
    soaAnalysis: {
      findMany: vi
        .fn()
        .mockResolvedValue(
          overrides?.soaAnalyses ?? [
            {
              id: 'soa-1',
              clinicalBenefits: ['Improved diagnostic accuracy', 'Faster processing'],
            },
          ],
        ),
    },
    validationStudy: {
      findMany: vi
        .fn()
        .mockResolvedValue(
          overrides?.validationStudies ?? [{ id: 'study-1', name: 'Sensitivity Study' }],
        ),
    },
    riskEntry: {
      findMany: vi.fn().mockResolvedValue(
        overrides?.riskEntries ?? [
          {
            id: 'risk-1',
            description: 'False positive',
            severity: 'MINOR',
            probability: 'OCCASIONAL',
          },
          {
            id: 'risk-2',
            description: 'System failure',
            severity: 'CRITICAL',
            probability: 'REMOTE',
          },
        ],
      ),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  } as any;
}

describe('DetermineBenefitRiskUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('populates benefits from SOA and validation data', async () => {
    const prisma = makePrisma();
    const useCase = new DetermineBenefitRiskUseCase(prisma);

    const result = await useCase.execute({ cerVersionId: VERSION_ID, userId: USER_ID });

    expect(result.benefits.length).toBeGreaterThanOrEqual(3); // 2 SOA + 1 validation
    expect(result.benefits.some((b) => b.source === 'SOA Analysis')).toBe(true);
    expect(result.benefits.some((b) => b.source === 'Validation Study')).toBe(true);
  });

  it('populates risks from risk management entries', async () => {
    const prisma = makePrisma();
    const useCase = new DetermineBenefitRiskUseCase(prisma);

    const result = await useCase.execute({ cerVersionId: VERSION_ID, userId: USER_ID });

    expect(result.risks).toHaveLength(2);
    expect(result.risks[0]!.description).toBe('False positive');
  });

  it('computes risk levels using severity x probability matrix', async () => {
    const prisma = makePrisma();
    const useCase = new DetermineBenefitRiskUseCase(prisma);

    const result = await useCase.execute({ cerVersionId: VERSION_ID, userId: USER_ID });

    // MINOR x OCCASIONAL = 2*3 = 6 -> ALARP
    expect(result.risks[0]!.riskLevel).toBe('ALARP');
    // CRITICAL x REMOTE = 4*2 = 8 -> ALARP
    expect(result.risks[1]!.riskLevel).toBe('ALARP');
  });

  it('creates mitigations for non-ACCEPTABLE risks', async () => {
    const prisma = makePrisma();
    const useCase = new DetermineBenefitRiskUseCase(prisma);

    const result = await useCase.execute({ cerVersionId: VERSION_ID, userId: USER_ID });

    // Both risks are ALARP, so mitigations for both
    expect(result.mitigations.length).toBeGreaterThanOrEqual(2);
  });

  it('throws NotFoundError when CER version not found', async () => {
    const prisma = makePrisma({ cerVersion: null });
    const useCase = new DetermineBenefitRiskUseCase(prisma);

    await expect(useCase.execute({ cerVersionId: 'missing', userId: USER_ID })).rejects.toThrow(
      'not found',
    );
  });

  it('throws ValidationError if analysis already exists', async () => {
    const prisma = makePrisma({ existingCount: 5 });
    const useCase = new DetermineBenefitRiskUseCase(prisma);

    await expect(useCase.execute({ cerVersionId: VERSION_ID, userId: USER_ID })).rejects.toThrow(
      'already exists',
    );
  });

  it('returns risk matrix summary', async () => {
    const prisma = makePrisma();
    const useCase = new DetermineBenefitRiskUseCase(prisma);

    const result = await useCase.execute({ cerVersionId: VERSION_ID, userId: USER_ID });

    expect(result.riskMatrix).toHaveProperty('ACCEPTABLE');
    expect(result.riskMatrix).toHaveProperty('ALARP');
    expect(result.riskMatrix).toHaveProperty('UNACCEPTABLE');
  });

  it('creates default risks when no risk entries found', async () => {
    const prisma = makePrisma({ riskEntries: [] });
    prisma.riskEntry.findMany.mockRejectedValue(new Error('Table not found'));
    const useCase = new DetermineBenefitRiskUseCase(prisma);

    const result = await useCase.execute({ cerVersionId: VERSION_ID, userId: USER_ID });

    expect(result.risks.length).toBeGreaterThan(0);
    expect(result.risks[0]!.source).toBe('Default');
  });

  it('creates default benefit when no upstream data found', async () => {
    const prisma = makePrisma({
      soaAnalyses: [],
      validationStudies: [],
    });
    prisma.soaAnalysis.findMany.mockResolvedValue([]);
    prisma.validationStudy.findMany.mockResolvedValue([]);
    const useCase = new DetermineBenefitRiskUseCase(prisma);

    const result = await useCase.execute({ cerVersionId: VERSION_ID, userId: USER_ID });

    expect(result.benefits).toHaveLength(1);
    expect(result.benefits[0]!.source).toBe('Manual');
  });

  it('persists all benefit and risk items', async () => {
    const prisma = makePrisma();
    const useCase = new DetermineBenefitRiskUseCase(prisma);

    const result = await useCase.execute({ cerVersionId: VERSION_ID, userId: USER_ID });

    const totalItems = result.benefits.length + result.risks.length;
    expect(prisma.benefitRiskItem.create).toHaveBeenCalledTimes(totalItems);
  });

  it('creates audit log entry', async () => {
    const prisma = makePrisma();
    const useCase = new DetermineBenefitRiskUseCase(prisma);

    await useCase.execute({ cerVersionId: VERSION_ID, userId: USER_ID });

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: USER_ID,
          action: 'cer.benefit-risk.determined',
        }),
      }),
    );
  });

  it('handles SOA query failure gracefully', async () => {
    const prisma = makePrisma();
    prisma.soaAnalysis.findMany.mockRejectedValue(new Error('DB error'));
    const useCase = new DetermineBenefitRiskUseCase(prisma);

    const result = await useCase.execute({ cerVersionId: VERSION_ID, userId: USER_ID });

    // Should still succeed with default/validation benefits
    expect(result.benefits.length).toBeGreaterThan(0);
  });
});

describe('computeRiskLevel', () => {
  it('returns ACCEPTABLE for low severity and low probability', () => {
    expect(computeRiskLevel('NEGLIGIBLE', 'IMPROBABLE')).toBe('ACCEPTABLE'); // 1*1=1
    expect(computeRiskLevel('MINOR', 'IMPROBABLE')).toBe('ACCEPTABLE'); // 2*1=2
    expect(computeRiskLevel('NEGLIGIBLE', 'REMOTE')).toBe('ACCEPTABLE'); // 1*2=2
    expect(computeRiskLevel('MINOR', 'REMOTE')).toBe('ACCEPTABLE'); // 2*2=4
  });

  it('returns ALARP for medium scores', () => {
    expect(computeRiskLevel('SERIOUS', 'OCCASIONAL')).toBe('ALARP'); // 3*3=9
    expect(computeRiskLevel('MINOR', 'OCCASIONAL')).toBe('ALARP'); // 2*3=6
    expect(computeRiskLevel('CRITICAL', 'REMOTE')).toBe('ALARP'); // 4*2=8
  });

  it('returns UNACCEPTABLE for high scores', () => {
    expect(computeRiskLevel('CATASTROPHIC', 'FREQUENT')).toBe('UNACCEPTABLE'); // 5*5=25
    expect(computeRiskLevel('CRITICAL', 'FREQUENT')).toBe('UNACCEPTABLE'); // 4*5=20
    expect(computeRiskLevel('CATASTROPHIC', 'PROBABLE')).toBe('UNACCEPTABLE'); // 5*4=20
  });
});
