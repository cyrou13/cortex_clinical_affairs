import type { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';

interface SetActiveVersionInput {
  validationStudyId: string;
  version: number;
}

interface SetActiveVersionResult {
  dataImportId: string;
  version: number;
  previousActiveVersion: number | null;
}

interface RollbackInput {
  validationStudyId: string;
  targetVersion: number;
}

interface RollbackResult {
  dataImportId: string;
  version: number;
  rolledBackFrom: number;
}

export interface DiffEntry {
  field: string;
  rowIndex: number;
  oldValue: unknown;
  newValue: unknown;
}

interface ComputeDiffInput {
  validationStudyId: string;
  versionA: number;
  versionB: number;
}

interface ComputeDiffResult {
  additions: number;
  deletions: number;
  modifications: number;
  details: DiffEntry[];
}

export class ManageImportVersionsUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async setActiveVersion(input: SetActiveVersionInput): Promise<SetActiveVersionResult> {
    const { validationStudyId, version } = input;

    // Find current active version
    const currentActive = await this.prisma.dataImport.findFirst({
      where: { validationStudyId, isActive: true },
      select: { id: true, version: true },
    });

    // Find target version
    const targetImport = await this.prisma.dataImport.findFirst({
      where: { validationStudyId, version },
      select: { id: true, version: true },
    });

    if (!targetImport) {
      throw new NotFoundError('DataImport', `version ${version}`);
    }

    // Deactivate all
    await this.prisma.dataImport.updateMany({
      where: { validationStudyId, isActive: true },
      data: { isActive: false },
    });

    // Activate target
    await this.prisma.dataImport.update({
      where: { id: targetImport.id },
      data: { isActive: true },
    });

    return {
      dataImportId: targetImport.id,
      version: targetImport.version,
      previousActiveVersion: currentActive?.version ?? null,
    };
  }

  async rollbackToVersion(input: RollbackInput): Promise<RollbackResult> {
    const { validationStudyId, targetVersion } = input;

    const currentActive = await this.prisma.dataImport.findFirst({
      where: { validationStudyId, isActive: true },
      select: { id: true, version: true },
    });

    if (!currentActive) {
      throw new ValidationError('No active import found to rollback from');
    }

    if (targetVersion >= currentActive.version) {
      throw new ValidationError(
        `Target version ${targetVersion} must be less than current active version ${currentActive.version}`,
      );
    }

    const result = await this.setActiveVersion({
      validationStudyId,
      version: targetVersion,
    });

    return {
      dataImportId: result.dataImportId,
      version: result.version,
      rolledBackFrom: currentActive.version,
    };
  }

  async computeDiff(input: ComputeDiffInput): Promise<ComputeDiffResult> {
    const { validationStudyId, versionA, versionB } = input;

    const importA = await this.prisma.dataImport.findFirst({
      where: { validationStudyId, version: versionA },
      select: { data: true, rowCount: true },
    });

    if (!importA) {
      throw new NotFoundError('DataImport', `version ${versionA}`);
    }

    const importB = await this.prisma.dataImport.findFirst({
      where: { validationStudyId, version: versionB },
      select: { data: true, rowCount: true },
    });

    if (!importB) {
      throw new NotFoundError('DataImport', `version ${versionB}`);
    }

    const rowsA = importA.data as Array<Record<string, unknown>>;
    const rowsB = importB.data as Array<Record<string, unknown>>;

    const details: DiffEntry[] = [];
    let additions = 0;
    let deletions = 0;
    let modifications = 0;

    const maxLen = Math.max(rowsA.length, rowsB.length);

    for (let i = 0; i < maxLen; i++) {
      if (i >= rowsA.length) {
        // Row added in B
        additions++;
        continue;
      }
      if (i >= rowsB.length) {
        // Row deleted in B
        deletions++;
        continue;
      }

      // Compare fields
      const rowA = rowsA[i]!;
      const rowB = rowsB[i]!;
      const allKeys = new Set([...Object.keys(rowA), ...Object.keys(rowB)]);
      for (const key of allKeys) {
        const valA = rowA[key];
        const valB = rowB[key];
        if (JSON.stringify(valA) !== JSON.stringify(valB)) {
          modifications++;
          details.push({
            field: key,
            rowIndex: i,
            oldValue: valA,
            newValue: valB,
          });
        }
      }
    }

    return {
      additions,
      deletions,
      modifications,
      details,
    };
  }
}
