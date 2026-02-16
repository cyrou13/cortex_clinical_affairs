import { describe, it, expect, vi } from 'vitest';
import { GetSoaLockReadinessUseCase } from './get-soa-lock-readiness.js';

const SOA_ID = 'soa-1';

function makePrisma(overrides?: {
  soa?: Record<string, unknown> | null;
  sections?: Array<Record<string, unknown>>;
  grids?: Array<Record<string, unknown>>;
  claims?: Array<Record<string, unknown>>;
  soaLinks?: Array<Record<string, unknown>>;
  articles?: Array<Record<string, unknown>>;
  qualityAssessments?: Array<Record<string, unknown>>;
  similarDevices?: Array<Record<string, unknown>>;
  asyncTasks?: Array<Record<string, unknown>>;
}) {
  return {
    soaAnalysis: {
      findUnique: vi
        .fn()
        .mockResolvedValue(
          overrides?.soa !== undefined
            ? overrides.soa
            : { id: SOA_ID, status: 'IN_PROGRESS', type: 'CLINICAL' },
        ),
    },
    thematicSection: {
      findMany: vi.fn().mockResolvedValue(
        overrides?.sections ?? [
          { id: 'sec-1', status: 'FINALIZED', title: 'Safety' },
          { id: 'sec-2', status: 'FINALIZED', title: 'Performance' },
        ],
      ),
    },
    extractionGrid: {
      findMany: vi.fn().mockResolvedValue(
        overrides?.grids ?? [
          {
            id: 'grid-1',
            name: 'Clinical Data',
            cells: [
              { id: 'cell-1', validationStatus: 'VALIDATED' },
              { id: 'cell-2', validationStatus: 'CORRECTED' },
            ],
          },
        ],
      ),
    },
    claim: {
      findMany: vi.fn().mockResolvedValue(
        overrides?.claims ?? [
          { id: 'claim-1', statementText: 'Claim 1', claimArticleLinks: [{ id: 'link-1' }] },
          { id: 'claim-2', statementText: 'Claim 2', claimArticleLinks: [{ id: 'link-2' }] },
        ],
      ),
    },
    soaSlsLink: {
      findMany: vi.fn().mockResolvedValue(overrides?.soaLinks ?? []),
    },
    article: {
      findMany: vi.fn().mockResolvedValue(overrides?.articles ?? []),
    },
    qualityAssessment: {
      findMany: vi.fn().mockResolvedValue(overrides?.qualityAssessments ?? []),
    },
    similarDevice: {
      findMany: vi.fn().mockResolvedValue(overrides?.similarDevices ?? [{ id: 'device-1' }]),
    },
    asyncTask: {
      findMany: vi.fn().mockResolvedValue(overrides?.asyncTasks ?? []),
    },
  } as any;
}

describe('GetSoaLockReadinessUseCase', () => {
  it('returns canLock true when all conditions are met', async () => {
    const prisma = makePrisma();
    const useCase = new GetSoaLockReadinessUseCase(prisma);

    const result = await useCase.execute({ soaAnalysisId: SOA_ID });

    expect(result.canLock).toBe(true);
    expect(result.blockers).toHaveLength(0);
    expect(result.summary.traceabilityPercentage).toBe(100);
  });

  it('returns canLock false when SOA is already locked', async () => {
    const prisma = makePrisma({
      soa: { id: SOA_ID, status: 'LOCKED', type: 'CLINICAL' },
    });
    const useCase = new GetSoaLockReadinessUseCase(prisma);

    const result = await useCase.execute({ soaAnalysisId: SOA_ID });

    expect(result.canLock).toBe(false);
    expect(result.blockers).toContain('SOA is already locked');
  });

  it('returns blockers for non-finalized sections', async () => {
    const prisma = makePrisma({
      sections: [
        { id: 'sec-1', status: 'FINALIZED', title: 'Safety' },
        { id: 'sec-2', status: 'DRAFT', title: 'Performance' },
        { id: 'sec-3', status: 'IN_PROGRESS', title: 'Clinical Data' },
      ],
    });
    const useCase = new GetSoaLockReadinessUseCase(prisma);

    const result = await useCase.execute({ soaAnalysisId: SOA_ID });

    expect(result.canLock).toBe(false);
    expect(result.blockers).toHaveLength(2);
    expect(result.blockers[0]).toContain('Performance');
    expect(result.blockers[1]).toContain('Clinical Data');
    expect(result.summary.finalizedSections).toBe(1);
    expect(result.summary.sectionCount).toBe(3);
  });

  it('returns blockers for unlinked claims', async () => {
    const prisma = makePrisma({
      claims: [
        { id: 'claim-1', statementText: 'Claim 1', claimArticleLinks: [{ id: 'link-1' }] },
        { id: 'claim-2', statementText: 'Claim 2', claimArticleLinks: [] },
        { id: 'claim-3', statementText: 'Claim 3', claimArticleLinks: [] },
      ],
    });
    const useCase = new GetSoaLockReadinessUseCase(prisma);

    const result = await useCase.execute({ soaAnalysisId: SOA_ID });

    expect(result.canLock).toBe(false);
    expect(result.blockers).toContain('2 claims have no article links');
    expect(result.summary.claimCount).toBe(3);
    expect(result.summary.linkedClaims).toBe(1);
    expect(result.summary.traceabilityPercentage).toBe(33);
  });

  it('returns blocker when Clinical SOA has no similar devices', async () => {
    const prisma = makePrisma({
      soa: { id: SOA_ID, status: 'IN_PROGRESS', type: 'CLINICAL' },
      similarDevices: [],
    });
    const useCase = new GetSoaLockReadinessUseCase(prisma);

    const result = await useCase.execute({ soaAnalysisId: SOA_ID });

    expect(result.canLock).toBe(false);
    expect(result.blockers).toContain(
      'Clinical SOA requires at least one similar device in Section 6',
    );
    expect(result.summary.similarDeviceCount).toBe(0);
  });

  it('returns blockers for active async tasks', async () => {
    const prisma = makePrisma({
      asyncTasks: [
        { id: 'task-1', type: 'extraction', status: 'RUNNING' },
        { id: 'task-2', type: 'narrative-generation', status: 'PENDING' },
      ],
    });
    const useCase = new GetSoaLockReadinessUseCase(prisma);

    const result = await useCase.execute({ soaAnalysisId: SOA_ID });

    expect(result.canLock).toBe(false);
    expect(result.blockers.some((b) => b.includes('active async tasks'))).toBe(true);
    expect(result.summary.activeTaskCount).toBe(2);
  });

  it('returns complete summary data', async () => {
    const prisma = makePrisma({
      sections: [
        { id: 'sec-1', status: 'FINALIZED', title: 'Safety' },
        { id: 'sec-2', status: 'FINALIZED', title: 'Performance' },
        { id: 'sec-3', status: 'FINALIZED', title: 'Clinical Benefit' },
      ],
      claims: [
        { id: 'claim-1', statementText: 'Claim 1', claimArticleLinks: [{ id: 'link-1' }] },
        { id: 'claim-2', statementText: 'Claim 2', claimArticleLinks: [{ id: 'link-2' }] },
        { id: 'claim-3', statementText: 'Claim 3', claimArticleLinks: [{ id: 'link-3' }] },
      ],
      similarDevices: [{ id: 'device-1' }, { id: 'device-2' }],
    });
    const useCase = new GetSoaLockReadinessUseCase(prisma);

    const result = await useCase.execute({ soaAnalysisId: SOA_ID });

    expect(result.summary).toEqual({
      sectionCount: 3,
      finalizedSections: 3,
      articleCount: 2,
      reviewedArticles: 2,
      claimCount: 3,
      linkedClaims: 3,
      traceabilityPercentage: 100,
      similarDeviceCount: 2,
      activeTaskCount: 0,
    });
  });

  it('throws NotFoundError when SOA does not exist', async () => {
    const prisma = makePrisma({ soa: null });
    const useCase = new GetSoaLockReadinessUseCase(prisma);

    await expect(useCase.execute({ soaAnalysisId: 'missing' })).rejects.toThrow('not found');
  });
});
