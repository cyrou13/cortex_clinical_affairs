import type { PrismaClient, Prisma } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';
import type { ChecksumService } from '../../../../shared/services/checksum-service.js';

// ── Types ───────────────────────────────────────────────────────────────

export interface CreateSnapshotsInput {
  cerVersionId: string;
  userId: string;
}

export interface SnapshotRecord {
  id: string;
  cerVersionId: string;
  moduleType: string;
  data: unknown;
  checksum: string;
}

export interface CreateSnapshotsResult {
  cerVersionId: string;
  snapshotCount: number;
  snapshots: SnapshotRecord[];
}

// ── Use Case ────────────────────────────────────────────────────────────

export class CreateUpstreamSnapshotsUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly checksumService: ChecksumService,
  ) {}

  async execute(input: CreateSnapshotsInput): Promise<CreateSnapshotsResult> {
    // Verify CER version exists
    const cerVersion = await (this.prisma as any).cerVersion.findUnique({
      where: { id: input.cerVersionId },
      select: { id: true, projectId: true },
    });

    if (!cerVersion) {
      throw new NotFoundError('CerVersion', input.cerVersionId);
    }

    const snapshots: SnapshotRecord[] = [];
    const projectId = cerVersion.projectId;

    // Snapshot SLS data
    const slsData = await (this.prisma as any).slsSession.findMany({
      where: { projectId },
    });
    if (slsData.length > 0) {
      const snapshot = await this.createSnapshot(
        input.cerVersionId,
        'SLS',
        slsData,
        input.userId,
      );
      snapshots.push(snapshot);
    }

    // Snapshot SOA data
    const soaData = await (this.prisma as any).soaAnalysis.findMany({
      where: { projectId },
    });
    if (soaData.length > 0) {
      const snapshot = await this.createSnapshot(
        input.cerVersionId,
        'SOA',
        soaData,
        input.userId,
      );
      snapshots.push(snapshot);
    }

    // Snapshot Validation data
    const validationData = await (this.prisma as any).validationStudy.findMany({
      where: { projectId },
    });
    if (validationData.length > 0) {
      const snapshot = await this.createSnapshot(
        input.cerVersionId,
        'VALIDATION',
        validationData,
        input.userId,
      );
      snapshots.push(snapshot);
    }

    // Snapshot PMS data
    const pmsData = await (this.prisma as any).pmsRecord.findMany({
      where: { projectId },
    });
    if (pmsData.length > 0) {
      const snapshot = await this.createSnapshot(
        input.cerVersionId,
        'PMS',
        pmsData,
        input.userId,
      );
      snapshots.push(snapshot);
    }

    return {
      cerVersionId: input.cerVersionId,
      snapshotCount: snapshots.length,
      snapshots,
    };
  }

  async verifySnapshot(snapshotId: string): Promise<{ valid: boolean; moduleType: string }> {
    const snapshot = await (this.prisma as any).versionSnapshot.findUnique({
      where: { id: snapshotId },
    });

    if (!snapshot) {
      throw new NotFoundError('VersionSnapshot', snapshotId);
    }

    const dataString = JSON.stringify(snapshot.data);
    const valid = this.checksumService.verifyHash(dataString, snapshot.checksum);

    return { valid, moduleType: snapshot.moduleType };
  }

  private async createSnapshot(
    cerVersionId: string,
    moduleType: string,
    data: unknown,
    userId: string,
  ): Promise<SnapshotRecord> {
    const dataString = JSON.stringify(data);
    const checksum = this.checksumService.computeHash(dataString);

    const snapshotId = crypto.randomUUID();

    const created = await (this.prisma as any).versionSnapshot.create({
      data: {
        id: snapshotId,
        cerVersionId,
        moduleType,
        data: data as unknown as Prisma.InputJsonValue,
        checksum,
        createdById: userId,
      },
    });

    return {
      id: created.id,
      cerVersionId: created.cerVersionId,
      moduleType: created.moduleType,
      data: created.data,
      checksum: created.checksum,
    };
  }
}
