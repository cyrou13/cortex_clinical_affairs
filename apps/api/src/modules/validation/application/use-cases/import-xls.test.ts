import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImportXlsUseCase } from './import-xls.js';

function makePrisma(overrides?: {
  study?: Record<string, unknown> | null;
  lastImport?: Record<string, unknown> | null;
}) {
  return {
    validationStudy: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.study !== undefined
          ? overrides.study
          : { id: 'study-1', status: 'IN_PROGRESS', type: 'STANDALONE' },
      ),
    },
    dataImport: {
      findFirst: vi.fn().mockResolvedValue(
        overrides?.lastImport !== undefined ? overrides.lastImport : null,
      ),
      create: vi.fn().mockResolvedValue({ id: 'import-1' }),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  } as any;
}

const validHeaders = ['case_id', 'ground_truth', 'prediction'];
const validRows = [
  ['C001', 'POSITIVE', 'POSITIVE'],
  ['C002', 'NEGATIVE', 'NEGATIVE'],
];

describe('ImportXlsUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('imports valid XLS data with version 1', async () => {
    const prisma = makePrisma();
    const useCase = new ImportXlsUseCase(prisma);

    const result = await useCase.execute({
      validationStudyId: 'study-1',
      fileName: 'data.xlsx',
      headers: validHeaders,
      rawRows: validRows,
      userId: 'user-1',
    });

    expect(result.version).toBe(1);
    expect(result.rowCount).toBe(2);
    expect(result.columnCount).toBe(3);
    expect(prisma.dataImport.create).toHaveBeenCalled();
  });

  it('increments version for subsequent imports', async () => {
    const prisma = makePrisma({ lastImport: { version: 3 } });
    const useCase = new ImportXlsUseCase(prisma);

    const result = await useCase.execute({
      validationStudyId: 'study-1',
      fileName: 'data_v4.xlsx',
      headers: validHeaders,
      rawRows: validRows,
      userId: 'user-1',
    });

    expect(result.version).toBe(4);
  });

  it('deactivates previous active imports', async () => {
    const prisma = makePrisma();
    const useCase = new ImportXlsUseCase(prisma);

    await useCase.execute({
      validationStudyId: 'study-1',
      fileName: 'data.xlsx',
      headers: validHeaders,
      rawRows: validRows,
      userId: 'user-1',
    });

    expect(prisma.dataImport.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          validationStudyId: 'study-1',
          isActive: true,
        }),
        data: { isActive: false },
      }),
    );
  });

  it('throws when study not found', async () => {
    const prisma = makePrisma({ study: null });
    const useCase = new ImportXlsUseCase(prisma);

    await expect(
      useCase.execute({
        validationStudyId: 'missing',
        fileName: 'data.xlsx',
        headers: validHeaders,
        rawRows: validRows,
        userId: 'user-1',
      }),
    ).rejects.toThrow('not found');
  });

  it('throws when study is locked', async () => {
    const prisma = makePrisma({
      study: { id: 'study-1', status: 'LOCKED', type: 'STANDALONE' },
    });
    const useCase = new ImportXlsUseCase(prisma);

    await expect(
      useCase.execute({
        validationStudyId: 'study-1',
        fileName: 'data.xlsx',
        headers: validHeaders,
        rawRows: validRows,
        userId: 'user-1',
      }),
    ).rejects.toThrow('locked');
  });

  it('throws when XLS schema validation fails (missing required column)', async () => {
    const prisma = makePrisma();
    const useCase = new ImportXlsUseCase(prisma);

    await expect(
      useCase.execute({
        validationStudyId: 'study-1',
        fileName: 'bad.xlsx',
        headers: ['case_id'],
        rawRows: [['C001']],
        userId: 'user-1',
      }),
    ).rejects.toThrow('validation failed');
  });

  it('throws when XLS has no data rows', async () => {
    const prisma = makePrisma();
    const useCase = new ImportXlsUseCase(prisma);

    await expect(
      useCase.execute({
        validationStudyId: 'study-1',
        fileName: 'empty.xlsx',
        headers: validHeaders,
        rawRows: [],
        userId: 'user-1',
      }),
    ).rejects.toThrow('validation failed');
  });

  it('returns warnings for unknown columns', async () => {
    const prisma = makePrisma();
    const useCase = new ImportXlsUseCase(prisma);

    const result = await useCase.execute({
      validationStudyId: 'study-1',
      fileName: 'data.xlsx',
      headers: ['case_id', 'ground_truth', 'prediction', 'extra_col'],
      rawRows: [['C001', 'POSITIVE', 'POSITIVE', 'extra']],
      userId: 'user-1',
    });

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some((w) => w.includes('extra_col'))).toBe(true);
  });

  it('supports MRMC study type with reader_id column', async () => {
    const prisma = makePrisma({
      study: { id: 'study-1', status: 'IN_PROGRESS', type: 'MRMC' },
    });
    const useCase = new ImportXlsUseCase(prisma);

    const result = await useCase.execute({
      validationStudyId: 'study-1',
      fileName: 'mrmc.xlsx',
      headers: ['case_id', 'reader_id', 'ground_truth', 'prediction'],
      rawRows: [['C001', 'R1', 'POS', 'POS']],
      userId: 'user-1',
    });

    expect(result.rowCount).toBe(1);
  });
});
