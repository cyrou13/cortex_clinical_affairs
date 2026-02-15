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
}) {
  return {
    soaAnalysis: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.soa !== undefined
          ? overrides.soa
          : { id: SOA_ID, status: 'IN_PROGRESS', projectId: PROJECT_ID },
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
      soa: { id: SOA_ID, status: 'LOCKED', projectId: PROJECT_ID },
    });
    const useCase = new LockSoaUseCase(prisma, eventBus);

    await expect(
      useCase.execute({ soaAnalysisId: SOA_ID, userId: USER_ID }),
    ).rejects.toThrow('locked');
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

    await expect(
      useCase.execute({ soaAnalysisId: SOA_ID, userId: USER_ID }),
    ).rejects.toThrow('not finalized');
  });

  it('throws NotFoundError when SOA does not exist', async () => {
    const prisma = makePrisma({ soa: null });
    const useCase = new LockSoaUseCase(prisma, eventBus);

    await expect(
      useCase.execute({ soaAnalysisId: 'missing', userId: USER_ID }),
    ).rejects.toThrow('not found');
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
});
