import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SaveSectionContentUseCase } from './save-section-content.js';

const SECTION_ID = 'sec-1';
const USER_ID = 'user-1';

function makePrisma(overrides?: {
  section?: Record<string, unknown> | null;
}) {
  return {
    cerSection: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.section !== undefined
          ? overrides.section
          : {
              id: SECTION_ID,
              humanEditedContent: { title: 'Existing' },
              aiDraftContent: { text: 'AI generated content' },
            },
      ),
      update: vi.fn().mockResolvedValue({ id: SECTION_ID }),
    },
  } as any;
}

describe('SaveSectionContentUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves content and returns word count', async () => {
    const prisma = makePrisma();
    const useCase = new SaveSectionContentUseCase(prisma);

    const result = await useCase.execute({
      cerSectionId: SECTION_ID,
      content: { body: 'hello world' },
      userId: USER_ID,
    });

    expect(result.cerSectionId).toBe(SECTION_ID);
    expect(result.wordCount).toBeGreaterThan(0);
    expect(result.savedAt).toBeDefined();
  });

  it('merges with existing content', async () => {
    const prisma = makePrisma();
    const useCase = new SaveSectionContentUseCase(prisma);

    await useCase.execute({
      cerSectionId: SECTION_ID,
      content: { body: 'new body' },
      userId: USER_ID,
    });

    const updateCall = prisma.cerSection.update.mock.calls[0][0];
    const savedContent = updateCall.data.humanEditedContent;
    expect(savedContent).toHaveProperty('title', 'Existing');
    expect(savedContent).toHaveProperty('body', 'new body');
  });

  it('throws NotFoundError when section does not exist', async () => {
    const prisma = makePrisma({ section: null });
    const useCase = new SaveSectionContentUseCase(prisma);

    await expect(
      useCase.execute({
        cerSectionId: 'missing',
        content: { text: 'hello' },
        userId: USER_ID,
      }),
    ).rejects.toThrow('not found');
  });

  it('is idempotent — same content yields same result', async () => {
    const prisma = makePrisma();
    const useCase = new SaveSectionContentUseCase(prisma);

    const result1 = await useCase.execute({
      cerSectionId: SECTION_ID,
      content: { body: 'same' },
      userId: USER_ID,
    });

    const result2 = await useCase.execute({
      cerSectionId: SECTION_ID,
      content: { body: 'same' },
      userId: USER_ID,
    });

    expect(result1.wordCount).toBe(result2.wordCount);
  });

  it('handles section with no existing content', async () => {
    const prisma = makePrisma({
      section: {
        id: SECTION_ID,
        humanEditedContent: null,
        aiDraftContent: null,
      },
    });
    const useCase = new SaveSectionContentUseCase(prisma);

    const result = await useCase.execute({
      cerSectionId: SECTION_ID,
      content: { text: 'new content' },
      userId: USER_ID,
    });

    expect(result.wordCount).toBeGreaterThan(0);
  });

  it('tracks humanEditPercentage in update call', async () => {
    const prisma = makePrisma();
    const useCase = new SaveSectionContentUseCase(prisma);

    await useCase.execute({
      cerSectionId: SECTION_ID,
      content: { text: 'completely different content here' },
      userId: USER_ID,
    });

    const updateCall = prisma.cerSection.update.mock.calls[0][0];
    expect(updateCall.data).toHaveProperty('humanEditPercentage');
    expect(typeof updateCall.data.humanEditPercentage).toBe('number');
  });
});
