import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExportProofPackageUseCase } from './export-proof-package.js';

const TRACE_ID = 'trace-1';
const SECTION_ID = 'sec-1';

function makePrisma(overrides?: {
  trace?: Record<string, unknown> | null;
  section?: Record<string, unknown> | null;
  soaSource?: Record<string, unknown> | null;
  study?: Record<string, unknown> | null;
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
              claimText: 'Device sensitivity meets threshold',
              cerSectionId: SECTION_ID,
              soaSourceId: 'soa-1',
              validationStudyId: 'study-1',
              slsArticleId: 'article-1',
            },
      ),
    },
    cerSection: {
      findUnique: vi
        .fn()
        .mockResolvedValue(
          overrides?.section !== undefined
            ? overrides.section
            : { id: SECTION_ID, sectionNumber: '3.1', title: 'Clinical Performance' },
        ),
    },
    soaSource: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.soaSource !== undefined
          ? overrides.soaSource
          : {
              id: 'soa-1',
              section: 'Results',
              extractedData: 'Sensitivity 95%',
              benchmark: '90%',
            },
      ),
    },
    validationStudy: {
      findUnique: vi
        .fn()
        .mockResolvedValue(
          overrides?.study !== undefined
            ? overrides.study
            : { id: 'study-1', name: 'Study A', type: 'STANDALONE', status: 'LOCKED' },
        ),
    },
    article: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.article !== undefined
          ? overrides.article
          : {
              id: 'article-1',
              title: 'Study Title',
              doi: '10.1234/x',
              authors: 'Smith J',
              journal: 'JAMA',
              year: 2025,
            },
      ),
    },
    auditLog: {
      findMany: vi.fn().mockResolvedValue(
        overrides?.auditEntries ?? [
          {
            action: 'created',
            userId: 'user-1',
            createdAt: '2026-01-01T00:00:00Z',
            before: null,
            after: { status: 'CREATED' },
          },
        ],
      ),
    },
  } as any;
}

describe('ExportProofPackageUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates complete proof package with all 4 levels', async () => {
    const prisma = makePrisma();
    const useCase = new ExportProofPackageUseCase(prisma);

    const result = await useCase.execute({ claimTraceId: TRACE_ID });

    expect(result.claimTraceId).toBe(TRACE_ID);
    expect(result.claimText).toBe('Device sensitivity meets threshold');
    expect(result.traceChain).toHaveLength(4);
    expect(result.traceChain[0].level).toBe(1);
    expect(result.traceChain[1].level).toBe(2);
    expect(result.traceChain[2].level).toBe(3);
    expect(result.traceChain[3].level).toBe(4);
  });

  it('throws NotFoundError when claim trace not found', async () => {
    const prisma = makePrisma({ trace: null });
    const useCase = new ExportProofPackageUseCase(prisma);

    await expect(useCase.execute({ claimTraceId: 'missing' })).rejects.toThrow('not found');
  });

  it('throws NotFoundError when section not found', async () => {
    const prisma = makePrisma({ section: null });
    const useCase = new ExportProofPackageUseCase(prisma);

    await expect(useCase.execute({ claimTraceId: TRACE_ID })).rejects.toThrow('not found');
  });

  it('includes audit trail in proof package', async () => {
    const prisma = makePrisma();
    const useCase = new ExportProofPackageUseCase(prisma);

    const result = await useCase.execute({ claimTraceId: TRACE_ID });

    expect(result.auditTrail).toHaveLength(1);
    expect(result.auditTrail[0].action).toBe('created');
  });

  it('generates proof package with only level 1 when no upstream links', async () => {
    const prisma = makePrisma({
      trace: {
        id: TRACE_ID,
        refNumber: '1',
        claimText: 'Simple claim',
        cerSectionId: SECTION_ID,
        soaSourceId: null,
        validationStudyId: null,
        slsArticleId: null,
      },
    });
    const useCase = new ExportProofPackageUseCase(prisma);

    const result = await useCase.execute({ claimTraceId: TRACE_ID });

    expect(result.traceChain).toHaveLength(1);
    expect(result.traceChain[0].label).toBe('CER Claim');
  });

  it('includes generatedAt timestamp', async () => {
    const prisma = makePrisma();
    const useCase = new ExportProofPackageUseCase(prisma);

    const result = await useCase.execute({ claimTraceId: TRACE_ID });

    expect(result.generatedAt).toBeDefined();
    expect(new Date(result.generatedAt).getTime()).not.toBeNaN();
  });
});
