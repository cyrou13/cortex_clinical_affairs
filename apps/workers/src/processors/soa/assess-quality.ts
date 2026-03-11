import type { Job } from 'bullmq';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import type { TaskJobData } from '../../shared/base-processor.js';
import { BaseProcessor } from '../../shared/base-processor.js';
import type { LlmService } from '../../shared/llm/llm-abstraction.js';

interface AssessQualityJobMetadata {
  gridId: string;
  soaAnalysisId: string;
  articleIds: string[];
  qualityCriteria: Array<{
    id: string;
    name: string;
    description: string;
  }>;
}

// Zod schema for validation
const QualityAssessmentSchema = z.object({
  overallQuality: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  overallScore: z.number().min(0).max(100),
  criteria: z.record(
    z.string(),
    z.object({
      score: z.number().min(0).max(100),
      rating: z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR']),
      justification: z.string(),
      concerns: z.array(z.string()).optional(),
    }),
  ),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  recommendation: z.string(),
});

type QualityAssessment = z.infer<typeof QualityAssessmentSchema>;

export class AssessQualityProcessor extends BaseProcessor {
  constructor(
    redis: any,
    private readonly prisma: PrismaClient,
    private readonly llmService: LlmService,
  ) {
    super(redis);
  }

  async process(job: Job<TaskJobData>): Promise<{ processed: number; failed: number }> {
    const metadata = job.data.metadata as unknown as AssessQualityJobMetadata;
    const { gridId, articleIds, qualityCriteria } = metadata;

    let processed = 0;
    let failed = 0;

    for (const articleId of articleIds) {
      // Check for cancellation between articles
      const cancelled = await this.checkCancellation(job);
      if (cancelled) {
        await this.reportProgress(job, processed / articleIds.length, {
          total: articleIds.length,
          current: processed,
          message: `Quality assessment cancelled. Processed ${processed}/${articleIds.length} articles.`,
        });
        break;
      }

      try {
        // Get article with full text and extracted grid data
        const article = await (this.prisma as any).article.findUnique({
          where: { id: articleId },
          select: {
            id: true,
            title: true,
            authors: true,
            journal: true,
            publicationYear: true,
            abstract: true,
          },
        });

        if (!article) {
          failed++;
          continue;
        }

        // Get extracted grid data for this article
        const gridCells = await this.prisma.gridCell.findMany({
          where: {
            extractionGridId: gridId,
            articleId,
          },
          select: {
            gridColumn: {
              select: {
                name: true,
                displayName: true,
              },
            },
            value: true,
            aiExtractedValue: true,
            confidenceScore: true,
          },
        } as any);

        // Build assessment prompt
        const systemPrompt = this.buildSystemPrompt(qualityCriteria);
        const userPrompt = this.buildUserPrompt(article, gridCells as any, qualityCriteria);

        // Call LLM
        const response = await this.llmService.complete('scoring', userPrompt, {
          systemPrompt,
          responseFormat: 'json',
          temperature: 0.2,
          maxTokens: 3000,
        });

        // Parse and validate JSON response
        const assessment = this.parseAndValidateAssessment(response.content);

        // Persist quality assessment
        await this.persistQualityAssessment(gridId, articleId, assessment);

        processed++;

        // Report progress
        await this.reportProgress(job, processed / articleIds.length, {
          total: articleIds.length,
          current: processed,
          message: `Assessing quality for article: ${article.title}`,
        });
      } catch (error: any) {
        // Log error but continue with next article
        console.error(`Failed to assess quality for article ${articleId}:`, error.message);
        failed++;
      }
    }

    return { processed, failed };
  }

  private buildSystemPrompt(qualityCriteria: AssessQualityJobMetadata['qualityCriteria']): string {
    return `You are a clinical research quality assessment expert. Evaluate the quality of a scientific article based on specific criteria for evidence synthesis.

Quality Criteria to Assess:
${qualityCriteria.map((c) => `- ${c.name}: ${c.description}`).join('\n')}

For each criterion, provide:
1. score: A numeric score from 0-100
2. rating: Overall rating (EXCELLENT, GOOD, FAIR, POOR)
3. justification: Brief explanation of the rating
4. concerns: Optional array of specific issues identified

Also provide:
- overallQuality: Overall quality level (HIGH, MEDIUM, LOW)
- overallScore: Overall quality score (0-100)
- strengths: Array of key strengths identified
- weaknesses: Array of key weaknesses identified
- recommendation: Brief recommendation regarding the use of this evidence

Return your response as JSON in this format:
{
  "overallQuality": "HIGH",
  "overallScore": 85,
  "criteria": {
    "criterion_name": {
      "score": 85,
      "rating": "GOOD",
      "justification": "explanation here",
      "concerns": ["concern 1", "concern 2"]
    }
  },
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "recommendation": "Brief recommendation text"
}`;
  }

  private buildUserPrompt(
    article: {
      title: string;
      authors: string | null;
      journal: string | null;
      publicationYear: number | null;
      abstract: string | null;
    },
    gridCells: Array<{
      gridColumn: { name: string; displayName: string };
      value: string | null;
      aiExtractedValue: string | null;
      confidenceScore: number | null;
    }>,
    qualityCriteria: AssessQualityJobMetadata['qualityCriteria'],
  ): string {
    const extractedData = gridCells
      .map(
        (cell) =>
          `${cell.gridColumn.displayName}: ${cell.value || cell.aiExtractedValue || 'Not extracted'} (confidence: ${cell.confidenceScore || 0})`,
      )
      .join('\n');

    return `Article Metadata:
Title: ${article.title}
Authors: ${article.authors || 'Unknown'}
Journal: ${article.journal || 'Unknown'}
Year: ${article.publicationYear || 'Unknown'}

Abstract:
${article.abstract || 'No abstract available'}

Extracted Data from Grid:
${extractedData}

Assess the quality of this article based on the following criteria: ${qualityCriteria.map((c) => c.name).join(', ')}`;
  }

  private parseAndValidateAssessment(content: string): QualityAssessment {
    try {
      const parsed = JSON.parse(content);
      return QualityAssessmentSchema.parse(parsed);
    } catch (error) {
      // If parsing fails or validation fails, throw error
      throw new Error(
        `Failed to parse or validate quality assessment: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async persistQualityAssessment(
    gridId: string,
    articleId: string,
    assessment: QualityAssessment,
  ): Promise<void> {
    // Store assessment as JSON in the ArticleQualityAssessment table
    await (this.prisma as any).articleQualityAssessment.upsert({
      where: {
        extractionGridId_articleId: {
          extractionGridId: gridId,
          articleId,
        },
      },
      create: {
        id: crypto.randomUUID(),
        extractionGridId: gridId,
        articleId,
        overallQuality: assessment.overallQuality,
        overallScore: assessment.overallScore,
        criteriaScores: assessment.criteria,
        strengths: assessment.strengths,
        weaknesses: assessment.weaknesses,
        recommendation: assessment.recommendation,
      },
      update: {
        overallQuality: assessment.overallQuality,
        overallScore: assessment.overallScore,
        criteriaScores: assessment.criteria,
        strengths: assessment.strengths,
        weaknesses: assessment.weaknesses,
        recommendation: assessment.recommendation,
        updatedAt: new Date(),
      },
    });
  }
}
