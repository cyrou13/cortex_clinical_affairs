import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ManageImportVersionsUseCase } from './manage-import-versions.js';

function makePrisma(overrides?: {
  currentActive?: Record<string, unknown> | null;
  targetImport?: Record<string, unknown> | null;
  importA?: Record<string, unknown> | null;
  importB?: Record<string, unknown> | null;
}) {
  const findFirstFn = vi.fn();

  // Default implementations
  if (overrides?.importA !== undefined || overrides?.importB !== undefined) {
    // computeDiff mode
    let callCount = 0;
    findFirstFn.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve(overrides?.importA ?? null);
      return Promise.resolve(overrides?.importB ?? null);
    });
  } else {
    // setActiveVersion/rollback mode
    let callCount = 0;
    findFirstFn.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve(
          overrides?.currentActive !== undefined
            ? overrides.currentActive
            : { id: 'import-1', version: 1 },
        );
      }
      return Promise.resolve(
        overrides?.targetImport !== undefined
          ? overrides.targetImport
          : { id: 'import-2', version: 2 },
      );
    });
  }

  return {
    dataImport: {
      findFirst: findFirstFn,
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      update: vi.fn().mockResolvedValue({}),
    },
  } as any;
}

describe('ManageImportVersionsUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('setActiveVersion', () => {
    it('sets the target version as active', async () => {
      const prisma = makePrisma({
        currentActive: { id: 'import-1', version: 1 },
        targetImport: { id: 'import-2', version: 2 },
      });
      const useCase = new ManageImportVersionsUseCase(prisma);

      const result = await useCase.setActiveVersion({
        validationStudyId: 'study-1',
        version: 2,
      });

      expect(result.version).toBe(2);
      expect(result.previousActiveVersion).toBe(1);
      expect(prisma.dataImport.updateMany).toHaveBeenCalled();
      expect(prisma.dataImport.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'import-2' },
          data: { isActive: true },
        }),
      );
    });

    it('throws when target version not found', async () => {
      const prisma = makePrisma({
        currentActive: { id: 'import-1', version: 1 },
        targetImport: null,
      });
      const useCase = new ManageImportVersionsUseCase(prisma);

      await expect(
        useCase.setActiveVersion({
          validationStudyId: 'study-1',
          version: 99,
        }),
      ).rejects.toThrow('not found');
    });

    it('handles no previous active version', async () => {
      const prisma = makePrisma({
        currentActive: null,
        targetImport: { id: 'import-1', version: 1 },
      });
      const useCase = new ManageImportVersionsUseCase(prisma);

      const result = await useCase.setActiveVersion({
        validationStudyId: 'study-1',
        version: 1,
      });

      expect(result.previousActiveVersion).toBeNull();
    });
  });

  describe('rollbackToVersion', () => {
    it('rolls back from version 3 to version 1', async () => {
      const prisma = makePrisma({
        currentActive: { id: 'import-3', version: 3 },
        targetImport: { id: 'import-1', version: 1 },
      });
      const useCase = new ManageImportVersionsUseCase(prisma);

      const result = await useCase.rollbackToVersion({
        validationStudyId: 'study-1',
        targetVersion: 1,
      });

      expect(result.version).toBe(1);
      expect(result.rolledBackFrom).toBe(3);
    });

    it('throws when no active import exists', async () => {
      const prisma = makePrisma({
        currentActive: null,
        targetImport: { id: 'import-1', version: 1 },
      });
      const useCase = new ManageImportVersionsUseCase(prisma);

      await expect(
        useCase.rollbackToVersion({
          validationStudyId: 'study-1',
          targetVersion: 1,
        }),
      ).rejects.toThrow('No active import');
    });

    it('throws when target version >= current version', async () => {
      const prisma = makePrisma({
        currentActive: { id: 'import-2', version: 2 },
        targetImport: { id: 'import-2', version: 2 },
      });
      const useCase = new ManageImportVersionsUseCase(prisma);

      await expect(
        useCase.rollbackToVersion({
          validationStudyId: 'study-1',
          targetVersion: 2,
        }),
      ).rejects.toThrow('must be less than');
    });
  });

  describe('computeDiff', () => {
    it('detects additions when version B has more rows', async () => {
      const prisma = makePrisma({
        importA: {
          data: [{ case_id: 'C001', value: 1 }],
          rowCount: 1,
        },
        importB: {
          data: [{ case_id: 'C001', value: 1 }, { case_id: 'C002', value: 2 }],
          rowCount: 2,
        },
      });
      const useCase = new ManageImportVersionsUseCase(prisma);

      const result = await useCase.computeDiff({
        validationStudyId: 'study-1',
        versionA: 1,
        versionB: 2,
      });

      expect(result.additions).toBe(1);
      expect(result.deletions).toBe(0);
    });

    it('detects deletions when version B has fewer rows', async () => {
      const prisma = makePrisma({
        importA: {
          data: [{ case_id: 'C001' }, { case_id: 'C002' }],
          rowCount: 2,
        },
        importB: {
          data: [{ case_id: 'C001' }],
          rowCount: 1,
        },
      });
      const useCase = new ManageImportVersionsUseCase(prisma);

      const result = await useCase.computeDiff({
        validationStudyId: 'study-1',
        versionA: 1,
        versionB: 2,
      });

      expect(result.deletions).toBe(1);
    });

    it('detects modifications in field values', async () => {
      const prisma = makePrisma({
        importA: {
          data: [{ case_id: 'C001', value: 'old' }],
          rowCount: 1,
        },
        importB: {
          data: [{ case_id: 'C001', value: 'new' }],
          rowCount: 1,
        },
      });
      const useCase = new ManageImportVersionsUseCase(prisma);

      const result = await useCase.computeDiff({
        validationStudyId: 'study-1',
        versionA: 1,
        versionB: 2,
      });

      expect(result.modifications).toBe(1);
      expect(result.details).toHaveLength(1);
      expect(result.details[0].field).toBe('value');
      expect(result.details[0].oldValue).toBe('old');
      expect(result.details[0].newValue).toBe('new');
    });

    it('returns empty diff for identical data', async () => {
      const data = [{ case_id: 'C001', value: 'same' }];
      const prisma = makePrisma({
        importA: { data, rowCount: 1 },
        importB: { data, rowCount: 1 },
      });
      const useCase = new ManageImportVersionsUseCase(prisma);

      const result = await useCase.computeDiff({
        validationStudyId: 'study-1',
        versionA: 1,
        versionB: 2,
      });

      expect(result.additions).toBe(0);
      expect(result.deletions).toBe(0);
      expect(result.modifications).toBe(0);
    });

    it('throws when version A not found', async () => {
      const prisma = makePrisma({
        importA: null,
        importB: { data: [], rowCount: 0 },
      });
      const useCase = new ManageImportVersionsUseCase(prisma);

      await expect(
        useCase.computeDiff({
          validationStudyId: 'study-1',
          versionA: 99,
          versionB: 1,
        }),
      ).rejects.toThrow('not found');
    });

    it('throws when version B not found', async () => {
      const prisma = makePrisma({
        importA: { data: [], rowCount: 0 },
        importB: null,
      });
      const useCase = new ManageImportVersionsUseCase(prisma);

      await expect(
        useCase.computeDiff({
          validationStudyId: 'study-1',
          versionA: 1,
          versionB: 99,
        }),
      ).rejects.toThrow('not found');
    });
  });
});
