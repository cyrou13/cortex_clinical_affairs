import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ArticleRepository } from './article-repository.js';

function makePrisma() {
  return {
    article: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
      update: vi.fn().mockResolvedValue({}),
      count: vi.fn().mockResolvedValue(0),
      groupBy: vi.fn().mockResolvedValue([]),
    },
  } as any;
}

describe('ArticleRepository', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let repo: ArticleRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrisma();
    repo = new ArticleRepository(prisma);
  });

  describe('findBySessionId', () => {
    it('queries with sessionId and default pagination', async () => {
      await repo.findBySessionId('session-1');

      expect(prisma.article.findMany).toHaveBeenCalledWith({
        where: { sessionId: 'session-1' },
        skip: 0,
        take: 50,
        orderBy: { createdAt: 'desc' },
      });
      expect(prisma.article.count).toHaveBeenCalledWith({
        where: { sessionId: 'session-1' },
      });
    });

    it('applies status filter', async () => {
      await repo.findBySessionId('session-1', { status: 'PENDING' });

      expect(prisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sessionId: 'session-1', status: 'PENDING' },
        }),
      );
    });

    it('applies searchText filter with OR condition', async () => {
      await repo.findBySessionId('session-1', { searchText: 'spinal' });

      expect(prisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            sessionId: 'session-1',
            OR: [
              { title: { contains: 'spinal', mode: 'insensitive' } },
              { abstract: { contains: 'spinal', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('applies year range filter', async () => {
      await repo.findBySessionId('session-1', { yearFrom: 2020, yearTo: 2024 });

      expect(prisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            publicationDate: {
              gte: new Date('2020-01-01'),
              lte: new Date('2024-12-31'),
            },
          }),
        }),
      );
    });

    it('returns paginated result shape', async () => {
      prisma.article.findMany.mockResolvedValue([{ id: 'a1', title: 'Test' }]);
      prisma.article.count.mockResolvedValue(1);

      const result = await repo.findBySessionId('session-1', undefined, 0, 10);

      expect(result).toEqual({
        items: [{ id: 'a1', title: 'Test' }],
        total: 1,
        offset: 0,
        limit: 10,
      });
    });
  });

  describe('findById', () => {
    it('queries by id', async () => {
      prisma.article.findUnique.mockResolvedValue({ id: 'article-1' });

      const result = await repo.findById('article-1');
      expect(result).toEqual({ id: 'article-1' });
      expect(prisma.article.findUnique).toHaveBeenCalledWith({
        where: { id: 'article-1' },
      });
    });
  });

  describe('findByDoi', () => {
    it('queries by DOI case-insensitively', async () => {
      await repo.findByDoi('10.1234/test', 'session-1');

      expect(prisma.article.findFirst).toHaveBeenCalledWith({
        where: {
          doi: { equals: '10.1234/test', mode: 'insensitive' },
          sessionId: 'session-1',
        },
      });
    });
  });

  describe('findByPmid', () => {
    it('queries by PMID', async () => {
      await repo.findByPmid('12345678', 'session-1');

      expect(prisma.article.findFirst).toHaveBeenCalledWith({
        where: { pmid: '12345678', sessionId: 'session-1' },
      });
    });
  });

  describe('createMany', () => {
    it('calls prisma createMany with articles array', async () => {
      const articles = [
        { id: 'a1', title: 'Article 1', sessionId: 's1', status: 'PENDING' },
        { id: 'a2', title: 'Article 2', sessionId: 's1', status: 'PENDING' },
      ];

      await repo.createMany(articles);

      expect(prisma.article.createMany).toHaveBeenCalledWith({
        data: articles,
      });
    });
  });

  describe('updateStatus', () => {
    it('updates the article status', async () => {
      prisma.article.update.mockResolvedValue({ id: 'a1', status: 'SCORED' });

      const result = await repo.updateStatus('a1', 'SCORED');

      expect(result).toEqual({ id: 'a1', status: 'SCORED' });
      expect(prisma.article.update).toHaveBeenCalledWith({
        where: { id: 'a1' },
        data: { status: 'SCORED' },
      });
    });
  });

  describe('countByStatus', () => {
    it('returns counts grouped by status', async () => {
      prisma.article.groupBy.mockResolvedValue([
        { status: 'PENDING', _count: { status: 10 } },
        { status: 'SCORED', _count: { status: 5 } },
        { status: 'EXCLUDED', _count: { status: 3 } },
      ]);

      const result = await repo.countByStatus('session-1');

      expect(result).toEqual({
        PENDING: 10,
        SCORED: 5,
        EXCLUDED: 3,
      });
      expect(prisma.article.groupBy).toHaveBeenCalledWith({
        by: ['status'],
        where: { sessionId: 'session-1' },
        _count: { status: true },
      });
    });

    it('returns empty object when no articles', async () => {
      prisma.article.groupBy.mockResolvedValue([]);

      const result = await repo.countByStatus('session-1');
      expect(result).toEqual({});
    });
  });
});
