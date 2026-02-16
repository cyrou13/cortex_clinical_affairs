import type { Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import type { TaskJobData } from '../../shared/base-processor.js';
import { BaseProcessor } from '../../shared/base-processor.js';
import type { LlmService, LlmResponse } from '../../shared/llm/index.js';

interface CustomFilterScoreMetadata {
  sessionId: string;
  filterId: string;
  criterion: string;
  filterName: string;
}

const BATCH_SIZE = 10;

export class CustomFilterScoreProcessor extends BaseProcessor {
  private llmService: LlmService | null = null;
  private prisma: PrismaClient | null = null;

  /**
   * Allow injection of LlmService and PrismaClient for testing.
   */
  setLlmService(llmService: LlmService): void {
    this.llmService = llmService;
  }

  setPrisma(prisma: PrismaClient): void {
    this.prisma = prisma;
  }

  private getPrisma(): PrismaClient {
    if (!this.prisma) {
      this.prisma = new PrismaClient();
    }
    return this.prisma;
  }

  async process(job: Job<TaskJobData>): Promise<void> {
    const metadata = job.data.metadata as unknown as CustomFilterScoreMetadata;
    const { sessionId, criterion, filterName } = metadata;

    const prisma = this.getPrisma();

    // Get all articles for the session
    const articles = await (prisma as any).article.findMany({
      where: { sessionId },
      select: { id: true, title: true, abstract: true },
    });

    const totalArticles = articles.length;

    if (totalArticles === 0) {
      await this.reportProgress(job, 100, {
        total: 0,
        current: 0,
        message: `No articles to score for filter '${filterName}'`,
      });
      return;
    }

    await this.reportProgress(job, 0, {
      total: totalArticles,
      current: 0,
      message: `Starting custom filter scoring for '${filterName}' across ${totalArticles} articles`,
    });

    let processed = 0;

    // Process articles in batches
    for (let i = 0; i < articles.length; i += BATCH_SIZE) {
      // Check for cancellation
      const cancelled = await this.checkCancellation(job);
      if (cancelled) {
        await this.reportProgress(job, Math.round((processed / totalArticles) * 100), {
          total: totalArticles,
          current: processed,
          message: `Custom filter scoring cancelled after ${processed}/${totalArticles} articles`,
        });
        return;
      }

      const batch = articles.slice(i, i + BATCH_SIZE);

      // Score each article in the batch
      const scorePromises = batch.map(
        async (article: { id: string; title: string; abstract: string | null }) => {
          try {
            const score = await this.scoreArticle(article, criterion);
            await (prisma as any).article.update({
              where: { id: article.id },
              data: { customFilterScore: score },
            });
          } catch {
            // If scoring fails for an article, set score to null and continue
            await (prisma as any).article.update({
              where: { id: article.id },
              data: { customFilterScore: null },
            });
          }
        },
      );

      await Promise.all(scorePromises);

      processed += batch.length;

      await this.reportProgress(job, Math.round((processed / totalArticles) * 100), {
        total: totalArticles,
        current: processed,
        message: `Scored ${processed}/${totalArticles} articles for filter '${filterName}'`,
      });
    }

    // Report completion
    await this.reportProgress(job, 100, {
      total: totalArticles,
      current: totalArticles,
      message: `Completed custom filter scoring: ${totalArticles} articles scored for '${filterName}'`,
    });
  }

  private async scoreArticle(
    article: { id: string; title: string; abstract: string | null },
    criterion: string,
  ): Promise<number> {
    if (!this.llmService) {
      // Fallback: return 50 if no LLM service configured (during testing or setup)
      return 50;
    }

    const prompt = `You are evaluating a scientific article against a specific criterion.

Criterion: ${criterion}

Article Title: ${article.title}
Article Abstract: ${article.abstract ?? 'No abstract available'}

Rate how well this article matches the criterion on a scale of 0-100, where:
- 0 = Does not match the criterion at all
- 50 = Uncertain / partially matches
- 100 = Perfectly matches the criterion

Respond with ONLY a JSON object in this format: {"score": <number>}`;

    const response: LlmResponse = await this.llmService.complete('scoring', prompt, {
      temperature: 0.1,
      maxTokens: 50,
      responseFormat: 'json',
    });

    try {
      const parsed = JSON.parse(response.content);
      const score = Number(parsed.score);
      if (isNaN(score) || score < 0 || score > 100) {
        return 50; // Default to uncertain
      }
      return Math.round(score);
    } catch {
      return 50; // Default to uncertain on parse failure
    }
  }
}
