import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AssembleSectionsUseCase } from './assemble-sections.js';

function makePrisma(overrides?: {
  cerVersion?: Record<string, unknown> | null;
  upstreamLinks?: Array<Record<string, unknown>>;
  existingSections?: number;
}) {
  return {
    cerVersion: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.cerVersion !== undefined
          ? overrides.cerVersion
          : { id: 'cer-1', status: 'DRAFT' },
      ),
    },
    cerUpstreamLink: {
      findMany: vi.fn().mockResolvedValue(
        overrides?.upstreamLinks ?? [
          { moduleType: 'SLS' },
          { moduleType: 'SOA' },
          { moduleType: 'VALIDATION' },
        ],
      ),
    },
    cerSection: {
      count: vi.fn().mockResolvedValue(overrides?.existingSections ?? 0),
      create: vi.fn().mockResolvedValue({ id: 'sec-1' }),
    },
  } as any;
}

function makeJobEnqueuer() {
  let counter = 0;
  return {
    enqueue: vi.fn().mockImplementation(() => {
      counter++;
      return Promise.resolve(`job-${counter}`);
    }),
  };
}

describe('AssembleSectionsUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates 14 sections and enqueues 14 drafting jobs', async () => {
    const prisma = makePrisma();
    const enqueuer = makeJobEnqueuer();
    const useCase = new AssembleSectionsUseCase(prisma, enqueuer);

    const result = await useCase.execute({ cerVersionId: 'cer-1', userId: 'user-1' });

    expect(result.sectionCount).toBe(14);
    expect(result.sectionIds).toHaveLength(14);
    expect(result.jobIds).toHaveLength(14);
    expect(prisma.cerSection.create).toHaveBeenCalledTimes(14);
    expect(enqueuer.enqueue).toHaveBeenCalledTimes(14);
  });

  it('enqueues jobs to cer:draft-section queue', async () => {
    const prisma = makePrisma();
    const enqueuer = makeJobEnqueuer();
    const useCase = new AssembleSectionsUseCase(prisma, enqueuer);

    await useCase.execute({ cerVersionId: 'cer-1', userId: 'user-1' });

    expect(enqueuer.enqueue).toHaveBeenCalledWith(
      'cer:draft-section',
      expect.objectContaining({
        type: 'cer:draft-section',
        metadata: expect.objectContaining({
          cerVersionId: 'cer-1',
          sectionNumber: '1',
        }),
      }),
    );
  });

  it('throws when CER version not found', async () => {
    const prisma = makePrisma({ cerVersion: null });
    const enqueuer = makeJobEnqueuer();
    const useCase = new AssembleSectionsUseCase(prisma, enqueuer);

    await expect(
      useCase.execute({ cerVersionId: 'missing', userId: 'user-1' }),
    ).rejects.toThrow('not found');
  });

  it('throws when CER version is locked', async () => {
    const prisma = makePrisma({ cerVersion: { id: 'cer-1', status: 'LOCKED' } });
    const enqueuer = makeJobEnqueuer();
    const useCase = new AssembleSectionsUseCase(prisma, enqueuer);

    await expect(
      useCase.execute({ cerVersionId: 'cer-1', userId: 'user-1' }),
    ).rejects.toThrow('locked');
  });

  it('throws when no upstream modules are linked', async () => {
    const prisma = makePrisma({ upstreamLinks: [] });
    const enqueuer = makeJobEnqueuer();
    const useCase = new AssembleSectionsUseCase(prisma, enqueuer);

    await expect(
      useCase.execute({ cerVersionId: 'cer-1', userId: 'user-1' }),
    ).rejects.toThrow('upstream modules');
  });

  it('throws when sections already exist', async () => {
    const prisma = makePrisma({ existingSections: 14 });
    const enqueuer = makeJobEnqueuer();
    const useCase = new AssembleSectionsUseCase(prisma, enqueuer);

    await expect(
      useCase.execute({ cerVersionId: 'cer-1', userId: 'user-1' }),
    ).rejects.toThrow('already been assembled');
  });

  it('creates sections with correct order indices', async () => {
    const prisma = makePrisma();
    const enqueuer = makeJobEnqueuer();
    const useCase = new AssembleSectionsUseCase(prisma, enqueuer);

    await useCase.execute({ cerVersionId: 'cer-1', userId: 'user-1' });

    // First section should have orderIndex 0
    const firstCall = prisma.cerSection.create.mock.calls[0]![0];
    expect(firstCall.data.orderIndex).toBe(0);
    expect(firstCall.data.sectionNumber).toBe('1');

    // Last section should have orderIndex 13
    const lastCall = prisma.cerSection.create.mock.calls[13]![0];
    expect(lastCall.data.orderIndex).toBe(13);
    expect(lastCall.data.sectionNumber).toBe('14');
  });

  it('returns cerVersionId in result', async () => {
    const prisma = makePrisma();
    const enqueuer = makeJobEnqueuer();
    const useCase = new AssembleSectionsUseCase(prisma, enqueuer);

    const result = await useCase.execute({ cerVersionId: 'cer-1', userId: 'user-1' });
    expect(result.cerVersionId).toBe('cer-1');
  });
});
