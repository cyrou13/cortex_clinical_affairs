import type { Job } from 'bullmq';
import type { PrismaClient } from '@prisma/client';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import type { TaskJobData } from '../../shared/base-processor.js';
import { BaseProcessor } from '../../shared/base-processor.js';
import type { LlmService } from '../../shared/llm/llm-abstraction.js';

interface ExtractGridDataJobMetadata {
  gridId: string;
  soaAnalysisId: string;
  articleIds: string[];
  columnDefinitions: Array<{
    id: string;
    name: string;
    displayName: string;
    dataType: string;
  }>;
}

interface ExtractionResult {
  columns: Record<
    string,
    {
      value: string;
      confidence: number;
      sourceQuote?: string;
      pageNumber?: number;
    }
  >;
}

export class ExtractGridDataProcessor extends BaseProcessor {
  constructor(
    redis: any,
    private readonly prisma: PrismaClient,
    private readonly llmService: LlmService,
  ) {
    super(redis);
  }

  async process(job: Job<TaskJobData>): Promise<{ processed: number; failed: number }> {
    const metadata = job.data.metadata as unknown as ExtractGridDataJobMetadata;
    const { gridId, articleIds, columnDefinitions } = metadata;

    let processed = 0;
    let failed = 0;

    for (const articleId of articleIds) {
      // Check for cancellation between articles
      const cancelled = await this.checkCancellation(job);
      if (cancelled) {
        await this.reportProgress(job, processed / articleIds.length, {
          total: articleIds.length,
          current: processed,
          message: `Extraction cancelled. Processed ${processed}/${articleIds.length} articles.`,
        });
        break;
      }

      try {
        // Get article metadata and PDF storage key
        const article = await (this.prisma as any).article.findUnique({
          where: { id: articleId },
          select: {
            id: true,
            title: true,
            authors: true,
            publicationYear: true,
            abstract: true,
            pdfStorageKey: true,
          },
        });

        if (!article) {
          failed++;
          continue;
        }

        // Extract text from PDF stored in MinIO
        let pdfTextContent: string | null = null;
        if (article.pdfStorageKey) {
          pdfTextContent = await this.extractPdfText(article.pdfStorageKey);
        }

        // Fall back to abstract if no PDF text available
        if (!pdfTextContent && !article.abstract) {
          failed++;
          continue;
        }
        const articleText = pdfTextContent || article.abstract || '';

        // Build extraction prompt
        const systemPrompt = this.buildSystemPrompt(columnDefinitions);
        const userPrompt = this.buildUserPrompt({ ...article, articleText }, columnDefinitions);

        // Call LLM
        const response = await this.llmService.complete('extraction', userPrompt, {
          systemPrompt,
          responseFormat: 'json',
          temperature: 0.1,
          maxTokens: 2000,
        });

        // Parse JSON response
        const extractionResult = this.parseExtractionResult(response.content);

        // Upsert grid cells with AI-extracted data
        await this.persistExtractionResults(gridId, articleId, columnDefinitions, extractionResult);

        processed++;

        // Report progress
        await this.reportProgress(job, processed / articleIds.length, {
          total: articleIds.length,
          current: processed,
          message: `Extracting data from article: ${article.title}`,
        });
      } catch (error: any) {
        console.error(`Failed to extract data for article ${articleId}:`, error.message);
        failed++;
      }
    }

    return { processed, failed };
  }

  private buildSystemPrompt(
    columnDefinitions: ExtractGridDataJobMetadata['columnDefinitions'],
  ): string {
    return `You are extracting structured data from a scientific article for a clinical evidence analysis grid.

Extract the following fields:
${columnDefinitions.map((col) => `- ${col.displayName} (${col.name}): ${col.dataType}`).join('\n')}

For each field, provide:
1. value: The extracted value
2. confidence: A score from 0-100 indicating how confident you are in the extraction
3. sourceQuote (optional): The exact quote from the article that supports this value
4. pageNumber (optional): The page number where the information was found

Return your response as JSON in this format:
{
  "columns": {
    "column_name": {
      "value": "extracted value",
      "confidence": 85,
      "sourceQuote": "direct quote from article",
      "pageNumber": 3
    }
  }
}

If a field cannot be extracted, omit it from the response or set confidence to 0.`;
  }

  private buildUserPrompt(
    article: {
      title: string;
      authors: string | null;
      publicationYear: number | null;
      articleText: string;
    },
    columnDefinitions: ExtractGridDataJobMetadata['columnDefinitions'],
  ): string {
    return `Article metadata:
Title: ${article.title}
Authors: ${article.authors || 'Unknown'}
Year: ${article.publicationYear || 'Unknown'}

Article content:
${article.articleText.substring(0, 10000)}

Extract data for columns: ${columnDefinitions.map((c) => c.displayName).join(', ')}`;
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

  private async extractPdfText(storageKey: string): Promise<string | null> {
    try {
      const s3 = this.createS3Client();
      const bucket = process.env['MINIO_BUCKET'] ?? 'cortex-documents';
      const result = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: storageKey }));
      if (!result.Body) return null;
      const chunks: Uint8Array[] = [];
      for await (const chunk of result.Body as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      const pdfParse = (await import('pdf-parse')).default;
      const pdf = await pdfParse(buffer);
      return pdf.text || null;
    } catch (err) {
      console.error(`Failed to extract PDF text from ${storageKey}:`, err);
      return null;
    }
  }

  private parseExtractionResult(content: string): ExtractionResult {
    try {
      const parsed = JSON.parse(content);
      return parsed as ExtractionResult;
    } catch {
      // If parsing fails, return empty result
      return { columns: {} };
    }
  }

  private async persistExtractionResults(
    gridId: string,
    articleId: string,
    columnDefinitions: ExtractGridDataJobMetadata['columnDefinitions'],
    extractionResult: ExtractionResult,
  ): Promise<void> {
    for (const columnDef of columnDefinitions) {
      const extracted = extractionResult.columns[columnDef.name];
      if (!extracted) continue;

      const confidenceLevel = this.mapConfidenceLevel(extracted.confidence);

      const strValue = extracted.value != null ? String(extracted.value) : null;
      const cellData = {
        value: strValue,
        aiExtractedValue: strValue,
        confidenceLevel,
        confidenceScore: extracted.confidence,
        sourceQuote: extracted.sourceQuote || null,
        sourcePageNumber: extracted.pageNumber || null,
        pdfLocationData: extracted.pageNumber ? { page: extracted.pageNumber } : null,
        validationStatus: 'PENDING' as const,
      };

      // Find existing cell
      const existing = await (this.prisma as any).gridCell.findFirst({
        where: {
          extractionGridId: gridId,
          articleId,
          gridColumnId: columnDef.id,
        },
      });

      if (existing) {
        await (this.prisma as any).gridCell.update({
          where: { id: existing.id },
          data: cellData,
        });
      } else {
        await (this.prisma as any).gridCell.create({
          data: {
            id: crypto.randomUUID(),
            extractionGridId: gridId,
            articleId,
            gridColumnId: columnDef.id,
            ...cellData,
          },
        });
      }
    }
  }

  private mapConfidenceLevel(score: number): 'HIGH' | 'MEDIUM' | 'LOW' | 'UNSCORED' {
    if (score >= 80) return 'HIGH';
    if (score >= 50) return 'MEDIUM';
    if (score > 0) return 'LOW';
    return 'UNSCORED';
  }
}
