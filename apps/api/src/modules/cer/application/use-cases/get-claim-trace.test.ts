import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetClaimTraceUseCase } from './get-claim-trace.js';

const TRACE_ID = 'trace-1';
const SECTION_ID = 'sec-1';
const SOA_SOURCE_ID = 'soa-src-1';
const STUDY_ID = 'study-1';
const ARTICLE_ID = 'article-1';

function makePrisma(overrides?: {
  trace?: Record<string, unknown> | null;
  section?: Record<string, unknown> | null;
  soaSource?: Record<string, unknown> | null;
  study?: Record<string, unknown> | null;
  validationResults?: Array<Record<string, unknown>>;
  article?: Record<string, unknown> | null;
  auditEntries?: Array<Record<string, unknown>>;
}) {
  return {
    claimTrace: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.trace !== undefined
          ? overrides.trace
          : {
              id: TRACE_ID,
              refNumber: '1',
              claimText: 'Device demonstrates 95% sensitivity',
              cerSectionId: SECTION_ID,
              soaSourceId: SOA_SOURCE_ID,
              validationStudyId: STUDY_ID,
              slsArticleId: ARTICLE_ID,
            },
      ),
    },
    cerSection: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.section !== undefined
          ? overrides.section
          : {
              id: SECTION_ID,
              sectionNumber: '3.1',
              title: 'Clinical Performance',
            },
      ),
    },
    soaSource: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.soaSource !== undefined
          ? overrides.soaSource
          : {
              id: SOA_SOURCE_ID,
              section: 'Results',
              extractedData: 'Sensitivity 94.5%',
              benchmark: '90%',
            },
      ),
    },
    validationStudy: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.study !== undefined
          ? overrides.study
          : {
              id: STUDY_ID,
              name: 'Standalone Study',
              type: 'STANDALONE',
            },
      ),
    },
    validationResult: {
      findMany: vi
        .fn()
        .mockResolvedValue(
          overrides?.validationResults ?? [
            { metricType: 'SENSITIVITY', value: 0.95, comparison: 'ABOVE_THRESHOLD' },
          ],
        ),
    },
    article: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.article !== undefined
          ? overrides.article
          : {
              id: ARTICLE_ID,
              title: 'Clinical study of device performance',
              doi: '10.1234/test',
              query: 'device sensitivity specificity',
              database: 'PubMed',
            },
      ),
    },
    auditLog: {
      findMany: vi
        .fn()
        .mockResolvedValue(
          overrides?.auditEntries ?? [
            { action: 'claimTrace.created', userId: 'user-1', createdAt: '2026-01-01T00:00:00Z' },
          ],
        ),
    },
  } as any;
}

describe('GetClaimTraceUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns complete 4-level trace chain', async () => {
    const prisma = makePrisma();
    const useCase = new GetClaimTraceUseCase(prisma);

    const result = await useCase.execute({ claimTraceId: TRACE_ID });

    expect(result.claimTraceId).toBe(TRACE_ID);
    expect(result.refNumber).toBe('1');
    expect(result.level1.text).toBe('Device demonstrates 95% sensitivity');
    expect(result.level1.sectionNumber).toBe('3.1');
    expect(result.level2).not.toBeNull();
    expect(result.level2!.extractedData).toBe('Sensitivity 94.5%');
    expect(result.level3).not.toBeNull();
    expect(result.level3!.endpoint).toBe('SENSITIVITY');
    expect(result.level4).not.toBeNull();
    expect(result.level4!.title).toBe('Clinical study of device performance');
  });

  it('throws NotFoundError when trace not found', async () => {
    const prisma = makePrisma({ trace: null });
    const useCase = new GetClaimTraceUseCase(prisma);

    await expect(useCase.execute({ claimTraceId: 'missing' })).rejects.toThrow('not found');
  });

  it('throws NotFoundError when section not found', async () => {
    const prisma = makePrisma({ section: null });
    const useCase = new GetClaimTraceUseCase(prisma);

    await expect(useCase.execute({ claimTraceId: TRACE_ID })).rejects.toThrow('not found');
  });

  it('returns null level2 when no soaSourceId', async () => {
    const prisma = makePrisma({
      trace: {
        id: TRACE_ID,
        refNumber: '1',
        claimText: 'Claim text',
        cerSectionId: SECTION_ID,
        soaSourceId: null,
        validationStudyId: null,
        slsArticleId: null,
      },
    });
    const useCase = new GetClaimTraceUseCase(prisma);

    const result = await useCase.execute({ claimTraceId: TRACE_ID });

    expect(result.level2).toBeNull();
    expect(result.level3).toBeNull();
    expect(result.level4).toBeNull();
  });

  it('returns null level3 when no validationStudyId', async () => {
    const prisma = makePrisma({
      trace: {
        id: TRACE_ID,
        refNumber: '1',
        claimText: 'Claim text',
        cerSectionId: SECTION_ID,
        soaSourceId: SOA_SOURCE_ID,
        validationStudyId: null,
        slsArticleId: ARTICLE_ID,
      },
    });
    const useCase = new GetClaimTraceUseCase(prisma);

    const result = await useCase.execute({ claimTraceId: TRACE_ID });

    expect(result.level2).not.toBeNull();
    expect(result.level3).toBeNull();
    expect(result.level4).not.toBeNull();
  });

  it('returns null level4 when no slsArticleId', async () => {
    const prisma = makePrisma({
      trace: {
        id: TRACE_ID,
        refNumber: '1',
        claimText: 'Claim text',
        cerSectionId: SECTION_ID,
        soaSourceId: SOA_SOURCE_ID,
        validationStudyId: STUDY_ID,
        slsArticleId: null,
      },
    });
    const useCase = new GetClaimTraceUseCase(prisma);

    const result = await useCase.execute({ claimTraceId: TRACE_ID });

    expect(result.level4).toBeNull();
  });

  it('includes audit trail entries', async () => {
    const prisma = makePrisma({
      auditEntries: [
        { action: 'claimTrace.created', userId: 'user-1', createdAt: '2026-01-01T00:00:00Z' },
        { action: 'claimTrace.updated', userId: 'user-2', createdAt: '2026-01-02T00:00:00Z' },
      ],
    });
    const useCase = new GetClaimTraceUseCase(prisma);

    const result = await useCase.execute({ claimTraceId: TRACE_ID });

    expect(result.auditTrail).toHaveLength(2);
    expect(result.auditTrail[0].action).toBe('claimTrace.created');
    expect(result.auditTrail[1].action).toBe('claimTrace.updated');
  });

  it('returns empty audit trail when no entries', async () => {
    const prisma = makePrisma({ auditEntries: [] });
    const useCase = new GetClaimTraceUseCase(prisma);

    const result = await useCase.execute({ claimTraceId: TRACE_ID });

    expect(result.auditTrail).toEqual([]);
  });

  it('handles level2 with missing optional fields', async () => {
    const prisma = makePrisma({
      soaSource: {
        id: SOA_SOURCE_ID,
        section: null,
        extractedData: null,
        benchmark: null,
      },
    });
    const useCase = new GetClaimTraceUseCase(prisma);

    const result = await useCase.execute({ claimTraceId: TRACE_ID });

    expect(result.level2).not.toBeNull();
    expect(result.level2!.section).toBe('');
    expect(result.level2!.benchmark).toBeNull();
  });

  it('handles validation study with no results', async () => {
    const prisma = makePrisma({ validationResults: [] });
    const useCase = new GetClaimTraceUseCase(prisma);

    const result = await useCase.execute({ claimTraceId: TRACE_ID });

    expect(result.level3).not.toBeNull();
    expect(result.level3!.endpoint).toBe('STANDALONE');
    expect(result.level3!.result).toBe('N/A');
  });

  it('queries audit log with correct target info', async () => {
    const prisma = makePrisma();
    const useCase = new GetClaimTraceUseCase(prisma);

    await useCase.execute({ claimTraceId: TRACE_ID });

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          targetType: 'claimTrace',
          targetId: TRACE_ID,
        },
      }),
    );
  });

  it('handles soaSource not found in DB gracefully', async () => {
    const prisma = makePrisma({ soaSource: null });
    const useCase = new GetClaimTraceUseCase(prisma);

    const result = await useCase.execute({ claimTraceId: TRACE_ID });

    expect(result.level2).toBeNull();
  });
});
