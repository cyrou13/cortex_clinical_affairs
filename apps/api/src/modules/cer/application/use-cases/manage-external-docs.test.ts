import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ManageExternalDocsUseCase } from './manage-external-docs.js';

function makePrisma(overrides?: {
  cerVersion?: Record<string, unknown> | null;
  doc?: Record<string, unknown> | null;
  docs?: Array<Record<string, unknown>>;
}) {
  return {
    cerVersion: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.cerVersion !== undefined
          ? overrides.cerVersion
          : { id: 'cer-1', status: 'DRAFT' },
      ),
    },
    cerExternalDocument: {
      create: vi.fn().mockImplementation((args: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: args.data.id, ...args.data }),
      ),
      findUnique: vi.fn().mockResolvedValue(
        overrides?.doc !== undefined
          ? overrides.doc
          : {
              id: 'doc-1',
              title: 'IEC 62304',
              version: '2.0',
              date: '2015-06-01',
              summary: 'Software lifecycle',
              documentType: 'STANDARD',
              cerVersion: { id: 'cer-1', status: 'DRAFT' },
            },
      ),
      update: vi.fn().mockImplementation((args: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: 'doc-1', ...args.data }),
      ),
      delete: vi.fn().mockResolvedValue({ id: 'doc-1' }),
      findMany: vi.fn().mockResolvedValue(overrides?.docs ?? []),
    },
  } as any;
}

describe('ManageExternalDocsUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('creates an external document', async () => {
      const prisma = makePrisma();
      const useCase = new ManageExternalDocsUseCase(prisma);

      const result = await useCase.create({
        cerVersionId: 'cer-1',
        title: 'IEC 62304',
        version: '2.0',
        date: '2015-06-01',
        summary: 'Software lifecycle processes',
        documentType: 'STANDARD',
        userId: 'user-1',
      });

      expect(result.title).toBe('IEC 62304');
      expect(prisma.cerExternalDocument.create).toHaveBeenCalled();
    });

    it('throws when CER version not found', async () => {
      const prisma = makePrisma({ cerVersion: null });
      const useCase = new ManageExternalDocsUseCase(prisma);

      await expect(
        useCase.create({
          cerVersionId: 'missing',
          title: 'T',
          version: '1',
          date: '2024',
          summary: 'S',
          documentType: 'STANDARD',
          userId: 'user-1',
        }),
      ).rejects.toThrow('not found');
    });

    it('throws when CER version is locked', async () => {
      const prisma = makePrisma({ cerVersion: { id: 'cer-1', status: 'LOCKED' } });
      const useCase = new ManageExternalDocsUseCase(prisma);

      await expect(
        useCase.create({
          cerVersionId: 'cer-1',
          title: 'T',
          version: '1',
          date: '2024',
          summary: 'S',
          documentType: 'STANDARD',
          userId: 'user-1',
        }),
      ).rejects.toThrow('locked');
    });

    it('throws for invalid document type', async () => {
      const prisma = makePrisma();
      const useCase = new ManageExternalDocsUseCase(prisma);

      await expect(
        useCase.create({
          cerVersionId: 'cer-1',
          title: 'T',
          version: '1',
          date: '2024',
          summary: 'S',
          documentType: 'INVALID',
          userId: 'user-1',
        }),
      ).rejects.toThrow('Invalid document type');
    });
  });

  describe('update', () => {
    it('updates an external document', async () => {
      const prisma = makePrisma();
      const useCase = new ManageExternalDocsUseCase(prisma);

      const result = await useCase.update({
        documentId: 'doc-1',
        title: 'Updated Title',
        userId: 'user-1',
      });

      expect(prisma.cerExternalDocument.update).toHaveBeenCalled();
    });

    it('throws when document not found', async () => {
      const prisma = makePrisma({ doc: null });
      const useCase = new ManageExternalDocsUseCase(prisma);

      await expect(
        useCase.update({ documentId: 'missing', userId: 'user-1' }),
      ).rejects.toThrow('not found');
    });
  });

  describe('delete', () => {
    it('deletes an external document', async () => {
      const prisma = makePrisma();
      const useCase = new ManageExternalDocsUseCase(prisma);

      const result = await useCase.delete({ documentId: 'doc-1', userId: 'user-1' });
      expect(result.deleted).toBe(true);
      expect(prisma.cerExternalDocument.delete).toHaveBeenCalled();
    });

    it('throws when document not found for delete', async () => {
      const prisma = makePrisma({ doc: null });
      const useCase = new ManageExternalDocsUseCase(prisma);

      await expect(
        useCase.delete({ documentId: 'missing', userId: 'user-1' }),
      ).rejects.toThrow('not found');
    });
  });

  describe('list', () => {
    it('lists documents for a CER version', async () => {
      const prisma = makePrisma({ docs: [{ id: 'doc-1' }, { id: 'doc-2' }] });
      const useCase = new ManageExternalDocsUseCase(prisma);

      const result = await useCase.list('cer-1');
      expect(result).toHaveLength(2);
    });
  });
});
