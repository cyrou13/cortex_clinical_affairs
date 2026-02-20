import type { Job } from 'bullmq';
import type { PrismaClient } from '@prisma/client';
import type { Redis } from 'ioredis';
import type { Prisma } from '@prisma/client';
import { BaseProcessor, type TaskJobData } from '../../shared/base-processor.js';
import { PdfRetrievalService } from './clients/pdf-retrieval-service.js';

const BATCH_SIZE = 5;

interface RetrievePdfsMetadata {
  sessionId: string;
  articleIds: string[];
}

interface ArticleRow {
  id: string;
  doi: string | null;
  pmid: string | null;
  title: string;
  authors: unknown;
  sessionId: string;
  session: { projectId: string } | null;
}

export class RetrievePdfsProcessor extends BaseProcessor {
  private prisma: PrismaClient;

  constructor(redis: Redis, prisma?: PrismaClient) {
    super(redis);
    this.prisma = prisma!;
  }

  setPrisma(prisma: PrismaClient): void {
    this.prisma = prisma;
  }

  private async persistProgress(taskId: string, progress: number, total: number): Promise<void> {
    try {
      await this.prisma.asyncTask.update({
        where: { id: taskId },
        data: { progress, total },
      });
    } catch {
      // Best-effort DB update
    }
  }

  async process(job: Job<TaskJobData>): Promise<void> {
    const metadata = job.data.metadata as unknown as RetrievePdfsMetadata;
    const { sessionId, articleIds } = metadata;
    const contactEmail = process.env['CONTACT_EMAIL'] ?? 'admin@cortex-clinical.com';
    const pdfService = new PdfRetrievalService(contactEmail);

    // Fetch articles to retrieve PDFs for
    const articles: ArticleRow[] = await (this.prisma as any).article.findMany({
      where: {
        id: { in: articleIds },
        sessionId,
      },
      select: {
        id: true,
        doi: true,
        pmid: true,
        title: true,
        authors: true,
        sessionId: true,
        session: { select: { projectId: true } },
      },
    });

    const total = articles.length;
    let processed = 0;
    let found = 0;
    let notFound = 0;

    await this.reportProgress(job, 0, {
      total,
      current: 0,
      message: `Starting PDF retrieval for ${total} articles`,
    });
    await this.persistProgress(job.data.taskId, 0, total);

    const totalBatches = Math.ceil(total / BATCH_SIZE);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      // Check cancellation
      const cancelled = await this.checkCancellation(job);
      if (cancelled) {
        await this.reportProgress(job, Math.round((processed / total) * 100), {
          total,
          current: processed,
          message: `PDF retrieval cancelled after ${processed}/${total} articles`,
        });
        await this.persistProgress(job.data.taskId, Math.round((processed / total) * 100), total);
        return;
      }

      const batchStart = batchIndex * BATCH_SIZE;
      const batch = articles.slice(batchStart, batchStart + BATCH_SIZE);

      // Process batch concurrently
      const results = await Promise.allSettled(
        batch.map(async (article) => {
          try {
            const result = await pdfService.retrieve({
              doi: article.doi,
              pmcId: null, // PMC ID not stored separately; could be derived from pmid
              pmid: article.pmid,
            });

            if (result.found && result.pdfBuffer) {
              // Store the PDF key (in production, upload to MinIO/S3)
              const storageKey = `sessions/${sessionId}/articles/${article.id}/fulltext.pdf`;

              await (this.prisma as any).article.update({
                where: { id: article.id },
                data: {
                  pdfStatus: 'FOUND',
                  pdfStorageKey: storageKey,
                  pdfVerificationResult: {
                    source: result.source,
                    pdfUrl: result.pdfUrl,
                    retrievedAt: new Date().toISOString(),
                    sizeBytes: result.pdfBuffer.length,
                  } as unknown as Prisma.InputJsonValue,
                },
              });
              return 'found' as const;
            } else {
              await (this.prisma as any).article.update({
                where: { id: article.id },
                data: {
                  pdfStatus: 'NOT_FOUND',
                },
              });
              return 'not_found' as const;
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            process.stderr.write(`[WARN] PDF retrieval failed for article ${article.id}: ${msg}\n`);
            await (this.prisma as any).article.update({
              where: { id: article.id },
              data: { pdfStatus: 'NOT_FOUND' },
            });
            return 'not_found' as const;
          }
        }),
      );

      for (const r of results) {
        processed++;
        if (r.status === 'fulfilled' && r.value === 'found') {
          found++;
        } else {
          notFound++;
        }
      }

      const pct = Math.round((processed / total) * 100);
      await this.reportProgress(job, pct, {
        total,
        current: processed,
        message: `Retrieved ${found} PDFs, ${notFound} not found (${processed}/${total})`,
      });
      await this.persistProgress(job.data.taskId, pct, total);
    }

    // Final report
    await this.reportProgress(job, 100, {
      total,
      current: processed,
      message: `Completed: ${found} PDFs found, ${notFound} not found out of ${total} articles`,
    });
    await this.persistProgress(job.data.taskId, 100, total);
  }
}
