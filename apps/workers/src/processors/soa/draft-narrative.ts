import type { Job } from 'bullmq';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import type { TaskJobData } from '../../shared/base-processor.js';
import { BaseProcessor } from '../../shared/base-processor.js';
import type { LlmService } from '../../shared/llm/llm-abstraction.js';

interface DraftNarrativeJobMetadata {
  sectionId: string;
  soaAnalysisId: string;
  projectId?: string;
}

// Zod schema for validating the LLM narrative response
const NarrativeContentSchema = z.object({
  title: z.string(),
  sections: z.array(
    z.object({
      heading: z.string().optional(),
      paragraphs: z.array(z.string()),
    }),
  ),
  keyFindings: z.array(z.string()),
  citations: z.array(z.string()).optional(),
});

type NarrativeContent = z.infer<typeof NarrativeContentSchema>;

export class DraftNarrativeProcessor extends BaseProcessor {
  constructor(
    redis: any,
    private readonly prisma: PrismaClient,
    private readonly llmService: LlmService,
  ) {
    super(redis);
  }

  async process(job: Job<TaskJobData>): Promise<void> {
    const metadata = job.data.metadata as unknown as DraftNarrativeJobMetadata;
    const { sectionId, soaAnalysisId, projectId } = metadata;

    // Report initial progress
    await this.reportProgress(job, 0, {
      message: 'Loading section data...',
    });

    // Load section data
    const section = await (this.prisma as any).thematicSection.findUnique({
      where: { id: sectionId },
      select: {
        title: true,
        sectionKey: true,
      },
    });

    if (!section) {
      throw new Error('Section not found');
    }

    // Update progress
    await this.reportProgress(job, 20, {
      message: 'Loading analysis data...',
    });

    // Load SOA analysis
    const soaAnalysis = await (this.prisma as any).soaAnalysis.findUnique({
      where: { id: soaAnalysisId },
      select: {
        id: true,
        name: true,
        type: true,
        description: true,
      },
    });

    if (!soaAnalysis) {
      throw new Error('SOA analysis not found');
    }

    // Load extraction grids with columns
    const grids = await (this.prisma as any).extractionGrid.findMany({
      where: { soaAnalysisId },
      select: {
        id: true,
        columns: {
          select: {
            id: true,
            name: true,
            displayName: true,
            dataType: true,
          },
        },
      },
    });

    const gridId = grids[0]?.id;

    // Load articles via SoaSlsLink → sessions
    const links = await (this.prisma as any).soaSlsLink.findMany({
      where: { soaAnalysisId },
      select: { slsSessionId: true },
    });
    const sessionIds = links.map((l: { slsSessionId: string }) => l.slsSessionId);

    const articles = await (this.prisma as any).article.findMany({
      where: {
        sessionId: { in: sessionIds },
        status: { in: ['INCLUDED', 'FINAL_INCLUDED'] },
      },
      select: {
        id: true,
        title: true,
        authors: true,
        journal: true,
        publicationYear: true,
        abstract: true,
      },
      take: 50,
    });

    // Load grid cells for these articles
    let articleCellsMap: Map<
      string,
      Array<{ columnName: string; displayName: string; value: string | null }>
    > = new Map();
    if (gridId) {
      const articleIds = articles.map((a: { id: string }) => a.id);
      const cells = await (this.prisma as any).gridCell.findMany({
        where: {
          extractionGridId: gridId,
          articleId: { in: articleIds },
        },
        select: {
          articleId: true,
          value: true,
          aiExtractedValue: true,
          gridColumn: {
            select: {
              name: true,
              displayName: true,
            },
          },
        },
      });

      for (const cell of cells as Array<{
        articleId: string;
        value: string | null;
        aiExtractedValue: string | null;
        gridColumn: { name: string; displayName: string };
      }>) {
        const existing = articleCellsMap.get(cell.articleId) ?? [];
        existing.push({
          columnName: cell.gridColumn.name,
          displayName: cell.gridColumn.displayName,
          value: cell.value ?? cell.aiExtractedValue ?? null,
        });
        articleCellsMap.set(cell.articleId, existing);
      }
    }

    // Update progress
    await this.reportProgress(job, 40, {
      message: 'Generating AI narrative draft...',
    });

    // Build prompt for LLM
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(section, soaAnalysis, articles, articleCellsMap);

    try {
      // Call LLM to generate narrative
      const response = await this.llmService.complete(
        'drafting',
        userPrompt,
        {
          systemPrompt,
          responseFormat: 'json',
          temperature: 0.7,
          maxTokens: 4096,
        },
        projectId,
      );

      // Parse and validate response
      const narrativeContent = this.parseAndValidateNarrative(response.content);

      // Convert to TipTap JSON format
      const aiDraft = this.convertToTipTapFormat(narrativeContent);

      // Update progress
      await this.reportProgress(job, 80, {
        message: 'Saving AI draft...',
      });

      // Save AI draft to section
      await (this.prisma as any).thematicSection.update({
        where: { id: sectionId },
        data: {
          narrativeAiDraft: aiDraft,
        },
      });

      // Complete - report final progress
      await this.reportProgress(job, 100, {
        message: 'AI narrative draft generated successfully',
      });
    } catch (error: any) {
      throw new Error(`Failed to generate narrative: ${error.message}`);
    }
  }

  private buildSystemPrompt(): string {
    return `You are a medical writing expert specializing in State of the Art (SOA) analysis narratives for clinical affairs and regulatory submissions.

Your task is to synthesize scientific evidence from multiple research articles into a coherent, well-structured narrative section.

Guidelines:
- Write in clear, professional academic language
- Use active voice where appropriate
- Synthesize information across studies, identifying patterns and themes
- Highlight key findings, trends, and gaps in the evidence
- Include critical analysis of study quality where relevant
- Maintain objectivity and evidence-based reasoning
- Structure content logically with clear transitions
- Use appropriate medical and scientific terminology

Return your response as JSON with this structure:
{
  "title": "Section title",
  "sections": [
    {
      "heading": "Optional subsection heading",
      "paragraphs": ["Paragraph 1 text", "Paragraph 2 text"]
    }
  ],
  "keyFindings": ["Finding 1", "Finding 2", "Finding 3"],
  "citations": ["Article reference 1", "Article reference 2"]
}`;
  }

  private buildUserPrompt(
    section: { title: string; sectionKey: string },
    soaAnalysis: { name: string; type: string; description: string | null },
    articles: Array<{
      id: string;
      title: string;
      authors: any;
      journal: string | null;
      publicationYear: number | null;
      abstract: string | null;
    }>,
    articleCellsMap: Map<
      string,
      Array<{ columnName: string; displayName: string; value: string | null }>
    >,
  ): string {
    const articlesData = articles
      .map((article, idx) => {
        const cells = articleCellsMap.get(article.id) ?? [];
        const extractedData = cells
          .filter((c) => c.value)
          .map((cell) => `  - ${cell.displayName}: ${cell.value}`)
          .join('\n');

        const authorStr = Array.isArray(article.authors)
          ? article.authors.join(', ')
          : article.authors || 'Unknown';

        return `
Article ${idx + 1}:
  Title: ${article.title}
  Authors: ${authorStr}
  Journal: ${article.journal || 'Unknown'}
  Year: ${article.publicationYear || 'Unknown'}
  Abstract: ${(article.abstract || 'No abstract available').substring(0, 500)}
  Extracted Data:
${extractedData || '  None'}
`;
      })
      .join('\n---\n');

    return `Section to Draft:
Title: ${section.title}
Section Key: ${section.sectionKey}

SOA Analysis: ${soaAnalysis.name} (${soaAnalysis.type})
${soaAnalysis.description ? `Description: ${soaAnalysis.description}` : ''}

Evidence Base (${articles.length} articles):
${articlesData || 'No articles available'}

Please draft a comprehensive narrative for this section that synthesizes the evidence from the articles provided. Focus on:
1. Key patterns and trends across studies
2. Strength and quality of evidence
3. Clinical significance and implications
4. Any gaps or limitations in the evidence
5. Overall conclusions based on the evidence

Structure the narrative with clear subsections as appropriate for the content.`;
  }

  private parseAndValidateNarrative(content: string): NarrativeContent {
    try {
      const parsed = JSON.parse(content);
      return NarrativeContentSchema.parse(parsed);
    } catch (error) {
      throw new Error(
        `Failed to parse or validate narrative: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private convertToTipTapFormat(narrative: NarrativeContent): any {
    const content: any[] = [];

    // Add title as heading
    content.push({
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: narrative.title }],
    });

    // Add sections
    for (const section of narrative.sections) {
      if (section.heading) {
        content.push({
          type: 'heading',
          attrs: { level: 3 },
          content: [{ type: 'text', text: section.heading }],
        });
      }

      for (const paragraph of section.paragraphs) {
        content.push({
          type: 'paragraph',
          content: [{ type: 'text', text: paragraph }],
        });
      }
    }

    // Add key findings section
    if (narrative.keyFindings.length > 0) {
      content.push({
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: 'Key Findings' }],
      });

      content.push({
        type: 'bulletList',
        content: narrative.keyFindings.map((finding: string) => ({
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: finding }],
            },
          ],
        })),
      });
    }

    return {
      type: 'doc',
      content,
    };
  }
}
