import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TrackDeviationsUseCase } from './track-deviations.js';

const CER_VERSION_ID = 'cer-v1';
const USER_ID = 'user-1';
const DEVIATION_ID = 'dev-1';

function makeEventBus() {
  return {
    publish: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

function makePrisma(overrides?: {
  cerVersion?: Record<string, unknown> | null;
  config?: Record<string, unknown> | null;
  deviation?: Record<string, unknown> | null;
  deviations?: Record<string, unknown>[];
}) {
  return {
    cerVersion: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.cerVersion !== undefined
          ? overrides.cerVersion
          : { id: CER_VERSION_ID, status: 'IN_PROGRESS' },
      ),
    },
    pccpDeviationConfig: {
      findFirst: vi.fn().mockResolvedValue(
        overrides?.config !== undefined
          ? overrides.config
          : { mandatoryJustificationLevel: 'HIGH' },
      ),
    },
    pccpDeviation: {
      create: vi.fn().mockImplementation(({ data }) => Promise.resolve({
        id: data.id,
        cerVersionId: data.cerVersionId,
        pccpSection: data.pccpSection,
        description: data.description,
        expectedValue: data.expectedValue,
        actualValue: data.actualValue,
        significance: data.significance,
        justification: data.justification,
        impactedSections: data.impactedSections,
        resolutionAction: data.resolutionAction,
        status: data.status,
        exceedsThreshold: data.exceedsThreshold,
      })),
      findUnique: vi.fn().mockResolvedValue(
        overrides?.deviation !== undefined
          ? overrides.deviation
          : {
              id: DEVIATION_ID,
              cerVersionId: CER_VERSION_ID,
              pccpSection: 'Section 1',
              description: 'Test deviation',
              expectedValue: '95',
              actualValue: '90',
              significance: 'MEDIUM',
              justification: null,
              impactedSections: ['Section 2'],
              resolutionAction: null,
              status: 'IDENTIFIED',
              exceedsThreshold: false,
            },
      ),
      update: vi.fn().mockImplementation(({ where, data }) =>
        Promise.resolve({
          id: where.id,
          cerVersionId: CER_VERSION_ID,
          pccpSection: 'Section 1',
          description: data.description ?? 'Test deviation',
          expectedValue: data.expectedValue ?? '95',
          actualValue: data.actualValue ?? '90',
          significance: data.significance ?? 'MEDIUM',
          justification: data.justification ?? null,
          impactedSections: data.impactedSections ?? ['Section 2'],
          resolutionAction: data.resolutionAction ?? null,
          status: data.status ?? 'IDENTIFIED',
          exceedsThreshold: false,
        }),
      ),
      delete: vi.fn().mockResolvedValue({ id: DEVIATION_ID }),
      findMany: vi.fn().mockResolvedValue(overrides?.deviations ?? []),
    },
  } as any;
}

describe('TrackDeviationsUseCase', () => {
  let eventBus: ReturnType<typeof makeEventBus>;

  beforeEach(() => {
    vi.clearAllMocks();
    eventBus = makeEventBus();
  });

  describe('create', () => {
    it('creates a deviation with valid input', async () => {
      const prisma = makePrisma();
      const useCase = new TrackDeviationsUseCase(prisma, eventBus);

      const result = await useCase.create({
        cerVersionId: CER_VERSION_ID,
        pccpSection: 'Section 1',
        description: 'Value differs from expected',
        expectedValue: '95',
        actualValue: '90',
        significance: 'MEDIUM',
        impactedSections: ['Section 2'],
        userId: USER_ID,
      });

      expect(result.cerVersionId).toBe(CER_VERSION_ID);
      expect(result.significance).toBe('MEDIUM');
      expect(result.status).toBe('IDENTIFIED');
    });

    it('throws ValidationError for invalid significance', async () => {
      const prisma = makePrisma();
      const useCase = new TrackDeviationsUseCase(prisma, eventBus);

      await expect(
        useCase.create({
          cerVersionId: CER_VERSION_ID,
          pccpSection: 'Section 1',
          description: 'Test',
          expectedValue: '95',
          actualValue: '90',
          significance: 'INVALID',
          impactedSections: [],
          userId: USER_ID,
        }),
      ).rejects.toThrow('Invalid significance');
    });

    it('throws NotFoundError when CER version does not exist', async () => {
      const prisma = makePrisma({ cerVersion: null });
      const useCase = new TrackDeviationsUseCase(prisma, eventBus);

      await expect(
        useCase.create({
          cerVersionId: 'missing',
          pccpSection: 'Section 1',
          description: 'Test',
          expectedValue: '95',
          actualValue: '90',
          significance: 'LOW',
          impactedSections: [],
          userId: USER_ID,
        }),
      ).rejects.toThrow('not found');
    });

    it('requires justification for HIGH significance', async () => {
      const prisma = makePrisma();
      const useCase = new TrackDeviationsUseCase(prisma, eventBus);

      await expect(
        useCase.create({
          cerVersionId: CER_VERSION_ID,
          pccpSection: 'Section 1',
          description: 'Test',
          expectedValue: '95',
          actualValue: '90',
          significance: 'HIGH',
          impactedSections: [],
          userId: USER_ID,
        }),
      ).rejects.toThrow('Justification is required');
    });

    it('requires justification for CRITICAL significance', async () => {
      const prisma = makePrisma();
      const useCase = new TrackDeviationsUseCase(prisma, eventBus);

      await expect(
        useCase.create({
          cerVersionId: CER_VERSION_ID,
          pccpSection: 'Section 1',
          description: 'Test',
          expectedValue: '95',
          actualValue: '90',
          significance: 'CRITICAL',
          impactedSections: [],
          userId: USER_ID,
        }),
      ).rejects.toThrow('Justification is required');
    });

    it('allows HIGH significance with justification', async () => {
      const prisma = makePrisma();
      const useCase = new TrackDeviationsUseCase(prisma, eventBus);

      const result = await useCase.create({
        cerVersionId: CER_VERSION_ID,
        pccpSection: 'Section 1',
        description: 'Test',
        expectedValue: '95',
        actualValue: '80',
        significance: 'HIGH',
        justification: 'This is justified because...',
        impactedSections: [],
        userId: USER_ID,
      });

      expect(result.significance).toBe('HIGH');
    });

    it('flags deviations exceeding configured thresholds', async () => {
      const prisma = makePrisma({
        config: { mandatoryJustificationLevel: 'MEDIUM' },
      });
      const useCase = new TrackDeviationsUseCase(prisma, eventBus);

      const result = await useCase.create({
        cerVersionId: CER_VERSION_ID,
        pccpSection: 'Section 1',
        description: 'Test',
        expectedValue: '95',
        actualValue: '90',
        significance: 'MEDIUM',
        justification: 'Justified reason',
        impactedSections: [],
        userId: USER_ID,
      });

      expect(result.exceedsThreshold).toBe(true);
    });

    it('emits cer.pccp-deviation.created event', async () => {
      const prisma = makePrisma();
      const useCase = new TrackDeviationsUseCase(prisma, eventBus);

      await useCase.create({
        cerVersionId: CER_VERSION_ID,
        pccpSection: 'Section 1',
        description: 'Test',
        expectedValue: '95',
        actualValue: '90',
        significance: 'LOW',
        impactedSections: [],
        userId: USER_ID,
      });

      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'cer.pccp-deviation.created',
          aggregateType: 'PccpDeviation',
        }),
      );
    });
  });

  describe('update', () => {
    it('updates an existing deviation', async () => {
      const prisma = makePrisma();
      const useCase = new TrackDeviationsUseCase(prisma, eventBus);

      const result = await useCase.update({
        deviationId: DEVIATION_ID,
        description: 'Updated description',
        userId: USER_ID,
      });

      expect(result.id).toBe(DEVIATION_ID);
      expect(prisma.pccpDeviation.update).toHaveBeenCalled();
    });

    it('throws NotFoundError for non-existent deviation', async () => {
      const prisma = makePrisma({ deviation: null });
      const useCase = new TrackDeviationsUseCase(prisma, eventBus);

      await expect(
        useCase.update({ deviationId: 'missing', userId: USER_ID }),
      ).rejects.toThrow('not found');
    });

    it('validates significance on update', async () => {
      const prisma = makePrisma();
      const useCase = new TrackDeviationsUseCase(prisma, eventBus);

      await expect(
        useCase.update({
          deviationId: DEVIATION_ID,
          significance: 'INVALID',
          userId: USER_ID,
        }),
      ).rejects.toThrow('Invalid significance');
    });
  });

  describe('delete', () => {
    it('deletes an existing deviation', async () => {
      const prisma = makePrisma();
      const useCase = new TrackDeviationsUseCase(prisma, eventBus);

      const result = await useCase.delete({
        deviationId: DEVIATION_ID,
        userId: USER_ID,
      });

      expect(result.deleted).toBe(true);
      expect(prisma.pccpDeviation.delete).toHaveBeenCalled();
    });

    it('throws NotFoundError for non-existent deviation', async () => {
      const prisma = makePrisma({ deviation: null });
      const useCase = new TrackDeviationsUseCase(prisma, eventBus);

      await expect(
        useCase.delete({ deviationId: 'missing', userId: USER_ID }),
      ).rejects.toThrow('not found');
    });
  });
});
