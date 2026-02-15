import type { PrismaClient, Prisma } from '@prisma/client';
import { NotFoundError, LockConflictError, ValidationError } from '../../../../shared/errors/index.js';
import type { EventBus } from '../../../../shared/events/event-bus.js';
import { createValidationLockedEvent } from '../../domain/events/validation-locked.js';

// ── Types ───────────────────────────────────────────────────────────────

interface LockValidationInput {
  validationStudyId: string;
  userId: string;
}

interface LockValidationResult {
  validationStudyId: string;
  lockedAt: string;
  snapshotId: string;
}

interface PreLockCheck {
  label: string;
  passed: boolean;
  detail?: string;
}

// ── Use Case ────────────────────────────────────────────────────────────

export class LockValidationUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: LockValidationInput): Promise<LockValidationResult> {
    const { validationStudyId, userId } = input;

    // 1. Fetch study
    const study = await (this.prisma as any).validationStudy.findUnique({
      where: { id: validationStudyId },
      select: {
        id: true,
        status: true,
        projectId: true,
        type: true,
        name: true,
      },
    });

    if (!study) {
      throw new NotFoundError('ValidationStudy', validationStudyId);
    }

    if (study.status === 'LOCKED') {
      throw new LockConflictError('ValidationStudy', validationStudyId);
    }

    // 2. Pre-lock checks
    const checks = await this.runPreLockChecks(validationStudyId);
    const failedChecks = checks.filter((c) => !c.passed);

    if (failedChecks.length > 0) {
      const details = failedChecks.map((c) => `${c.label}: ${c.detail ?? 'failed'}`).join('; ');
      throw new ValidationError(
        `Cannot lock validation study: ${failedChecks.length} check(s) failed (${details})`,
      );
    }

    // 3. Lock study
    const now = new Date();

    await (this.prisma as any).validationStudy.update({
      where: { id: validationStudyId },
      data: {
        status: 'LOCKED',
        lockedAt: now,
        lockedById: userId,
      },
    });

    // 4. Create snapshot
    const snapshot = await (this.prisma as any).validationSnapshot.create({
      data: {
        id: crypto.randomUUID(),
        validationStudyId,
        createdById: userId,
        snapshotData: {
          studyId: validationStudyId,
          studyName: study.name,
          studyType: study.type,
          lockedAt: now.toISOString(),
          checks: checks.map((c) => ({ label: c.label, passed: c.passed })),
        } as unknown as Prisma.InputJsonValue,
      },
    });

    // 5. Audit log
    void (this.prisma as any).auditLog.create({
      data: {
        userId,
        action: 'validation.study.locked',
        targetType: 'validationStudy',
        targetId: validationStudyId,
        before: { status: study.status } as unknown as Prisma.InputJsonValue,
        after: {
          status: 'LOCKED',
          snapshotId: snapshot.id,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    // 6. Emit domain event
    const event = createValidationLockedEvent(
      {
        validationStudyId,
        projectId: study.projectId,
        studyType: study.type,
      },
      userId,
      crypto.randomUUID(),
    );

    void this.eventBus.publish(event);

    return {
      validationStudyId,
      lockedAt: now.toISOString(),
      snapshotId: snapshot.id,
    };
  }

  /**
   * Run all pre-lock checks for a validation study.
   *
   * Required checks:
   * 1. Protocol is approved
   * 2. Active data import exists
   * 3. Results have been mapped
   * 4. At least one report has been generated
   */
  private async runPreLockChecks(validationStudyId: string): Promise<PreLockCheck[]> {
    const checks: PreLockCheck[] = [];

    // Check 1: Protocol approved
    const protocol = await (this.prisma as any).validationProtocol.findFirst({
      where: { validationStudyId },
      select: { id: true, status: true },
      orderBy: { createdAt: 'desc' },
    });

    checks.push({
      label: 'Protocol approved',
      passed: protocol?.status === 'APPROVED',
      detail: protocol ? `Status: ${protocol.status}` : 'No protocol found',
    });

    // Check 2: Active import exists
    const activeImport = await (this.prisma as any).dataImport.findFirst({
      where: {
        validationStudyId,
        status: 'COMPLETED',
      },
      select: { id: true },
    });

    checks.push({
      label: 'Active data import',
      passed: !!activeImport,
      detail: activeImport ? 'Found' : 'No completed data import',
    });

    // Check 3: Results mapped
    const resultCount = await (this.prisma as any).validationResult.count({
      where: { validationStudyId },
    });

    checks.push({
      label: 'Results mapped',
      passed: resultCount > 0,
      detail: `${resultCount} result(s) mapped`,
    });

    // Check 4: Reports generated
    const reportCount = await (this.prisma as any).generatedReport.count({
      where: { validationStudyId },
    });

    checks.push({
      label: 'Reports generated',
      passed: reportCount > 0,
      detail: `${reportCount} report(s) generated`,
    });

    return checks;
  }
}
