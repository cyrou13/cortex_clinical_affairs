import type { Job } from 'bullmq';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import type { TaskJobData } from '../../shared/base-processor.js';
import { BaseProcessor } from '../../shared/base-processor.js';
import type { LlmService } from '../../shared/llm/llm-abstraction.js';

interface GenerateClaimsJobMetadata {
  soaAnalysisId: string;
  gridId: string;
}

// Zod schema for a single LLM-generated claim
const GeneratedClaimSchema = z.object({
  statementText: z.string(),
  evidenceStrength: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  supportingArticleIds: z.array(z.string()),
  sourceQuotes: z.array(z.string()),
});

const GeneratedClaimsResponseSchema = z.array(GeneratedClaimSchema);

type GeneratedClaim = z.infer<typeof GeneratedClaimSchema>;

export class GenerateClaimsProcessor extends BaseProcessor {
  constructor(
    redis: any,
    private readonly prisma: PrismaClient,
    private readonly llmService: LlmService,
  ) {
    super(redis);
  }

  async process(job: Job<TaskJobData>): Promise<{ generated: number; failed: number }> {
    const metadata = job.data.metadata as unknown as GenerateClaimsJobMetadata;
    const { soaAnalysisId, gridId } = metadata;

    // Get all thematic sections that have narrative content or AI draft
    const sections = await (this.prisma as any).thematicSection.findMany({
      where: {
        soaAnalysisId,
        OR: [{ narrativeContent: { not: null } }, { narrativeAiDraft: { not: null } }],
      },
      orderBy: { orderIndex: 'asc' },
    });

    if (sections.length === 0) {
      return { generated: 0, failed: 0 };
    }

    // Get all articles from the grid with their extracted data cells
    const gridCells = await this.prisma.gridCell.findMany({
      where: { extractionGridId: gridId },
      select: {
        articleId: true,
        gridColumn: {
          select: {
            name: true,
            displayName: true,
          },
        },
        value: true,
        aiExtractedValue: true,
      },
    } as any);

    // Build per-article data summary for the prompt
    const articleDataMap = new Map<string, Array<{ field: string; value: string }>>();
    for (const cell of gridCells as any[]) {
      const val = cell.value || cell.aiExtractedValue || '';
      if (!val) continue;
      if (!articleDataMap.has(cell.articleId)) {
        articleDataMap.set(cell.articleId, []);
      }
      articleDataMap.get(cell.articleId)!.push({
        field: cell.gridColumn.displayName,
        value: val,
      });
    }

    const articleIds = [...articleDataMap.keys()];

    let generated = 0;
    let failed = 0;

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];

      // Check for cancellation between sections
      const cancelled = await this.checkCancellation(job);
      if (cancelled) {
        await this.reportProgress(job, i / sections.length, {
          total: sections.length,
          current: i,
          message: `Claim generation cancelled. Processed ${i}/${sections.length} sections.`,
        });
        break;
      }

      try {
        const systemPrompt = this.buildSystemPrompt();
        const userPrompt = this.buildUserPrompt(section, articleDataMap, articleIds);

        const response = await this.llmService.complete('extraction', userPrompt, {
          systemPrompt,
          responseFormat: 'json',
          temperature: 0.3,
          maxTokens: 4000,
        });

        const claims = this.parseAndValidateClaims(response.content);

        await this.persistClaims(soaAnalysisId, section.id, claims, job.data.createdBy);

        generated += claims.length;

        await this.reportProgress(job, (i + 1) / sections.length, {
          total: sections.length,
          current: i + 1,
          message: `Generated ${claims.length} claim(s) for section: ${section.title}`,
        });
      } catch (error: any) {
        console.error(
          `Failed to generate claims for section ${section.id} (${section.title}):`,
          error.message,
        );
        failed++;
      }
    }

    return { generated, failed };
  }

  private buildSystemPrompt(): string {
    return `You are a clinical regulatory expert specializing in medical device State of the Art (SOA) analysis. Your task is to generate evidence-based claims from thematic section content and extracted article data.

For each claim, provide:
1. statementText: A clear, precise regulatory claim statement
2. evidenceStrength: Overall evidence strength (HIGH, MEDIUM, LOW)
3. supportingArticleIds: Array of article IDs from the provided data that support this claim
4. sourceQuotes: Array of relevant quotes from the articles supporting the claim

Generate claims that are:
- Factual, measurable, and defensible from the evidence
- Suitable for inclusion in a Clinical Evaluation Report (CER)
- Properly scoped to the thematic section
- Linked to specific articles from the grid data

Return your response as a JSON array in this format:
[
  {
    "statementText": "Clear claim statement based on evidence",
    "evidenceStrength": "HIGH",
    "supportingArticleIds": ["article-id-1", "article-id-2"],
    "sourceQuotes": ["Relevant quote from article 1", "Relevant quote from article 2"]
  }
]

Return an empty array [] if no defensible claims can be generated from the provided content.`;
  }

  private buildUserPrompt(
    section: {
      id: string;
      title: string;
      sectionKey: string;
      narrativeContent: unknown;
      narrativeAiDraft: unknown;
    },
    articleDataMap: Map<string, Array<{ field: string; value: string }>>,
    articleIds: string[],
  ): string {
    const narrativeText =
      typeof section.narrativeContent === 'string'
        ? section.narrativeContent
        : section.narrativeContent
          ? JSON.stringify(section.narrativeContent)
          : typeof section.narrativeAiDraft === 'string'
            ? section.narrativeAiDraft
            : section.narrativeAiDraft
              ? JSON.stringify(section.narrativeAiDraft)
              : 'No narrative content available';

    const articleSummaries = articleIds
      .slice(0, 20) // Cap at 20 articles to avoid token overflow
      .map((articleId) => {
        const fields = articleDataMap.get(articleId) ?? [];
        const fieldText = fields.map((f) => `  ${f.field}: ${f.value}`).join('\n');
        return `Article ID: ${articleId}\n${fieldText}`;
      })
      .join('\n\n');

    return `Thematic Section: ${section.title} (key: ${section.sectionKey})

Narrative Content:
${narrativeText}

Extracted Article Data (${articleIds.length} articles):
${articleSummaries}

Generate evidence-based claims for this thematic section based on the narrative content and the extracted article data above. Only reference the article IDs provided above.`;
  }

  private parseAndValidateClaims(content: string): GeneratedClaim[] {
    try {
      let parsed = JSON.parse(content);
      // Handle LLM returning { claims: [...] } instead of [...]
      if (!Array.isArray(parsed) && parsed && Array.isArray(parsed.claims)) {
        parsed = parsed.claims;
      }
      // Handle single claim object wrapped in non-array
      if (!Array.isArray(parsed) && parsed && parsed.statementText) {
        parsed = [parsed];
      }
      return GeneratedClaimsResponseSchema.parse(parsed);
    } catch (error) {
      throw new Error(
        `Failed to parse or validate generated claims: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async persistClaims(
    soaAnalysisId: string,
    thematicSectionId: string,
    claims: GeneratedClaim[],
    createdById: string,
  ): Promise<void> {
    for (const claim of claims) {
      const claimId = crypto.randomUUID();

      await (this.prisma as any).claim.create({
        data: {
          id: claimId,
          soaAnalysisId,
          statementText: claim.statementText,
          thematicSectionId,
          status: 'DRAFT',
          evidenceStrength: claim.evidenceStrength,
          createdById,
        },
      });

      // Create ClaimArticleLink records for each supporting article
      for (let i = 0; i < claim.supportingArticleIds.length; i++) {
        const articleId = claim.supportingArticleIds[i];
        const sourceQuote = claim.sourceQuotes[i] ?? null;

        try {
          await (this.prisma as any).claimArticleLink.create({
            data: {
              id: crypto.randomUUID(),
              claimId,
              articleId,
              sourceQuote,
            },
          });
        } catch (error: any) {
          // Article may not exist in DB — log and skip
          console.warn(`Could not link article ${articleId} to claim ${claimId}: ${error.message}`);
        }
      }
    }
  }
}
