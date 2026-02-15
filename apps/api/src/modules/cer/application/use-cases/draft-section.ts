import type { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../../../../shared/errors/index.js';
import type { UpstreamDataRequirement } from '@cortex/shared';

interface DraftSectionInput {
  cerSectionId: string;
  cerVersionId: string;
  sectionNumber: string;
  sectionTitle: string;
  requiredUpstreamData: UpstreamDataRequirement[];
  userId: string;
}

interface DraftSectionResult {
  cerSectionId: string;
  content: string;
  references: UpstreamReference[];
  wordCount: number;
}

export interface UpstreamReference {
  moduleType: string;
  moduleId: string;
  dataType: string;
  excerpt: string;
}

export interface LlmProvider {
  generateSectionDraft(prompt: string): Promise<{
    content: string;
    references: Array<{ sourceId: string; excerpt: string }>;
  }>;
}

export interface UpstreamDataGatherer {
  gatherData(
    cerVersionId: string,
    requirements: UpstreamDataRequirement[],
  ): Promise<{
    data: Array<{
      moduleType: string;
      moduleId: string;
      dataType: string;
      content: string;
    }>;
  }>;
}

export class DraftSectionUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly llm: LlmProvider,
    private readonly dataGatherer: UpstreamDataGatherer,
  ) {}

  async execute(input: DraftSectionInput): Promise<DraftSectionResult> {
    const { cerSectionId, cerVersionId, sectionNumber, sectionTitle, requiredUpstreamData } = input;

    // Verify section exists
    const section = await this.prisma.cerSection.findUnique({
      where: { id: cerSectionId },
      select: { id: true, status: true },
    });

    if (!section) {
      throw new NotFoundError('CerSection', cerSectionId);
    }

    // Gather upstream data
    const upstreamResult = await this.dataGatherer.gatherData(cerVersionId, requiredUpstreamData);

    // Build prompt
    const prompt = this.buildPrompt(sectionNumber, sectionTitle, upstreamResult.data);

    // Generate draft via LLM
    const llmResult = await this.llm.generateSectionDraft(prompt);

    // Build references
    const references: UpstreamReference[] = upstreamResult.data.map((d) => ({
      moduleType: d.moduleType,
      moduleId: d.moduleId,
      dataType: d.dataType,
      excerpt: d.content.slice(0, 200),
    }));

    const wordCount = llmResult.content.split(/\s+/).filter(Boolean).length;

    // Store content
    await this.prisma.cerSection.update({
      where: { id: cerSectionId },
      data: {
        content: llmResult.content,
        status: 'DRAFT',
        wordCount,
        draftedAt: new Date().toISOString(),
      } as any,
    });

    return {
      cerSectionId,
      content: llmResult.content,
      references,
      wordCount,
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
      '',
      '--- UPSTREAM DATA ---',
      dataContext || 'No upstream data available for this section.',
      '--- END DATA ---',
      '',
      `Write the complete Section ${sectionNumber} "${sectionTitle}" content:`,
    ].join('\n');
  }
}
