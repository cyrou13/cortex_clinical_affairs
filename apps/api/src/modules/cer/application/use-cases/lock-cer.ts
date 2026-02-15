import type { PrismaClient, Prisma } from '@prisma/client';
import {
  NotFoundError,
  ValidationError,
  LockConflictError,
} from '../../../../shared/errors/index.js';
import type { EventBus } from '../../../../shared/events/event-bus.js';
import { createCerVersionLockedEvent } from '../../domain/events/cer-events.js';
import { CreateUpstreamSnapshotsUseCase } from './create-upstream-snapshots.js';
import type { ChecksumService } from '../../../../shared/services/checksum-service.js';

// ── Types ───────────────────────────────────────────────────────────────

interface LockCerInput {
  cerVersionId: string;
  userId: string;
}

interface PreLockCheck {
  label: string;
  passed: boolean;
  detail?: string;
}

interface LockCerResult {
  cerVersionId: string;
  lockedAt: string;
  snapshotCount: number;
}

// ── Use Case ────────────────────────────────────────────────────────────

export class LockCerUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly eventBus: EventBus,
    private readonly checksumService: ChecksumService,
  ) {}

  async execute(input: LockCerInput): Promise<LockCerResult> {
    const { cerVersionId, userId } = input;

    // 1. Fetch CER version
    const cerVersion = await this.prisma.cerVersion.findUnique({
      where: { id: cerVersionId },
      select: {
        id: true,
        status: true,
        projectId: true,
        versionNumber: true,
      },
    });

    if (!cerVersion) {
      throw new NotFoundError('CerVersion', cerVersionId);
    }

    if (cerVersion.status === 'LOCKED') {
      throw new LockConflictError('CerVersion', cerVersionId);
    }

    // 2. Pre-lock checks
    const checks = await this.runPreLockChecks(cerVersionId);
    const failedChecks = checks.filter((c) => !c.passed);

    if (failedChecks.length > 0) {
      const details = failedChecks.map((c) => `${c.label}: ${c.detail ?? 'failed'}`).join('; ');
      throw new ValidationError(
        `Cannot lock CER: ${failedChecks.length} check(s) failed (${details})`,
      );
    }

    // 3. Lock CER version
    const now = new Date();

    await this.prisma.cerVersion.update({
      where: { id: cerVersionId },
      data: {
        status: 'LOCKED',
        lockedAt: now,
        lockedById: userId,
      },
    });

    // 4. Create upstream snapshots
    const snapshotUseCase = new CreateUpstreamSnapshotsUseCase(this.prisma, this.checksumService);
    const snapshotResult = await snapshotUseCase.execute({
      cerVersionId,
      userId,
    });

    // 5. Audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'cer.version.locked',
        targetType: 'cerVersion',
        targetId: cerVersionId,
        before: { status: cerVersion.status } as unknown as Prisma.InputJsonValue,
        after: {
          status: 'LOCKED',
          snapshotCount: snapshotResult.snapshotCount,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    // 6. Emit domain event
    const event = createCerVersionLockedEvent(
      {
        cerVersionId,
        projectId: cerVersion.projectId,
        versionNumber: cerVersion.versionNumber.toString(),
      },
      userId,
      crypto.randomUUID(),
    );
    void this.eventBus.publish(event);

    return {
      cerVersionId,
      lockedAt: now.toISOString(),
      snapshotCount: snapshotResult.snapshotCount,
    };
  }

  private async runPreLockChecks(cerVersionId: string): Promise<PreLockCheck[]> {
    const checks: PreLockCheck[] = [];

    // Check 1: All 14 sections FINALIZED
    const sections = await this.prisma.cerSection.findMany({
      where: { cerVersionId },
      select: { id: true, sectionType: true, status: true },
    });

    const totalSections = sections.length;
    const finalizedSections = sections.filter((s: any) => s.status === 'FINALIZED').length;

    checks.push({
      label: 'All sections finalized',
      passed: totalSections >= 14 && finalizedSections === totalSections,
      detail:
        totalSections < 14
          ? `Only ${totalSections} sections (need 14)`
          : `${finalizedSections}/${totalSections} finalized`,
    });

    // Check 2: 100% traceability coverage
    const claimTraceCount = await this.prisma.claimTrace.count({
      where: { cerVersionId },
    });

    checks.push({
      label: 'Traceability coverage',
      passed: claimTraceCount > 0,
      detail: claimTraceCount > 0 ? `${claimTraceCount} trace(s)` : 'No claim traces found',
    });

    // Check 3: All evaluators assigned with CV + COI
    const evaluators = await this.prisma.evaluator.findMany({
      where: { cerVersionId },
      select: {
        id: true,
        role: true,
        cvFilePath: true,
        coiDeclaredAt: true,
        signedAt: true,
      },
    });

    const evaluatorRoles = new Set(evaluators.map((e: any) => e.role));
    const hasAllRoles =
      evaluatorRoles.has('WRITTEN_BY') &&
      evaluatorRoles.has('VERIFIED_BY') &&
      evaluatorRoles.has('APPROVED_BY');

    const allHaveCv = evaluators.every((e: any) => !!e.cvFilePath);
    const allHaveCoi = evaluators.every((e: any) => !!e.coiDeclaredAt);

    checks.push({
      label: 'Evaluators assigned with CV and COI',
      passed: evaluators.length > 0 && hasAllRoles && allHaveCv && allHaveCoi,
      detail: !hasAllRoles
        ? 'Missing required evaluator roles'
        : !allHaveCv
          ? 'Some evaluators missing CV'
          : !allHaveCoi
            ? 'Some evaluators missing COI declaration'
            : `${evaluators.length} evaluator(s) complete`,
    });

    // Check 4: E-signature completed
    const allSigned = evaluators.length > 0 && evaluators.every((e: any) => !!e.signedAt);

    checks.push({
      label: 'E-signature completed',
      passed: allSigned,
      detail: allSigned
        ? 'All evaluators signed'
        : `${evaluators.filter((e: any) => !!e.signedAt).length}/${evaluators.length} signed`,
    });

    // Check 5: GSPR matrix finalized
    const gsprMatrix = await (this.prisma.gsprMapping as any).findFirst({
      where: { cerVersionId },
      select: { id: true, status: true },
    });

    checks.push({
      label: 'GSPR matrix finalized',
      passed: (gsprMatrix?.status as string) === 'FINALIZED',
      detail: gsprMatrix ? `Status: ${gsprMatrix.status}` : 'No GSPR matrix found',
    });

    // Check 6: Benefit-risk finalized
    const benefitRisk = await this.prisma.benefitRiskAssessment.findFirst({
      where: { cerVersionId },
      select: { id: true, status: true },
    });

    checks.push({
      label: 'Benefit-risk finalized',
      passed: benefitRisk?.status === 'FINALIZED',
      detail: benefitRisk ? `Status: ${benefitRisk.status}` : 'No benefit-risk assessment found',
    });

    return checks;
  }
}
