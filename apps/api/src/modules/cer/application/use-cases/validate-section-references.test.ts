import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ValidateSectionReferencesUseCase } from './validate-section-references.js';

const SECTION_ID = 'sec-1';

function makePrisma(overrides?: {
  section?: Record<string, unknown> | null;
  claimTraces?: Array<Record<string, unknown>>;
}) {
  return {
    cerSection: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.section !== undefined
          ? overrides.section
          : {
              id: SECTION_ID,
              humanEditedContent: { text: 'See [1] and [2] for details' },
              aiDraftContent: null,
            },
      ),
    },
    claimTrace: {
      findMany: vi.fn().mockResolvedValue(
        overrides?.claimTraces ?? [{ refNumber: '1' }],
      ),
    },
  } as any;
}

describe('ValidateSectionReferencesUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('identifies verified references', async () => {
    const prisma = makePrisma({
      claimTraces: [{ refNumber: '1' }, { refNumber: '2' }],
    });
    const useCase = new ValidateSectionReferencesUseCase(prisma);

    const result = await useCase.execute({ cerSectionId: SECTION_ID });

    expect(result.verifiedCount).toBe(2);
    expect(result.unverifiedReferences).toEqual([]);
  });

  it('identifies unverified references', async () => {
    const prisma = makePrisma({
      claimTraces: [{ refNumber: '1' }],
    });
    const useCase = new ValidateSectionReferencesUseCase(prisma);

    const result = await useCase.execute({ cerSectionId: SECTION_ID });

    expect(result.unverifiedReferences).toEqual(['2']);
    expect(result.verifiedCount).toBe(1);
  });

  it('identifies orphaned traces', async () => {
    const prisma = makePrisma({
      claimTraces: [{ refNumber: '1' }, { refNumber: '3' }],
    });
    const useCase = new ValidateSectionReferencesUseCase(prisma);

    const result = await useCase.execute({ cerSectionId: SECTION_ID });

    expect(result.orphanedTraces).toEqual(['3']);
  });

  it('computes traceability coverage correctly', async () => {
    const prisma = makePrisma({
      claimTraces: [{ refNumber: '1' }],
    });
    const useCase = new ValidateSectionReferencesUseCase(prisma);

    const result = await useCase.execute({ cerSectionId: SECTION_ID });

    expect(result.traceabilityCoverage).toBe(50); // 1 of 2
  });

  it('returns 100% coverage when no references in content', async () => {
    const prisma = makePrisma({
      section: {
        id: SECTION_ID,
        humanEditedContent: { text: 'No references here' },
        aiDraftContent: null,
      },
      claimTraces: [],
    });
    const useCase = new ValidateSectionReferencesUseCase(prisma);

    const result = await useCase.execute({ cerSectionId: SECTION_ID });

    expect(result.traceabilityCoverage).toBe(100);
    expect(result.totalReferences).toBe(0);
  });

  it('throws NotFoundError when section not found', async () => {
    const prisma = makePrisma({ section: null });
    const useCase = new ValidateSectionReferencesUseCase(prisma);

    await expect(
      useCase.execute({ cerSectionId: 'missing' }),
    ).rejects.toThrow('not found');
  });

  it('falls back to aiDraftContent when humanEditedContent is null', async () => {
    const prisma = makePrisma({
      section: {
        id: SECTION_ID,
        humanEditedContent: null,
        aiDraftContent: { text: 'AI content with [R1]' },
      },
      claimTraces: [{ refNumber: 'R1' }],
    });
    const useCase = new ValidateSectionReferencesUseCase(prisma);

    const result = await useCase.execute({ cerSectionId: SECTION_ID });

    expect(result.totalReferences).toBe(1);
    expect(result.verifiedCount).toBe(1);
  });

  it('handles R-prefixed references', async () => {
    const prisma = makePrisma({
      section: {
        id: SECTION_ID,
        humanEditedContent: { text: 'See [R1] and [R2]' },
        aiDraftContent: null,
      },
      claimTraces: [{ refNumber: 'R1' }],
    });
    const useCase = new ValidateSectionReferencesUseCase(prisma);

    const result = await useCase.execute({ cerSectionId: SECTION_ID });

    expect(result.totalReferences).toBe(2);
    expect(result.unverifiedReferences).toEqual(['R2']);
  });

  it('deduplicates inline references', async () => {
    const prisma = makePrisma({
      section: {
        id: SECTION_ID,
        humanEditedContent: { text: '[1] repeated [1] again' },
        aiDraftContent: null,
      },
      claimTraces: [{ refNumber: '1' }],
    });
    const useCase = new ValidateSectionReferencesUseCase(prisma);

    const result = await useCase.execute({ cerSectionId: SECTION_ID });

    expect(result.totalReferences).toBe(1);
    expect(result.verifiedCount).toBe(1);
  });

  it('returns correct totalReferences count', async () => {
    const prisma = makePrisma();
    const useCase = new ValidateSectionReferencesUseCase(prisma);

    const result = await useCase.execute({ cerSectionId: SECTION_ID });

    expect(result.totalReferences).toBe(2);
  });
});
