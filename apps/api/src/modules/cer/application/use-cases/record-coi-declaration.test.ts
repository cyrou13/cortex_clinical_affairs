import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecordCoiDeclarationUseCase } from './record-coi-declaration.js';

const EVALUATOR_ID = 'eval-1';
const USER_ID = 'user-1';

function makePrisma(overrides?: {
  evaluator?: Record<string, unknown> | null;
}) {
  return {
    evaluator: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.evaluator !== undefined
          ? overrides.evaluator
          : { id: EVALUATOR_ID, signedAt: null },
      ),
      update: vi.fn().mockResolvedValue({ id: EVALUATOR_ID }),
    },
  } as any;
}

describe('RecordCoiDeclarationUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('records COI declaration without conflict', async () => {
    const prisma = makePrisma();
    const useCase = new RecordCoiDeclarationUseCase(prisma);

    const result = await useCase.execute({
      evaluatorId: EVALUATOR_ID,
      hasConflict: false,
      declarationText: 'I declare no conflict of interest',
      userId: USER_ID,
    });

    expect(result.evaluatorId).toBe(EVALUATOR_ID);
    expect(result.hasConflict).toBe(false);
    expect(result.conflictDetails).toBeNull();
    expect(result.coiDeclaredAt).toBeDefined();
  });

  it('records COI declaration with conflict and details', async () => {
    const prisma = makePrisma();
    const useCase = new RecordCoiDeclarationUseCase(prisma);

    const result = await useCase.execute({
      evaluatorId: EVALUATOR_ID,
      hasConflict: true,
      conflictDetails: 'I have a consulting relationship with...',
      declarationText: 'I declare the following conflict...',
      userId: USER_ID,
    });

    expect(result.hasConflict).toBe(true);
    expect(result.conflictDetails).toBe('I have a consulting relationship with...');
  });

  it('throws ValidationError when conflict exists without details', async () => {
    const prisma = makePrisma();
    const useCase = new RecordCoiDeclarationUseCase(prisma);

    await expect(
      useCase.execute({
        evaluatorId: EVALUATOR_ID,
        hasConflict: true,
        declarationText: 'I declare...',
        userId: USER_ID,
      }),
    ).rejects.toThrow('Conflict details are required');
  });

  it('throws ValidationError for empty declaration text', async () => {
    const prisma = makePrisma();
    const useCase = new RecordCoiDeclarationUseCase(prisma);

    await expect(
      useCase.execute({
        evaluatorId: EVALUATOR_ID,
        hasConflict: false,
        declarationText: '',
        userId: USER_ID,
      }),
    ).rejects.toThrow('COI declaration text is required');
  });

  it('throws NotFoundError when evaluator does not exist', async () => {
    const prisma = makePrisma({ evaluator: null });
    const useCase = new RecordCoiDeclarationUseCase(prisma);

    await expect(
      useCase.execute({
        evaluatorId: 'missing',
        hasConflict: false,
        declarationText: 'I declare...',
        userId: USER_ID,
      }),
    ).rejects.toThrow('not found');
  });

  it('throws ValidationError when evaluator has already signed', async () => {
    const prisma = makePrisma({
      evaluator: { id: EVALUATOR_ID, signedAt: new Date().toISOString() },
    });
    const useCase = new RecordCoiDeclarationUseCase(prisma);

    await expect(
      useCase.execute({
        evaluatorId: EVALUATOR_ID,
        hasConflict: false,
        declarationText: 'I declare...',
        userId: USER_ID,
      }),
    ).rejects.toThrow('after signing');
  });

  it('clears conflict details when hasConflict is false', async () => {
    const prisma = makePrisma();
    const useCase = new RecordCoiDeclarationUseCase(prisma);

    await useCase.execute({
      evaluatorId: EVALUATOR_ID,
      hasConflict: false,
      conflictDetails: 'should be cleared',
      declarationText: 'No conflict',
      userId: USER_ID,
    });

    expect(prisma.evaluator.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          hasConflict: false,
          conflictDetails: null,
        }),
      }),
    );
  });

  it('sets coiDeclaredAt timestamp', async () => {
    const prisma = makePrisma();
    const useCase = new RecordCoiDeclarationUseCase(prisma);

    await useCase.execute({
      evaluatorId: EVALUATOR_ID,
      hasConflict: false,
      declarationText: 'I declare...',
      userId: USER_ID,
    });

    expect(prisma.evaluator.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          coiDeclaredAt: expect.any(Date),
        }),
      }),
    );
  });
});
