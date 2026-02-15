import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateBenefitRiskUseCase } from './update-benefit-risk.js';

const ITEM_ID = 'item-1';
const MIT_ID = 'mit-1';
const USER_ID = 'user-1';

function makePrisma(overrides?: {
  item?: Record<string, unknown> | null;
  mitigation?: Record<string, unknown> | null;
}) {
  return {
    benefitRiskItem: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.item !== undefined
          ? overrides.item
          : {
              id: ITEM_ID,
              itemType: 'BENEFIT',
              description: 'Original benefit',
              severity: null,
              probability: null,
              riskLevel: null,
            },
      ),
      update: vi.fn().mockResolvedValue({ id: ITEM_ID }),
    },
    benefitRiskMitigation: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.mitigation !== undefined
          ? overrides.mitigation
          : { id: MIT_ID, description: 'Original mitigation', residualRiskLevel: 'ALARP' },
      ),
      update: vi.fn().mockResolvedValue({ id: MIT_ID }),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  } as any;
}

describe('UpdateBenefitRiskUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateBenefit', () => {
    it('updates benefit description', async () => {
      const prisma = makePrisma();
      const useCase = new UpdateBenefitRiskUseCase(prisma);

      const result = await useCase.updateBenefit({
        benefitRiskItemId: ITEM_ID,
        description: 'Updated benefit',
        userId: USER_ID,
      });

      expect(result.description).toBe('Updated benefit');
      expect(result.updatedFields).toContain('description');
    });

    it('throws NotFoundError when item not found', async () => {
      const prisma = makePrisma({ item: null });
      const useCase = new UpdateBenefitRiskUseCase(prisma);

      await expect(
        useCase.updateBenefit({ benefitRiskItemId: 'missing', userId: USER_ID }),
      ).rejects.toThrow('not found');
    });

    it('throws ValidationError when item is not a benefit', async () => {
      const prisma = makePrisma({
        item: { id: ITEM_ID, itemType: 'RISK', description: 'A risk' },
      });
      const useCase = new UpdateBenefitRiskUseCase(prisma);

      await expect(
        useCase.updateBenefit({ benefitRiskItemId: ITEM_ID, userId: USER_ID }),
      ).rejects.toThrow('not a benefit');
    });
  });

  describe('updateRisk', () => {
    it('updates risk severity and recomputes risk level', async () => {
      const prisma = makePrisma({
        item: {
          id: ITEM_ID,
          itemType: 'RISK',
          description: 'A risk',
          severity: 'MINOR',
          probability: 'REMOTE',
          riskLevel: 'ACCEPTABLE',
        },
      });
      const useCase = new UpdateBenefitRiskUseCase(prisma);

      const result = await useCase.updateRisk({
        benefitRiskItemId: ITEM_ID,
        severity: 'CATASTROPHIC',
        userId: USER_ID,
      });

      expect(result.riskLevel).toBe('ALARP'); // 5*2=10
      expect(result.updatedFields).toContain('severity');
      expect(result.updatedFields).toContain('riskLevel');
    });

    it('recomputes risk level on probability change', async () => {
      const prisma = makePrisma({
        item: {
          id: ITEM_ID,
          itemType: 'RISK',
          description: 'A risk',
          severity: 'CRITICAL',
          probability: 'IMPROBABLE',
          riskLevel: 'ACCEPTABLE',
        },
      });
      const useCase = new UpdateBenefitRiskUseCase(prisma);

      const result = await useCase.updateRisk({
        benefitRiskItemId: ITEM_ID,
        probability: 'FREQUENT',
        userId: USER_ID,
      });

      expect(result.riskLevel).toBe('UNACCEPTABLE'); // 4*5=20
    });

    it('throws ValidationError for invalid severity', async () => {
      const prisma = makePrisma({
        item: { id: ITEM_ID, itemType: 'RISK', description: 'A risk', severity: 'MINOR', probability: 'REMOTE', riskLevel: 'ACCEPTABLE' },
      });
      const useCase = new UpdateBenefitRiskUseCase(prisma);

      await expect(
        useCase.updateRisk({
          benefitRiskItemId: ITEM_ID,
          severity: 'INVALID' as any,
          userId: USER_ID,
        }),
      ).rejects.toThrow('Invalid severity');
    });

    it('throws ValidationError for invalid probability', async () => {
      const prisma = makePrisma({
        item: { id: ITEM_ID, itemType: 'RISK', description: 'A risk', severity: 'MINOR', probability: 'REMOTE', riskLevel: 'ACCEPTABLE' },
      });
      const useCase = new UpdateBenefitRiskUseCase(prisma);

      await expect(
        useCase.updateRisk({
          benefitRiskItemId: ITEM_ID,
          probability: 'INVALID' as any,
          userId: USER_ID,
        }),
      ).rejects.toThrow('Invalid probability');
    });
  });

  describe('updateMitigation', () => {
    it('updates mitigation description', async () => {
      const prisma = makePrisma();
      const useCase = new UpdateBenefitRiskUseCase(prisma);

      const result = await useCase.updateMitigation({
        mitigationId: MIT_ID,
        description: 'Updated mitigation measure',
        userId: USER_ID,
      });

      expect(result.description).toBe('Updated mitigation measure');
      expect(result.updatedFields).toContain('description');
    });

    it('throws NotFoundError when mitigation not found', async () => {
      const prisma = makePrisma({ mitigation: null });
      const useCase = new UpdateBenefitRiskUseCase(prisma);

      await expect(
        useCase.updateMitigation({ mitigationId: 'missing', userId: USER_ID }),
      ).rejects.toThrow('not found');
    });

    it('updates residual risk level', async () => {
      const prisma = makePrisma();
      const useCase = new UpdateBenefitRiskUseCase(prisma);

      const result = await useCase.updateMitigation({
        mitigationId: MIT_ID,
        residualRiskLevel: 'ACCEPTABLE',
        userId: USER_ID,
      });

      expect(result.riskLevel).toBe('ACCEPTABLE');
    });
  });
});
