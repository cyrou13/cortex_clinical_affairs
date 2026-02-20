import type { Job } from 'bullmq';
import type { PrismaClient } from '@prisma/client';
import type { Redis } from 'ioredis';
import type { TaskJobData } from '../../shared/base-processor.js';
import { BaseProcessor } from '../../shared/base-processor.js';
import type { LlmService } from '../../shared/llm/index.js';
import type { ScoringArticle, ScoringContext, ExclusionCodeEntry } from './scoring-prompt.js';
import { buildScoringPrompt, parseScoringResponse } from './scoring-prompt.js';

const BATCH_SIZE = 10;

interface ScoreArticlesMetadata {
  sessionId: string;
  articleIds: string[];
  exclusionCodes: ExclusionCodeEntry[];
  sessionName: string;
  sessionType: string;
  scopeFields: Record<string, unknown> | null;
  projectId: string;
  totalArticles: number;
}

export class ScoreArticlesProcessor extends BaseProcessor {
  private llmService: LlmService;
  private prisma: PrismaClient;

  constructor(redis: Redis, llmService?: LlmService, prisma?: PrismaClient) {
    super(redis);
    // Allow injection for testing; real usage will set these externally or via factory
    this.llmService = llmService!;
    this.prisma = prisma!;
  }

  /**
   * Set the LLM service (used when constructing in production where DI order matters).
   */
  setLlmService(llmService: LlmService): void {
    this.llmService = llmService;
  }

  /**
   * Set the Prisma client (used when constructing in production).
   */
  setPrisma(prisma: PrismaClient): void {
    this.prisma = prisma;
  }

  /**
   * Persist progress to the AsyncTask DB record so polling queries see updates.
   */
  private async persistProgress(taskId: string, progress: number, total: number): Promise<void> {
    try {
      await this.prisma.asyncTask.update({
        where: { id: taskId },
        data: { progress, total },
      });
    } catch {
      // Best-effort DB update; don't fail the batch
    }
  }

  async process(job: Job<TaskJobData>): Promise<void> {
    const metadata = job.data.metadata as unknown as ScoreArticlesMetadata;
    const {
      sessionId: _sessionId,
      articleIds,
      exclusionCodes,
      sessionName,
      sessionType,
      scopeFields,
      projectId,
      totalArticles,
    } = metadata;

    const scoringContext: ScoringContext = {
      sessionName,
      sessionType,
      scopeFields,
    };

    // Fetch the full article data for all article IDs
    const articles = await (this.prisma as any).article.findMany({
      where: {
        id: { in: articleIds },
        status: 'PENDING',
      },
      select: {
        id: true,
        title: true,
        abstract: true,
        authors: true,
        journal: true,
        publicationDate: true,
      },
    });

    const totalBatches = Math.ceil(articles.length / BATCH_SIZE);
    let processedCount = 0;

    await this.reportProgress(job, 0, {
      total: totalArticles,
      current: 0,
      message: `Starting AI scoring of ${articles.length} articles in ${totalBatches} batch(es)`,
    });
    await this.persistProgress(job.data.taskId, 0, totalArticles);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      // Check cancellation between batches
      const cancelled = await this.checkCancellation(job);
      if (cancelled) {
        const pct = Math.round((processedCount / totalArticles) * 100);
        await this.reportProgress(job, pct, {
          total: totalArticles,
          current: processedCount,
          message: `Scoring cancelled after ${processedCount} articles`,
        });
        await this.persistProgress(job.data.taskId, pct, totalArticles);
        return;
      }

      const batchStart = batchIndex * BATCH_SIZE;
      const batchArticles: ScoringArticle[] = articles.slice(batchStart, batchStart + BATCH_SIZE);

      const pctBefore = Math.round((processedCount / totalArticles) * 100);
      await this.reportProgress(job, pctBefore, {
        total: totalArticles,
        current: processedCount,
        message: `Scoring batch ${batchIndex + 1}/${totalBatches} (${batchArticles.length} articles)`,
      });

      try {
        // Build prompt for this batch
        const { system, user } = buildScoringPrompt(batchArticles, scoringContext, exclusionCodes);

        // Call LLM
        const llmResponse = await this.llmService.complete(
          'scoring',
          user,
          {
            systemPrompt: system,
            responseFormat: 'json',
            temperature: 0.1,
          },
          projectId,
        );

        // Parse response
        const scoringResults = parseScoringResponse(llmResponse.content);

        // Update articles with scoring results
        const now = new Date();
        for (const result of scoringResults) {
          // Only update articles that were in our batch
          const articleInBatch = batchArticles.find((a) => a.id === result.articleId);
          if (!articleInBatch) continue;

          await (this.prisma as any).article.update({
            where: { id: result.articleId },
            data: {
              relevanceScore: result.relevanceScore,
              aiExclusionCode: result.aiExclusionCode,
              aiReasoning: result.aiReasoning,
              aiCategory: result.aiCategory,
              status: 'SCORED',
              scoredAt: now,
            },
          });
        }

        processedCount += batchArticles.length;
      } catch (err) {
        // Log error to stderr for debugging, then continue with next batch
        const errorMessage = err instanceof Error ? err.message : String(err);
        process.stderr.write(`[ERROR] Score batch ${batchIndex + 1} failed: ${errorMessage}\n`);
        await this.reportProgress(job, Math.round((processedCount / totalArticles) * 100), {
          total: totalArticles,
          current: processedCount,
          message: `Error in batch ${batchIndex + 1}: ${errorMessage}. Continuing...`,
        });
        // Mark batch articles as failed - skip them but count them
        processedCount += batchArticles.length;
      }

      // Persist progress to DB after each batch for polling queries
      const pctAfter = Math.round((processedCount / totalArticles) * 100);
      await this.persistProgress(job.data.taskId, pctAfter, totalArticles);
    }

    // Report final progress
    await this.reportProgress(job, 100, {
      total: totalArticles,
      current: processedCount,
      message: `Completed: ${processedCount}/${totalArticles} articles scored`,
    });
    await this.persistProgress(job.data.taskId, 100, totalArticles);
  }
}
