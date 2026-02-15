import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateExternalDocVersionUseCase } from './update-external-doc-version.js';

function makePrisma(overrides?: {
  doc?: Record<string, unknown> | null;
  sectionLinks?: Array<Record<string, unknown>>;
}) {
  return {
    cerExternalDocument: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.doc !== undefined
          ? overrides.doc
          : {
              id: 'doc-1',
              cerVersionId: 'cer-1',
              title: 'IEC 62304',
              version: '2.0',
              date: '2015-06-01',
              summary: 'Software lifecycle',
              documentType: 'STANDARD',
              cerVersion: { id: 'cer-1', status: 'DRAFT' },
            },
      ),
      update: vi.fn().mockResolvedValue({ id: 'doc-1' }),
    },
    cerExternalDocumentHistory: {
      create: vi.fn().mockResolvedValue({ id: 'hist-1' }),
    },
    cerSectionDocLink: {
      findMany: vi.fn().mockResolvedValue(
        overrides?.sectionLinks ?? [
          { cerSectionId: 'sec-1' },
          { cerSectionId: 'sec-2' },
        ],
      ),
    },
    cerSection: {
      updateMany: vi.fn().mockResolvedValue({ count: 2 }),
    },
  } as any;
}

function makeEventBus() {
  return {
    publish: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

describe('UpdateExternalDocVersionUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('archives current version and updates document', async () => {
    const prisma = makePrisma();
    const eventBus = makeEventBus();
    const useCase = new UpdateExternalDocVersionUseCase(prisma, eventBus);

    const result = await useCase.execute({
      documentId: 'doc-1',
      newVersion: '3.0',
      newDate: '2024-01-01',
      userId: 'user-1',
    });

    expect(result.previousVersion).toBe('2.0');
    expect(result.newVersion).toBe('3.0');
    expect(result.archivedHistoryId).toBeTruthy();
    expect(prisma.cerExternalDocumentHistory.create).toHaveBeenCalled();
    expect(prisma.cerExternalDocument.update).toHaveBeenCalled();
  });

  it('flags impacted sections with versionMismatchWarning', async () => {
    const prisma = makePrisma({
      sectionLinks: [{ cerSectionId: 'sec-1' }, { cerSectionId: 'sec-2' }],
    });
    const eventBus = makeEventBus();
    const useCase = new UpdateExternalDocVersionUseCase(prisma, eventBus);

    const result = await useCase.execute({
      documentId: 'doc-1',
      newVersion: '3.0',
      newDate: '2024-01-01',
      userId: 'user-1',
    });

    expect(result.impactedSectionCount).toBe(2);
    expect(prisma.cerSection.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ['sec-1', 'sec-2'] } },
        data: { versionMismatchWarning: true },
      }),
    );
  });

  it('does not flag sections when none are linked', async () => {
    const prisma = makePrisma({ sectionLinks: [] });
    const eventBus = makeEventBus();
    const useCase = new UpdateExternalDocVersionUseCase(prisma, eventBus);

    const result = await useCase.execute({
      documentId: 'doc-1',
      newVersion: '3.0',
      newDate: '2024-01-01',
      userId: 'user-1',
    });

    expect(result.impactedSectionCount).toBe(0);
    expect(prisma.cerSection.updateMany).not.toHaveBeenCalled();
  });

  it('emits cer.external-doc.version-changed event', async () => {
    const prisma = makePrisma();
    const eventBus = makeEventBus();
    const useCase = new UpdateExternalDocVersionUseCase(prisma, eventBus);

    await useCase.execute({
      documentId: 'doc-1',
      newVersion: '3.0',
      newDate: '2024-01-01',
      userId: 'user-1',
    });

    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'cer.external-doc.version-changed' }),
    );
  });

  it('throws when document not found', async () => {
    const prisma = makePrisma({ doc: null });
    const eventBus = makeEventBus();
    const useCase = new UpdateExternalDocVersionUseCase(prisma, eventBus);

    await expect(
      useCase.execute({
        documentId: 'missing',
        newVersion: '3.0',
        newDate: '2024-01-01',
        userId: 'user-1',
      }),
    ).rejects.toThrow('not found');
  });

  it('throws when CER version is locked', async () => {
    const prisma = makePrisma({
      doc: {
        id: 'doc-1',
        cerVersionId: 'cer-1',
        version: '2.0',
        date: '2015-06-01',
        summary: 'S',
        cerVersion: { id: 'cer-1', status: 'LOCKED' },
      },
    });
    const eventBus = makeEventBus();
    const useCase = new UpdateExternalDocVersionUseCase(prisma, eventBus);

    await expect(
      useCase.execute({
        documentId: 'doc-1',
        newVersion: '3.0',
        newDate: '2024-01-01',
        userId: 'user-1',
      }),
    ).rejects.toThrow('locked');
  });

  it('throws for empty new version', async () => {
    const prisma = makePrisma();
    const eventBus = makeEventBus();
    const useCase = new UpdateExternalDocVersionUseCase(prisma, eventBus);

    await expect(
      useCase.execute({
        documentId: 'doc-1',
        newVersion: '',
        newDate: '2024-01-01',
        userId: 'user-1',
      }),
    ).rejects.toThrow('version is required');
  });

  it('throws for empty new date', async () => {
    const prisma = makePrisma();
    const eventBus = makeEventBus();
    const useCase = new UpdateExternalDocVersionUseCase(prisma, eventBus);

    await expect(
      useCase.execute({
        documentId: 'doc-1',
        newVersion: '3.0',
        newDate: '',
        userId: 'user-1',
      }),
    ).rejects.toThrow('date is required');
  });

  it('updates summary when provided', async () => {
    const prisma = makePrisma();
    const eventBus = makeEventBus();
    const useCase = new UpdateExternalDocVersionUseCase(prisma, eventBus);

    await useCase.execute({
      documentId: 'doc-1',
      newVersion: '3.0',
      newDate: '2024-01-01',
      newSummary: 'Updated summary',
      userId: 'user-1',
    });

    expect(prisma.cerExternalDocument.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ summary: 'Updated summary' }),
      }),
    );
  });

  it('retains existing summary when newSummary not provided', async () => {
    const prisma = makePrisma();
    const eventBus = makeEventBus();
    const useCase = new UpdateExternalDocVersionUseCase(prisma, eventBus);

    await useCase.execute({
      documentId: 'doc-1',
      newVersion: '3.0',
      newDate: '2024-01-01',
      userId: 'user-1',
    });

    expect(prisma.cerExternalDocument.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ summary: 'Software lifecycle' }),
      }),
    );
  });
});
