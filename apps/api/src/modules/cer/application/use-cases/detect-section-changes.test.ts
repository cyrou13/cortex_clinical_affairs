import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DetectSectionChangesUseCase } from './detect-section-changes.js';

const CER_VERSION_ID = 'cer-v2';
const PREV_VERSION_ID = 'cer-v1';
const PROJECT_ID = 'proj-1';

function makeChecksumService() {
  return {
    computeHash: vi.fn().mockReturnValue('hash'),
    verifyHash: vi.fn().mockReturnValue(true),
    computeDocumentHash: vi.fn().mockReturnValue('doc-hash'),
  };
}

function makePrisma(overrides?: {
  currentVersion?: Record<string, unknown> | null;
  previousVersion?: Record<string, unknown> | null;
  currentSnapshots?: Record<string, unknown>[];
  previousSnapshots?: Record<string, unknown>[];
  sections?: Record<string, unknown>[];
}) {
  return {
    cerVersion: {
      findUnique: vi.fn().mockImplementation(({ where }: any) => {
        if (where.id === CER_VERSION_ID) {
          return Promise.resolve(
            overrides?.currentVersion !== undefined
              ? overrides.currentVersion
              : { id: CER_VERSION_ID, projectId: PROJECT_ID },
          );
        }
        if (where.id === PREV_VERSION_ID) {
          return Promise.resolve(
            overrides?.previousVersion !== undefined
              ? overrides.previousVersion
              : { id: PREV_VERSION_ID },
          );
        }
        return Promise.resolve(null);
      }),
    },
    versionSnapshot: {
      findMany: vi.fn().mockImplementation(({ where }: any) => {
        if (where.cerVersionId === CER_VERSION_ID) {
          return Promise.resolve(overrides?.currentSnapshots ?? []);
        }
        if (where.cerVersionId === PREV_VERSION_ID) {
          return Promise.resolve(overrides?.previousSnapshots ?? []);
        }
        return Promise.resolve([]);
      }),
    },
    cerSection: {
      findMany: vi.fn().mockResolvedValue(
        overrides?.sections ?? [
          { id: 'sec-1', sectionType: 'LITERATURE_REVIEW' },
          { id: 'sec-2', sectionType: 'STATE_OF_THE_ART' },
        ],
      ),
      update: vi.fn().mockResolvedValue({}),
    },
  } as any;
}

describe('DetectSectionChangesUseCase', () => {
  let checksumService: ReturnType<typeof makeChecksumService>;

  beforeEach(() => {
    vi.clearAllMocks();
    checksumService = makeChecksumService();
  });

  it('throws NotFoundError when current version does not exist', async () => {
    const prisma = makePrisma({ currentVersion: null });
    const useCase = new DetectSectionChangesUseCase(prisma, checksumService);

    await expect(
      useCase.execute({
        cerVersionId: CER_VERSION_ID,
        previousVersionId: PREV_VERSION_ID,
      }),
    ).rejects.toThrow('not found');
  });

  it('throws NotFoundError when previous version does not exist', async () => {
    const prisma = makePrisma({ previousVersion: null });
    const useCase = new DetectSectionChangesUseCase(prisma, checksumService);

    await expect(
      useCase.execute({
        cerVersionId: CER_VERSION_ID,
        previousVersionId: PREV_VERSION_ID,
      }),
    ).rejects.toThrow('not found');
  });

  it('returns no changes when snapshots are identical', async () => {
    const prisma = makePrisma({
      currentSnapshots: [{ moduleType: 'SLS', checksum: 'hash-a' }],
      previousSnapshots: [{ moduleType: 'SLS', checksum: 'hash-a' }],
    });
    const useCase = new DetectSectionChangesUseCase(prisma, checksumService);

    const result = await useCase.execute({
      cerVersionId: CER_VERSION_ID,
      previousVersionId: PREV_VERSION_ID,
    });

    expect(result.upstreamChanges).toHaveLength(0);
  });

  it('detects modified upstream module', async () => {
    const prisma = makePrisma({
      currentSnapshots: [{ moduleType: 'SLS', checksum: 'hash-new' }],
      previousSnapshots: [{ moduleType: 'SLS', checksum: 'hash-old' }],
    });
    const useCase = new DetectSectionChangesUseCase(prisma, checksumService);

    const result = await useCase.execute({
      cerVersionId: CER_VERSION_ID,
      previousVersionId: PREV_VERSION_ID,
    });

    expect(result.upstreamChanges).toHaveLength(1);
    expect(result.upstreamChanges[0].changeType).toBe('MODIFIED');
    expect(result.upstreamChanges[0].moduleType).toBe('SLS');
  });

  it('detects added upstream module', async () => {
    const prisma = makePrisma({
      currentSnapshots: [
        { moduleType: 'SLS', checksum: 'hash-a' },
        { moduleType: 'PMS', checksum: 'hash-b' },
      ],
      previousSnapshots: [{ moduleType: 'SLS', checksum: 'hash-a' }],
    });
    const useCase = new DetectSectionChangesUseCase(prisma, checksumService);

    const result = await useCase.execute({
      cerVersionId: CER_VERSION_ID,
      previousVersionId: PREV_VERSION_ID,
    });

    const added = result.upstreamChanges.find((c) => c.changeType === 'ADDED');
    expect(added).toBeDefined();
    expect(added!.moduleType).toBe('PMS');
  });

  it('detects removed upstream module', async () => {
    const prisma = makePrisma({
      currentSnapshots: [],
      previousSnapshots: [{ moduleType: 'SLS', checksum: 'hash-a' }],
    });
    const useCase = new DetectSectionChangesUseCase(prisma, checksumService);

    const result = await useCase.execute({
      cerVersionId: CER_VERSION_ID,
      previousVersionId: PREV_VERSION_ID,
    });

    const removed = result.upstreamChanges.find((c) => c.changeType === 'REMOVED');
    expect(removed).toBeDefined();
    expect(removed!.moduleType).toBe('SLS');
  });

  it('flags affected sections for SLS changes', async () => {
    const prisma = makePrisma({
      currentSnapshots: [{ moduleType: 'SLS', checksum: 'hash-new' }],
      previousSnapshots: [{ moduleType: 'SLS', checksum: 'hash-old' }],
      sections: [
        { id: 'sec-1', sectionType: 'LITERATURE_REVIEW' },
        { id: 'sec-2', sectionType: 'STATE_OF_THE_ART' },
        { id: 'sec-3', sectionType: 'EXECUTIVE_SUMMARY' },
      ],
    });
    const useCase = new DetectSectionChangesUseCase(prisma, checksumService);

    const result = await useCase.execute({
      cerVersionId: CER_VERSION_ID,
      previousVersionId: PREV_VERSION_ID,
    });

    const litReview = result.affectedSections.find(
      (s) => s.sectionType === 'LITERATURE_REVIEW',
    );
    expect(litReview!.requiresUpdate).toBe(true);

    const execSummary = result.affectedSections.find(
      (s) => s.sectionType === 'EXECUTIVE_SUMMARY',
    );
    expect(execSummary!.requiresUpdate).toBe(false);
  });

  it('updates DB for affected sections', async () => {
    const prisma = makePrisma({
      currentSnapshots: [{ moduleType: 'SLS', checksum: 'hash-new' }],
      previousSnapshots: [{ moduleType: 'SLS', checksum: 'hash-old' }],
      sections: [{ id: 'sec-1', sectionType: 'LITERATURE_REVIEW' }],
    });
    const useCase = new DetectSectionChangesUseCase(prisma, checksumService);

    await useCase.execute({
      cerVersionId: CER_VERSION_ID,
      previousVersionId: PREV_VERSION_ID,
    });

    expect(prisma.cerSection.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sec-1' },
        data: expect.objectContaining({
          requiresUpdate: true,
        }),
      }),
    );
  });

  it('returns cerVersionId in result', async () => {
    const prisma = makePrisma();
    const useCase = new DetectSectionChangesUseCase(prisma, checksumService);

    const result = await useCase.execute({
      cerVersionId: CER_VERSION_ID,
      previousVersionId: PREV_VERSION_ID,
    });

    expect(result.cerVersionId).toBe(CER_VERSION_ID);
  });

  it('handles multiple upstream changes correctly', async () => {
    const prisma = makePrisma({
      currentSnapshots: [
        { moduleType: 'SLS', checksum: 'hash-new' },
        { moduleType: 'SOA', checksum: 'hash-new-2' },
      ],
      previousSnapshots: [
        { moduleType: 'SLS', checksum: 'hash-old' },
        { moduleType: 'SOA', checksum: 'hash-old-2' },
      ],
    });
    const useCase = new DetectSectionChangesUseCase(prisma, checksumService);

    const result = await useCase.execute({
      cerVersionId: CER_VERSION_ID,
      previousVersionId: PREV_VERSION_ID,
    });

    expect(result.upstreamChanges).toHaveLength(2);
  });
});
