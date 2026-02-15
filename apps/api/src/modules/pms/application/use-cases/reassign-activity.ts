import type { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';

interface ReassignActivityResult {
  activityId: string;
  previousAssigneeId: string;
  newAssigneeId: string;
}

export class ReassignActivityUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(activityId: string, newAssigneeId: string, userId: string): Promise<ReassignActivityResult> {
    const activity = await this.prisma.pmcfActivity.findUnique({
      where: { id: activityId },
      select: { id: true, status: true, assigneeId: true },
    });

    if (!activity) {
      throw new NotFoundError('PmcfActivity', activityId);
    }

    if (activity.status === 'COMPLETED') {
      throw new ValidationError('Cannot reassign a completed activity');
    }

    const previousAssigneeId = activity.assigneeId;

    await this.prisma.pmcfActivity.update({
      where: { id: activityId },
      data: { assigneeId: newAssigneeId },
    });

    return { activityId, previousAssigneeId, newAssigneeId };
  }
}
