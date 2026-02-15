import type { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../../../../shared/errors/index.js';

// ── Types ───────────────────────────────────────────────────────────────

interface ExportProofPackageInput {
  claimTraceId: string;
}

interface TraceLevel {
  level: number;
  label: string;
  data: Record<string, unknown>;
}

interface AuditEntry {
  action: string;
  userId: string;
  timestamp: string;
  details: Record<string, unknown> | null;
}

export interface ProofPackageData {
  claimTraceId: string;
  claimText: string;
  refNumber: string;
  sectionTitle: string;
  sectionNumber: string;
  traceChain: TraceLevel[];
  auditTrail: AuditEntry[];
  generatedAt: string;
}

// ── Use Case ────────────────────────────────────────────────────────────

export class ExportProofPackageUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: ExportProofPackageInput): Promise<ProofPackageData> {
    const { claimTraceId } = input;

    // 1. Fetch claim trace
    const trace = await (this.prisma as any).claimTrace.findUnique({
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

    // 2. Fetch section info
    const section = await (this.prisma as any).cerSection.findUnique({
      where: { id: trace.cerSectionId },
      select: { id: true, sectionNumber: true, title: true },
    });

    if (!section) {
      throw new NotFoundError('CerSection', trace.cerSectionId);
    }

    // 3. Build trace chain
    const traceChain: TraceLevel[] = [];

    // Level 1: CER Claim
    traceChain.push({
      level: 1,
      label: 'CER Claim',
      data: {
        claimText: trace.claimText,
        sectionNumber: section.sectionNumber,
        sectionTitle: section.title,
      },
    });

    // Level 2: SOA Source
    if (trace.soaSourceId) {
      const soaSource = await (this.prisma as any).soaSource.findUnique({
        where: { id: trace.soaSourceId },
        select: { id: true, section: true, extractedData: true, benchmark: true },
      });

      if (soaSource) {
        traceChain.push({
          level: 2,
          label: 'SOA Source',
          data: {
            soaSourceId: soaSource.id,
            section: soaSource.section,
            extractedData: soaSource.extractedData,
            benchmark: soaSource.benchmark,
          },
        });
      }
    }

    // Level 3: Validation Study
    if (trace.validationStudyId) {
      const study = await (this.prisma as any).validationStudy.findUnique({
        where: { id: trace.validationStudyId },
        select: { id: true, name: true, type: true, status: true },
      });

      if (study) {
        traceChain.push({
          level: 3,
          label: 'Validation Study',
          data: {
            validationStudyId: study.id,
            name: study.name,
            type: study.type,
            status: study.status,
          },
        });
      }
    }

    // Level 4: SLS Article
    if (trace.slsArticleId) {
      const article = await (this.prisma as any).slsArticle.findUnique({
        where: { id: trace.slsArticleId },
        select: { id: true, title: true, doi: true, authors: true, journal: true, year: true },
      });

      if (article) {
        traceChain.push({
          level: 4,
          label: 'SLS Article',
          data: {
            slsArticleId: article.id,
            title: article.title,
            doi: article.doi,
            authors: article.authors,
            journal: article.journal,
            year: article.year,
          },
        });
      }
    }

    // 4. Fetch audit trail
    const auditEntries = await (this.prisma as any).auditLog.findMany({
      where: {
        targetType: 'claimTrace',
        targetId: claimTraceId,
      },
      select: {
        action: true,
        userId: true,
        createdAt: true,
        before: true,
        after: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const auditTrail: AuditEntry[] = auditEntries.map(
      (e: { action: string; userId: string; createdAt: Date | string; before: unknown; after: unknown }) => ({
        action: e.action,
        userId: e.userId,
        timestamp: typeof e.createdAt === 'string' ? e.createdAt : e.createdAt.toISOString(),
        details: (e.after as Record<string, unknown>) ?? null,
      }),
    );

    return {
      claimTraceId,
      claimText: trace.claimText,
      refNumber: trace.refNumber,
      sectionTitle: section.title,
      sectionNumber: section.sectionNumber,
      traceChain,
      auditTrail,
      generatedAt: new Date().toISOString(),
    };
  }
}
