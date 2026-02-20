import type { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';

// ── Types ───────────────────────────────────────────────────────────────

export const EXPORT_FORMATS = ['CER_MDR', 'CEP', 'PCCP', 'GSPR_TABLE'] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export interface ExportCerInput {
  cerVersionId: string;
  exportFormat: string;
  userId: string;
}

export interface ExportCerResult {
  jobId: string;
  cerVersionId: string;
  exportFormat: string;
  status: string;
}

export interface TaskEnqueuer {
  enqueueTask(
    type: string,
    data: Record<string, unknown> | undefined,
    userId: string,
  ): Promise<{ id: string }>;
}

// ── Use Case ────────────────────────────────────────────────────────────

export class ExportCerUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly taskService: TaskEnqueuer,
  ) {}

  async execute(input: ExportCerInput): Promise<ExportCerResult> {
    // Validate export format
    if (!EXPORT_FORMATS.includes(input.exportFormat as ExportFormat)) {
      throw new ValidationError(
        `Invalid export format: ${input.exportFormat}. Must be one of: ${EXPORT_FORMATS.join(', ')}`,
      );
    }

    // Verify CER version exists
    const cerVersion = await this.prisma.cerVersion.findUnique({
      where: { id: input.cerVersionId },
      select: { id: true, status: true, projectId: true },
    });

    if (!cerVersion) {
      throw new NotFoundError('CerVersion', input.cerVersionId);
    }

    // Validate sections exist
    const sectionCount = await this.prisma.cerSection.count({
      where: { cerVersionId: input.cerVersionId },
    });

    if (sectionCount === 0) {
      throw new ValidationError('CER version has no sections to export');
    }

    // Enqueue BullMQ job via task service
    const task = await this.taskService.enqueueTask(
      'cer.generate-docx',
      {
        cerVersionId: input.cerVersionId,
        exportFormat: input.exportFormat,
        projectId: cerVersion.projectId,
      },
      input.userId,
    );

    return {
      jobId: task.id,
      cerVersionId: input.cerVersionId,
      exportFormat: input.exportFormat,
      status: 'PENDING',
    };
  }
}
