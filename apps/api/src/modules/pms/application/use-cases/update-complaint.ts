import type { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';
import { canTransitionComplaint } from '../../domain/value-objects/complaint-status.js';

interface UpdateComplaintInput {
  complaintId: string;
  description?: string;
  severity?: string;
  classification?: string;
  status?: string;
  resolution?: string;
  correctiveAction?: string;
  userId: string;
}

interface UpdateComplaintResult {
  id: string;
  status: string;
  updatedFields: string[];
}

export class UpdateComplaintUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: UpdateComplaintInput): Promise<UpdateComplaintResult> {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id: input.complaintId },
    });

    if (!complaint) {
      throw new NotFoundError('Complaint', input.complaintId);
    }

    if (input.status && !canTransitionComplaint(complaint.status, input.status as any)) {
      throw new ValidationError(`Cannot transition complaint from ${complaint.status} to ${input.status}`);
    }

    const updateData: Record<string, unknown> = {};
    const updatedFields: string[] = [];

    if (input.description !== undefined) { updateData.description = input.description; updatedFields.push('description'); }
    if (input.severity !== undefined) { updateData.severity = input.severity; updatedFields.push('severity'); }
    if (input.classification !== undefined) { updateData.classification = input.classification; updatedFields.push('classification'); }
    if (input.status !== undefined) {
      updateData.status = input.status;
      updatedFields.push('status');
      if (input.status === 'RESOLVED') {
        updateData.resolutionDate = new Date();
      }
    }
    if (input.resolution !== undefined) { updateData.resolution = input.resolution; updatedFields.push('resolution'); }
    if (input.correctiveAction !== undefined) { updateData.correctiveAction = input.correctiveAction; updatedFields.push('correctiveAction'); }

    await this.prisma.complaint.update({
      where: { id: input.complaintId },
      data: updateData,
    });

    return {
      id: input.complaintId,
      status: (input.status ?? complaint.status) as string,
      updatedFields,
    };
  }
}
