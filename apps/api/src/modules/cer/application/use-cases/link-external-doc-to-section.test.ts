import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LinkExternalDocToSectionUseCase } from './link-external-doc-to-section.js';

function makePrisma(overrides?: {
  section?: Record<string, unknown> | null;
  doc?: Record<string, unknown> | null;
  existingLink?: Record<string, unknown> | null;
}) {
  return {
    cerSection: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.section !== undefined
          ? overrides.section
          : {
              id: 'sec-1',
              cerVersionId: 'cer-1',
              cerVersion: { id: 'cer-1', status: 'DRAFT' },
            },
      ),
    },
    cerExternalDocument: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.doc !== undefined
          ? overrides.doc
          : { id: 'doc-1', cerVersionId: 'cer-1' },
      ),
    },
    cerSectionDocLink: {
      findFirst: vi.fn().mockResolvedValue(overrides?.existingLink ?? null),
      create: vi.fn().mockResolvedValue({ id: 'link-1' }),
    },
  } as any;
}

describe('LinkExternalDocToSectionUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a link between section and document', async () => {
    const prisma = makePrisma();
    const useCase = new LinkExternalDocToSectionUseCase(prisma);

    const result = await useCase.execute({
      cerSectionId: 'sec-1',
      externalDocumentId: 'doc-1',
      userId: 'user-1',
    });

    expect(result.cerSectionId).toBe('sec-1');
    expect(result.externalDocumentId).toBe('doc-1');
    expect(result.linkId).toBeTruthy();
    expect(prisma.cerSectionDocLink.create).toHaveBeenCalled();
  });

  it('includes reference context when provided', async () => {
    const prisma = makePrisma();
    const useCase = new LinkExternalDocToSectionUseCase(prisma);

    await useCase.execute({
      cerSectionId: 'sec-1',
      externalDocumentId: 'doc-1',
      referenceContext: 'Section 4.2 - Performance requirements',
      userId: 'user-1',
    });

    expect(prisma.cerSectionDocLink.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          referenceContext: 'Section 4.2 - Performance requirements',
        }),
      }),
    );
  });

  it('throws when section not found', async () => {
    const prisma = makePrisma({ section: null });
    const useCase = new LinkExternalDocToSectionUseCase(prisma);

    await expect(
      useCase.execute({
        cerSectionId: 'missing',
        externalDocumentId: 'doc-1',
        userId: 'user-1',
      }),
    ).rejects.toThrow('not found');
  });

  it('throws when document not found', async () => {
    const prisma = makePrisma({ doc: null });
    const useCase = new LinkExternalDocToSectionUseCase(prisma);

    await expect(
      useCase.execute({
        cerSectionId: 'sec-1',
        externalDocumentId: 'missing',
        userId: 'user-1',
      }),
    ).rejects.toThrow('not found');
  });

  it('throws when document and section belong to different CER versions', async () => {
    const prisma = makePrisma({
      doc: { id: 'doc-1', cerVersionId: 'cer-other' },
    });
    const useCase = new LinkExternalDocToSectionUseCase(prisma);

    await expect(
      useCase.execute({
        cerSectionId: 'sec-1',
        externalDocumentId: 'doc-1',
        userId: 'user-1',
      }),
    ).rejects.toThrow('same CER version');
  });
});
