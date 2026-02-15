import type { PrismaClient } from '@prisma/client';
import type { EventBus } from '../../../../shared/events/event-bus.js';
import { NotFoundError } from '../../../../shared/errors/index.js';
import { createComplaintsImportedEvent } from '../../domain/events/pms-events.js';

interface ImportComplaintsInput {
  pmsCycleId: string;
  complaints: Array<{
    date: string;
    reportDate: string;
    description: string;
    deviceIdentifier: string;
    severity: string;
    classification: string;
    externalId?: string;
    isIncident?: boolean;
  }>;
  source: string;
  userId: string;
}

interface ImportComplaintsResult {
  pmsCycleId: string;
  imported: number;
  skipped: number;
  errors: Array<{ rowIndex: number; message: string }>;
}

export class ImportComplaintsUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: ImportComplaintsInput): Promise<ImportComplaintsResult> {
    const cycle = await this.prisma.pmsCycle.findUnique({
      where: { id: input.pmsCycleId },
      select: { id: true },
    });

    if (!cycle) {
      throw new NotFoundError('PmsCycle', input.pmsCycleId);
    }

    let imported = 0;
    let skipped = 0;
    const errors: Array<{ rowIndex: number; message: string }> = [];

    for (let i = 0; i < input.complaints.length; i++) {
      const complaint = input.complaints[i];

      if (complaint.externalId) {
        const existing = await this.prisma.complaint.findFirst({
          where: { pmsCycleId: input.pmsCycleId, externalId: complaint.externalId },
        });
        if (existing) {
          skipped++;
          continue;
        }
      }

      try {
        await this.prisma.complaint.create({
          data: {
            id: crypto.randomUUID(),
            pmsCycleId: input.pmsCycleId,
            date: new Date(complaint.date),
            reportDate: new Date(complaint.reportDate),
            description: complaint.description,
            deviceIdentifier: complaint.deviceIdentifier,
            severity: complaint.severity,
            classification: complaint.classification,
            status: 'OPEN',
            source: input.source,
            externalId: complaint.externalId ?? null,
            isIncident: complaint.isIncident ?? false,
            regulatoryReportRequired: false,
            createdById: input.userId,
          },
        });
        imported++;
      } catch (err) {
        errors.push({ rowIndex: i, message: (err as Error).message });
      }
    }

    const event = createComplaintsImportedEvent(
      { pmsCycleId: input.pmsCycleId, imported, skipped, source: input.source },
      input.userId,
      crypto.randomUUID(),
    );
    void this.eventBus.publish(event);

    return { pmsCycleId: input.pmsCycleId, imported, skipped, errors };
  }
}
