import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResolveVersionMismatchUseCase } from './resolve-version-mismatch.js';

function makePrisma(overrides?: {
  section?: Record<string, unknown> | null;
}) {
  return {
    cerSection: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.section !== undefined
          ? overrides.section
          : {
              id: 'sec-1',
              versionMismatchWarning: true,
              cerVersion: { id: 'cer-1', status: 'DRAFT' },
            },
      ),
      update: vi.fn().mockResolvedValue({ id: 'sec-1' }),
    },
  } as any;
}

describe('ResolveVersionMismatchUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves mismatch with acknowledge action', async () => {
    const prisma = makePrisma();
    const useCase = new ResolveVersionMismatchUseCase(prisma);

    const result = await useCase.execute({
      sectionId: 'sec-1',
      action: 'acknowledge',
      userId: 'user-1',
    });

    expect(result.resolved).toBe(true);
    expect(result.action).toBe('acknowledge');
    expect(prisma.cerSection.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ versionMismatchWarning: false }),
      }),
    );
  });

  it('resolves mismatch with update-reference action', async () => {
    const prisma = makePrisma();
    const useCase = new ResolveVersionMismatchUseCase(prisma);

    const result = await useCase.execute({
      sectionId: 'sec-1',
      action: 'update-reference',
      userId: 'user-1',
    });

    expect(result.resolved).toBe(true);
    expect(result.action).toBe('update-reference');
  });

  it('throws for invalid action', async () => {
    const prisma = makePrisma();
    const useCase = new ResolveVersionMismatchUseCase(prisma);

    await expect(
      useCase.execute({
        sectionId: 'sec-1',
        action: 'invalid' as any,
        userId: 'user-1',
      }),
    ).rejects.toThrow('Invalid resolution action');
  });

  it('throws when section not found', async () => {
    const prisma = makePrisma({ section: null });
    const useCase = new ResolveVersionMismatchUseCase(prisma);

    await expect(
      useCase.execute({
        sectionId: 'missing',
        action: 'acknowledge',
        userId: 'user-1',
      }),
    ).rejects.toThrow('not found');
  });

  it('throws when CER version is locked', async () => {
    const prisma = makePrisma({
      section: {
        id: 'sec-1',
        versionMismatchWarning: true,
        cerVersion: { id: 'cer-1', status: 'LOCKED' },
      },
    });
    const useCase = new ResolveVersionMismatchUseCase(prisma);

    await expect(
      useCase.execute({
        sectionId: 'sec-1',
        action: 'acknowledge',
        userId: 'user-1',
      }),
    ).rejects.toThrow('locked');
  });

  it('throws when section has no mismatch warning', async () => {
    const prisma = makePrisma({
      section: {
        id: 'sec-1',
        versionMismatchWarning: false,
        cerVersion: { id: 'cer-1', status: 'DRAFT' },
      },
    });
    const useCase = new ResolveVersionMismatchUseCase(prisma);

    await expect(
      useCase.execute({
        sectionId: 'sec-1',
        action: 'acknowledge',
        userId: 'user-1',
      }),
    ).rejects.toThrow('does not have a version mismatch');
  });
});
