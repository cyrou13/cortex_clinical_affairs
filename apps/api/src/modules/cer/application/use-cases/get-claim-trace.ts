import type { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../../../../shared/errors/index.js';

// ── Types ───────────────────────────────────────────────────────────────

interface GetClaimTraceInput {
  claimTraceId: string;
}

interface Level1_CerClaim {
  text: string;
  sectionNumber: string;
  sectionTitle: string;
  cerSectionId: string;
}

interface Level2_SoaSource {
  soaSourceId: string;
  section: string;
  extractedData: string;
  benchmark: string | null;
}

interface Level3_ValidationStudy {
  validationStudyId: string;
  endpoint: string;
  result: string;
  comparison: string | null;
}

interface Level4_SlsArticle {
  slsArticleId: string;
  title: string;
  doi: string | null;
  query: string | null;
  database: string | null;
}

interface AuditEntry {
  action: string;
  userId: string;
  timestamp: string;
}

export interface ClaimTraceResult {
  claimTraceId: string;
  refNumber: string;
  level1: Level1_CerClaim;
  level2: Level2_SoaSource | null;
  level3: Level3_ValidationStudy | null;
  level4: Level4_SlsArticle | null;
  auditTrail: AuditEntry[];
}

// ── Use Case ────────────────────────────────────────────────────────────

export class GetClaimTraceUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: GetClaimTraceInput): Promise<ClaimTraceResult> {
    const { claimTraceId } = input;

    // 1. Fetch claim trace
    const trace = await this.prisma.claimTrace.findUnique({
      where: { id: claimTraceId },
      select: {
        id: true,
        refNumber: true,
        claimText: true,
        cerSectionId: true,
        soaSourceId: true,
        validationStudyId: true,
        slsArticleId: true,
      },
    });

    if (!trace) {
      throw new NotFoundError('ClaimTrace', claimTraceId);
    }

    // 2. Fetch Level 1: CER Claim (section info)
    const section = await this.prisma.cerSection.findUnique({
      where: { id: trace.cerSectionId },
      select: { id: true, sectionNumber: true, title: true },
    });

    if (!section) {
      throw new NotFoundError('CerSection', trace.cerSectionId);
    }

    const level1: Level1_CerClaim = {
      text: trace.claimText ?? '',
      sectionNumber: section.sectionNumber,
      sectionTitle: section.title,
      cerSectionId: trace.cerSectionId,
    };

    // 3. Fetch Level 2: SOA Source (cross-module)
    let level2: Level2_SoaSource | null = null;
    if (trace.soaSourceId) {
      const soaSource = await (this.prisma as any).soaSource.findUnique({
        where: { id: trace.soaSourceId },
        select: {
          id: true,
          section: true,
          extractedData: true,
          benchmark: true,
        },
      });

      if (soaSource) {
        level2 = {
          soaSourceId: soaSource.id,
          section: soaSource.section ?? '',
          extractedData: soaSource.extractedData ?? '',
          benchmark: soaSource.benchmark ?? null,
        };
      }
    }

    // 4. Fetch Level 3: Validation Study (cross-module)
    let level3: Level3_ValidationStudy | null = null;
    if (trace.validationStudyId) {
      const study = await this.prisma.validationStudy.findUnique({
        where: { id: trace.validationStudyId },
        select: {
          id: true,
          name: true,
          type: true,
        },
      });

      // Fetch results for this study
      const results = await this.prisma.validationResult.findMany({
        where: { validationStudyId: trace.validationStudyId },
        select: { metricType: true, value: true, comparison: true },
        take: 1,
      });

      if (study) {
        level3 = {
          validationStudyId: study.id,
          endpoint: results[0]?.metricType ?? study.type,
          result: results[0]?.value?.toString() ?? 'N/A',
          comparison: results[0]?.comparison ?? null,
        };
      }
    }

    // 5. Fetch Level 4: SLS Article (cross-module)
    let level4: Level4_SlsArticle | null = null;
    if (trace.slsArticleId) {
      const article = await this.prisma.article.findUnique({
        where: { id: trace.slsArticleId },
        select: {
          id: true,
          title: true,
          doi: true,
          source: true,
          sourceDatabase: true,
        },
      });

      if (article) {
        level4 = {
          slsArticleId: article.id,
          title: article.title ?? '',
          doi: article.doi ?? null,
          query: article.source ?? null,
          database: article.sourceDatabase ?? null,
        };
      }
    }

    // 6. Fetch audit trail entries for this claim trace
    const auditEntries = await this.prisma.auditLog.findMany({
      where: {
        targetType: 'claimTrace',
        targetId: claimTraceId,
      },
      select: {
        action: true,
        userId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const auditTrail: AuditEntry[] = auditEntries.map(
      (e: { action: string; userId: string; createdAt: Date | string }) => ({
        action: e.action,
        userId: e.userId,
        timestamp: typeof e.createdAt === 'string' ? e.createdAt : e.createdAt.toISOString(),
      }),
    );

    return {
      claimTraceId,
      refNumber: trace.refNumber,
      level1,
      level2,
      level3,
      level4,
      auditTrail,
    };
  }
}
