import type { PrismaClient, Prisma } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';

// ── Types ───────────────────────────────────────────────────────────────

interface GenerateComplianceStatementInput {
  cerVersionId: string;
  userId: string;
}

interface ComplianceSummary {
  compliant: number;
  partial: number;
  notApplicable: number;
  total: number;
}

interface ComplianceGap {
  gsprId: string;
  title: string;
  status: string;
  notes: string | null;
}

export interface GenerateComplianceStatementResult {
  cerVersionId: string;
  summary: ComplianceSummary;
  gaps: ComplianceGap[];
  conclusion: string;
  statementText: string;
}

// ── Use Case ────────────────────────────────────────────────────────────

export class GenerateComplianceStatementUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: GenerateComplianceStatementInput): Promise<GenerateComplianceStatementResult> {
    const { cerVersionId, userId } = input;

    // 1. Verify CER version exists
    const cerVersion = await (this.prisma as any).cerVersion.findUnique({
      where: { id: cerVersionId },
      select: { id: true },
    });

    if (!cerVersion) {
      throw new NotFoundError('CerVersion', cerVersionId);
    }

    // 2. Fetch GSPR matrix rows
    const rows = await (this.prisma as any).gsprMatrixRow.findMany({
      where: { cerVersionId },
      select: {
        gsprId: true,
        title: true,
        status: true,
        notes: true,
      },
      orderBy: { gsprId: 'asc' },
    });

    if (rows.length === 0) {
      throw new ValidationError('No GSPR matrix found. Generate GSPR matrix first.');
    }

    // 3. Compute summary
    const summary: ComplianceSummary = {
      compliant: 0,
      partial: 0,
      notApplicable: 0,
      total: rows.length,
    };

    const gaps: ComplianceGap[] = [];

    for (const row of rows) {
      switch (row.status) {
        case 'COMPLIANT':
          summary.compliant++;
          break;
        case 'PARTIAL':
          summary.partial++;
          gaps.push({
            gsprId: row.gsprId,
            title: row.title,
            status: row.status,
            notes: row.notes,
          });
          break;
        case 'NOT_APPLICABLE':
          summary.notApplicable++;
          break;
      }
    }

    // 4. Generate conclusion text
    const conclusion = generateConclusion(summary, gaps);

    // 5. Generate full statement text
    const statementText = generateStatementText(summary, gaps, conclusion);

    // 6. Store as CER section or update existing compliance section
    const existingSection = await (this.prisma as any).cerSection.findFirst({
      where: {
        cerVersionId,
        sectionType: 'COMPLIANCE_STATEMENT',
      },
      select: { id: true },
    });

    if (existingSection) {
      await (this.prisma as any).cerSection.update({
        where: { id: existingSection.id },
        data: {
          aiDraftContent: { statementText, summary, gaps } as unknown as Prisma.InputJsonValue,
          updatedAt: new Date(),
          updatedById: userId,
        },
      });
    } else {
      await (this.prisma as any).cerSection.create({
        data: {
          id: crypto.randomUUID(),
          cerVersionId,
          sectionType: 'COMPLIANCE_STATEMENT',
          sectionNumber: 'ANNEX-GSPR',
          title: 'GSPR Compliance Statement',
          status: 'DRAFT',
          aiDraftContent: { statementText, summary, gaps } as unknown as Prisma.InputJsonValue,
          createdById: userId,
        },
      });
    }

    // 7. Audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'cer.compliance-statement.generated',
        targetType: 'cerVersion',
        targetId: cerVersionId,
        before: null as unknown as Prisma.InputJsonValue,
        after: { summary } as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      cerVersionId,
      summary,
      gaps,
      conclusion,
      statementText,
    };
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────

function generateConclusion(summary: ComplianceSummary, gaps: ComplianceGap[]): string {
  const compliantPct = Math.round((summary.compliant / summary.total) * 100);

  if (summary.partial === 0) {
    return `The device meets all applicable General Safety and Performance Requirements (${summary.compliant} of ${summary.total} requirements compliant, ${summary.notApplicable} not applicable). Full compliance with MDR Annex I is demonstrated.`;
  }

  return (
    `The device demonstrates compliance with ${summary.compliant} of ${summary.total} applicable GSPRs (${compliantPct}%). ` +
    `${summary.partial} requirement(s) have partial compliance requiring additional evidence or mitigation. ` +
    `${summary.notApplicable} requirement(s) are not applicable. ` +
    `Gaps identified: ${gaps.map((g) => g.gsprId).join(', ')}.`
  );
}

export function generateStatementText(
  summary: ComplianceSummary,
  gaps: ComplianceGap[],
  conclusion: string,
): string {
  const lines: string[] = [];

  lines.push('GSPR COMPLIANCE STATEMENT');
  lines.push('');
  lines.push('1. SUMMARY');
  lines.push(`   Total GSPR requirements evaluated: ${summary.total}`);
  lines.push(`   Compliant: ${summary.compliant}`);
  lines.push(`   Partial compliance: ${summary.partial}`);
  lines.push(`   Not applicable: ${summary.notApplicable}`);
  lines.push('');

  if (gaps.length > 0) {
    lines.push('2. IDENTIFIED GAPS');
    for (const gap of gaps) {
      lines.push(`   - ${gap.gsprId}: ${gap.title} (Status: ${gap.status})`);
      if (gap.notes) {
        lines.push(`     Notes: ${gap.notes}`);
      }
    }
    lines.push('');
  }

  lines.push(`${gaps.length > 0 ? '3' : '2'}. CONCLUSION`);
  lines.push(`   ${conclusion}`);

  return lines.join('\n');
}
