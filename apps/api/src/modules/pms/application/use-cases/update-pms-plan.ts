import type { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';

interface UpdatePmsPlanInput {
  pmsPlanId: string;
  updateFrequency?: string;
  dataCollectionMethods?: string[];
  userId: string;
}

interface UpdatePmsPlanResult {
  pmsPlanId: string;
  updateFrequency: string;
  dataCollectionMethods: unknown;
  status: string;
}

export class UpdatePmsPlanUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: UpdatePmsPlanInput): Promise<UpdatePmsPlanResult> {
    const plan = await (this.prisma as any).pmsPlan.findUnique({
      where: { id: input.pmsPlanId },
    });

    if (!plan) {
      throw new NotFoundError('PmsPlan', input.pmsPlanId);
    }

    if (plan.status !== 'DRAFT') {
      throw new ValidationError('PMS plan can only be updated in DRAFT status');
    }

    const updated = await (this.prisma as any).pmsPlan.update({
      where: { id: input.pmsPlanId },
      data: {
        ...(input.updateFrequency !== undefined && { updateFrequency: input.updateFrequency.trim() }),
        ...(input.dataCollectionMethods !== undefined && { dataCollectionMethods: input.dataCollectionMethods }),
      },
    });

    return {
      pmsPlanId: updated.id,
      updateFrequency: updated.updateFrequency,
      dataCollectionMethods: updated.dataCollectionMethods,
      status: updated.status,
    };
  }
}
