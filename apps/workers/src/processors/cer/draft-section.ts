import type { Job } from 'bullmq';
import { BaseProcessor, type TaskJobData } from '../../shared/base-processor.js';

export interface DraftSectionMetadata {
  cerVersionId: string;
  cerSectionId: string;
  sectionNumber: string;
  sectionTitle: string;
  requiredUpstreamData: Array<{
    moduleType: string;
    dataType: string;
    description: string;
  }>;
}

export interface DraftSectionDeps {
  gatherUpstreamData(
    cerVersionId: string,
    requirements: DraftSectionMetadata['requiredUpstreamData'],
  ): Promise<Array<{ moduleType: string; moduleId: string; dataType: string; content: string }>>;
  generateDraft(prompt: string): Promise<{ content: string; references: Array<{ sourceId: string; excerpt: string }> }>;
  storeContent(cerSectionId: string, content: string, wordCount: number): Promise<void>;
  createClaimTraces(
    cerSectionId: string,
    references: Array<{ sourceId: string; excerpt: string }>,
  ): Promise<number>;
}

export class DraftSectionProcessor extends BaseProcessor {
  constructor(
    redis: ConstructorParameters<typeof BaseProcessor>[0],
    private readonly deps: DraftSectionDeps,
  ) {
    super(redis);
  }

  async process(job: Job<TaskJobData>): Promise<{
    cerSectionId: string;
    wordCount: number;
    claimTraceCount: number;
  }> {
    const metadata = job.data.metadata as unknown as DraftSectionMetadata;
    const { cerVersionId, cerSectionId, sectionNumber, sectionTitle, requiredUpstreamData } = metadata;

    await this.reportProgress(job, 10, {
      message: `Gathering upstream data for Section ${sectionNumber}`,
    });

    // Gather upstream data
    const upstreamData = await this.deps.gatherUpstreamData(cerVersionId, requiredUpstreamData);

    if (await this.checkCancellation(job)) {
      return { cerSectionId, wordCount: 0, claimTraceCount: 0 };
    }

    await this.reportProgress(job, 30, {
      message: `Building prompt for Section ${sectionNumber} "${sectionTitle}"`,
    });

    // Build prompt
    const prompt = this.buildPrompt(sectionNumber, sectionTitle, upstreamData);

    await this.reportProgress(job, 40, {
      message: `Generating AI draft for Section ${sectionNumber}`,
    });

    // Generate draft
    const llmResult = await this.deps.generateDraft(prompt);

    if (await this.checkCancellation(job)) {
      return { cerSectionId, wordCount: 0, claimTraceCount: 0 };
    }

    await this.reportProgress(job, 70, {
      message: `Storing content for Section ${sectionNumber}`,
    });

    // Calculate word count
    const wordCount = llmResult.content.split(/\s+/).filter(Boolean).length;

    // Store content
    await this.deps.storeContent(cerSectionId, llmResult.content, wordCount);

    await this.reportProgress(job, 85, {
      message: `Creating claim traces for Section ${sectionNumber}`,
    });

    // Create claim trace records from references
    const claimTraceCount = await this.deps.createClaimTraces(
      cerSectionId,
      llmResult.references,
    );

    await this.reportProgress(job, 100, {
      message: `Section ${sectionNumber} draft complete: ${wordCount} words, ${claimTraceCount} claim traces`,
    });

    return {
      cerSectionId,
      wordCount,
      claimTraceCount,
    };
  }

  private buildPrompt(
    sectionNumber: string,
    sectionTitle: string,
    upstreamData: Array<{ moduleType: string; dataType: string; content: string }>,
  ): string {
    const dataContext = upstreamData
      .map((d) => `[${d.moduleType}/${d.dataType}]\n${d.content}`)
      .join('\n\n');

    return [
      `You are drafting Section ${sectionNumber} "${sectionTitle}" of a Clinical Evaluation Report (CER) per MDR 2017/745 Annex XIV Part A.`,
      '',
      'Use formal, technical regulatory language. Include specific references to the data provided.',
      'Structure the section with appropriate headings and subheadings.',
      'For each claim made, cite the specific data source.',
      '',
      '--- UPSTREAM DATA ---',
      dataContext || 'No upstream data available for this section.',
      '--- END DATA ---',
      '',
      `Write the complete Section ${sectionNumber} "${sectionTitle}" content:`,
    ].join('\n');
  }
}
