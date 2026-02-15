import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@cortex/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@cortex/shared')>();
  let counter = 0;
  return {
    ...actual,
    generateId: vi.fn().mockImplementation(() => `generated-id-${++counter}`),
  };
});

import { ImportArticlesUseCase } from './import-articles.js';
import type { ArticleMetadata } from '@cortex/shared';

function makePrisma(overrides?: {
  sessionResult?: unknown;
  existingArticles?: unknown[];
}) {
  return {
    slsSession: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.sessionResult !== undefined
          ? overrides.sessionResult
          : { id: 'session-1', status: 'DRAFT', projectId: 'project-1' },
      ),
    },
    article: {
      findMany: vi.fn().mockResolvedValue(overrides?.existingArticles ?? []),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    articleQueryLink: {
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  } as any;
}

const sampleArticles: ArticleMetadata[] = [
  {
    title: 'Article One',
    doi: '10.1234/one',
    pmid: '111',
    authors: ['Smith J'],
    publicationDate: '2024-01-15',
    journal: 'Test Journal',
    sourceDatabase: 'PUBMED',
  },
  {
    title: 'Article Two',
    doi: '10.1234/two',
    authors: ['Doe A'],
    publicationDate: '2024-03-20',
    journal: 'Another Journal',
    sourceDatabase: 'PUBMED',
  },
];

describe('ImportArticlesUseCase', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let useCase: ImportArticlesUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrisma();
    useCase = new ImportArticlesUseCase(prisma);
  });

  it('imports articles successfully with no duplicates', async () => {
    const result = await useCase.execute({
      sessionId: 'session-1',
      articles: sampleArticles,
      queryId: 'query-1',
      executionId: 'exec-1',
      userId: 'user-1',
    });

    expect(result.importedCount).toBe(2);
    expect(result.duplicateCount).toBe(0);
    expect(prisma.article.createMany).toHaveBeenCalledTimes(1);
    expect(prisma.articleQueryLink.createMany).toHaveBeenCalledTimes(1);
  });

  it('throws NotFoundError when session does not exist', async () => {
    prisma = makePrisma({ sessionResult: null });
    useCase = new ImportArticlesUseCase(prisma);

    await expect(
      useCase.execute({
        sessionId: 'session-1',
        articles: sampleArticles,
        queryId: 'query-1',
        executionId: 'exec-1',
        userId: 'user-1',
      }),
    ).rejects.toThrow('not found');
  });

  it('throws ValidationError when session is LOCKED', async () => {
    prisma = makePrisma({
      sessionResult: { id: 'session-1', status: 'LOCKED', projectId: 'project-1' },
    });
    useCase = new ImportArticlesUseCase(prisma);

    await expect(
      useCase.execute({
        sessionId: 'session-1',
        articles: sampleArticles,
        queryId: 'query-1',
        executionId: 'exec-1',
        userId: 'user-1',
      }),
    ).rejects.toThrow('locked session');
  });

  it('deduplicates against existing articles by DOI', async () => {
    prisma = makePrisma({
      existingArticles: [
        {
          title: 'Existing Article',
          doi: '10.1234/one',
          pmid: null,
          authors: null,
          publicationDate: null,
          journal: null,
          sourceDatabase: null,
          abstract: null,
        },
      ],
    });
    useCase = new ImportArticlesUseCase(prisma);

    const result = await useCase.execute({
      sessionId: 'session-1',
      articles: sampleArticles,
      queryId: 'query-1',
      executionId: 'exec-1',
      userId: 'user-1',
    });

    expect(result.importedCount).toBe(1);
    expect(result.duplicateCount).toBe(1);
    expect(result.stats.duplicatesByDoi).toBe(1);
  });

  it('does not create records when all articles are duplicates', async () => {
    prisma = makePrisma({
      existingArticles: sampleArticles.map((a) => ({
        ...a,
        abstract: a.abstract ?? null,
        authors: a.authors ?? null,
        doi: a.doi ?? null,
        pmid: a.pmid ?? null,
        publicationDate: null,
        journal: a.journal ?? null,
        sourceDatabase: a.sourceDatabase ?? null,
      })),
    });
    useCase = new ImportArticlesUseCase(prisma);

    const result = await useCase.execute({
      sessionId: 'session-1',
      articles: sampleArticles,
      queryId: 'query-1',
      executionId: 'exec-1',
      userId: 'user-1',
    });

    expect(result.importedCount).toBe(0);
    expect(prisma.article.createMany).not.toHaveBeenCalled();
    expect(prisma.articleQueryLink.createMany).not.toHaveBeenCalled();
  });

  it('creates audit log entry', async () => {
    await useCase.execute({
      sessionId: 'session-1',
      articles: sampleArticles,
      queryId: 'query-1',
      executionId: 'exec-1',
      userId: 'user-1',
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          action: 'sls.articles.imported',
          targetType: 'slsSession',
          targetId: 'session-1',
        }),
      }),
    );
  });

  it('sets article status to PENDING', async () => {
    await useCase.execute({
      sessionId: 'session-1',
      articles: [sampleArticles[0]!],
      queryId: 'query-1',
      executionId: 'exec-1',
      userId: 'user-1',
    });

    const createCall = prisma.article.createMany.mock.calls[0]![0];
    expect(createCall.data[0].status).toBe('PENDING');
  });

  it('returns proper deduplication stats', async () => {
    const result = await useCase.execute({
      sessionId: 'session-1',
      articles: sampleArticles,
      queryId: 'query-1',
      executionId: 'exec-1',
      userId: 'user-1',
    });

    expect(result.stats).toEqual(
      expect.objectContaining({
        totalBefore: expect.any(Number),
        totalAfter: expect.any(Number),
        duplicatesByDoi: expect.any(Number),
        duplicatesByPmid: expect.any(Number),
        duplicatesByTitle: expect.any(Number),
      }),
    );
  });
});
