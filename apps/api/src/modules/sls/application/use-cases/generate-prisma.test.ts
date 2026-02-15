import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeneratePrismaUseCase } from './generate-prisma.js';

const SESSION_ID = 'sess-1';

function makePrisma(overrides?: {
  session?: Record<string, unknown> | null;
  articles?: Array<Record<string, unknown>>;
  queryExecutions?: Array<Record<string, unknown>>;
}) {
  const session = overrides?.session !== undefined
    ? overrides.session
    : {
        id: SESSION_ID,
        status: 'SCREENING',
        deduplicationStats: {
          doiDuplicates: 50,
          pmidDuplicates: 20,
          titleFuzzyDuplicates: 10,
        },
      };

  const articles = overrides?.articles ?? [
    { id: 'art-1', status: 'INCLUDED', source: 'PubMed', relevanceScore: 85, exclusionCodeId: null },
    { id: 'art-2', status: 'EXCLUDED', source: 'PubMed', relevanceScore: 20, exclusionCodeId: 'ec-1' },
    { id: 'art-3', status: 'INCLUDED', source: 'Cochrane', relevanceScore: 90, exclusionCodeId: null },
    { id: 'art-4', status: 'EXCLUDED', source: 'PubMed', relevanceScore: 15, exclusionCodeId: 'ec-2' },
  ];

  const queryExecutions = overrides?.queryExecutions ?? [
    { id: 'exec-1', database: 'PubMed', resultCount: 200, queryVersion: { query: { id: 'q-1', name: 'Query 1' } } },
    { id: 'exec-2', database: 'Cochrane', resultCount: 100, queryVersion: { query: { id: 'q-1', name: 'Query 1' } } },
    { id: 'exec-3', database: 'PubMed', resultCount: 50, queryVersion: { query: { id: 'q-2', name: 'Query 2' } } },
  ];

  return {
    slsSession: {
      findUnique: vi.fn().mockResolvedValue(session),
    },
    article: {
      findMany: vi.fn().mockResolvedValue(articles),
    },
    slsQuery: {
      findMany: vi.fn().mockResolvedValue([
        { id: 'q-1', name: 'Query 1' },
        { id: 'q-2', name: 'Query 2' },
      ]),
    },
    queryExecution: {
      findMany: vi.fn().mockResolvedValue(queryExecutions),
    },
    screeningDecision: {
      count: vi.fn().mockResolvedValue(4),
    },
    exclusionCode: {
      findMany: vi.fn().mockResolvedValue([
        { id: 'ec-1', code: 'E1', label: 'Wrong population' },
        { id: 'ec-2', code: 'E2', label: 'Wrong intervention' },
      ]),
    },
  } as any;
}

describe('GeneratePrismaUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws NotFoundError for missing session', async () => {
    const prisma = makePrisma({ session: null });
    const useCase = new GeneratePrismaUseCase(prisma);

    await expect(useCase.execute('missing')).rejects.toThrow('not found');
  });

  it('calculates identification per database', async () => {
    const prisma = makePrisma();
    const useCase = new GeneratePrismaUseCase(prisma);

    const result = await useCase.execute(SESSION_ID);

    expect(result.identification.perDatabase).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ database: 'PubMed', articlesFound: 250, queriesExecuted: 2 }),
        expect.objectContaining({ database: 'Cochrane', articlesFound: 100, queriesExecuted: 1 }),
      ]),
    );
    expect(result.identification.totalIdentified).toBe(350);
  });

  it('calculates deduplication stats', async () => {
    const prisma = makePrisma();
    const useCase = new GeneratePrismaUseCase(prisma);

    const result = await useCase.execute(SESSION_ID);

    expect(result.deduplication).toEqual({
      duplicatesRemovedByDoi: 50,
      duplicatesRemovedByPmid: 20,
      duplicatesRemovedByTitleFuzzy: 10,
      totalDuplicatesRemoved: 80,
      uniqueArticlesAfterDedup: 4,
    });
  });

  it('calculates screening stats', async () => {
    const prisma = makePrisma();
    const useCase = new GeneratePrismaUseCase(prisma);

    const result = await useCase.execute(SESSION_ID);

    expect(result.screening.aiScored).toBe(4);
    expect(result.screening.manuallyReviewed).toBe(4);
    expect(result.screening.includedAfterScreening).toBe(2);
    expect(result.screening.excludedAfterScreening).toBe(2);
  });

  it('calculates exclusion code breakdown', async () => {
    const prisma = makePrisma();
    const useCase = new GeneratePrismaUseCase(prisma);

    const result = await useCase.execute(SESSION_ID);

    expect(result.screening.excludedByCode).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'E1', label: 'Wrong population', count: 1 }),
        expect.objectContaining({ code: 'E2', label: 'Wrong intervention', count: 1 }),
      ]),
    );
  });

  it('calculates inclusion stats', async () => {
    const prisma = makePrisma();
    const useCase = new GeneratePrismaUseCase(prisma);

    const result = await useCase.execute(SESSION_ID);

    expect(result.inclusion.finalIncluded).toBe(2);
    expect(result.inclusion.perQuery).toHaveLength(2);
  });

  it('handles missing deduplication stats gracefully', async () => {
    const prisma = makePrisma({
      session: { id: SESSION_ID, status: 'SCREENING', deduplicationStats: null },
    });
    const useCase = new GeneratePrismaUseCase(prisma);

    const result = await useCase.execute(SESSION_ID);

    expect(result.deduplication.totalDuplicatesRemoved).toBe(0);
  });

  it('handles empty articles', async () => {
    const prisma = makePrisma({ articles: [] });
    const useCase = new GeneratePrismaUseCase(prisma);

    const result = await useCase.execute(SESSION_ID);

    expect(result.screening.aiScored).toBe(0);
    expect(result.inclusion.finalIncluded).toBe(0);
    expect(result.deduplication.uniqueArticlesAfterDedup).toBe(0);
  });
});
