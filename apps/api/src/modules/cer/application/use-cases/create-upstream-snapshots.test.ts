import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateUpstreamSnapshotsUseCase } from './create-upstream-snapshots.js';

const CER_VERSION_ID = 'cer-v1';
const PROJECT_ID = 'proj-1';
const USER_ID = 'user-1';

function makeChecksumService() {
  return {
    computeHash: vi.fn().mockReturnValue('hash-abc-123'),
    verifyHash: vi.fn().mockReturnValue(true),
    computeDocumentHash: vi.fn().mockReturnValue('doc-hash'),
  };
}

function makePrisma(overrides?: {
  cerVersion?: Record<string, unknown> | null;
  slsData?: Record<string, unknown>[];
  soaData?: Record<string, unknown>[];
  validationData?: Record<string, unknown>[];
  pmsData?: Record<string, unknown>[];
  snapshot?: Record<string, unknown> | null;
}) {
  return {
    cerVersion: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.cerVersion !== undefined
          ? overrides.cerVersion
          : { id: CER_VERSION_ID, projectId: PROJECT_ID },
      ),
    },
    slsSession: {
      findMany: vi.fn().mockResolvedValue(overrides?.slsData ?? []),
    },
    soaAnalysis: {
      findMany: vi.fn().mockResolvedValue(overrides?.soaData ?? []),
    },
    validationStudy: {
      findMany: vi.fn().mockResolvedValue(overrides?.validationData ?? []),
    },
    pmsRecord: {
      findMany: vi.fn().mockResolvedValue(overrides?.pmsData ?? []),
    },
    versionSnapshot: {
      create: vi.fn().mockImplementation(({ data }) =>
        Promise.resolve({
          id: data.id,
          cerVersionId: data.cerVersionId,
          moduleType: data.moduleType,
          data: data.data,
          checksum: data.checksum,
        }),
      ),
      findUnique: vi.fn().mockResolvedValue(
        overrides?.snapshot !== undefined
          ? overrides.snapshot
          : { id: 'snap-1', moduleType: 'SLS', data: [{ id: 'sls-1' }], checksum: 'hash-abc-123' },
      ),
    },
  } as any;
}

describe('CreateUpstreamSnapshotsUseCase', () => {
  let checksumService: ReturnType<typeof makeChecksumService>;

  beforeEach(() => {
    vi.clearAllMocks();
    checksumService = makeChecksumService();
  });

  it('throws NotFoundError when CER version does not exist', async () => {
    const prisma = makePrisma({ cerVersion: null });
    const useCase = new CreateUpstreamSnapshotsUseCase(prisma, checksumService);

    await expect(
      useCase.execute({ cerVersionId: 'missing', userId: USER_ID }),
    ).rejects.toThrow('not found');
  });

  it('returns empty snapshots when no upstream data exists', async () => {
    const prisma = makePrisma();
    const useCase = new CreateUpstreamSnapshotsUseCase(prisma, checksumService);

    const result = await useCase.execute({
      cerVersionId: CER_VERSION_ID,
      userId: USER_ID,
    });

    expect(result.snapshotCount).toBe(0);
    expect(result.snapshots).toHaveLength(0);
  });

  it('creates SLS snapshot', async () => {
    const prisma = makePrisma({
      slsData: [{ id: 'sls-1', query: 'search query' }],
    });
    const useCase = new CreateUpstreamSnapshotsUseCase(prisma, checksumService);

    const result = await useCase.execute({
      cerVersionId: CER_VERSION_ID,
      userId: USER_ID,
    });

    expect(result.snapshotCount).toBe(1);
    expect(result.snapshots[0].moduleType).toBe('SLS');
  });

  it('creates multiple snapshots for multiple upstream modules', async () => {
    const prisma = makePrisma({
      slsData: [{ id: 'sls-1' }],
      soaData: [{ id: 'soa-1' }],
      validationData: [{ id: 'val-1' }],
    });
    const useCase = new CreateUpstreamSnapshotsUseCase(prisma, checksumService);

    const result = await useCase.execute({
      cerVersionId: CER_VERSION_ID,
      userId: USER_ID,
    });

    expect(result.snapshotCount).toBe(3);
  });

  it('computes checksum for each snapshot', async () => {
    const prisma = makePrisma({
      slsData: [{ id: 'sls-1' }],
    });
    const useCase = new CreateUpstreamSnapshotsUseCase(prisma, checksumService);

    await useCase.execute({
      cerVersionId: CER_VERSION_ID,
      userId: USER_ID,
    });

    expect(checksumService.computeHash).toHaveBeenCalled();
  });

  it('stores snapshot data in DB', async () => {
    const prisma = makePrisma({
      slsData: [{ id: 'sls-1' }],
    });
    const useCase = new CreateUpstreamSnapshotsUseCase(prisma, checksumService);

    await useCase.execute({
      cerVersionId: CER_VERSION_ID,
      userId: USER_ID,
    });

    expect(prisma.versionSnapshot.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          cerVersionId: CER_VERSION_ID,
          moduleType: 'SLS',
          checksum: 'hash-abc-123',
        }),
      }),
    );
  });

  it('returns cerVersionId in result', async () => {
    const prisma = makePrisma();
    const useCase = new CreateUpstreamSnapshotsUseCase(prisma, checksumService);

    const result = await useCase.execute({
      cerVersionId: CER_VERSION_ID,
      userId: USER_ID,
    });

    expect(result.cerVersionId).toBe(CER_VERSION_ID);
  });

  describe('verifySnapshot', () => {
    it('verifies snapshot integrity', async () => {
      const prisma = makePrisma();
      const useCase = new CreateUpstreamSnapshotsUseCase(prisma, checksumService);

      const result = await useCase.verifySnapshot('snap-1');

      expect(result.valid).toBe(true);
      expect(result.moduleType).toBe('SLS');
    });

    it('throws NotFoundError for non-existent snapshot', async () => {
      const prisma = makePrisma({ snapshot: null });
      const useCase = new CreateUpstreamSnapshotsUseCase(prisma, checksumService);

      await expect(useCase.verifySnapshot('missing')).rejects.toThrow('not found');
    });

    it('detects tampered snapshot', async () => {
      checksumService.verifyHash.mockReturnValue(false);
      const prisma = makePrisma();
      const useCase = new CreateUpstreamSnapshotsUseCase(prisma, checksumService);

      const result = await useCase.verifySnapshot('snap-1');

      expect(result.valid).toBe(false);
    });
  });
});
