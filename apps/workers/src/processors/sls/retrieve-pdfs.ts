import type { Job } from 'bullmq';
import type { PrismaClient } from '@prisma/client';
import type { Redis } from 'ioredis';
import type { Prisma } from '@prisma/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
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

  private createS3Client(): S3Client {
    const endpoint = process.env['MINIO_ENDPOINT'] ?? 'localhost';
    const port = process.env['MINIO_PORT'] ?? '9000';
    const useSSL = process.env['MINIO_USE_SSL'] === 'true';
    return new S3Client({
      endpoint: `${useSSL ? 'https' : 'http'}://${endpoint}:${port}`,
      region: 'us-east-1',
      credentials: {
        accessKeyId: process.env['MINIO_ACCESS_KEY'] ?? 'cortex_minio',
        secretAccessKey: process.env['MINIO_SECRET_KEY'] ?? 'cortex_minio_secret',
      },
      forcePathStyle: true,
    });
  }

  private async uploadToMinio(key: string, buffer: Buffer): Promise<void> {
    const bucket = process.env['MINIO_BUCKET'] ?? 'cortex-documents';
    const s3 = this.createS3Client();
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: 'application/pdf',
      }),
    );
  }

  /**
   * Look up a DOI via CrossRef works API using title search.
   */
  private async lookupDoiViaCrossRef(title: string, email: string): Promise<string | null> {
    const cleanTitle = title.replace(/[[\]{}():"]/g, '').slice(0, 200);
    const url = `https://api.crossref.org/works?query.title=${encodeURIComponent(cleanTitle)}&rows=3&mailto=${encodeURIComponent(email)}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);

    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) return null;

      const data: any = await res.json();
      const items = data.message?.items ?? [];

      // Find best title match
      const normalizeTitle = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normalizedTarget = normalizeTitle(title);

      for (const item of items) {
        const itemTitles: string[] = item.title ?? [];
        for (const t of itemTitles) {
          const normalized = normalizeTitle(t);
          if (
            normalized === normalizedTarget ||
            normalizedTarget.includes(normalized) ||
            normalized.includes(normalizedTarget)
          ) {
            return item.DOI ?? null;
          }
        }
      }
      return null;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
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

    // Enrich missing DOIs via CrossRef title search
    const missingDoi = articles.filter((a) => !a.doi);
    if (missingDoi.length > 0) {
      await this.reportProgress(job, 0, {
        message: `Enriching DOIs for ${missingDoi.length} articles via CrossRef...`,
      });
      let enriched = 0;
      for (const article of missingDoi) {
        try {
          const doi = await this.lookupDoiViaCrossRef(article.title, contactEmail);
          if (doi) {
            article.doi = doi;
            await (this.prisma as any).article.update({
              where: { id: article.id },
              data: { doi },
            });
            enriched++;
          }
        } catch {
          // Best-effort
        }
        // Rate limit: CrossRef polite pool ~50 req/s with email
        if (enriched % 10 === 0) await new Promise((r) => setTimeout(r, 200));
      }
      if (enriched > 0) {
        process.stdout.write(`[INFO] Enriched ${enriched} DOIs via CrossRef\n`);
      }
    }

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
              pmcId: null,
              pmid: article.pmid,
            });

            if (result.found && result.pdfBuffer) {
              const projectId = article.session?.projectId ?? 'unknown';
              const storageKey = `projects/${projectId}/sessions/${sessionId}/articles/${article.id}/fulltext.pdf`;

              // Upload PDF to MinIO
              await this.uploadToMinio(storageKey, result.pdfBuffer);

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
