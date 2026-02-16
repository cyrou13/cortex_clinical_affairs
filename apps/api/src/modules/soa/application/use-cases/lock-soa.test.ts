import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LockSoaUseCase } from './lock-soa.js';

const SOA_ID = 'soa-1';
const PROJECT_ID = 'proj-1';
const USER_ID = 'user-1';

function makeEventBus() {
  return {
    publish: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

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
            : { id: SOA_ID, status: 'IN_PROGRESS', projectId: PROJECT_ID, type: 'CLINICAL' },
        ),
      update: vi.fn().mockResolvedValue({ id: SOA_ID, status: 'LOCKED' }),
    },
    thematicSection: {
      findMany: vi.fn().mockResolvedValue(
        overrides?.sections ?? [
          { id: 'sec-1', status: 'FINALIZED', title: 'Safety' },
          { id: 'sec-2', status: 'FINALIZED', title: 'Performance' },
          { id: 'sec-3', status: 'FINALIZED', title: 'Clinical Benefit' },
        ],
      ),
      count: vi.fn().mockResolvedValue(3),
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
      count: vi.fn().mockResolvedValue(2),
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
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  } as any;
}

describe('LockSoaUseCase', () => {
  let eventBus: ReturnType<typeof makeEventBus>;

  beforeEach(() => {
    vi.clearAllMocks();
    eventBus = makeEventBus();
  });

  it('locks SOA when all sections are finalized', async () => {
    const prisma = makePrisma();
    const useCase = new LockSoaUseCase(prisma, eventBus);

    const result = await useCase.execute({ soaAnalysisId: SOA_ID, userId: USER_ID });

    expect(result.soaAnalysisId).toBe(SOA_ID);
    expect(result.lockedAt).toBeDefined();
    expect(result.sectionCount).toBe(3);
    expect(prisma.soaAnalysis.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: SOA_ID },
        data: expect.objectContaining({ status: 'LOCKED' }),
      }),
    );
  });

  it('throws LockConflictError when SOA is already locked', async () => {
    const prisma = makePrisma({
      soa: { id: SOA_ID, status: 'LOCKED', projectId: PROJECT_ID, type: 'CLINICAL' },
    });
    const useCase = new LockSoaUseCase(prisma, eventBus);

    await expect(useCase.execute({ soaAnalysisId: SOA_ID, userId: USER_ID })).rejects.toThrow(
      'locked',
    );
  });

  it('throws ValidationError when sections are not all finalized', async () => {
    const prisma = makePrisma({
      sections: [
        { id: 'sec-1', status: 'FINALIZED', title: 'Safety' },
        { id: 'sec-2', status: 'DRAFT', title: 'Performance' },
        { id: 'sec-3', status: 'IN_PROGRESS', title: 'Clinical Benefit' },
      ],
    });
    const useCase = new LockSoaUseCase(prisma, eventBus);

    await expect(useCase.execute({ soaAnalysisId: SOA_ID, userId: USER_ID })).rejects.toThrow(
      'not finalized',
    );
  });

  it('throws NotFoundError when SOA does not exist', async () => {
    const prisma = makePrisma({ soa: null });
    const useCase = new LockSoaUseCase(prisma, eventBus);

    await expect(useCase.execute({ soaAnalysisId: 'missing', userId: USER_ID })).rejects.toThrow(
      'not found',
    );
  });

  it('emits soa.analysis.locked domain event', async () => {
    const prisma = makePrisma();
    const useCase = new LockSoaUseCase(prisma, eventBus);

    await useCase.execute({ soaAnalysisId: SOA_ID, userId: USER_ID });

    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'soa.analysis.locked',
        aggregateId: SOA_ID,
        aggregateType: 'SoaAnalysis',
        data: expect.objectContaining({
          soaAnalysisId: SOA_ID,
          projectId: PROJECT_ID,
          sectionCount: 3,
        }),
      }),
    );
  });

  it('creates audit log entry on successful lock', async () => {
    const prisma = makePrisma();
    const useCase = new LockSoaUseCase(prisma, eventBus);

    await useCase.execute({ soaAnalysisId: SOA_ID, userId: USER_ID });

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: USER_ID,
          action: 'soa.analysis.locked',
          targetType: 'soaAnalysis',
          targetId: SOA_ID,
        }),
      }),
    );
  });

  it('throws ValidationError when extraction grids have no reviewed articles', async () => {
    const prisma = makePrisma({
      grids: [
        {
          id: 'grid-1',
          name: 'Clinical Data',
          cells: [
            { id: 'cell-1', validationStatus: 'PENDING' },
            { id: 'cell-2', validationStatus: 'PENDING' },
          ],
        },
      ],
    });
    const useCase = new LockSoaUseCase(prisma, eventBus);

    await expect(useCase.execute({ soaAnalysisId: SOA_ID, userId: USER_ID })).rejects.toThrow(
      'no reviewed articles',
    );
  });

  it('throws ValidationError when claims have no article links (traceability)', async () => {
    const prisma = makePrisma({
      claims: [
        { id: 'claim-1', statementText: 'Claim 1', claimArticleLinks: [{ id: 'link-1' }] },
        { id: 'claim-2', statementText: 'Claim 2', claimArticleLinks: [] },
        { id: 'claim-3', statementText: 'Claim 3', claimArticleLinks: [] },
      ],
    });
    const useCase = new LockSoaUseCase(prisma, eventBus);

    await expect(useCase.execute({ soaAnalysisId: SOA_ID, userId: USER_ID })).rejects.toThrow(
      '2 claim(s) have no supporting articles',
    );
  });

  it('throws ValidationError when quality assessment is incomplete', async () => {
    const prisma = makePrisma({
      soaLinks: [{ slsSessionId: 'sls-1' }],
      articles: [{ id: 'article-1' }, { id: 'article-2' }, { id: 'article-3' }],
      qualityAssessments: [
        { articleId: 'article-1' },
        // article-2 and article-3 not assessed
      ],
    });
    const useCase = new LockSoaUseCase(prisma, eventBus);

    await expect(useCase.execute({ soaAnalysisId: SOA_ID, userId: USER_ID })).rejects.toThrow(
      '2 article(s) missing quality assessment',
    );
  });

  it('throws ValidationError when Clinical SOA has no similar devices', async () => {
    const prisma = makePrisma({
      soa: { id: SOA_ID, status: 'IN_PROGRESS', projectId: PROJECT_ID, type: 'CLINICAL' },
      similarDevices: [],
    });
    const useCase = new LockSoaUseCase(prisma, eventBus);

    await expect(useCase.execute({ soaAnalysisId: SOA_ID, userId: USER_ID })).rejects.toThrow(
      'at least one similar device',
    );
  });

  it('allows lock when non-Clinical SOA has no similar devices', async () => {
    const prisma = makePrisma({
      soa: { id: SOA_ID, status: 'IN_PROGRESS', projectId: PROJECT_ID, type: 'SIMILAR_DEVICE' },
      similarDevices: [],
    });
    const useCase = new LockSoaUseCase(prisma, eventBus);

    const result = await useCase.execute({ soaAnalysisId: SOA_ID, userId: USER_ID });

    expect(result.soaAnalysisId).toBe(SOA_ID);
  });

  it('throws ValidationError when active async tasks are running', async () => {
    const prisma = makePrisma({
      asyncTasks: [
        { id: 'task-1', type: 'extraction', status: 'RUNNING' },
        { id: 'task-2', type: 'quality-assessment', status: 'PENDING' },
      ],
    });
    const useCase = new LockSoaUseCase(prisma, eventBus);

    await expect(useCase.execute({ soaAnalysisId: SOA_ID, userId: USER_ID })).rejects.toThrow(
      '2 active async task(s)',
    );
  });

  it('returns multiple blockers in validation error', async () => {
    const prisma = makePrisma({
      sections: [
        { id: 'sec-1', status: 'FINALIZED', title: 'Safety' },
        { id: 'sec-2', status: 'DRAFT', title: 'Performance' },
      ],
      claims: [{ id: 'claim-1', statementText: 'Claim 1', claimArticleLinks: [] }],
      similarDevices: [],
    });
    const useCase = new LockSoaUseCase(prisma, eventBus);

    await expect(useCase.execute({ soaAnalysisId: SOA_ID, userId: USER_ID })).rejects.toThrow(
      /section.*not finalized.*claim.*no supporting articles.*similar device/s,
    );
  });
});
