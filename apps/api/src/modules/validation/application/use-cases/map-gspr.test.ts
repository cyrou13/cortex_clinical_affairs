import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MapGsprUseCase } from './map-gspr.js';

const STUDY_ID = 'study-1';
const USER_ID = 'user-1';
const GSPR_ID = 'GSPR-1';
const MAPPING_ID = 'mapping-1';

function makePrisma(overrides?: {
  study?: Record<string, unknown> | null;
  existingMapping?: Record<string, unknown> | null;
}) {
  return {
    validationStudy: {
      findUnique: vi
        .fn()
        .mockResolvedValue(
          overrides?.study !== undefined
            ? overrides.study
            : { id: STUDY_ID, status: 'IN_PROGRESS' },
        ),
    },
    gsprMapping: {
      findFirst: vi
        .fn()
        .mockResolvedValue(
          overrides?.existingMapping !== undefined ? overrides.existingMapping : null,
        ),
      create: vi.fn().mockResolvedValue({
        id: MAPPING_ID,
        validationStudyId: STUDY_ID,
        gsprId: GSPR_ID,
        status: 'COMPLIANT',
        justification: null,
        evidenceReferences: [],
      }),
      update: vi.fn().mockResolvedValue({
        id: MAPPING_ID,
        validationStudyId: STUDY_ID,
        gsprId: GSPR_ID,
        status: 'PARTIAL',
        justification: 'Partial compliance reason',
        evidenceReferences: [],
      }),
      delete: vi.fn().mockResolvedValue({}),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  } as any;
}

describe('MapGsprUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('execute (create/update)', () => {
    it('creates a new GSPR mapping when none exists', async () => {
      const prisma = makePrisma();
      const useCase = new MapGsprUseCase(prisma);

      const result = await useCase.execute({
        validationStudyId: STUDY_ID,
        gsprId: GSPR_ID,
        status: 'COMPLIANT',
        userId: USER_ID,
      });

      expect(result.id).toBe(MAPPING_ID);
      expect(result.gsprId).toBe(GSPR_ID);
      expect(result.status).toBe('COMPLIANT');
      expect(prisma.gsprMapping.create).toHaveBeenCalled();
      expect(prisma.gsprMapping.update).not.toHaveBeenCalled();
    });

    it('updates existing mapping when one exists', async () => {
      const prisma = makePrisma({
        existingMapping: {
          id: MAPPING_ID,
          validationStudyId: STUDY_ID,
          gsprId: GSPR_ID,
          status: 'COMPLIANT',
          justification: null,
        },
      });
      const useCase = new MapGsprUseCase(prisma);

      const result = await useCase.execute({
        validationStudyId: STUDY_ID,
        gsprId: GSPR_ID,
        status: 'PARTIAL',
        justification: 'Partial compliance reason',
        userId: USER_ID,
      });

      expect(result.status).toBe('PARTIAL');
      expect(prisma.gsprMapping.update).toHaveBeenCalled();
      expect(prisma.gsprMapping.create).not.toHaveBeenCalled();
    });

    it('throws NotFoundError when study does not exist', async () => {
      const prisma = makePrisma({ study: null });
      const useCase = new MapGsprUseCase(prisma);

      await expect(
        useCase.execute({
          validationStudyId: 'missing',
          gsprId: GSPR_ID,
          status: 'COMPLIANT',
          userId: USER_ID,
        }),
      ).rejects.toThrow('not found');
    });

    it('throws ValidationError when study is locked', async () => {
      const prisma = makePrisma({
        study: { id: STUDY_ID, status: 'LOCKED' },
      });
      const useCase = new MapGsprUseCase(prisma);

      await expect(
        useCase.execute({
          validationStudyId: STUDY_ID,
          gsprId: GSPR_ID,
          status: 'COMPLIANT',
          userId: USER_ID,
        }),
      ).rejects.toThrow('locked');
    });

    it('throws ValidationError when PARTIAL status has no justification', async () => {
      const prisma = makePrisma();
      const useCase = new MapGsprUseCase(prisma);

      await expect(
        useCase.execute({
          validationStudyId: STUDY_ID,
          gsprId: GSPR_ID,
          status: 'PARTIAL',
          userId: USER_ID,
        }),
      ).rejects.toThrow('Justification is required');
    });

    it('throws ValidationError when NOT_APPLICABLE status has no justification', async () => {
      const prisma = makePrisma();
      const useCase = new MapGsprUseCase(prisma);

      await expect(
        useCase.execute({
          validationStudyId: STUDY_ID,
          gsprId: GSPR_ID,
          status: 'NOT_APPLICABLE',
          userId: USER_ID,
        }),
      ).rejects.toThrow('Justification is required');
    });

    it('allows PARTIAL status with justification', async () => {
      const prisma = makePrisma();
      prisma.gsprMapping.create.mockResolvedValue({
        id: MAPPING_ID,
        validationStudyId: STUDY_ID,
        gsprId: GSPR_ID,
        status: 'PARTIAL',
        justification: 'Reason for partial',
        evidenceReferences: [],
      });
      const useCase = new MapGsprUseCase(prisma);

      const result = await useCase.execute({
        validationStudyId: STUDY_ID,
        gsprId: GSPR_ID,
        status: 'PARTIAL',
        justification: 'Reason for partial',
        userId: USER_ID,
      });

      expect(result.status).toBe('PARTIAL');
      expect(result.justification).toBe('Reason for partial');
    });

    it('allows NOT_APPLICABLE status with justification', async () => {
      const prisma = makePrisma();
      prisma.gsprMapping.create.mockResolvedValue({
        id: MAPPING_ID,
        validationStudyId: STUDY_ID,
        gsprId: GSPR_ID,
        status: 'NOT_APPLICABLE',
        justification: 'N/A reason',
        evidenceReferences: [],
      });
      const useCase = new MapGsprUseCase(prisma);

      const result = await useCase.execute({
        validationStudyId: STUDY_ID,
        gsprId: GSPR_ID,
        status: 'NOT_APPLICABLE',
        justification: 'N/A reason',
        userId: USER_ID,
      });

      expect(result.status).toBe('NOT_APPLICABLE');
    });

    it('COMPLIANT status does not require justification', async () => {
      const prisma = makePrisma();
      const useCase = new MapGsprUseCase(prisma);

      const result = await useCase.execute({
        validationStudyId: STUDY_ID,
        gsprId: GSPR_ID,
        status: 'COMPLIANT',
        userId: USER_ID,
      });

      expect(result.justification).toBeNull();
    });

    it('includes evidence references in result', async () => {
      const prisma = makePrisma();
      const useCase = new MapGsprUseCase(prisma);

      const result = await useCase.execute({
        validationStudyId: STUDY_ID,
        gsprId: GSPR_ID,
        status: 'COMPLIANT',
        evidenceReferences: ['REF-001', 'REF-002'],
        userId: USER_ID,
      });

      expect(result.evidenceReferences).toEqual(['REF-001', 'REF-002']);
    });

    it('creates audit log entry', async () => {
      const prisma = makePrisma();
      const useCase = new MapGsprUseCase(prisma);

      await useCase.execute({
        validationStudyId: STUDY_ID,
        gsprId: GSPR_ID,
        status: 'COMPLIANT',
        userId: USER_ID,
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: USER_ID,
            action: 'gspr.mapping.created',
            targetType: 'gsprMapping',
          }),
        }),
      );
    });

    it('creates audit log entry for update', async () => {
      const prisma = makePrisma({
        existingMapping: {
          id: MAPPING_ID,
          status: 'COMPLIANT',
          justification: null,
        },
      });
      const useCase = new MapGsprUseCase(prisma);

      await useCase.execute({
        validationStudyId: STUDY_ID,
        gsprId: GSPR_ID,
        status: 'PARTIAL',
        justification: 'Updated reason',
        userId: USER_ID,
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'gspr.mapping.updated',
          }),
        }),
      );
    });
  });

  describe('delete', () => {
    it('deletes existing mapping', async () => {
      const prisma = makePrisma({
        existingMapping: {
          id: MAPPING_ID,
          validationStudyId: STUDY_ID,
          gsprId: GSPR_ID,
          status: 'COMPLIANT',
        },
      });
      const useCase = new MapGsprUseCase(prisma);

      await useCase.delete({
        validationStudyId: STUDY_ID,
        gsprId: GSPR_ID,
        userId: USER_ID,
      });

      expect(prisma.gsprMapping.delete).toHaveBeenCalledWith({
        where: { id: MAPPING_ID },
      });
    });

    it('throws NotFoundError when study does not exist', async () => {
      const prisma = makePrisma({ study: null });
      const useCase = new MapGsprUseCase(prisma);

      await expect(
        useCase.delete({
          validationStudyId: 'missing',
          gsprId: GSPR_ID,
          userId: USER_ID,
        }),
      ).rejects.toThrow('not found');
    });

    it('throws ValidationError when study is locked', async () => {
      const prisma = makePrisma({
        study: { id: STUDY_ID, status: 'LOCKED' },
      });
      const useCase = new MapGsprUseCase(prisma);

      await expect(
        useCase.delete({
          validationStudyId: STUDY_ID,
          gsprId: GSPR_ID,
          userId: USER_ID,
        }),
      ).rejects.toThrow('locked');
    });

    it('throws NotFoundError when mapping does not exist', async () => {
      const prisma = makePrisma({ existingMapping: null });
      const useCase = new MapGsprUseCase(prisma);

      await expect(
        useCase.delete({
          validationStudyId: STUDY_ID,
          gsprId: 'GSPR-999',
          userId: USER_ID,
        }),
      ).rejects.toThrow('not found');
    });

    it('creates audit log entry on delete', async () => {
      const prisma = makePrisma({
        existingMapping: {
          id: MAPPING_ID,
          status: 'COMPLIANT',
          gsprId: GSPR_ID,
        },
      });
      const useCase = new MapGsprUseCase(prisma);

      await useCase.delete({
        validationStudyId: STUDY_ID,
        gsprId: GSPR_ID,
        userId: USER_ID,
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'gspr.mapping.deleted',
          }),
        }),
      );
    });
  });
});
