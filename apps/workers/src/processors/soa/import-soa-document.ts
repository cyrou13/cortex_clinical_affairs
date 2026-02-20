import type { Job } from 'bullmq';
import type { PrismaClient, Prisma } from '@prisma/client';
import type { TaskJobData } from '../../shared/base-processor.js';
import { BaseProcessor } from '../../shared/base-processor.js';
import type { LlmService } from '../../shared/llm/llm-abstraction.js';
import { parseDocument } from './document-parser.js';
import {
  buildPhase1SystemPrompt,
  buildPhase1UserPrompt,
  buildPhase2SystemPrompt,
  buildPhase2UserPrompt,
  buildPhase3SystemPrompt,
  buildPhase3UserPrompt,
} from './import-soa-prompt.js';
import { generateGapReport } from './gap-report-generator.js';
import type { SoaExtractedData } from '@cortex/shared';

interface ImportSoaJobMetadata {
  importId: string;
  projectId: string;
  storageKey: string;
  sourceFormat: 'PDF' | 'DOCX';
  fileName: string;
}

export class ImportSoaDocumentProcessor extends BaseProcessor {
  constructor(
    redis: any,
    private readonly prisma: PrismaClient,
    private readonly llmService: LlmService,
  ) {
    super(redis);
  }

  async process(job: Job<TaskJobData>): Promise<{ importId: string; status: string }> {
    const metadata = job.data.metadata as unknown as ImportSoaJobMetadata;
    const { importId, projectId, sourceFormat } = metadata;

    try {
      // Phase 0: Parse document (5%)
      await this.reportProgress(job, 5, { message: 'Parsing document...' });

      const fileBuffer = await this.getFileBuffer(importId);
      const parsed = await parseDocument(fileBuffer, sourceFormat);

      if (await this.checkCancellation(job)) {
        return this.handleCancellation(importId);
      }

      // Phase 1: Extract SOA type + articles (35%)
      await this.reportProgress(job, 10, { message: 'Phase 1: Extracting articles...' });

      const phase1Result = await this.runPhase1(parsed.fullText, projectId);

      if (await this.checkCancellation(job)) {
        return this.handleCancellation(importId);
      }

      await this.reportProgress(job, 35, {
        message: `Phase 1 complete: ${phase1Result.articles.length} articles found`,
      });

      // Phase 2: Extract sections + claims (60%)
      await this.reportProgress(job, 40, { message: 'Phase 2: Extracting sections and claims...' });

      const phase2Result = await this.runPhase2(parsed.fullText, phase1Result.soaType, projectId);

      if (await this.checkCancellation(job)) {
        return this.handleCancellation(importId);
      }

      await this.reportProgress(job, 60, {
        message: `Phase 2 complete: ${phase2Result.sections.length} sections, ${phase2Result.claims.length} claims`,
      });

      // Phase 3: Extract grid + devices + quality (80%)
      await this.reportProgress(job, 65, { message: 'Phase 3: Extracting grid data...' });

      const articleList = phase1Result.articles
        .map(
          (a: any) =>
            `${a.tempId}: "${a.title}" (${a.authors ?? 'Unknown'}, ${a.publicationYear ?? 'n.d.'})`,
        )
        .join('\n');

      const phase3Result = await this.runPhase3(
        parsed.fullText,
        phase1Result.soaType,
        articleList,
        projectId,
      );

      if (await this.checkCancellation(job)) {
        return this.handleCancellation(importId);
      }

      await this.reportProgress(job, 80, { message: 'Phase 3 complete. Generating gap report...' });

      // Assemble extracted data — cast to SoaExtractedData since LLM output
      // may have looser types than the Zod schema demands
      const extractedData = {
        soaType: phase1Result.soaType,
        articles: phase1Result.articles,
        sections: phase2Result.sections,
        gridColumns: phase3Result.gridColumns ?? [],
        gridCells: phase3Result.gridCells ?? [],
        claims: phase2Result.claims,
        similarDevices: phase3Result.similarDevices ?? [],
        qualityAssessments: phase3Result.qualityAssessments ?? [],
        slsSessions: phase1Result.slsSessions ?? [],
      } as SoaExtractedData;

      // Generate gap report (90%)
      await this.reportProgress(job, 90, { message: 'Generating gap report...' });
      const gapReport = generateGapReport(extractedData);

      // Save to SoaImport — replaces _rawFileContent with actual extracted data (100%)
      await (this.prisma as any).soaImport.update({
        where: { id: importId },
        data: {
          status: 'REVIEW',
          extractedData: extractedData as unknown as Prisma.InputJsonValue,
          gapReport: gapReport as unknown as Prisma.InputJsonValue,
        },
      });

      await this.reportProgress(job, 100, { message: 'Import complete — ready for review' });

      return { importId, status: 'REVIEW' };
    } catch (error) {
      // Mark import as failed
      try {
        await (this.prisma as any).soaImport.update({
          where: { id: importId },
          data: {
            status: 'FAILED',
            extractedData: {
              error: error instanceof Error ? error.message : String(error),
            } as unknown as Prisma.InputJsonValue,
          },
        });
      } catch {
        // Best effort — DB update may fail too
      }
      throw error;
    }
  }

  private async getFileBuffer(importId: string): Promise<Buffer> {
    const soaImport = await (this.prisma as any).soaImport.findUnique({
      where: { id: importId },
    });

    if (!soaImport) {
      throw new Error(`SoaImport ${importId} not found`);
    }

    // Read base64 file content stored during task creation
    const rawContent = (soaImport.extractedData as any)?._rawFileContent;
    if (!rawContent || typeof rawContent !== 'string') {
      throw new Error(`No file content found for SoaImport ${importId}`);
    }

    return Buffer.from(rawContent, 'base64');
  }

  private async runPhase1(
    documentText: string,
    projectId: string,
  ): Promise<{
    soaType: 'CLINICAL' | 'SIMILAR_DEVICE' | 'ALTERNATIVE';
    articles: Array<{
      tempId: string;
      title: string;
      authors?: string;
      publicationYear?: number;
      doi?: string;
      pmid?: string;
      journal?: string;
      abstract?: string;
    }>;
    slsSessions?: Array<{
      type: 'SOA_CLINICAL' | 'SOA_DEVICE';
      name: string;
      scopeFields: Record<string, unknown>;
      queries: Array<{
        name: string;
        queryString: string;
        databases: string[];
        dateFrom?: string;
        dateTo?: string;
      }>;
      exclusionCodes: Array<{
        code: string;
        label: string;
        shortCode: string;
        description?: string;
      }>;
      articleTempIds: string[];
    }>;
  }> {
    const response = await this.llmCompleteWithRetry(
      buildPhase1UserPrompt(documentText),
      buildPhase1SystemPrompt(),
      projectId,
    );

    return this.parseJsonResponse(response.content, 'Phase 1');
  }

  private async runPhase2(
    documentText: string,
    soaType: string,
    projectId: string,
  ): Promise<{
    sections: Array<{
      sectionKey: string;
      title: string;
      orderIndex: number;
      narrativeContent?: string;
    }>;
    claims: Array<{
      statementText: string;
      thematicSectionKey?: string;
      articleTempIds: string[];
      sourceQuote?: string;
    }>;
  }> {
    const response = await this.llmCompleteWithRetry(
      buildPhase2UserPrompt(documentText, soaType),
      buildPhase2SystemPrompt(),
      projectId,
    );

    return this.parseJsonResponse(response.content, 'Phase 2');
  }

  private async runPhase3(
    documentText: string,
    soaType: string,
    articleList: string,
    projectId: string,
  ): Promise<{
    gridColumns: Array<{
      name: string;
      displayName: string;
      dataType: string;
      isRequired: boolean;
      orderIndex: number;
    }>;
    gridCells: Array<{
      articleTempId: string;
      columnName: string;
      value?: string;
      sourceQuote?: string;
    }>;
    similarDevices: Array<{
      deviceName: string;
      manufacturer: string;
      indication: string;
      regulatoryStatus: string;
      benchmarks: Array<{
        metricName: string;
        metricValue: string;
        unit: string;
        sourceDescription?: string;
      }>;
    }>;
    qualityAssessments: Array<{
      articleTempId: string;
      assessmentType: string;
      assessmentData: Record<string, unknown>;
      dataContributionLevel: string;
    }>;
  }> {
    const response = await this.llmCompleteWithRetry(
      buildPhase3UserPrompt(documentText, soaType, articleList),
      buildPhase3SystemPrompt(),
      projectId,
    );

    return this.parseJsonResponse(response.content, 'Phase 3');
  }

  private async llmCompleteWithRetry(
    prompt: string,
    systemPrompt: string,
    projectId: string,
    maxRetries = 3,
  ): Promise<{ content: string }> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.llmService.complete(
          'extraction',
          prompt,
          {
            systemPrompt,
            responseFormat: 'json',
            temperature: 0.1,
          },
          projectId,
        );
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes('429') || msg.includes('rate_limit') || msg.includes('Rate limit')) {
          const waitMs = Math.min(10000 * (attempt + 1), 30000);
          await new Promise((r) => setTimeout(r, waitMs));
          continue;
        }
        throw error;
      }
    }
    throw new Error('LLM rate limit exceeded after max retries');
  }

  private parseJsonResponse<T>(content: string, phase: string): T {
    try {
      // Strip markdown code fences if present
      let cleaned = content.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      return JSON.parse(cleaned);
    } catch (error) {
      throw new Error(
        `Failed to parse LLM response in ${phase}: ${error instanceof Error ? error.message : String(error)}. Response start: ${content.slice(0, 200)}`,
      );
    }
  }

  private async handleCancellation(
    importId: string,
  ): Promise<{ importId: string; status: string }> {
    await (this.prisma as any).soaImport.update({
      where: { id: importId },
      data: { status: 'CANCELLED' },
    });
    return { importId, status: 'CANCELLED' };
  }
}
