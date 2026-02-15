import type { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../../../../shared/errors/index.js';
import type { ChecksumService } from '../../../../shared/services/checksum-service.js';

// ── Types ───────────────────────────────────────────────────────────────

export interface DetectChangesInput {
  cerVersionId: string;
  previousVersionId: string;
}

export interface UpstreamChange {
  moduleType: string;
  changeType: 'ADDED' | 'REMOVED' | 'MODIFIED';
  description: string;
}

export interface SectionChangeResult {
  sectionId: string;
  sectionType: string;
  requiresUpdate: boolean;
  changeReason: string | null;
}

export interface DetectChangesResult {
  cerVersionId: string;
  upstreamChanges: UpstreamChange[];
  affectedSections: SectionChangeResult[];
}

// ── Use Case ────────────────────────────────────────────────────────────

export class DetectSectionChangesUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly checksumService: ChecksumService,
  ) {}

  async execute(input: DetectChangesInput): Promise<DetectChangesResult> {
    // Verify both versions exist
    const currentVersion = await this.prisma.cerVersion.findUnique({
      where: { id: input.cerVersionId },
      select: { id: true, projectId: true },
    });

    if (!currentVersion) {
      throw new NotFoundError('CerVersion', input.cerVersionId);
    }

    const previousVersion = await this.prisma.cerVersion.findUnique({
      where: { id: input.previousVersionId },
      select: { id: true },
    });

    if (!previousVersion) {
      throw new NotFoundError('CerVersion', input.previousVersionId);
    }

    // Load snapshots from both versions
    const currentSnapshots = await this.prisma.versionSnapshot.findMany({
      where: { cerVersionId: input.cerVersionId },
    });

    const previousSnapshots = await this.prisma.versionSnapshot.findMany({
      where: { cerVersionId: input.previousVersionId },
    });

    // Detect upstream changes
    const upstreamChanges: UpstreamChange[] = [];

    const previousModuleMap = new Map<string, any>();
    for (const snap of previousSnapshots) {
      previousModuleMap.set(snap.moduleType, snap);
    }

    const currentModuleMap = new Map<string, any>();
    for (const snap of currentSnapshots) {
      currentModuleMap.set(snap.moduleType, snap);
    }

    // Check for added and modified modules
    for (const snap of currentSnapshots) {
      const prev = previousModuleMap.get(snap.moduleType);
      if (!prev) {
        upstreamChanges.push({
          moduleType: snap.moduleType,
          changeType: 'ADDED',
          description: `New ${snap.moduleType} data added`,
        });
      } else if (snap.checksum !== prev.checksum) {
        upstreamChanges.push({
          moduleType: snap.moduleType,
          changeType: 'MODIFIED',
          description: `${snap.moduleType} data has been modified`,
        });
      }
    }

    // Check for removed modules
    for (const snap of previousSnapshots) {
      if (!currentModuleMap.has(snap.moduleType)) {
        upstreamChanges.push({
          moduleType: snap.moduleType,
          changeType: 'REMOVED',
          description: `${snap.moduleType} data has been removed`,
        });
      }
    }

    // Map upstream changes to affected sections
    const sections = await this.prisma.cerSection.findMany({
      where: { cerVersionId: input.cerVersionId },
      select: { id: true, sectionType: true },
    });

    const moduleToSections: Record<string, string[]> = {
      SLS: ['LITERATURE_REVIEW', 'CLINICAL_DATA_APPRAISAL'],
      SOA: ['STATE_OF_THE_ART', 'EQUIVALENCE_ANALYSIS'],
      VALIDATION: ['CLINICAL_INVESTIGATION', 'CLINICAL_DATA_ANALYSIS'],
      PMS: ['POST_MARKET_SURVEILLANCE', 'PMCF_DATA'],
    };

    const affectedSections: SectionChangeResult[] = [];

    for (const section of sections) {
      let requiresUpdate = false;
      let changeReason: string | null = null;

      for (const change of upstreamChanges) {
        const affectedTypes = moduleToSections[change.moduleType] ?? [];
        if (affectedTypes.includes(section.sectionType)) {
          requiresUpdate = true;
          changeReason = `${change.moduleType} upstream data ${change.changeType.toLowerCase()}`;
          break;
        }
      }

      affectedSections.push({
        sectionId: section.id,
        sectionType: section.sectionType,
        requiresUpdate,
        changeReason,
      });
    }

    // Flag affected sections in DB
    for (const affected of affectedSections) {
      if (affected.requiresUpdate) {
        await this.prisma.cerSection.update({
          where: { id: affected.sectionId },
          data: {
            requiresUpdate: true,
            changeReason: affected.changeReason,
          },
        });
      }
    }

    return {
      cerVersionId: input.cerVersionId,
      upstreamChanges,
      affectedSections,
    };
  }
}
