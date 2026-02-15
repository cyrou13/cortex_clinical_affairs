import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EnforceTraceabilityUseCase } from './enforce-traceability.js';

const VERSION_ID = 'ver-1';

function makePrisma(overrides?: {
  cerVersion?: Record<string, unknown> | null;
  sections?: Array<Record<string, unknown>>;
  claimTraces?: Array<Record<string, unknown>>;
}) {
  return {
    cerVersion: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.cerVersion !== undefined
          ? overrides.cerVersion
          : { id: VERSION_ID },
      ),
    },
    cerSection: {
      findMany: vi.fn().mockResolvedValue(
        overrides?.sections ?? [
          {
            id: 'sec-1',
            title: 'Performance',
            humanEditedContent: { text: 'See [1] and [2]' },
            aiDraftContent: null,
          },
          {
            id: 'sec-2',
            title: 'Safety',
            humanEditedContent: { text: 'Reference [3]' },
            aiDraftContent: null,
          },
        ],
      ),
    },
    claimTrace: {
      findMany: vi.fn().mockResolvedValue(
        overrides?.claimTraces ?? [
          { refNumber: '1', cerSectionId: 'sec-1' },
          { refNumber: '2', cerSectionId: 'sec-1' },
          { refNumber: '3', cerSectionId: 'sec-2' },
        ],
      ),
    },
  } as any;
}

describe('EnforceTraceabilityUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 100% coverage when all claims are traced', async () => {
    const prisma = makePrisma();
    const useCase = new EnforceTraceabilityUseCase(prisma);

    const result = await useCase.execute({ cerVersionId: VERSION_ID });

    expect(result.coveragePercentage).toBe(100);
    expect(result.canFinalize).toBe(true);
    expect(result.untracedClaims).toEqual([]);
  });

  it('returns partial coverage when some claims are untraced', async () => {
    const prisma = makePrisma({
      claimTraces: [
        { refNumber: '1', cerSectionId: 'sec-1' },
        // Missing ref 2 for sec-1, missing ref 3 for sec-2
      ],
    });
    const useCase = new EnforceTraceabilityUseCase(prisma);

    const result = await useCase.execute({ cerVersionId: VERSION_ID });

    expect(result.coveragePercentage).toBe(33); // 1 of 3
    expect(result.canFinalize).toBe(false);
    expect(result.untracedClaims).toHaveLength(2);
  });

  it('returns untraced claims with section locations', async () => {
    const prisma = makePrisma({
      claimTraces: [{ refNumber: '1', cerSectionId: 'sec-1' }],
    });
    const useCase = new EnforceTraceabilityUseCase(prisma);

    const result = await useCase.execute({ cerVersionId: VERSION_ID });

    const untraced = result.untracedClaims;
    expect(untraced).toContainEqual(
      expect.objectContaining({
        refNumber: '2',
        cerSectionId: 'sec-1',
        sectionTitle: 'Performance',
      }),
    );
    expect(untraced).toContainEqual(
      expect.objectContaining({
        refNumber: '3',
        cerSectionId: 'sec-2',
        sectionTitle: 'Safety',
      }),
    );
  });

  it('throws NotFoundError when CER version not found', async () => {
    const prisma = makePrisma({ cerVersion: null });
    const useCase = new EnforceTraceabilityUseCase(prisma);

    await expect(
      useCase.execute({ cerVersionId: 'missing' }),
    ).rejects.toThrow('not found');
  });

  it('returns 100% coverage when no references in any section', async () => {
    const prisma = makePrisma({
      sections: [
        { id: 'sec-1', title: 'Intro', humanEditedContent: { text: 'No refs' }, aiDraftContent: null },
      ],
      claimTraces: [],
    });
    const useCase = new EnforceTraceabilityUseCase(prisma);

    const result = await useCase.execute({ cerVersionId: VERSION_ID });

    expect(result.coveragePercentage).toBe(100);
    expect(result.totalClaims).toBe(0);
    expect(result.canFinalize).toBe(true);
  });

  it('enforceOrThrow throws TraceabilityViolationError when coverage < 100%', async () => {
    const prisma = makePrisma({
      claimTraces: [{ refNumber: '1', cerSectionId: 'sec-1' }],
    });
    const useCase = new EnforceTraceabilityUseCase(prisma);

    await expect(
      useCase.enforceOrThrow({ cerVersionId: VERSION_ID }),
    ).rejects.toThrow('Traceability coverage');
  });

  it('enforceOrThrow succeeds when coverage is 100%', async () => {
    const prisma = makePrisma();
    const useCase = new EnforceTraceabilityUseCase(prisma);

    const result = await useCase.enforceOrThrow({ cerVersionId: VERSION_ID });

    expect(result.canFinalize).toBe(true);
  });

  it('handles sections with no content', async () => {
    const prisma = makePrisma({
      sections: [
        { id: 'sec-1', title: 'Empty', humanEditedContent: null, aiDraftContent: null },
      ],
      claimTraces: [],
    });
    const useCase = new EnforceTraceabilityUseCase(prisma);

    const result = await useCase.execute({ cerVersionId: VERSION_ID });

    expect(result.totalClaims).toBe(0);
    expect(result.coveragePercentage).toBe(100);
  });
});
