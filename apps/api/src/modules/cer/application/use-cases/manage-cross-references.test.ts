import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ManageCrossReferencesUseCase } from './manage-cross-references.js';

const VERSION_ID = 'ver-1';

function makePrisma(overrides?: {
  cerVersion?: Record<string, unknown> | null;
  sections?: Array<Record<string, unknown>>;
  bibEntries?: Array<Record<string, unknown>>;
  crossRefs?: Array<Record<string, unknown>>;
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
          { id: 'sec-1', humanEditedContent: { text: 'See [1] and [R1]' }, aiDraftContent: null },
          { id: 'sec-2', humanEditedContent: { text: 'Ref [2] and [R2]' }, aiDraftContent: null },
        ],
      ),
    },
    bibliographyEntry: {
      findMany: vi.fn().mockResolvedValue(
        overrides?.bibEntries ?? [
          { orderIndex: 1 },
          { orderIndex: 2 },
          { orderIndex: 3 }, // unused
        ],
      ),
    },
    crossReference: {
      findMany: vi.fn().mockResolvedValue(
        overrides?.crossRefs ?? [
          { refNumber: 'R1' },
        ],
      ),
    },
  } as any;
}

describe('ManageCrossReferencesUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('differentiates bibliography and external doc references', async () => {
    const prisma = makePrisma();
    const useCase = new ManageCrossReferencesUseCase(prisma);

    const result = await useCase.execute({ cerVersionId: VERSION_ID });

    expect(result.bibliographyRefs.length).toBe(2); // [1] and [2]
    expect(result.externalDocRefs.length).toBe(2); // [R1] and [R2]
    expect(result.bibliographyRefs[0].type).toBe('BIBLIOGRAPHY');
    expect(result.externalDocRefs[0].type).toBe('EXTERNAL_DOC');
  });

  it('detects orphaned references (no target)', async () => {
    const prisma = makePrisma();
    const useCase = new ManageCrossReferencesUseCase(prisma);

    const result = await useCase.execute({ cerVersionId: VERSION_ID });

    // R2 has no cross-reference target
    const orphanedExt = result.orphanedReferences.filter((r) => r.refNumber === 'R2');
    expect(orphanedExt.length).toBe(1);
  });

  it('detects unused bibliography entries', async () => {
    const prisma = makePrisma();
    const useCase = new ManageCrossReferencesUseCase(prisma);

    const result = await useCase.execute({ cerVersionId: VERSION_ID });

    // Entry 3 exists in bibliography but is not referenced in text
    expect(result.unusedBibliographyEntries).toContain('3');
  });

  it('marks bibliography refs with matching entries as having targets', async () => {
    const prisma = makePrisma();
    const useCase = new ManageCrossReferencesUseCase(prisma);

    const result = await useCase.execute({ cerVersionId: VERSION_ID });

    const ref1 = result.bibliographyRefs.find((r) => r.refNumber === '1');
    expect(ref1?.hasTarget).toBe(true);
  });

  it('marks external doc refs with matching cross-references as having targets', async () => {
    const prisma = makePrisma();
    const useCase = new ManageCrossReferencesUseCase(prisma);

    const result = await useCase.execute({ cerVersionId: VERSION_ID });

    const refR1 = result.externalDocRefs.find((r) => r.refNumber === 'R1');
    expect(refR1?.hasTarget).toBe(true);
  });

  it('throws NotFoundError when CER version not found', async () => {
    const prisma = makePrisma({ cerVersion: null });
    const useCase = new ManageCrossReferencesUseCase(prisma);

    await expect(
      useCase.execute({ cerVersionId: 'missing' }),
    ).rejects.toThrow('not found');
  });

  it('handles sections with no references', async () => {
    const prisma = makePrisma({
      sections: [
        { id: 'sec-1', humanEditedContent: { text: 'No references here' }, aiDraftContent: null },
      ],
      bibEntries: [],
      crossRefs: [],
    });
    const useCase = new ManageCrossReferencesUseCase(prisma);

    const result = await useCase.execute({ cerVersionId: VERSION_ID });

    expect(result.totalReferences).toBe(0);
    expect(result.orphanedReferences).toEqual([]);
    expect(result.unusedBibliographyEntries).toEqual([]);
  });

  it('returns correct total references count', async () => {
    const prisma = makePrisma();
    const useCase = new ManageCrossReferencesUseCase(prisma);

    const result = await useCase.execute({ cerVersionId: VERSION_ID });

    expect(result.totalReferences).toBe(4); // 2 bib + 2 ext
  });
});
