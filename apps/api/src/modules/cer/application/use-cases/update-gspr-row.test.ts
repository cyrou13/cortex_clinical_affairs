import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateGsprRowUseCase } from './update-gspr-row.js';

const ROW_ID = 'row-1';
const USER_ID = 'user-1';

function makePrisma(overrides?: {
  row?: Record<string, unknown> | null;
}) {
  return {
    gsprMatrixRow: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.row !== undefined
          ? overrides.row
          : {
              id: ROW_ID,
              gsprId: 'GSPR-1',
              status: 'PARTIAL',
              evidenceReferences: ['ref-1'],
              notes: null,
            },
      ),
      update: vi.fn().mockResolvedValue({ id: ROW_ID }),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  } as any;
}

describe('UpdateGsprRowUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates status to COMPLIANT', async () => {
    const prisma = makePrisma();
    const useCase = new UpdateGsprRowUseCase(prisma);

    const result = await useCase.execute({
      gsprMatrixRowId: ROW_ID,
      status: 'COMPLIANT',
      userId: USER_ID,
    });

    expect(result.status).toBe('COMPLIANT');
    expect(prisma.gsprMatrixRow.update).toHaveBeenCalled();
  });

  it('updates evidence references', async () => {
    const prisma = makePrisma();
    const useCase = new UpdateGsprRowUseCase(prisma);

    const result = await useCase.execute({
      gsprMatrixRowId: ROW_ID,
      evidenceReferences: ['ref-1', 'ref-2', 'ref-3'],
      userId: USER_ID,
    });

    expect(result.evidenceReferences).toEqual(['ref-1', 'ref-2', 'ref-3']);
  });

  it('throws NotFoundError when row not found', async () => {
    const prisma = makePrisma({ row: null });
    const useCase = new UpdateGsprRowUseCase(prisma);

    await expect(
      useCase.execute({ gsprMatrixRowId: 'missing', userId: USER_ID }),
    ).rejects.toThrow('not found');
  });

  it('throws ValidationError for invalid status', async () => {
    const prisma = makePrisma();
    const useCase = new UpdateGsprRowUseCase(prisma);

    await expect(
      useCase.execute({
        gsprMatrixRowId: ROW_ID,
        status: 'INVALID' as any,
        userId: USER_ID,
      }),
    ).rejects.toThrow('Invalid GSPR status');
  });

  it('throws ValidationError when NOT_APPLICABLE without notes', async () => {
    const prisma = makePrisma();
    const useCase = new UpdateGsprRowUseCase(prisma);

    await expect(
      useCase.execute({
        gsprMatrixRowId: ROW_ID,
        status: 'NOT_APPLICABLE',
        userId: USER_ID,
      }),
    ).rejects.toThrow('Notes are required');
  });

  it('allows NOT_APPLICABLE with notes', async () => {
    const prisma = makePrisma();
    const useCase = new UpdateGsprRowUseCase(prisma);

    const result = await useCase.execute({
      gsprMatrixRowId: ROW_ID,
      status: 'NOT_APPLICABLE',
      notes: 'Not applicable for software-only device',
      userId: USER_ID,
    });

    expect(result.status).toBe('NOT_APPLICABLE');
    expect(result.notes).toBe('Not applicable for software-only device');
  });

  it('creates audit log entry', async () => {
    const prisma = makePrisma();
    const useCase = new UpdateGsprRowUseCase(prisma);

    await useCase.execute({
      gsprMatrixRowId: ROW_ID,
      status: 'COMPLIANT',
      userId: USER_ID,
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: USER_ID,
          action: 'cer.gspr-row.updated',
          targetType: 'gsprMatrixRow',
          targetId: ROW_ID,
        }),
      }),
    );
  });

  it('preserves existing notes when NOT_APPLICABLE and notes already set', async () => {
    const prisma = makePrisma({
      row: {
        id: ROW_ID,
        gsprId: 'GSPR-1',
        status: 'NOT_APPLICABLE',
        evidenceReferences: [],
        notes: 'Existing justification',
      },
    });
    const useCase = new UpdateGsprRowUseCase(prisma);

    const result = await useCase.execute({
      gsprMatrixRowId: ROW_ID,
      status: 'NOT_APPLICABLE',
      userId: USER_ID,
    });

    expect(result.notes).toBe('Existing justification');
  });
});
