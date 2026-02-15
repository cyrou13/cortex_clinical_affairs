import type { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError, PermissionDeniedError } from '../../../../shared/errors/index.js';
import type { EventBus } from '../../../../shared/events/event-bus.js';
import { createPccpDeviationApprovedEvent } from '../../domain/events/cer-events.js';

// ── Types ───────────────────────────────────────────────────────────────

const APPROVER_ROLES = ['RA_MANAGER', 'ADMIN'] as const;

export interface ApproveDeviationInput {
  deviationId: string;
  approverId: string;
  approverRole: string;
}

export interface ApproveDeviationResult {
  deviationId: string;
  status: string;
  justificationApproved: boolean;
  approvedById: string;
  approvedAt: string;
}

// ── Use Case ────────────────────────────────────────────────────────────

export class ApproveDeviationJustificationUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: ApproveDeviationInput): Promise<ApproveDeviationResult> {
    // Validate approver role
    if (!APPROVER_ROLES.includes(input.approverRole as (typeof APPROVER_ROLES)[number])) {
      throw new PermissionDeniedError(
        'Only RA Manager or Admin can approve deviation justifications',
      );
    }

    // Fetch deviation
    const deviation = await (this.prisma as any).pccpDeviation.findUnique({
      where: { id: input.deviationId },
      select: {
        id: true,
        cerVersionId: true,
        status: true,
        justification: true,
        significance: true,
      },
    });

    if (!deviation) {
      throw new NotFoundError('PccpDeviation', input.deviationId);
    }

    // Must have justification to approve
    if (!deviation.justification?.trim()) {
      throw new ValidationError('Cannot approve deviation without justification');
    }

    // Must be in IDENTIFIED or JUSTIFIED status
    if (deviation.status !== 'IDENTIFIED' && deviation.status !== 'JUSTIFIED') {
      throw new ValidationError(
        `Cannot approve deviation in ${deviation.status} status. Must be IDENTIFIED or JUSTIFIED`,
      );
    }

    const now = new Date();

    await (this.prisma as any).pccpDeviation.update({
      where: { id: input.deviationId },
      data: {
        status: 'APPROVED',
        justificationApproved: true,
        approvedById: input.approverId,
        approvedAt: now,
      },
    });

    // Emit event
    const event = createPccpDeviationApprovedEvent(
      {
        deviationId: input.deviationId,
        cerVersionId: deviation.cerVersionId,
        approverId: input.approverId,
      },
      input.approverId,
      crypto.randomUUID(),
    );
    void this.eventBus.publish(event);

    return {
      deviationId: input.deviationId,
      status: 'APPROVED',
      justificationApproved: true,
      approvedById: input.approverId,
      approvedAt: now.toISOString(),
    };
  }
}
