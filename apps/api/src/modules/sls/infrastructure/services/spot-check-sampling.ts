import type { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../../../../shared/errors/index.js';

interface SampledArticle {
  id: string;
  title: string;
  abstract: string | null;
  relevanceScore: number | null;
  aiCategory: string | null;
  aiReasoning: string | null;
  aiExclusionCode: string | null;
  status: string;
}

export class SpotCheckSamplingService {
  constructor(private readonly prisma: PrismaClient) {}

  async generateSample(
    sessionId: string,
    category: 'likely_relevant' | 'likely_irrelevant',
    count: number,
  ): Promise<SampledArticle[]> {
    const session = await this.prisma.slsSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundError('SlsSession', sessionId);
    }

    const likelyRelevantThreshold = session.likelyRelevantThreshold ?? 75;
    const uncertainLowerThreshold = session.uncertainLowerThreshold ?? 40;

    // Build score filter based on category
    const scoreFilter =
      category === 'likely_relevant'
        ? { gte: likelyRelevantThreshold }
        : { lt: uncertainLowerThreshold };

    // Get articles in category that haven't been spot-checked
    const spotCheckedArticleIds = await this.prisma.screeningDecision
      .findMany({
        where: {
          article: { sessionId },
        },
        select: { articleId: true },
        distinct: ['articleId'],
      })
      .then((decisions: Array<{ articleId: string }>) =>
        decisions.map((d) => d.articleId),
      );

    const eligibleArticles = await this.prisma.article.findMany({
      where: {
        sessionId,
        relevanceScore: scoreFilter,
        id: spotCheckedArticleIds.length > 0
          ? { notIn: spotCheckedArticleIds }
          : undefined,
      },
      select: {
        id: true,
        title: true,
        abstract: true,
        relevanceScore: true,
        aiCategory: true,
        aiReasoning: true,
        aiExclusionCode: true,
        status: true,
      },
    });

    // Shuffle and pick N articles
    const shuffled = shuffleArray(eligibleArticles);
    return shuffled.slice(0, count);
  }
}

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
