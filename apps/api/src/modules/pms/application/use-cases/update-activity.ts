import type { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';

interface UpdateActivityInput {
  activityId: string;
  title?: string;
  description?: string;
  findingsSummary?: string;
  conclusions?: string;
  dataCollected?: Record<string, unknown>;
  userId: string;
}

interface UpdateActivityResult {
  activityId: string;
  title: string;
  status: string;
  updatedFields: string[];
}

export class UpdateActivityUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: UpdateActivityInput): Promise<UpdateActivityResult> {
    const activity = await (this.prisma as any).pmcfActivity.findUnique({
      where: { id: input.activityId },
    });

    if (!activity) {
      throw new NotFoundError('PmcfActivity', input.activityId);
    }

    if (activity.status === 'COMPLETED') {
      throw new ValidationError('Cannot update a completed activity');
    }

    const updateData: Record<string, unknown> = {};
    const updatedFields: string[] = [];

    if (input.title !== undefined) { updateData.title = input.title; updatedFields.push('title'); }
    if (input.description !== undefined) { updateData.description = input.description; updatedFields.push('description'); }
    if (input.findingsSummary !== undefined) { updateData.findingsSummary = input.findingsSummary; updatedFields.push('findingsSummary'); }
    if (input.conclusions !== undefined) { updateData.conclusions = input.conclusions; updatedFields.push('conclusions'); }
    if (input.dataCollected !== undefined) { updateData.dataCollected = input.dataCollected; updatedFields.push('dataCollected'); }

    const updated = await (this.prisma as any).pmcfActivity.update({
      where: { id: input.activityId },
      data: updateData,
    });

    return {
      activityId: updated.id,
      title: updated.title,
      status: updated.status,
      updatedFields,
    };
  }
}
