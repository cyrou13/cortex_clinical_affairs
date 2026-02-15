import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LockValidationUseCase } from './lock-validation.js';

const STUDY_ID = 'study-1';
const PROJECT_ID = 'proj-1';
const USER_ID = 'user-1';
const SNAPSHOT_ID = 'snap-1';

function makeEventBus() {
  return {
    publish: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

function makePrisma(overrides?: {
  study?: Record<string, unknown> | null;
  protocol?: Record<string, unknown> | null;
  activeImport?: Record<string, unknown> | null;
  resultCount?: number;
  reportCount?: number;
}) {
  return {
    validationStudy: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.study !== undefined
          ? overrides.study
          : {
              id: STUDY_ID,
              status: 'IN_PROGRESS',
              projectId: PROJECT_ID,
              type: 'STANDALONE',
              name: 'Test Study',
            },
      ),
      update: vi.fn().mockResolvedValue({ id: STUDY_ID, status: 'LOCKED' }),
    },
    validationProtocol: {
      findFirst: vi.fn().mockResolvedValue(
        overrides?.protocol !== undefined
          ? overrides.protocol
          : { id: 'proto-1', status: 'APPROVED' },
      ),
    },
    dataImport: {
      findFirst: vi.fn().mockResolvedValue(
        overrides?.activeImport !== undefined
          ? overrides.activeImport
          : { id: 'import-1' },
      ),
    },
    validationResult: {
      count: vi.fn().mockResolvedValue(
        overrides?.resultCount !== undefined ? overrides.resultCount : 5,
      ),
    },
    generatedReport: {
      count: vi.fn().mockResolvedValue(
        overrides?.reportCount !== undefined ? overrides.reportCount : 2,
      ),
    },
    validationSnapshot: {
      create: vi.fn().mockResolvedValue({ id: SNAPSHOT_ID }),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  } as any;
}

describe('LockValidationUseCase', () => {
  let eventBus: ReturnType<typeof makeEventBus>;

  beforeEach(() => {
    vi.clearAllMocks();
    eventBus = makeEventBus();
  });

  it('locks validation study when all checks pass', async () => {
    const prisma = makePrisma();
    const useCase = new LockValidationUseCase(prisma, eventBus);

    const result = await useCase.execute({
      validationStudyId: STUDY_ID,
      userId: USER_ID,
    });

    expect(result.validationStudyId).toBe(STUDY_ID);
    expect(result.lockedAt).toBeDefined();
    expect(result.snapshotId).toBe(SNAPSHOT_ID);
  });

  it('updates study status to LOCKED', async () => {
    const prisma = makePrisma();
    const useCase = new LockValidationUseCase(prisma, eventBus);

    await useCase.execute({ validationStudyId: STUDY_ID, userId: USER_ID });

    expect(prisma.validationStudy.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: STUDY_ID },
        data: expect.objectContaining({ status: 'LOCKED' }),
      }),
    );
  });

  it('throws NotFoundError when study does not exist', async () => {
    const prisma = makePrisma({ study: null });
    const useCase = new LockValidationUseCase(prisma, eventBus);

    await expect(
      useCase.execute({ validationStudyId: 'missing', userId: USER_ID }),
    ).rejects.toThrow('not found');
  });

  it('throws LockConflictError when study is already locked', async () => {
    const prisma = makePrisma({
      study: {
        id: STUDY_ID,
        status: 'LOCKED',
        projectId: PROJECT_ID,
        type: 'STANDALONE',
        name: 'Test Study',
      },
    });
    const useCase = new LockValidationUseCase(prisma, eventBus);

    await expect(
      useCase.execute({ validationStudyId: STUDY_ID, userId: USER_ID }),
    ).rejects.toThrow('locked');
  });

  it('throws ValidationError when protocol is not approved', async () => {
    const prisma = makePrisma({
      protocol: { id: 'proto-1', status: 'DRAFT' },
    });
    const useCase = new LockValidationUseCase(prisma, eventBus);

    await expect(
      useCase.execute({ validationStudyId: STUDY_ID, userId: USER_ID }),
    ).rejects.toThrow('check(s) failed');
  });

  it('throws ValidationError when no protocol exists', async () => {
    const prisma = makePrisma({ protocol: null });
    const useCase = new LockValidationUseCase(prisma, eventBus);

    await expect(
      useCase.execute({ validationStudyId: STUDY_ID, userId: USER_ID }),
    ).rejects.toThrow('Protocol approved');
  });

  it('throws ValidationError when no active import exists', async () => {
    const prisma = makePrisma({ activeImport: null });
    const useCase = new LockValidationUseCase(prisma, eventBus);

    await expect(
      useCase.execute({ validationStudyId: STUDY_ID, userId: USER_ID }),
    ).rejects.toThrow('Active data import');
  });

  it('throws ValidationError when no results mapped', async () => {
    const prisma = makePrisma({ resultCount: 0 });
    const useCase = new LockValidationUseCase(prisma, eventBus);

    await expect(
      useCase.execute({ validationStudyId: STUDY_ID, userId: USER_ID }),
    ).rejects.toThrow('Results mapped');
  });

  it('throws ValidationError when no reports generated', async () => {
    const prisma = makePrisma({ reportCount: 0 });
    const useCase = new LockValidationUseCase(prisma, eventBus);

    await expect(
      useCase.execute({ validationStudyId: STUDY_ID, userId: USER_ID }),
    ).rejects.toThrow('Reports generated');
  });

  it('accumulates multiple failed checks in error message', async () => {
    const prisma = makePrisma({
      protocol: null,
      activeImport: null,
      resultCount: 0,
      reportCount: 0,
    });
    const useCase = new LockValidationUseCase(prisma, eventBus);

    await expect(
      useCase.execute({ validationStudyId: STUDY_ID, userId: USER_ID }),
    ).rejects.toThrow('4 check(s) failed');
  });

  it('creates snapshot on successful lock', async () => {
    const prisma = makePrisma();
    const useCase = new LockValidationUseCase(prisma, eventBus);

    await useCase.execute({ validationStudyId: STUDY_ID, userId: USER_ID });

    expect(prisma.validationSnapshot.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          validationStudyId: STUDY_ID,
          createdById: USER_ID,
          snapshotData: expect.objectContaining({
            studyId: STUDY_ID,
            studyType: 'STANDALONE',
          }),
        }),
      }),
    );
  });

  it('emits validation.study.locked domain event', async () => {
    const prisma = makePrisma();
    const useCase = new LockValidationUseCase(prisma, eventBus);

    await useCase.execute({ validationStudyId: STUDY_ID, userId: USER_ID });

    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'validation.study.locked',
        aggregateId: STUDY_ID,
        aggregateType: 'ValidationStudy',
        data: expect.objectContaining({
          validationStudyId: STUDY_ID,
          projectId: PROJECT_ID,
          studyType: 'STANDALONE',
        }),
      }),
    );
  });

  it('creates audit log entry on successful lock', async () => {
    const prisma = makePrisma();
    const useCase = new LockValidationUseCase(prisma, eventBus);

    await useCase.execute({ validationStudyId: STUDY_ID, userId: USER_ID });

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: USER_ID,
          action: 'validation.study.locked',
          targetType: 'validationStudy',
          targetId: STUDY_ID,
        }),
      }),
    );
  });

  it('does not create snapshot or emit event on validation failure', async () => {
    const prisma = makePrisma({ resultCount: 0 });
    const useCase = new LockValidationUseCase(prisma, eventBus);

    await expect(
      useCase.execute({ validationStudyId: STUDY_ID, userId: USER_ID }),
    ).rejects.toThrow();

    expect(prisma.validationSnapshot.create).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('does not update study status on validation failure', async () => {
    const prisma = makePrisma({ reportCount: 0 });
    const useCase = new LockValidationUseCase(prisma, eventBus);

    await expect(
      useCase.execute({ validationStudyId: STUDY_ID, userId: USER_ID }),
    ).rejects.toThrow();

    expect(prisma.validationStudy.update).not.toHaveBeenCalled();
  });
});
