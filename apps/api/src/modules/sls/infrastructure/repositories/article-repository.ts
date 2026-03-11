import type { PrismaClient, ArticleStatus } from '@prisma/client';
import type { ArticleFilter } from '@cortex/shared';

export class ArticleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findBySessionId(sessionId: string, filter?: ArticleFilter, offset = 0, limit = 50) {
    const where: Record<string, unknown> = { sessionId };

    if (filter) {
      if (filter.status) {
        where.status = filter.status;
      }
      if (filter.sourceDatabase) {
        where.sourceDatabase = filter.sourceDatabase;
      }
      if (filter.yearFrom || filter.yearTo) {
        const dateFilter: Record<string, Date> = {};
        if (filter.yearFrom) {
          dateFilter.gte = new Date(`${filter.yearFrom}-01-01`);
        }
        if (filter.yearTo) {
          dateFilter.lte = new Date(`${filter.yearTo}-12-31`);
        }
        where.publicationDate = dateFilter;
      }
      if (filter.pdfStatus) {
        if (filter.pdfStatus === 'NONE') {
          where.OR = [{ pdfStatus: 'NONE' }, { pdfStatus: null }];
        } else {
          where.pdfStatus = filter.pdfStatus;
        }
      }
      if (filter.customFilterPassed === true) {
        where.customFilterScore = { gte: 50 };
      } else if (filter.customFilterPassed === false) {
        where.customFilterScore = { lt: 50 };
      }
      if (filter.searchText) {
        // Use AND to combine with potential pdfStatus OR clause
        const textFilter = [
          { title: { contains: filter.searchText, mode: 'insensitive' } },
          { abstract: { contains: filter.searchText, mode: 'insensitive' } },
        ];
        if (where.OR) {
          where.AND = [{ OR: where.OR }, { OR: textFilter }];
          delete where.OR;
        } else {
          where.OR = textFilter;
        }
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.article.count({ where }),
    ]);

    return { items, total, offset, limit };
  }

  async findById(id: string) {
    return this.prisma.article.findUnique({
      where: { id },
    });
  }

  async findByDoi(doi: string, sessionId: string) {
    return this.prisma.article.findFirst({
      where: {
        doi: { equals: doi, mode: 'insensitive' },
        sessionId,
      },
    });
  }

  async findByPmid(pmid: string, sessionId: string) {
    return this.prisma.article.findFirst({
      where: { pmid, sessionId },
    });
  }

  async createMany(articles: Array<Record<string, unknown>>) {
    return this.prisma.article.createMany({
      data: articles as any,
    });
  }

  async updateStatus(id: string, status: string) {
    return this.prisma.article.update({
      where: { id },
      data: { status: status as ArticleStatus },
    });
  }

  async countByStatus(sessionId: string): Promise<Record<string, number>> {
    const results = await this.prisma.article.groupBy({
      by: ['status'],
      where: { sessionId },
      _count: { status: true },
    });

    const counts: Record<string, number> = {};
    for (const row of results) {
      counts[row.status] = row._count.status;
    }
    return counts;
  }
}
