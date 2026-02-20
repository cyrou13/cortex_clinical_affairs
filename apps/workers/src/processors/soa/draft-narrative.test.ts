import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DraftNarrativeProcessor } from './draft-narrative.js';

function makeMockJob(metadata: any) {
  return {
    data: {
      taskId: 'task-1',
      type: 'soa.draft-narrative',
      metadata,
      createdBy: 'user-1',
    },
    updateProgress: vi.fn(),
  } as any;
}

function makeMockRedis() {
  return {
    get: vi.fn().mockResolvedValue(null),
    publish: vi.fn(),
  } as any;
}

function makeMockPrisma() {
  return {
    thematicSection: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'section-1',
        title: 'Clinical Evidence',
        sectionKey: 'clinical_evidence',
        description: 'Overview of clinical evidence',
      }),
      update: vi.fn().mockResolvedValue({ id: 'section-1' }),
    },
    soaAnalysis: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'soa-1',
        scopeDefinition: { indication: 'Type 2 Diabetes' },
        extractionGrid: {
          id: 'grid-1',
          columns: [
            { name: 'study_type', displayName: 'Study Type', dataType: 'TEXT' },
            { name: 'sample_size', displayName: 'Sample Size', dataType: 'NUMERIC' },
          ],
        },
      }),
    },
    article: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: 'article-1',
          title: 'Clinical Trial Results',
          authors: 'Smith et al.',
          journal: 'Medical Journal',
          publicationYear: 2023,
          abstract: 'Study of treatment efficacy...',
          gridCells: [
            {
              gridColumn: { name: 'study_type', displayName: 'Study Type' },
              value: 'RCT',
              confidenceScore: 95,
            },
          ],
          qualityAssessments: [
            {
              overallQuality: 'HIGH',
              overallScore: 85,
              strengths: ['Good design'],
              weaknesses: ['Limited follow-up'],
            },
          ],
        },
      ]),
    },
  } as any;
}

function makeMockLlmService() {
  return {
    complete: vi.fn().mockResolvedValue({
      content: JSON.stringify({
        title: 'Clinical Evidence Overview',
        sections: [
          {
            heading: 'Efficacy Studies',
            paragraphs: [
              'Multiple randomized controlled trials have demonstrated efficacy...',
              'The evidence base includes high-quality studies with robust methodology...',
            ],
          },
          {
            paragraphs: ['Overall, the clinical evidence supports the use of the device...'],
          },
        ],
        keyFindings: [
          'High efficacy demonstrated in RCTs',
          'Good safety profile',
          'Limited long-term data available',
        ],
        citations: ['Smith et al. 2023'],
      }),
      usage: { promptTokens: 500, completionTokens: 300, totalTokens: 800 },
      cost: 0.005,
      model: 'gpt-4',
      provider: 'openai',
      cached: false,
      latencyMs: 3000,
    }),
  } as any;
}

describe('DraftNarrativeProcessor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates narrative draft from articles', async () => {
    const redis = makeMockRedis();
    const prisma = makeMockPrisma();
    const llmService = makeMockLlmService();
    const processor = new DraftNarrativeProcessor(redis, prisma, llmService);

    const job = makeMockJob({
      sectionId: 'section-1',
      soaAnalysisId: 'soa-1',
      projectId: 'project-1',
    });

    await processor.process(job);

    expect(llmService.complete).toHaveBeenCalledWith(
      'drafting',
      expect.stringContaining('Clinical Evidence'),
      expect.objectContaining({
        responseFormat: 'json',
        temperature: 0.7,
      }),
      'project-1',
    );
    expect(prisma.thematicSection.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'section-1' },
        data: expect.objectContaining({
          narrativeAiDraft: expect.objectContaining({
            type: 'doc',
            content: expect.any(Array),
          }),
        }),
      }),
    );
  });

  it('throws error if section not found', async () => {
    const redis = makeMockRedis();
    const prisma = makeMockPrisma();
    prisma.thematicSection.findUnique.mockResolvedValueOnce(null);
    const llmService = makeMockLlmService();
    const processor = new DraftNarrativeProcessor(redis, prisma, llmService);

    const job = makeMockJob({
      sectionId: 'section-1',
      soaAnalysisId: 'soa-1',
    });

    await expect(processor.process(job)).rejects.toThrow('Section not found');
    expect(llmService.complete).not.toHaveBeenCalled();
  });

  it('throws error if SOA analysis not found', async () => {
    const redis = makeMockRedis();
    const prisma = makeMockPrisma();
    prisma.soaAnalysis.findUnique.mockResolvedValueOnce(null);
    const llmService = makeMockLlmService();
    const processor = new DraftNarrativeProcessor(redis, prisma, llmService);

    const job = makeMockJob({
      sectionId: 'section-1',
      soaAnalysisId: 'soa-1',
    });

    await expect(processor.process(job)).rejects.toThrow('SOA analysis not found');
    expect(llmService.complete).not.toHaveBeenCalled();
  });

  it('converts LLM response to TipTap format', async () => {
    const redis = makeMockRedis();
    const prisma = makeMockPrisma();
    const llmService = makeMockLlmService();
    const processor = new DraftNarrativeProcessor(redis, prisma, llmService);

    const job = makeMockJob({
      sectionId: 'section-1',
      soaAnalysisId: 'soa-1',
    });

    await processor.process(job);

    const updateCall = prisma.thematicSection.update.mock.calls[0]?.[0];
    const draft = updateCall?.data?.narrativeAiDraft;

    expect(draft).toMatchObject({
      type: 'doc',
      content: expect.arrayContaining([
        expect.objectContaining({ type: 'heading', attrs: { level: 2 } }),
        expect.objectContaining({ type: 'heading', attrs: { level: 3 } }),
        expect.objectContaining({ type: 'paragraph' }),
        expect.objectContaining({ type: 'bulletList' }),
      ]),
    });
  });

  it('validates LLM response with Zod schema', async () => {
    const redis = makeMockRedis();
    const prisma = makeMockPrisma();
    const llmService = makeMockLlmService();

    // Invalid response - missing required fields
    llmService.complete.mockResolvedValueOnce({
      content: JSON.stringify({
        title: 'Test',
        // Missing sections and keyFindings
      }),
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      cost: 0.001,
      model: 'gpt-4',
      provider: 'openai',
      cached: false,
      latencyMs: 1500,
    });

    const processor = new DraftNarrativeProcessor(redis, prisma, llmService);

    const job = makeMockJob({
      sectionId: 'section-1',
      soaAnalysisId: 'soa-1',
    });

    await expect(processor.process(job)).rejects.toThrow('Failed to parse or validate narrative');
    expect(prisma.thematicSection.update).not.toHaveBeenCalled();
  });

  it('limits articles to prevent prompt overflow', async () => {
    const redis = makeMockRedis();
    const prisma = makeMockPrisma();
    const llmService = makeMockLlmService();
    const processor = new DraftNarrativeProcessor(redis, prisma, llmService);

    const job = makeMockJob({
      sectionId: 'section-1',
      soaAnalysisId: 'soa-1',
    });

    await processor.process(job);

    expect(prisma.article.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 50,
      }),
    );
  });

  it('includes article data in prompt', async () => {
    const redis = makeMockRedis();
    const prisma = makeMockPrisma();
    const llmService = makeMockLlmService();
    const processor = new DraftNarrativeProcessor(redis, prisma, llmService);

    const job = makeMockJob({
      sectionId: 'section-1',
      soaAnalysisId: 'soa-1',
    });

    await processor.process(job);

    const promptCall = llmService.complete.mock.calls[0];
    const userPrompt = promptCall?.[1];

    expect(userPrompt).toContain('Clinical Trial Results');
    expect(userPrompt).toContain('Smith et al.');
    expect(userPrompt).toContain('Study Type: RCT');
    expect(userPrompt).toContain('Quality: HIGH');
  });

  it('reports progress at each stage', async () => {
    const redis = makeMockRedis();
    const prisma = makeMockPrisma();
    const llmService = makeMockLlmService();
    const processor = new DraftNarrativeProcessor(redis, prisma, llmService);

    const job = makeMockJob({
      sectionId: 'section-1',
      soaAnalysisId: 'soa-1',
    });

    await processor.process(job);

    expect(redis.publish).toHaveBeenCalledWith(
      'task:progress:user-1',
      expect.stringContaining('Loading section data'),
    );
    expect(redis.publish).toHaveBeenCalledWith(
      'task:progress:user-1',
      expect.stringContaining('Loading analysis data'),
    );
    expect(redis.publish).toHaveBeenCalledWith(
      'task:progress:user-1',
      expect.stringContaining('Generating AI narrative draft'),
    );
    expect(redis.publish).toHaveBeenCalledWith(
      'task:progress:user-1',
      expect.stringContaining('Saving AI draft'),
    );
    expect(redis.publish).toHaveBeenCalledWith(
      'task:progress:user-1',
      expect.stringContaining('AI narrative draft generated successfully'),
    );
  });
});
