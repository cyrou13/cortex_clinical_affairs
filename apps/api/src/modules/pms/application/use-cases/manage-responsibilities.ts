import type { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';
import { isValidActivityType } from '../../domain/value-objects/activity-type.js';

interface AddResponsibilityInput {
  pmsPlanId: string;
  activityType: string;
  userId: string;
  role: string;
  description?: string;
  assignedBy: string;
}

interface ResponsibilityResult {
  id: string;
  pmsPlanId: string;
  activityType: string;
  userId: string;
  role: string;
  description: string | null;
}

export class ManageResponsibilitiesUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async add(input: AddResponsibilityInput): Promise<ResponsibilityResult> {
    if (!isValidActivityType(input.activityType)) {
      throw new ValidationError(`Invalid activity type: ${input.activityType}`);
    }

    const plan = await this.prisma.pmsPlan.findUnique({
      where: { id: input.pmsPlanId },
      select: { id: true },
    });

    if (!plan) {
      throw new NotFoundError('PmsPlan', input.pmsPlanId);
    }

    const responsibility = await this.prisma.pmsResponsibility.create({
      data: {
        id: crypto.randomUUID(),
        pmsPlanId: input.pmsPlanId,
        activityType: input.activityType,
        userId: input.userId,
        role: input.role,
        description: input.description ?? null,
      },
    });

    return responsibility;
  }

  async remove(responsibilityId: string): Promise<{ deleted: boolean }> {
    await this.prisma.pmsResponsibility.delete({
      where: { id: responsibilityId },
    });
    return { deleted: true };
  }

  async list(pmsPlanId: string): Promise<ResponsibilityResult[]> {
    return this.prisma.pmsResponsibility.findMany({
      where: { pmsPlanId },
      orderBy: { activityType: 'asc' },
    });
  }
}
