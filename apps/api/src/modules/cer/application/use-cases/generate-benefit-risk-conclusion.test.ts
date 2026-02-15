import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  GenerateBenefitRiskConclusionUseCase,
  generateConclusionText,
} from './generate-benefit-risk-conclusion.js';

const VERSION_ID = 'ver-1';

function makePrisma(overrides?: {
  cerVersion?: Record<string, unknown> | null;
  benefits?: Array<Record<string, unknown>>;
  risks?: Array<Record<string, unknown>>;
  mitigations?: Array<Record<string, unknown>>;
}) {
  return {
    cerVersion: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.cerVersion !== undefined
          ? overrides.cerVersion
          : { id: VERSION_ID },
      ),
    },
    benefitRiskItem: {
      findMany: vi.fn().mockImplementation(({ where }) => {
        if (where.itemType === 'BENEFIT') {
          return Promise.resolve(
            overrides?.benefits ?? [
              { description: 'Improved diagnostic accuracy' },
              { description: 'Faster processing time' },
            ],
          );
        }
        return Promise.resolve(
          overrides?.risks ?? [
            { description: 'False positive', riskLevel: 'ALARP' },
            { description: 'System failure', riskLevel: 'ACCEPTABLE' },
          ],
        );
      }),
    },
    benefitRiskMitigation: {
      findMany: vi.fn().mockResolvedValue(
        overrides?.mitigations ?? [
          { description: 'Quality control checks' },
        ],
      ),
    },
  } as any;
}

describe('GenerateBenefitRiskConclusionUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates conclusion with correct summaries', async () => {
    const prisma = makePrisma();
    const useCase = new GenerateBenefitRiskConclusionUseCase(prisma);

    const result = await useCase.execute({ cerVersionId: VERSION_ID });

    expect(result.benefitSummary.count).toBe(2);
    expect(result.riskSummary.total).toBe(2);
    expect(result.riskSummary.alarp).toBe(1);
    expect(result.riskSummary.acceptable).toBe(1);
    expect(result.mitigationSummary.total).toBe(1);
  });

  it('returns favorable ratio when no unacceptable risks', async () => {
    const prisma = makePrisma();
    const useCase = new GenerateBenefitRiskConclusionUseCase(prisma);

    const result = await useCase.execute({ cerVersionId: VERSION_ID });

    expect(result.favorableRatio).toBe(true);
    expect(result.conclusionText).toContain('FAVORABLE');
  });

  it('returns unfavorable ratio when unacceptable risks exist', async () => {
    const prisma = makePrisma({
      risks: [
        { description: 'Critical failure', riskLevel: 'UNACCEPTABLE' },
      ],
    });
    const useCase = new GenerateBenefitRiskConclusionUseCase(prisma);

    const result = await useCase.execute({ cerVersionId: VERSION_ID });

    expect(result.favorableRatio).toBe(false);
    expect(result.conclusionText).toContain('WARNING');
    expect(result.conclusionText).toContain('unacceptable');
  });

  it('throws NotFoundError when CER version not found', async () => {
    const prisma = makePrisma({ cerVersion: null });
    const useCase = new GenerateBenefitRiskConclusionUseCase(prisma);

    await expect(
      useCase.execute({ cerVersionId: 'missing' }),
    ).rejects.toThrow('not found');
  });

  it('throws ValidationError when no benefit-risk data', async () => {
    const prisma = makePrisma({ benefits: [] });
    const useCase = new GenerateBenefitRiskConclusionUseCase(prisma);

    await expect(
      useCase.execute({ cerVersionId: VERSION_ID }),
    ).rejects.toThrow('No benefit-risk data');
  });

  it('includes benefit descriptions in summary', async () => {
    const prisma = makePrisma();
    const useCase = new GenerateBenefitRiskConclusionUseCase(prisma);

    const result = await useCase.execute({ cerVersionId: VERSION_ID });

    expect(result.benefitSummary.descriptions).toContain('Improved diagnostic accuracy');
  });
});

describe('generateConclusionText', () => {
  it('includes benefit and risk counts', () => {
    const text = generateConclusionText(
      { count: 3, descriptions: [] },
      { total: 2, acceptable: 1, alarp: 1, unacceptable: 0 },
      { total: 1, withDescription: 1 },
      true,
    );

    expect(text).toContain('3 clinical benefit(s)');
    expect(text).toContain('2 risk(s)');
  });

  it('mentions favorable when true', () => {
    const text = generateConclusionText(
      { count: 1, descriptions: [] },
      { total: 1, acceptable: 1, alarp: 0, unacceptable: 0 },
      { total: 0, withDescription: 0 },
      true,
    );

    expect(text).toContain('FAVORABLE');
  });

  it('warns when unacceptable risks exist', () => {
    const text = generateConclusionText(
      { count: 1, descriptions: [] },
      { total: 2, acceptable: 0, alarp: 0, unacceptable: 2 },
      { total: 0, withDescription: 0 },
      false,
    );

    expect(text).toContain('WARNING');
    expect(text).toContain('2 unacceptable risk(s)');
  });
});
