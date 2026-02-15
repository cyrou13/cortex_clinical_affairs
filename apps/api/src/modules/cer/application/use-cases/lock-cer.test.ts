import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LockCerUseCase } from './lock-cer.js';

const CER_VERSION_ID = 'cer-v1';
const PROJECT_ID = 'proj-1';
const USER_ID = 'user-1';

function makeEventBus() {
  return {
    publish: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

function makeChecksumService() {
  return {
    computeHash: vi.fn().mockReturnValue('hash-abc'),
    verifyHash: vi.fn().mockReturnValue(true),
    computeDocumentHash: vi.fn().mockReturnValue('doc-hash'),
  };
}

function makeSection(overrides?: Partial<Record<string, unknown>>) {
  return {
    id: crypto.randomUUID(),
    sectionType: 'SCOPE',
    status: 'FINALIZED',
    ...overrides,
  };
}

function makeEvaluator(overrides?: Partial<Record<string, unknown>>) {
  return {
    id: crypto.randomUUID(),
    role: 'WRITTEN_BY',
    cvFilePath: '/uploads/cv.pdf',
    coiDeclaredAt: new Date().toISOString(),
    signedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makePrisma(overrides?: {
  cerVersion?: Record<string, unknown> | null;
  sections?: Record<string, unknown>[];
  claimTraceCount?: number;
  evaluators?: Record<string, unknown>[];
  gsprMapping?: Record<string, unknown> | null;
  benefitRisk?: Record<string, unknown> | null;
}) {
  const defaultSections = Array.from({ length: 14 }, (_, i) =>
    makeSection({ id: `sec-${i}`, sectionType: `SECTION_${i}` }),
  );

  const defaultEvaluators = [
    makeEvaluator({ role: 'WRITTEN_BY' }),
    makeEvaluator({ role: 'VERIFIED_BY' }),
    makeEvaluator({ role: 'APPROVED_BY' }),
  ];

  return {
    cerVersion: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.cerVersion !== undefined
          ? overrides.cerVersion
          : {
              id: CER_VERSION_ID,
              status: 'FINALIZED',
              projectId: PROJECT_ID,
              versionNumber: '1.0',
            },
      ),
      update: vi.fn().mockResolvedValue({ id: CER_VERSION_ID, status: 'LOCKED' }),
    },
    cerSection: {
      findMany: vi.fn().mockResolvedValue(overrides?.sections ?? defaultSections),
    },
    claimTrace: {
      count: vi.fn().mockResolvedValue(
        overrides?.claimTraceCount !== undefined ? overrides.claimTraceCount : 10,
      ),
    },
    evaluator: {
      findMany: vi.fn().mockResolvedValue(overrides?.evaluators ?? defaultEvaluators),
    },
    gsprMapping: {
      findFirst: vi.fn().mockResolvedValue(
        overrides?.gsprMapping !== undefined
          ? overrides.gsprMapping
          : { id: 'gspr-1', status: 'FINALIZED' },
      ),
    },
    benefitRiskAssessment: {
      findFirst: vi.fn().mockResolvedValue(
        overrides?.benefitRisk !== undefined
          ? overrides.benefitRisk
          : { id: 'br-1', status: 'FINALIZED' },
      ),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
    // For CreateUpstreamSnapshotsUseCase called internally
    slsSession: { findMany: vi.fn().mockResolvedValue([]) },
    soaAnalysis: { findMany: vi.fn().mockResolvedValue([]) },
    validationStudy: { findMany: vi.fn().mockResolvedValue([]) },
    pmsRecord: { findMany: vi.fn().mockResolvedValue([]) },
    versionSnapshot: {
      create: vi.fn().mockImplementation(({ data }) =>
        Promise.resolve({ id: data.id, ...data }),
      ),
    },
  } as any;
}

describe('LockCerUseCase', () => {
  let eventBus: ReturnType<typeof makeEventBus>;
  let checksumService: ReturnType<typeof makeChecksumService>;

  beforeEach(() => {
    vi.clearAllMocks();
    eventBus = makeEventBus();
    checksumService = makeChecksumService();
  });

  it('locks CER version when all checks pass', async () => {
    const prisma = makePrisma();
    const useCase = new LockCerUseCase(prisma, eventBus, checksumService);

    const result = await useCase.execute({
      cerVersionId: CER_VERSION_ID,
      userId: USER_ID,
    });

    expect(result.cerVersionId).toBe(CER_VERSION_ID);
    expect(result.lockedAt).toBeDefined();
  });

  it('updates status to LOCKED', async () => {
    const prisma = makePrisma();
    const useCase = new LockCerUseCase(prisma, eventBus, checksumService);

    await useCase.execute({ cerVersionId: CER_VERSION_ID, userId: USER_ID });

    expect(prisma.cerVersion.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: CER_VERSION_ID },
        data: expect.objectContaining({ status: 'LOCKED' }),
      }),
    );
  });

  it('throws NotFoundError when CER version does not exist', async () => {
    const prisma = makePrisma({ cerVersion: null });
    const useCase = new LockCerUseCase(prisma, eventBus, checksumService);

    await expect(
      useCase.execute({ cerVersionId: 'missing', userId: USER_ID }),
    ).rejects.toThrow('not found');
  });

  it('throws LockConflictError when already locked', async () => {
    const prisma = makePrisma({
      cerVersion: {
        id: CER_VERSION_ID,
        status: 'LOCKED',
        projectId: PROJECT_ID,
        versionNumber: '1.0',
      },
    });
    const useCase = new LockCerUseCase(prisma, eventBus, checksumService);

    await expect(
      useCase.execute({ cerVersionId: CER_VERSION_ID, userId: USER_ID }),
    ).rejects.toThrow('locked');
  });

  it('throws ValidationError when fewer than 14 sections', async () => {
    const prisma = makePrisma({
      sections: [makeSection()],
    });
    const useCase = new LockCerUseCase(prisma, eventBus, checksumService);

    await expect(
      useCase.execute({ cerVersionId: CER_VERSION_ID, userId: USER_ID }),
    ).rejects.toThrow('check(s) failed');
  });

  it('throws ValidationError when sections not all FINALIZED', async () => {
    const sections = Array.from({ length: 14 }, (_, i) =>
      makeSection({ id: `sec-${i}`, sectionType: `SECTION_${i}` }),
    );
    sections[0].status = 'DRAFT';

    const prisma = makePrisma({ sections });
    const useCase = new LockCerUseCase(prisma, eventBus, checksumService);

    await expect(
      useCase.execute({ cerVersionId: CER_VERSION_ID, userId: USER_ID }),
    ).rejects.toThrow('check(s) failed');
  });

  it('throws ValidationError when no claim traces', async () => {
    const prisma = makePrisma({ claimTraceCount: 0 });
    const useCase = new LockCerUseCase(prisma, eventBus, checksumService);

    await expect(
      useCase.execute({ cerVersionId: CER_VERSION_ID, userId: USER_ID }),
    ).rejects.toThrow('Traceability');
  });

  it('throws ValidationError when evaluators missing roles', async () => {
    const prisma = makePrisma({
      evaluators: [makeEvaluator({ role: 'WRITTEN_BY' })],
    });
    const useCase = new LockCerUseCase(prisma, eventBus, checksumService);

    await expect(
      useCase.execute({ cerVersionId: CER_VERSION_ID, userId: USER_ID }),
    ).rejects.toThrow('check(s) failed');
  });

  it('throws ValidationError when evaluators not all signed', async () => {
    const prisma = makePrisma({
      evaluators: [
        makeEvaluator({ role: 'WRITTEN_BY', signedAt: null }),
        makeEvaluator({ role: 'VERIFIED_BY' }),
        makeEvaluator({ role: 'APPROVED_BY' }),
      ],
    });
    const useCase = new LockCerUseCase(prisma, eventBus, checksumService);

    await expect(
      useCase.execute({ cerVersionId: CER_VERSION_ID, userId: USER_ID }),
    ).rejects.toThrow('check(s) failed');
  });

  it('throws ValidationError when GSPR not finalized', async () => {
    const prisma = makePrisma({
      gsprMapping: { id: 'gspr-1', status: 'DRAFT' },
    });
    const useCase = new LockCerUseCase(prisma, eventBus, checksumService);

    await expect(
      useCase.execute({ cerVersionId: CER_VERSION_ID, userId: USER_ID }),
    ).rejects.toThrow('GSPR');
  });

  it('throws ValidationError when benefit-risk not finalized', async () => {
    const prisma = makePrisma({
      benefitRisk: { id: 'br-1', status: 'DRAFT' },
    });
    const useCase = new LockCerUseCase(prisma, eventBus, checksumService);

    await expect(
      useCase.execute({ cerVersionId: CER_VERSION_ID, userId: USER_ID }),
    ).rejects.toThrow('Benefit-risk');
  });

  it('emits cer.version.locked event', async () => {
    const prisma = makePrisma();
    const useCase = new LockCerUseCase(prisma, eventBus, checksumService);

    await useCase.execute({ cerVersionId: CER_VERSION_ID, userId: USER_ID });

    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'cer.version.locked',
        aggregateType: 'CerVersion',
        data: expect.objectContaining({
          cerVersionId: CER_VERSION_ID,
          projectId: PROJECT_ID,
        }),
      }),
    );
  });

  it('creates audit log entry', async () => {
    const prisma = makePrisma();
    const useCase = new LockCerUseCase(prisma, eventBus, checksumService);

    await useCase.execute({ cerVersionId: CER_VERSION_ID, userId: USER_ID });

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: USER_ID,
          action: 'cer.version.locked',
          targetType: 'cerVersion',
          targetId: CER_VERSION_ID,
        }),
      }),
    );
  });

  it('does not update status or emit event on validation failure', async () => {
    const prisma = makePrisma({ claimTraceCount: 0 });
    const useCase = new LockCerUseCase(prisma, eventBus, checksumService);

    await expect(
      useCase.execute({ cerVersionId: CER_VERSION_ID, userId: USER_ID }),
    ).rejects.toThrow();

    expect(prisma.cerVersion.update).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });
});
