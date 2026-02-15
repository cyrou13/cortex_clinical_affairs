import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ManageVersionsUseCase } from './manage-versions.js';

const PROJECT_ID = 'proj-1';
const CER_VERSION_ID = 'cer-v1';
const PREV_VERSION_ID = 'cer-v0';
const USER_ID = 'user-1';

function makeEventBus() {
  return {
    publish: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

function makePrisma(overrides?: {
  project?: Record<string, unknown> | null;
  previousVersion?: Record<string, unknown> | null;
  sections?: Record<string, unknown>[];
  claimTraces?: Record<string, unknown>[];
  crossRefs?: Record<string, unknown>[];
  bibEntries?: Record<string, unknown>[];
}) {
  return {
    project: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.project !== undefined
          ? overrides.project
          : { id: PROJECT_ID },
      ),
    },
    cerVersion: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.previousVersion !== undefined
          ? overrides.previousVersion
          : {
              id: PREV_VERSION_ID,
              status: 'LOCKED',
              versionNumber: '1.0',
              projectId: PROJECT_ID,
            },
      ),
      create: vi.fn().mockImplementation(({ data }) =>
        Promise.resolve({ id: data.id, ...data }),
      ),
    },
    cerSection: {
      findMany: vi.fn().mockResolvedValue(
        overrides?.sections ?? [
          {
            id: 'sec-1',
            sectionType: 'EXECUTIVE_SUMMARY',
            title: 'Executive Summary',
            orderIndex: 0,
            content: 'Content',
            status: 'FINALIZED',
          },
          {
            id: 'sec-2',
            sectionType: 'SCOPE',
            title: 'Scope',
            orderIndex: 1,
            content: 'Scope content',
            status: 'FINALIZED',
          },
        ],
      ),
      create: vi.fn().mockImplementation(({ data }) =>
        Promise.resolve({ id: data.id, ...data }),
      ),
    },
    claimTrace: {
      findMany: vi.fn().mockResolvedValue(overrides?.claimTraces ?? []),
      create: vi.fn().mockImplementation(({ data }) =>
        Promise.resolve({ id: data.id }),
      ),
    },
    crossReference: {
      findMany: vi.fn().mockResolvedValue(overrides?.crossRefs ?? []),
      create: vi.fn().mockImplementation(({ data }) =>
        Promise.resolve({ id: data.id }),
      ),
    },
    bibliographyEntry: {
      findMany: vi.fn().mockResolvedValue(overrides?.bibEntries ?? []),
      create: vi.fn().mockImplementation(({ data }) =>
        Promise.resolve({ id: data.id }),
      ),
    },
  } as any;
}

describe('ManageVersionsUseCase', () => {
  let eventBus: ReturnType<typeof makeEventBus>;

  beforeEach(() => {
    vi.clearAllMocks();
    eventBus = makeEventBus();
  });

  it('creates initial version with number 1.0', async () => {
    const prisma = makePrisma();
    const useCase = new ManageVersionsUseCase(prisma, eventBus);

    const result = await useCase.execute({
      projectId: PROJECT_ID,
      versionType: 'INITIAL',
      userId: USER_ID,
    });

    expect(result.versionNumber).toBe('1.0');
    expect(result.versionType).toBe('INITIAL');
  });

  it('creates annual update with incremented major version', async () => {
    const prisma = makePrisma();
    const useCase = new ManageVersionsUseCase(prisma, eventBus);

    const result = await useCase.execute({
      projectId: PROJECT_ID,
      previousVersionId: PREV_VERSION_ID,
      versionType: 'ANNUAL_UPDATE',
      userId: USER_ID,
    });

    expect(result.versionNumber).toBe('2.0');
  });

  it('creates patch update with incremented minor version', async () => {
    const prisma = makePrisma();
    const useCase = new ManageVersionsUseCase(prisma, eventBus);

    const result = await useCase.execute({
      projectId: PROJECT_ID,
      previousVersionId: PREV_VERSION_ID,
      versionType: 'PATCH_UPDATE',
      userId: USER_ID,
    });

    expect(result.versionNumber).toBe('1.1');
  });

  it('throws ValidationError for invalid version type', async () => {
    const prisma = makePrisma();
    const useCase = new ManageVersionsUseCase(prisma, eventBus);

    await expect(
      useCase.execute({
        projectId: PROJECT_ID,
        versionType: 'INVALID',
        userId: USER_ID,
      }),
    ).rejects.toThrow('Invalid version type');
  });

  it('throws NotFoundError when project does not exist', async () => {
    const prisma = makePrisma({ project: null });
    const useCase = new ManageVersionsUseCase(prisma, eventBus);

    await expect(
      useCase.execute({
        projectId: 'missing',
        versionType: 'INITIAL',
        userId: USER_ID,
      }),
    ).rejects.toThrow('not found');
  });

  it('throws NotFoundError when previous version does not exist', async () => {
    const prisma = makePrisma({ previousVersion: null });
    const useCase = new ManageVersionsUseCase(prisma, eventBus);

    await expect(
      useCase.execute({
        projectId: PROJECT_ID,
        previousVersionId: 'missing',
        versionType: 'ANNUAL_UPDATE',
        userId: USER_ID,
      }),
    ).rejects.toThrow('not found');
  });

  it('throws LockConflictError when previous version is not locked', async () => {
    const prisma = makePrisma({
      previousVersion: {
        id: PREV_VERSION_ID,
        status: 'DRAFT',
        versionNumber: '1.0',
        projectId: PROJECT_ID,
      },
    });
    const useCase = new ManageVersionsUseCase(prisma, eventBus);

    await expect(
      useCase.execute({
        projectId: PROJECT_ID,
        previousVersionId: PREV_VERSION_ID,
        versionType: 'ANNUAL_UPDATE',
        userId: USER_ID,
      }),
    ).rejects.toThrow('locked');
  });

  it('duplicates sections from previous version', async () => {
    const prisma = makePrisma({
      sections: [
        { id: 'sec-1', sectionType: 'SCOPE', title: 'Scope', orderIndex: 0, content: 'C1', status: 'FINALIZED' },
        { id: 'sec-2', sectionType: 'METHODS', title: 'Methods', orderIndex: 1, content: 'C2', status: 'FINALIZED' },
      ],
    });
    const useCase = new ManageVersionsUseCase(prisma, eventBus);

    const result = await useCase.execute({
      projectId: PROJECT_ID,
      previousVersionId: PREV_VERSION_ID,
      versionType: 'ANNUAL_UPDATE',
      userId: USER_ID,
    });

    expect(result.duplicatedSections).toBe(2);
    expect(prisma.cerSection.create).toHaveBeenCalledTimes(2);
  });

  it('sets duplicated sections to DRAFT status', async () => {
    const prisma = makePrisma({
      sections: [
        { id: 'sec-1', sectionType: 'SCOPE', title: 'Scope', orderIndex: 0, content: 'C', status: 'FINALIZED' },
      ],
    });
    const useCase = new ManageVersionsUseCase(prisma, eventBus);

    await useCase.execute({
      projectId: PROJECT_ID,
      previousVersionId: PREV_VERSION_ID,
      versionType: 'ANNUAL_UPDATE',
      userId: USER_ID,
    });

    expect(prisma.cerSection.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'DRAFT',
        }),
      }),
    );
  });

  it('duplicates related records (claim traces, cross refs, bibliography)', async () => {
    const prisma = makePrisma({
      claimTraces: [{ id: 'ct-1', claimId: 'claim-1', sectionType: 'SCOPE', evidenceReference: 'ref-1', traceType: 'DIRECT' }],
      crossRefs: [{ id: 'cr-1', sourceSectionType: 'SCOPE', targetSectionType: 'METHODS', description: 'See methods' }],
      bibEntries: [{ id: 'bib-1', citationKey: 'Smith2024', title: 'Study', authors: 'Smith', journal: 'J Med', year: 2024, doi: '10.1234', referenceType: 'JOURNAL' }],
    });
    const useCase = new ManageVersionsUseCase(prisma, eventBus);

    await useCase.execute({
      projectId: PROJECT_ID,
      previousVersionId: PREV_VERSION_ID,
      versionType: 'ANNUAL_UPDATE',
      userId: USER_ID,
    });

    expect(prisma.claimTrace.create).toHaveBeenCalled();
    expect(prisma.crossReference.create).toHaveBeenCalled();
    expect(prisma.bibliographyEntry.create).toHaveBeenCalled();
  });

  it('emits cer.version.created event', async () => {
    const prisma = makePrisma();
    const useCase = new ManageVersionsUseCase(prisma, eventBus);

    await useCase.execute({
      projectId: PROJECT_ID,
      versionType: 'INITIAL',
      userId: USER_ID,
    });

    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'cer.version.created',
        aggregateType: 'CerVersion',
      }),
    );
  });

  it('throws ValidationError when first version is not INITIAL type', async () => {
    const prisma = makePrisma();
    const useCase = new ManageVersionsUseCase(prisma, eventBus);

    await expect(
      useCase.execute({
        projectId: PROJECT_ID,
        versionType: 'ANNUAL_UPDATE',
        userId: USER_ID,
      }),
    ).rejects.toThrow('First version must be of type INITIAL');
  });

  it('validates previous version belongs to same project', async () => {
    const prisma = makePrisma({
      previousVersion: {
        id: PREV_VERSION_ID,
        status: 'LOCKED',
        versionNumber: '1.0',
        projectId: 'other-project',
      },
    });
    const useCase = new ManageVersionsUseCase(prisma, eventBus);

    await expect(
      useCase.execute({
        projectId: PROJECT_ID,
        previousVersionId: PREV_VERSION_ID,
        versionType: 'ANNUAL_UPDATE',
        userId: USER_ID,
      }),
    ).rejects.toThrow('does not belong');
  });
});
