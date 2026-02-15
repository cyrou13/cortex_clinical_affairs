import type { PrismaClient, Prisma } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';
import { getGsprForDeviceClass, type GsprRequirement } from '@cortex/shared';

// ── Types ───────────────────────────────────────────────────────────────

type DeviceClass = 'I' | 'IIa' | 'IIb' | 'III';
type GsprStatus = 'COMPLIANT' | 'PARTIAL' | 'NOT_APPLICABLE';

interface GenerateGsprInput {
  cerVersionId: string;
  deviceClass: DeviceClass;
  userId: string;
}

interface GsprRow {
  id: string;
  gsprId: string;
  title: string;
  status: GsprStatus;
  evidenceReferences: string[];
  notes: string | null;
}

interface GenerateGsprResult {
  cerVersionId: string;
  deviceClass: DeviceClass;
  totalRequirements: number;
  rows: GsprRow[];
}

// ── Use Case ────────────────────────────────────────────────────────────

export class GenerateGsprUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: GenerateGsprInput): Promise<GenerateGsprResult> {
    const { cerVersionId, deviceClass, userId } = input;

    // 1. Validate device class
    const validClasses: DeviceClass[] = ['I', 'IIa', 'IIb', 'III'];
    if (!validClasses.includes(deviceClass)) {
      throw new ValidationError(`Invalid device class: ${deviceClass}`);
    }

    // 2. Verify CER version exists
    const cerVersion = await this.prisma.cerVersion.findUnique({
      where: { id: cerVersionId },
      select: { id: true, projectId: true },
    });

    if (!cerVersion) {
      throw new NotFoundError('CerVersion', cerVersionId);
    }

    // 3. Check for existing GSPR matrix (prevent duplicates)
    const existingCount = await this.prisma.gsprMatrixRow.count({
      where: { cerVersionId },
    });

    if (existingCount > 0) {
      throw new ValidationError(
        'GSPR matrix already exists for this CER version. Delete existing matrix first.',
      );
    }

    // 4. Get applicable GSPR requirements
    const requirements = getGsprForDeviceClass(deviceClass);

    // 5. Fetch existing evidence from upstream modules
    const evidenceMap = await this.gatherEvidence(cerVersion.projectId);

    // 6. Create GSPR matrix rows
    const rows: GsprRow[] = [];

    for (const req of requirements) {
      const rowId = crypto.randomUUID();
      const evidence = evidenceMap.get(req.id) ?? [];
      const status = this.determineInitialStatus(req, evidence);

      await this.prisma.gsprMatrixRow.create({
        data: {
          id: rowId,
          cerVersionId,
          gsprId: req.id,
          title: req.title,
          description: req.description,
          chapter: req.chapter,
          section: req.section,
          status,
          evidenceReferences: evidence as unknown as Prisma.InputJsonValue,
          notes: null,
          createdById: userId,
        },
      });

      rows.push({
        id: rowId,
        gsprId: req.id,
        title: req.title,
        status,
        evidenceReferences: evidence,
        notes: null,
      });
    }

    // 7. Audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'cer.gspr-matrix.generated',
        targetType: 'cerVersion',
        targetId: cerVersionId,
        before: null as unknown as Prisma.InputJsonValue,
        after: {
          deviceClass,
          rowCount: rows.length,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      cerVersionId,
      deviceClass,
      totalRequirements: rows.length,
      rows,
    };
  }

  private determineInitialStatus(req: GsprRequirement, evidence: string[]): GsprStatus {
    if (evidence.length === 0) return 'PARTIAL';
    // If multiple evidence references, consider it compliant
    if (evidence.length >= 2) return 'COMPLIANT';
    return 'PARTIAL';
  }

  private async gatherEvidence(projectId: string): Promise<Map<string, string[]>> {
    const evidenceMap = new Map<string, string[]>();

    // Gather from validation study GSPR mappings
    const gsprMappings = await this.prisma.gsprMapping
      .findMany({
        where: {
          validationStudy: { projectId },
        },
        select: {
          gsprId: true,
          evidenceReferences: true,
        },
      })
      .catch(() => []);

    for (const mapping of gsprMappings) {
      const refs = Array.isArray(mapping.evidenceReferences)
        ? (mapping.evidenceReferences as string[])
        : [];
      const existing = evidenceMap.get(mapping.gsprId) ?? [];
      evidenceMap.set(mapping.gsprId, [...existing, ...refs]);
    }

    // Gather from SOA benchmarks
    const soaBenchmarks = await this.prisma.soaBenchmark
      .findMany({
        where: {
          soaAnalysis: { projectId },
        },
        select: {
          id: true,
          name: true,
        },
      })
      .catch(() => []);

    // Map common SOA benchmarks to GSPR requirements
    for (const bm of soaBenchmarks) {
      // GSPR-1 (safety/performance) and GSPR-9 (diagnostic/measuring) get SOA evidence
      const gsprIds = ['GSPR-1', 'GSPR-9'];
      for (const gsprId of gsprIds) {
        const existing = evidenceMap.get(gsprId) ?? [];
        existing.push(`SOA Benchmark: ${bm.name}`);
        evidenceMap.set(gsprId, existing);
      }
    }

    return evidenceMap;
  }
}
