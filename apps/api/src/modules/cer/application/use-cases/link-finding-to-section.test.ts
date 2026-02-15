import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LinkFindingToSectionUseCase } from './link-finding-to-section.js';

function makePrisma(overrides?: {
  finding?: Record<string, unknown> | null;
  section?: Record<string, unknown> | null;
  existingLink?: Record<string, unknown> | null;
}) {
  return {
    vigilanceFinding: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.finding !== undefined ? overrides.finding : { id: 'finding-1' },
      ),
    },
    cerSection: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.section !== undefined
          ? overrides.section
          : {
              id: 'sec-1',
              cerVersion: { id: 'cer-1', status: 'DRAFT' },
            },
      ),
    },
    vigilanceFindingSectionLink: {
      findFirst: vi.fn().mockResolvedValue(overrides?.existingLink ?? null),
      create: vi.fn().mockResolvedValue({ id: 'link-1' }),
    },
  } as any;
}

describe('LinkFindingToSectionUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('links a finding to a section', async () => {
    const prisma = makePrisma();
    const useCase = new LinkFindingToSectionUseCase(prisma);

    const result = await useCase.execute({
      findingId: 'finding-1',
      cerSectionId: 'sec-1',
      userId: 'user-1',
    });

    expect(result.findingId).toBe('finding-1');
    expect(result.cerSectionId).toBe('sec-1');
    expect(result.linkId).toBeTruthy();
  });

  it('throws when finding not found', async () => {
    const prisma = makePrisma({ finding: null });
    const useCase = new LinkFindingToSectionUseCase(prisma);

    await expect(
      useCase.execute({ findingId: 'missing', cerSectionId: 'sec-1', userId: 'user-1' }),
    ).rejects.toThrow('not found');
  });

  it('throws when section not found', async () => {
    const prisma = makePrisma({ section: null });
    const useCase = new LinkFindingToSectionUseCase(prisma);

    await expect(
      useCase.execute({ findingId: 'finding-1', cerSectionId: 'missing', userId: 'user-1' }),
    ).rejects.toThrow('not found');
  });

  it('throws when already linked', async () => {
    const prisma = makePrisma({ existingLink: { id: 'existing' } });
    const useCase = new LinkFindingToSectionUseCase(prisma);

    await expect(
      useCase.execute({ findingId: 'finding-1', cerSectionId: 'sec-1', userId: 'user-1' }),
    ).rejects.toThrow('already linked');
  });
});
