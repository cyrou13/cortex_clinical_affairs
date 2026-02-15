import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ManageBibliographyUseCase } from './manage-bibliography.js';

const VERSION_ID = 'ver-1';
const USER_ID = 'user-1';

function makePrisma(overrides?: {
  cerVersion?: Record<string, unknown> | null;
  sections?: Array<Record<string, unknown>>;
  claimTraces?: Array<Record<string, unknown>>;
  articles?: Array<Record<string, unknown>>;
}) {
  return {
    cerVersion: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.cerVersion !== undefined
          ? overrides.cerVersion
          : { id: VERSION_ID },
      ),
    },
    cerSection: {
      findMany: vi.fn().mockResolvedValue(
        overrides?.sections ?? [
          { id: 'sec-1', humanEditedContent: { text: 'See [1] and [2]' }, aiDraftContent: null },
          { id: 'sec-2', humanEditedContent: { text: 'Reference [1] again' }, aiDraftContent: null },
        ],
      ),
    },
    claimTrace: {
      findMany: vi.fn().mockResolvedValue(
        overrides?.claimTraces ?? [
          { refNumber: '1', slsArticleId: 'art-1' },
          { refNumber: '2', slsArticleId: 'art-2' },
        ],
      ),
    },
    slsArticle: {
      findMany: vi.fn().mockResolvedValue(
        overrides?.articles ?? [
          { id: 'art-1', title: 'First Article', authors: ['Smith J'], journal: 'JAMA', year: 2025, volume: '1', issue: '1', pages: '1-10', doi: '10.1/a' },
          { id: 'art-2', title: 'Second Article', authors: ['Doe A'], journal: 'Lancet', year: 2024, volume: '2', issue: null, pages: null, doi: null },
        ],
      ),
    },
    bibliographyEntry: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: data.id })),
    },
  } as any;
}

describe('ManageBibliographyUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('compiles bibliography from cited articles', async () => {
    const prisma = makePrisma();
    const useCase = new ManageBibliographyUseCase(prisma);

    const result = await useCase.execute({
      cerVersionId: VERSION_ID,
      citationStyle: 'VANCOUVER',
      userId: USER_ID,
    });

    expect(result.totalEntries).toBe(2);
    expect(result.entries[0].orderIndex).toBe(1);
    expect(result.entries[1].orderIndex).toBe(2);
  });

  it('deduplicates same article referenced multiple times', async () => {
    const prisma = makePrisma({
      claimTraces: [
        { refNumber: '1', slsArticleId: 'art-1' },
        { refNumber: '2', slsArticleId: 'art-1' }, // Same article
      ],
    });
    const useCase = new ManageBibliographyUseCase(prisma);

    const result = await useCase.execute({
      cerVersionId: VERSION_ID,
      citationStyle: 'VANCOUVER',
      userId: USER_ID,
    });

    expect(result.totalEntries).toBe(1);
  });

  it('formats citations in Vancouver style', async () => {
    const prisma = makePrisma();
    const useCase = new ManageBibliographyUseCase(prisma);

    const result = await useCase.execute({
      cerVersionId: VERSION_ID,
      citationStyle: 'VANCOUVER',
      userId: USER_ID,
    });

    expect(result.entries[0].formattedCitation).toContain('Smith J');
    expect(result.entries[0].formattedCitation).toContain('JAMA');
  });

  it('formats citations in Author-Year style', async () => {
    const prisma = makePrisma();
    const useCase = new ManageBibliographyUseCase(prisma);

    const result = await useCase.execute({
      cerVersionId: VERSION_ID,
      citationStyle: 'AUTHOR_YEAR',
      userId: USER_ID,
    });

    expect(result.entries[0].formattedCitation).toContain('(2025)');
    expect(result.citationStyle).toBe('AUTHOR_YEAR');
  });

  it('throws NotFoundError when CER version not found', async () => {
    const prisma = makePrisma({ cerVersion: null });
    const useCase = new ManageBibliographyUseCase(prisma);

    await expect(
      useCase.execute({ cerVersionId: 'missing', citationStyle: 'VANCOUVER', userId: USER_ID }),
    ).rejects.toThrow('not found');
  });

  it('returns empty entries when no references found', async () => {
    const prisma = makePrisma({
      sections: [
        { id: 'sec-1', humanEditedContent: { text: 'No references here' }, aiDraftContent: null },
      ],
      claimTraces: [],
    });
    const useCase = new ManageBibliographyUseCase(prisma);

    const result = await useCase.execute({
      cerVersionId: VERSION_ID,
      citationStyle: 'VANCOUVER',
      userId: USER_ID,
    });

    expect(result.totalEntries).toBe(0);
    expect(result.entries).toEqual([]);
  });

  it('assigns sequential order indexes', async () => {
    const prisma = makePrisma();
    const useCase = new ManageBibliographyUseCase(prisma);

    const result = await useCase.execute({
      cerVersionId: VERSION_ID,
      citationStyle: 'VANCOUVER',
      userId: USER_ID,
    });

    const indexes = result.entries.map((e) => e.orderIndex);
    expect(indexes).toEqual([1, 2]);
  });

  it('clears existing entries before creating new ones', async () => {
    const prisma = makePrisma();
    const useCase = new ManageBibliographyUseCase(prisma);

    await useCase.execute({
      cerVersionId: VERSION_ID,
      citationStyle: 'VANCOUVER',
      userId: USER_ID,
    });

    expect(prisma.bibliographyEntry.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { cerVersionId: VERSION_ID } }),
    );
  });

  it('persists each bibliography entry', async () => {
    const prisma = makePrisma();
    const useCase = new ManageBibliographyUseCase(prisma);

    const result = await useCase.execute({
      cerVersionId: VERSION_ID,
      citationStyle: 'VANCOUVER',
      userId: USER_ID,
    });

    expect(prisma.bibliographyEntry.create).toHaveBeenCalledTimes(result.totalEntries);
  });

  it('handles articles with string authors field', async () => {
    const prisma = makePrisma({
      articles: [
        { id: 'art-1', title: 'Article', authors: 'Smith J, Doe A', journal: 'J', year: 2025, volume: null, issue: null, pages: null, doi: null },
      ],
      claimTraces: [{ refNumber: '1', slsArticleId: 'art-1' }],
      sections: [{ id: 'sec-1', humanEditedContent: { text: '[1]' }, aiDraftContent: null }],
    });
    const useCase = new ManageBibliographyUseCase(prisma);

    const result = await useCase.execute({
      cerVersionId: VERSION_ID,
      citationStyle: 'VANCOUVER',
      userId: USER_ID,
    });

    expect(result.totalEntries).toBe(1);
    expect(result.entries[0].formattedCitation).toContain('Smith J');
  });
});
