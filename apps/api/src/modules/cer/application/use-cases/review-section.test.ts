import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ReviewSectionUseCase,
  extractInlineReferences,
  computeEditPercentage,
  countWords,
} from './review-section.js';

const SECTION_ID = 'sec-1';
const VERSION_ID = 'ver-1';
const USER_ID = 'user-1';

function makeEventBus() {
  return {
    publish: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

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
              status: 'DRAFT',
              aiDraftContent: { text: 'AI generated content for device safety' },
              humanEditedContent: null,
              cerVersionId: VERSION_ID,
            },
      ),
      update: vi.fn().mockResolvedValue({ id: SECTION_ID }),
    },
    claimTrace: {
      findMany: vi.fn().mockResolvedValue(overrides?.claimTraces ?? []),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  } as any;
}

describe('ReviewSectionUseCase', () => {
  let eventBus: ReturnType<typeof makeEventBus>;

  beforeEach(() => {
    vi.clearAllMocks();
    eventBus = makeEventBus();
  });

  it('transitions section from DRAFT to REVIEWED', async () => {
    const prisma = makePrisma();
    const useCase = new ReviewSectionUseCase(prisma, eventBus);

    const result = await useCase.execute({
      cerSectionId: SECTION_ID,
      content: { text: 'Reviewed content' },
      targetStatus: 'REVIEWED',
      userId: USER_ID,
    });

    expect(result.cerSectionId).toBe(SECTION_ID);
    expect(result.status).toBe('REVIEWED');
    expect(prisma.cerSection.update).toHaveBeenCalled();
  });

  it('transitions section from REVIEWED to FINALIZED when all refs verified', async () => {
    const prisma = makePrisma({
      section: {
        id: SECTION_ID,
        status: 'REVIEWED',
        aiDraftContent: { text: 'AI draft' },
        humanEditedContent: null,
        cerVersionId: VERSION_ID,
      },
      claimTraces: [{ refNumber: '1' }],
    });
    const useCase = new ReviewSectionUseCase(prisma, eventBus);

    const result = await useCase.execute({
      cerSectionId: SECTION_ID,
      content: { text: 'Content with [1]' },
      targetStatus: 'FINALIZED',
      userId: USER_ID,
    });

    expect(result.status).toBe('FINALIZED');
  });

  it('throws when section not found', async () => {
    const prisma = makePrisma({ section: null });
    const useCase = new ReviewSectionUseCase(prisma, eventBus);

    await expect(
      useCase.execute({
        cerSectionId: 'missing',
        content: {},
        targetStatus: 'REVIEWED',
        userId: USER_ID,
      }),
    ).rejects.toThrow('not found');
  });

  it('throws for invalid status transition DRAFT -> FINALIZED', async () => {
    const prisma = makePrisma();
    const useCase = new ReviewSectionUseCase(prisma, eventBus);

    await expect(
      useCase.execute({
        cerSectionId: SECTION_ID,
        content: {},
        targetStatus: 'FINALIZED',
        userId: USER_ID,
      }),
    ).rejects.toThrow('Cannot transition');
  });

  it('throws for invalid status transition FINALIZED -> REVIEWED', async () => {
    const prisma = makePrisma({
      section: {
        id: SECTION_ID,
        status: 'FINALIZED',
        aiDraftContent: null,
        humanEditedContent: null,
        cerVersionId: VERSION_ID,
      },
    });
    const useCase = new ReviewSectionUseCase(prisma, eventBus);

    await expect(
      useCase.execute({
        cerSectionId: SECTION_ID,
        content: {},
        targetStatus: 'REVIEWED',
        userId: USER_ID,
      }),
    ).rejects.toThrow('Cannot transition');
  });

  it('throws when finalizing with unverified references', async () => {
    const prisma = makePrisma({
      section: {
        id: SECTION_ID,
        status: 'REVIEWED',
        aiDraftContent: null,
        humanEditedContent: null,
        cerVersionId: VERSION_ID,
      },
      claimTraces: [],
    });
    const useCase = new ReviewSectionUseCase(prisma, eventBus);

    await expect(
      useCase.execute({
        cerSectionId: SECTION_ID,
        content: { text: 'Claim [1] and [2]' },
        targetStatus: 'FINALIZED',
        userId: USER_ID,
      }),
    ).rejects.toThrow('unverified reference');
  });

  it('computes humanEditPercentage when AI draft exists', async () => {
    const prisma = makePrisma({
      section: {
        id: SECTION_ID,
        status: 'DRAFT',
        aiDraftContent: 'word1 word2 word3',
        humanEditedContent: null,
        cerVersionId: VERSION_ID,
      },
    });
    const useCase = new ReviewSectionUseCase(prisma, eventBus);

    const result = await useCase.execute({
      cerSectionId: SECTION_ID,
      content: 'word1 word2 word3' as unknown as Record<string, unknown>,
      targetStatus: 'REVIEWED',
      userId: USER_ID,
    });

    expect(result.humanEditPercentage).toBe(0);
  });

  it('emits cer.section.status-changed event', async () => {
    const prisma = makePrisma();
    const useCase = new ReviewSectionUseCase(prisma, eventBus);

    await useCase.execute({
      cerSectionId: SECTION_ID,
      content: { text: 'Reviewed' },
      targetStatus: 'REVIEWED',
      userId: USER_ID,
    });

    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'cer.section.status-changed',
        aggregateId: SECTION_ID,
        aggregateType: 'CerSection',
        data: expect.objectContaining({
          cerSectionId: SECTION_ID,
          fromStatus: 'DRAFT',
          toStatus: 'REVIEWED',
        }),
      }),
    );
  });

  it('creates audit log entry', async () => {
    const prisma = makePrisma();
    const useCase = new ReviewSectionUseCase(prisma, eventBus);

    await useCase.execute({
      cerSectionId: SECTION_ID,
      content: { text: 'Reviewed' },
      targetStatus: 'REVIEWED',
      userId: USER_ID,
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: USER_ID,
          action: 'cer.section.status-changed',
          targetType: 'cerSection',
          targetId: SECTION_ID,
        }),
      }),
    );
  });

  it('allows REVIEWED -> DRAFT transition', async () => {
    const prisma = makePrisma({
      section: {
        id: SECTION_ID,
        status: 'REVIEWED',
        aiDraftContent: null,
        humanEditedContent: null,
        cerVersionId: VERSION_ID,
      },
    });
    const useCase = new ReviewSectionUseCase(prisma, eventBus);

    const result = await useCase.execute({
      cerSectionId: SECTION_ID,
      content: { text: 'Back to draft' },
      targetStatus: 'DRAFT',
      userId: USER_ID,
    });

    expect(result.status).toBe('DRAFT');
  });
});

describe('extractInlineReferences', () => {
  it('extracts numeric references', () => {
    expect(extractInlineReferences('See [1] and [2]')).toEqual(['1', '2']);
  });

  it('extracts R-prefixed references', () => {
    expect(extractInlineReferences('Ref [R1] and [R2]')).toEqual(['R1', 'R2']);
  });

  it('deduplicates references', () => {
    expect(extractInlineReferences('[1] and again [1]')).toEqual(['1']);
  });

  it('returns empty for no references', () => {
    expect(extractInlineReferences('No references here')).toEqual([]);
  });
});

describe('computeEditPercentage', () => {
  it('returns 0 for identical content', () => {
    expect(computeEditPercentage('same text', 'same text')).toBe(0);
  });

  it('returns 100 for empty AI draft', () => {
    expect(computeEditPercentage('', 'human content')).toBe(100);
  });

  it('returns non-zero for different content', () => {
    const pct = computeEditPercentage('word1 word2', 'word1 changed');
    expect(pct).toBeGreaterThan(0);
  });
});

describe('countWords', () => {
  it('counts words correctly', () => {
    expect(countWords('hello world foo')).toBe(3);
  });

  it('returns 0 for empty string', () => {
    expect(countWords('')).toBe(0);
  });
});
