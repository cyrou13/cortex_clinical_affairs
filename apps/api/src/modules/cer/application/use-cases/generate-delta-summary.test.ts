import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GenerateDeltaSummaryUseCase } from './generate-delta-summary.js';

const CURRENT_VERSION_ID = 'cer-v2';
const PREVIOUS_VERSION_ID = 'cer-v1';

function makePrisma(overrides?: {
  currentVersion?: Record<string, unknown> | null;
  previousVersion?: Record<string, unknown> | null;
  currentSections?: Record<string, unknown>[];
  previousSections?: Record<string, unknown>[];
}) {
  return {
    cerVersion: {
      findUnique: vi.fn().mockImplementation(({ where }: any) => {
        if (where.id === CURRENT_VERSION_ID) {
          return Promise.resolve(
            overrides?.currentVersion !== undefined
              ? overrides.currentVersion
              : { id: CURRENT_VERSION_ID, versionNumber: '2.0' },
          );
        }
        if (where.id === PREVIOUS_VERSION_ID) {
          return Promise.resolve(
            overrides?.previousVersion !== undefined
              ? overrides.previousVersion
              : { id: PREVIOUS_VERSION_ID, versionNumber: '1.0' },
          );
        }
        return Promise.resolve(null);
      }),
    },
    cerSection: {
      findMany: vi.fn().mockImplementation(({ where }: any) => {
        if (where.cerVersionId === CURRENT_VERSION_ID) {
          return Promise.resolve(overrides?.currentSections ?? []);
        }
        if (where.cerVersionId === PREVIOUS_VERSION_ID) {
          return Promise.resolve(overrides?.previousSections ?? []);
        }
        return Promise.resolve([]);
      }),
    },
  } as any;
}

describe('GenerateDeltaSummaryUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws NotFoundError when current version does not exist', async () => {
    const prisma = makePrisma({ currentVersion: null });
    const useCase = new GenerateDeltaSummaryUseCase(prisma);

    await expect(
      useCase.execute({
        currentVersionId: CURRENT_VERSION_ID,
        previousVersionId: PREVIOUS_VERSION_ID,
      }),
    ).rejects.toThrow('not found');
  });

  it('throws NotFoundError when previous version does not exist', async () => {
    const prisma = makePrisma({ previousVersion: null });
    const useCase = new GenerateDeltaSummaryUseCase(prisma);

    await expect(
      useCase.execute({
        currentVersionId: CURRENT_VERSION_ID,
        previousVersionId: PREVIOUS_VERSION_ID,
      }),
    ).rejects.toThrow('not found');
  });

  it('detects added sections', async () => {
    const prisma = makePrisma({
      currentSections: [
        { sectionType: 'SCOPE', title: 'Scope', content: 'New content', orderIndex: 0 },
      ],
      previousSections: [],
    });
    const useCase = new GenerateDeltaSummaryUseCase(prisma);

    const result = await useCase.execute({
      currentVersionId: CURRENT_VERSION_ID,
      previousVersionId: PREVIOUS_VERSION_ID,
    });

    expect(result.sectionsAdded).toBe(1);
    expect(result.diffs[0]!.status).toBe('ADDED');
  });

  it('detects removed sections', async () => {
    const prisma = makePrisma({
      currentSections: [],
      previousSections: [
        { sectionType: 'SCOPE', title: 'Scope', content: 'Old content', orderIndex: 0 },
      ],
    });
    const useCase = new GenerateDeltaSummaryUseCase(prisma);

    const result = await useCase.execute({
      currentVersionId: CURRENT_VERSION_ID,
      previousVersionId: PREVIOUS_VERSION_ID,
    });

    expect(result.sectionsRemoved).toBe(1);
    expect(result.diffs[0]!.status).toBe('REMOVED');
  });

  it('detects modified sections', async () => {
    const prisma = makePrisma({
      currentSections: [
        { sectionType: 'SCOPE', title: 'Scope', content: 'Modified content here', orderIndex: 0 },
      ],
      previousSections: [
        { sectionType: 'SCOPE', title: 'Scope', content: 'Original content', orderIndex: 0 },
      ],
    });
    const useCase = new GenerateDeltaSummaryUseCase(prisma);

    const result = await useCase.execute({
      currentVersionId: CURRENT_VERSION_ID,
      previousVersionId: PREVIOUS_VERSION_ID,
    });

    expect(result.sectionsModified).toBe(1);
    expect(result.diffs[0]!.status).toBe('MODIFIED');
  });

  it('detects unchanged sections', async () => {
    const prisma = makePrisma({
      currentSections: [
        { sectionType: 'SCOPE', title: 'Scope', content: 'Same content', orderIndex: 0 },
      ],
      previousSections: [
        { sectionType: 'SCOPE', title: 'Scope', content: 'Same content', orderIndex: 0 },
      ],
    });
    const useCase = new GenerateDeltaSummaryUseCase(prisma);

    const result = await useCase.execute({
      currentVersionId: CURRENT_VERSION_ID,
      previousVersionId: PREVIOUS_VERSION_ID,
    });

    expect(result.sectionsUnchanged).toBe(1);
    expect(result.diffs[0]!.status).toBe('UNCHANGED');
  });

  it('computes character diff for modified sections', async () => {
    const prisma = makePrisma({
      currentSections: [{ sectionType: 'SCOPE', title: 'Scope', content: 'AB', orderIndex: 0 }],
      previousSections: [{ sectionType: 'SCOPE', title: 'Scope', content: 'ABCDE', orderIndex: 0 }],
    });
    const useCase = new GenerateDeltaSummaryUseCase(prisma);

    const result = await useCase.execute({
      currentVersionId: CURRENT_VERSION_ID,
      previousVersionId: PREVIOUS_VERSION_ID,
    });

    expect(result.diffs[0]!.removedCharacters).toBe(3);
  });

  it('generates summary text', async () => {
    const prisma = makePrisma({
      currentSections: [
        { sectionType: 'SCOPE', title: 'Scope', content: 'New', orderIndex: 0 },
        { sectionType: 'METHODS', title: 'Methods', content: 'Same', orderIndex: 1 },
      ],
      previousSections: [
        { sectionType: 'METHODS', title: 'Methods', content: 'Same', orderIndex: 1 },
      ],
    });
    const useCase = new GenerateDeltaSummaryUseCase(prisma);

    const result = await useCase.execute({
      currentVersionId: CURRENT_VERSION_ID,
      previousVersionId: PREVIOUS_VERSION_ID,
    });

    expect(result.summaryText).toContain('1 section(s) added');
    expect(result.summaryText).toContain('1 section(s) unchanged');
    expect(result.summaryText).toContain('version 1.0 and 2.0');
  });

  it('handles both versions having empty sections', async () => {
    const prisma = makePrisma({
      currentSections: [],
      previousSections: [],
    });
    const useCase = new GenerateDeltaSummaryUseCase(prisma);

    const result = await useCase.execute({
      currentVersionId: CURRENT_VERSION_ID,
      previousVersionId: PREVIOUS_VERSION_ID,
    });

    expect(result.sectionsAdded).toBe(0);
    expect(result.sectionsRemoved).toBe(0);
    expect(result.sectionsModified).toBe(0);
    expect(result.sectionsUnchanged).toBe(0);
    expect(result.diffs).toHaveLength(0);
  });
});
