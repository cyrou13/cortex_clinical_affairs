import type { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';
import { isValidComplaintSeverity } from '../../domain/value-objects/complaint-status.js';

interface CreateComplaintInput {
  pmsCycleId: string;
  date: string;
  reportDate: string;
  description: string;
  deviceIdentifier: string;
  lotNumber?: string;
  serialNumber?: string;
  severity: string;
  classification: string;
  classificationDescription?: string;
  isIncident?: boolean;
  regulatoryReportRequired?: boolean;
  harmSeverity?: string;
  reporterName?: string;
  reporterContact?: string;
  userId: string;
}

interface ComplaintResult {
  id: string;
  pmsCycleId: string;
  date: Date;
  description: string;
  deviceIdentifier: string;
  severity: string;
  classification: string;
  status: string;
  source: string;
  isIncident: boolean;
}

export class CreateComplaintUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: CreateComplaintInput): Promise<ComplaintResult> {
    if (!isValidComplaintSeverity(input.severity)) {
      throw new ValidationError(`Invalid complaint severity: ${input.severity}`);
    }

    if (!input.description.trim()) {
      throw new ValidationError('Complaint description is required');
    }

    const cycle = await this.prisma.pmsCycle.findUnique({
      where: { id: input.pmsCycleId },
      select: { id: true },
    });

    if (!cycle) {
      throw new NotFoundError('PmsCycle', input.pmsCycleId);
    }

    const complaint = await this.prisma.complaint.create({
      data: {
        id: crypto.randomUUID(),
        pmsCycleId: input.pmsCycleId,
        date: new Date(input.date),
        reportDate: new Date(input.reportDate),
        description: input.description.trim(),
        deviceIdentifier: input.deviceIdentifier,
        lotNumber: input.lotNumber ?? null,
        serialNumber: input.serialNumber ?? null,
        severity: input.severity,
        classification: input.classification,
        classificationDescription: input.classificationDescription ?? null,
        status: 'OPEN',
        source: 'MANUAL',
        isIncident: input.isIncident ?? false,
        regulatoryReportRequired: input.regulatoryReportRequired ?? false,
        harmSeverity: input.harmSeverity ?? null,
        reporterName: input.reporterName ?? null,
        reporterContact: input.reporterContact ?? null,
        createdById: input.userId,
      },
    });

    return complaint;
  }
}
