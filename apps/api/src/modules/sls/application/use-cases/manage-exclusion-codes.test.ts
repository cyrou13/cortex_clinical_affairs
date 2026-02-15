import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ManageExclusionCodesUseCase } from './manage-exclusion-codes.js';

function makePrisma(overrides?: {
  sessionResult?: unknown;
  codeResult?: unknown;
  existingCode?: unknown;
  existingShortCode?: unknown;
  maxOrder?: unknown;
  codesForReorder?: unknown[];
}) {
  const findFirstFn = vi.fn()
    .mockResolvedValueOnce(overrides?.existingCode ?? null)       // code uniqueness check
    .mockResolvedValueOnce(overrides?.existingShortCode ?? null)  // shortCode uniqueness check
    .mockResolvedValueOnce(overrides?.maxOrder ?? null);          // max displayOrder

  return {
    slsSession: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.sessionResult !== undefined
          ? overrides.sessionResult
          : { id: 'session-1', projectId: 'project-1' },
      ),
    },
    exclusionCode: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.codeResult !== undefined
          ? overrides.codeResult
          : {
              id: 'code-1',
              sessionId: 'session-1',
              code: 'WRONG_POPULATION',
              label: 'Wrong population',
              shortCode: 'E1',
              isHidden: false,
              displayOrder: 0,
            },
      ),
      findFirst: findFirstFn,
      findMany: vi.fn().mockResolvedValue(
        overrides?.codesForReorder ?? [
          { id: 'code-1', displayOrder: 0 },
          { id: 'code-2', displayOrder: 1 },
        ],
      ),
      create: vi.fn().mockImplementation((args: { data: Record<string, unknown> }) => Promise.resolve({
        id: 'new-code-1',
        ...args.data,
      })),
      update: vi.fn().mockImplementation((args: { data: Record<string, unknown> }) => Promise.resolve({
        id: 'code-1',
        sessionId: 'session-1',
        ...args.data,
      })),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  } as any;
}

describe('ManageExclusionCodesUseCase', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let useCase: ManageExclusionCodesUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrisma();
    useCase = new ManageExclusionCodesUseCase(prisma);
  });

  describe('addExclusionCode', () => {
    const validInput = {
      code: 'WRONG_POPULATION',
      label: 'Wrong population',
      shortCode: 'E1',
    };

    it('creates an exclusion code successfully', async () => {
      const result = await useCase.addExclusionCode('session-1', validInput, 'user-1');

      expect(result.code).toBe('WRONG_POPULATION');
      expect(prisma.exclusionCode.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sessionId: 'session-1',
            code: 'WRONG_POPULATION',
            label: 'Wrong population',
            shortCode: 'E1',
            displayOrder: 0,
          }),
        }),
      );
    });

    it('sets displayOrder to max + 1', async () => {
      prisma = makePrisma({ maxOrder: { displayOrder: 5 } });
      useCase = new ManageExclusionCodesUseCase(prisma);

      await useCase.addExclusionCode('session-1', validInput, 'user-1');

      expect(prisma.exclusionCode.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            displayOrder: 6,
          }),
        }),
      );
    });

    it('creates an audit log entry', async () => {
      await useCase.addExclusionCode('session-1', validInput, 'user-1');

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            action: 'sls.exclusionCode.added',
            targetType: 'exclusionCode',
          }),
        }),
      );
    });

    it('throws NotFoundError when session does not exist', async () => {
      prisma = makePrisma({ sessionResult: null });
      useCase = new ManageExclusionCodesUseCase(prisma);

      await expect(
        useCase.addExclusionCode('session-1', validInput, 'user-1'),
      ).rejects.toThrow('not found');
    });

    it('throws ValidationError for duplicate code', async () => {
      prisma = makePrisma({ existingCode: { id: 'existing-1', code: 'WRONG_POPULATION' } });
      useCase = new ManageExclusionCodesUseCase(prisma);

      await expect(
        useCase.addExclusionCode('session-1', validInput, 'user-1'),
      ).rejects.toThrow('already exists');
    });

    it('throws ValidationError for duplicate shortCode', async () => {
      prisma = makePrisma({ existingShortCode: { id: 'existing-1', shortCode: 'E1' } });
      useCase = new ManageExclusionCodesUseCase(prisma);

      await expect(
        useCase.addExclusionCode('session-1', validInput, 'user-1'),
      ).rejects.toThrow('already exists');
    });

    it('throws ValidationError for invalid input', async () => {
      await expect(
        useCase.addExclusionCode('session-1', { code: '' }, 'user-1'),
      ).rejects.toThrow();
    });
  });

  describe('renameExclusionCode', () => {
    it('renames an exclusion code successfully', async () => {
      const result = await useCase.renameExclusionCode('code-1', { label: 'New label' }, 'user-1');

      expect(prisma.exclusionCode.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'code-1' },
          data: expect.objectContaining({ label: 'New label' }),
        }),
      );
    });

    it('creates an audit log entry', async () => {
      await useCase.renameExclusionCode('code-1', { label: 'New label' }, 'user-1');

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'sls.exclusionCode.renamed',
          }),
        }),
      );
    });

    it('throws NotFoundError when code does not exist', async () => {
      prisma = makePrisma({ codeResult: null });
      useCase = new ManageExclusionCodesUseCase(prisma);

      await expect(
        useCase.renameExclusionCode('code-1', { label: 'New label' }, 'user-1'),
      ).rejects.toThrow('not found');
    });

    it('throws ValidationError for invalid input', async () => {
      await expect(
        useCase.renameExclusionCode('code-1', { label: '' }, 'user-1'),
      ).rejects.toThrow();
    });
  });

  describe('hideExclusionCode', () => {
    it('hides an exclusion code successfully', async () => {
      await useCase.hideExclusionCode('code-1', 'user-1');

      expect(prisma.exclusionCode.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'code-1' },
          data: { isHidden: true },
        }),
      );
    });

    it('creates an audit log entry', async () => {
      await useCase.hideExclusionCode('code-1', 'user-1');

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'sls.exclusionCode.hidden',
          }),
        }),
      );
    });

    it('throws NotFoundError when code does not exist', async () => {
      prisma = makePrisma({ codeResult: null });
      useCase = new ManageExclusionCodesUseCase(prisma);

      await expect(
        useCase.hideExclusionCode('code-1', 'user-1'),
      ).rejects.toThrow('not found');
    });
  });

  describe('reorderExclusionCodes', () => {
    it('reorders exclusion codes successfully', async () => {
      await useCase.reorderExclusionCodes('session-1', ['code-2', 'code-1'], 'user-1');

      expect(prisma.exclusionCode.update).toHaveBeenCalledTimes(2);
      expect(prisma.exclusionCode.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'code-2' },
          data: { displayOrder: 0 },
        }),
      );
      expect(prisma.exclusionCode.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'code-1' },
          data: { displayOrder: 1 },
        }),
      );
    });

    it('creates an audit log entry', async () => {
      await useCase.reorderExclusionCodes('session-1', ['code-2', 'code-1'], 'user-1');

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'sls.exclusionCodes.reordered',
          }),
        }),
      );
    });

    it('throws NotFoundError when session does not exist', async () => {
      prisma = makePrisma({ sessionResult: null });
      useCase = new ManageExclusionCodesUseCase(prisma);

      await expect(
        useCase.reorderExclusionCodes('session-1', ['code-1'], 'user-1'),
      ).rejects.toThrow('not found');
    });

    it('throws ValidationError when IDs do not match session codes', async () => {
      prisma = makePrisma({ codesForReorder: [{ id: 'code-1' }] });
      useCase = new ManageExclusionCodesUseCase(prisma);

      await expect(
        useCase.reorderExclusionCodes('session-1', ['code-1', 'code-999'], 'user-1'),
      ).rejects.toThrow('do not belong');
    });
  });
});
