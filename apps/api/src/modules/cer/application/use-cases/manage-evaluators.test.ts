import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ManageEvaluatorsUseCase } from './manage-evaluators.js';

const CER_VERSION_ID = 'cer-v1';
const SECTION_ID = 'section-1';
const USER_ID = 'user-1';
const ASSIGNED_BY = 'admin-1';
const EVALUATOR_ID = 'eval-1';

function makePrisma(overrides?: {
  cerVersion?: Record<string, unknown> | null;
  section?: Record<string, unknown> | null;
  user?: Record<string, unknown> | null;
  existingAssignment?: Record<string, unknown> | null;
  writtenBy?: Record<string, unknown> | null;
  approvedBy?: Record<string, unknown> | null;
  evaluator?: Record<string, unknown> | null;
}) {
  return {
    cerVersion: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.cerVersion !== undefined
          ? overrides.cerVersion
          : { id: CER_VERSION_ID },
      ),
    },
    cerSection: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.section !== undefined
          ? overrides.section
          : { id: SECTION_ID, cerVersionId: CER_VERSION_ID },
      ),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.user !== undefined
          ? overrides.user
          : { id: USER_ID },
      ),
    },
    evaluator: {
      findFirst: vi.fn().mockImplementation(({ where }: any) => {
        if (where.role === 'WRITTEN_BY' && overrides?.writtenBy !== undefined) {
          return Promise.resolve(overrides.writtenBy);
        }
        if (where.role === 'APPROVED_BY' && overrides?.approvedBy !== undefined) {
          return Promise.resolve(overrides.approvedBy);
        }
        if (overrides?.existingAssignment !== undefined) {
          return Promise.resolve(overrides.existingAssignment);
        }
        return Promise.resolve(null);
      }),
      findUnique: vi.fn().mockResolvedValue(
        overrides?.evaluator !== undefined
          ? overrides.evaluator
          : { id: EVALUATOR_ID, signedAt: null },
      ),
      create: vi.fn().mockImplementation(({ data }) =>
        Promise.resolve({
          id: data.id,
          cerVersionId: data.cerVersionId,
          sectionId: data.sectionId,
          userId: data.userId,
          role: data.role,
        }),
      ),
      delete: vi.fn().mockResolvedValue({ id: EVALUATOR_ID }),
      findMany: vi.fn().mockResolvedValue([]),
    },
  } as any;
}

describe('ManageEvaluatorsUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('assign', () => {
    it('assigns an evaluator to a section', async () => {
      const prisma = makePrisma();
      const useCase = new ManageEvaluatorsUseCase(prisma);

      const result = await useCase.assign({
        cerVersionId: CER_VERSION_ID,
        sectionId: SECTION_ID,
        userId: USER_ID,
        role: 'WRITTEN_BY',
        assignedBy: ASSIGNED_BY,
      });

      expect(result.cerVersionId).toBe(CER_VERSION_ID);
      expect(result.sectionId).toBe(SECTION_ID);
      expect(result.role).toBe('WRITTEN_BY');
    });

    it('throws ValidationError for invalid role', async () => {
      const prisma = makePrisma();
      const useCase = new ManageEvaluatorsUseCase(prisma);

      await expect(
        useCase.assign({
          cerVersionId: CER_VERSION_ID,
          sectionId: SECTION_ID,
          userId: USER_ID,
          role: 'INVALID_ROLE',
          assignedBy: ASSIGNED_BY,
        }),
      ).rejects.toThrow('Invalid evaluator role');
    });

    it('throws NotFoundError when CER version does not exist', async () => {
      const prisma = makePrisma({ cerVersion: null });
      const useCase = new ManageEvaluatorsUseCase(prisma);

      await expect(
        useCase.assign({
          cerVersionId: 'missing',
          sectionId: SECTION_ID,
          userId: USER_ID,
          role: 'WRITTEN_BY',
          assignedBy: ASSIGNED_BY,
        }),
      ).rejects.toThrow('not found');
    });

    it('throws NotFoundError when section does not exist', async () => {
      const prisma = makePrisma({ section: null });
      const useCase = new ManageEvaluatorsUseCase(prisma);

      await expect(
        useCase.assign({
          cerVersionId: CER_VERSION_ID,
          sectionId: 'missing',
          userId: USER_ID,
          role: 'WRITTEN_BY',
          assignedBy: ASSIGNED_BY,
        }),
      ).rejects.toThrow('not found');
    });

    it('throws NotFoundError when user does not exist', async () => {
      const prisma = makePrisma({ user: null });
      const useCase = new ManageEvaluatorsUseCase(prisma);

      await expect(
        useCase.assign({
          cerVersionId: CER_VERSION_ID,
          sectionId: SECTION_ID,
          userId: 'missing',
          role: 'WRITTEN_BY',
          assignedBy: ASSIGNED_BY,
        }),
      ).rejects.toThrow('not found');
    });

    it('throws ValidationError when role is already assigned for section', async () => {
      const prisma = makePrisma({
        existingAssignment: { id: EVALUATOR_ID, userId: 'other-user' },
      });
      const useCase = new ManageEvaluatorsUseCase(prisma);

      await expect(
        useCase.assign({
          cerVersionId: CER_VERSION_ID,
          sectionId: SECTION_ID,
          userId: USER_ID,
          role: 'WRITTEN_BY',
          assignedBy: ASSIGNED_BY,
        }),
      ).rejects.toThrow('already assigned');
    });

    it('throws ValidationError when APPROVED_BY is same as WRITTEN_BY (separation of duties)', async () => {
      const prisma = makePrisma({
        writtenBy: { userId: USER_ID },
      });
      const useCase = new ManageEvaluatorsUseCase(prisma);

      await expect(
        useCase.assign({
          cerVersionId: CER_VERSION_ID,
          sectionId: SECTION_ID,
          userId: USER_ID,
          role: 'APPROVED_BY',
          assignedBy: ASSIGNED_BY,
        }),
      ).rejects.toThrow('separation of duties');
    });

    it('throws ValidationError when WRITTEN_BY is same as existing APPROVED_BY', async () => {
      const prisma = makePrisma({
        approvedBy: { userId: USER_ID },
      });
      const useCase = new ManageEvaluatorsUseCase(prisma);

      await expect(
        useCase.assign({
          cerVersionId: CER_VERSION_ID,
          sectionId: SECTION_ID,
          userId: USER_ID,
          role: 'WRITTEN_BY',
          assignedBy: ASSIGNED_BY,
        }),
      ).rejects.toThrow('separation of duties');
    });

    it('allows different users for WRITTEN_BY and APPROVED_BY', async () => {
      const prisma = makePrisma({
        writtenBy: { userId: 'other-user' },
      });
      const useCase = new ManageEvaluatorsUseCase(prisma);

      const result = await useCase.assign({
        cerVersionId: CER_VERSION_ID,
        sectionId: SECTION_ID,
        userId: USER_ID,
        role: 'APPROVED_BY',
        assignedBy: ASSIGNED_BY,
      });

      expect(result.role).toBe('APPROVED_BY');
    });

    it('validates section belongs to CER version', async () => {
      const prisma = makePrisma({
        section: { id: SECTION_ID, cerVersionId: 'other-version' },
      });
      const useCase = new ManageEvaluatorsUseCase(prisma);

      await expect(
        useCase.assign({
          cerVersionId: CER_VERSION_ID,
          sectionId: SECTION_ID,
          userId: USER_ID,
          role: 'WRITTEN_BY',
          assignedBy: ASSIGNED_BY,
        }),
      ).rejects.toThrow('does not belong');
    });
  });

  describe('remove', () => {
    it('removes an evaluator assignment', async () => {
      const prisma = makePrisma();
      const useCase = new ManageEvaluatorsUseCase(prisma);

      const result = await useCase.remove({
        evaluatorId: EVALUATOR_ID,
        removedBy: ASSIGNED_BY,
      });

      expect(result.deleted).toBe(true);
    });

    it('throws NotFoundError for non-existent evaluator', async () => {
      const prisma = makePrisma({ evaluator: null });
      const useCase = new ManageEvaluatorsUseCase(prisma);

      await expect(
        useCase.remove({ evaluatorId: 'missing', removedBy: ASSIGNED_BY }),
      ).rejects.toThrow('not found');
    });

    it('throws ValidationError when evaluator has already signed', async () => {
      const prisma = makePrisma({
        evaluator: { id: EVALUATOR_ID, signedAt: new Date().toISOString() },
      });
      const useCase = new ManageEvaluatorsUseCase(prisma);

      await expect(
        useCase.remove({ evaluatorId: EVALUATOR_ID, removedBy: ASSIGNED_BY }),
      ).rejects.toThrow('already signed');
    });
  });
});
