import type { Job } from 'bullmq';
import type { PrismaClient } from '@prisma/client';
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
        // Get article with PDF text
        const article = await (this.prisma as any).article.findUnique({
          where: { id: articleId },
          select: {
            id: true,
            title: true,
            authors: true,
            publicationYear: true,
            pdfTextContent: true,
          },
        });

        if (!article || !article.pdfTextContent) {
          // Skip articles without PDF text
          failed++;
          continue;
        }

        // Build extraction prompt
        const systemPrompt = this.buildSystemPrompt(columnDefinitions);
        const userPrompt = this.buildUserPrompt(article, columnDefinitions);

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
        // Log error but continue with next article
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
      pdfTextContent: string;
    },
    columnDefinitions: ExtractGridDataJobMetadata['columnDefinitions'],
  ): string {
    return `Article metadata:
Title: ${article.title}
Authors: ${article.authors || 'Unknown'}
Year: ${article.publicationYear || 'Unknown'}

Article content:
${article.pdfTextContent.substring(0, 10000)}

Extract data for columns: ${columnDefinitions.map((c) => c.displayName).join(', ')}`;
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

      // Map confidence score to level
      const confidenceLevel = this.mapConfidenceLevel(extracted.confidence);

      // Upsert cell
      await this.prisma.gridCell.upsert({
        where: {
          extractionGridId_articleId_gridColumnId: {
            extractionGridId: gridId,
            articleId,
            gridColumnId: columnDef.id,
          },
        } as any,
        create: {
          id: crypto.randomUUID(),
          extractionGridId: gridId,
          articleId,
          gridColumnId: columnDef.id,
          value: extracted.value || null,
          aiExtractedValue: extracted.value || null,
          confidenceLevel,
          confidenceScore: extracted.confidence,
          sourceQuote: extracted.sourceQuote || null,
          sourcePageNumber: extracted.pageNumber || null,
          pdfLocationData: extracted.pageNumber ? { page: extracted.pageNumber } : null,
          validationStatus: 'PENDING',
        } as any,
        update: {
          aiExtractedValue: extracted.value || null,
          value: extracted.value || null,
          confidenceLevel,
          confidenceScore: extracted.confidence,
          sourceQuote: extracted.sourceQuote || null,
          sourcePageNumber: extracted.pageNumber || null,
          pdfLocationData: extracted.pageNumber ? { page: extracted.pageNumber } : null,
          validationStatus: 'PENDING',
        } as any,
      });
    }
  }

  private mapConfidenceLevel(score: number): 'HIGH' | 'MEDIUM' | 'LOW' | 'UNSCORED' {
    if (score >= 80) return 'HIGH';
    if (score >= 50) return 'MEDIUM';
    if (score > 0) return 'LOW';
    return 'UNSCORED';
  }
}
