import type { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../../../../shared/errors/index.js';

// ── Types ───────────────────────────────────────────────────────────────

interface ExportAuditTrailInput {
  cerVersionId: string;
  filters?: {
    dateRange?: {
      from: string; // ISO 8601
      to: string;   // ISO 8601
    };
    userId?: string;
    actionType?: string;
  };
  format?: 'CSV' | 'JSON';
}

interface AuditTrailEntry {
  who: string;
  what: string;
  when: string;
  why: string;
  targetType: string;
  targetId: string;
}

export interface ExportAuditTrailResult {
  cerVersionId: string;
  entries: AuditTrailEntry[];
  totalCount: number;
  format: 'CSV' | 'JSON';
  csvData?: string;
  exportedAt: string;
}

// ── Use Case ────────────────────────────────────────────────────────────

export class ExportAuditTrailUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: ExportAuditTrailInput): Promise<ExportAuditTrailResult> {
    const { cerVersionId, filters, format = 'JSON' } = input;

    // 1. Verify CER version exists
    const cerVersion = await (this.prisma as any).cerVersion.findUnique({
      where: { id: cerVersionId },
      select: { id: true },
    });

    if (!cerVersion) {
      throw new NotFoundError('CerVersion', cerVersionId);
    }

    // 2. Fetch sections for this CER version (to scope audit log queries)
    const sections = await (this.prisma as any).cerSection.findMany({
      where: { cerVersionId },
      select: { id: true },
    });

    const sectionIds = sections.map((s: { id: string }) => s.id);

    // 3. Build where clause for audit log
    const where: Record<string, unknown> = {
      OR: [
        { targetType: 'cerVersion', targetId: cerVersionId },
        { targetType: 'cerSection', targetId: { in: sectionIds } },
        { targetType: 'claimTrace', targetId: { not: undefined } },
      ],
    };

    if (filters?.userId) {
      where.userId = filters.userId;
    }

    if (filters?.actionType) {
      where.action = { contains: filters.actionType };
    }

    if (filters?.dateRange) {
      where.createdAt = {
        gte: new Date(filters.dateRange.from),
        lte: new Date(filters.dateRange.to),
      };
    }

    // 4. Query audit log
    const rawEntries = await (this.prisma as any).auditLog.findMany({
      where,
      select: {
        userId: true,
        action: true,
        createdAt: true,
        targetType: true,
        targetId: true,
        after: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // 5. Map to structured entries
    const entries: AuditTrailEntry[] = rawEntries.map(
      (e: { userId: string; action: string; createdAt: Date | string; targetType: string; targetId: string; after: unknown }) => ({
        who: e.userId,
        what: e.action,
        when: typeof e.createdAt === 'string' ? e.createdAt : e.createdAt.toISOString(),
        why: extractReason(e.after),
        targetType: e.targetType,
        targetId: e.targetId,
      }),
    );

    // 6. Generate CSV if requested
    let csvData: string | undefined;
    if (format === 'CSV') {
      csvData = generateCsv(entries);
    }

    return {
      cerVersionId,
      entries,
      totalCount: entries.length,
      format,
      csvData,
      exportedAt: new Date().toISOString(),
    };
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────

function extractReason(after: unknown): string {
  if (!after || typeof after !== 'object') return '';
  const obj = after as Record<string, unknown>;
  if (typeof obj.reason === 'string') return obj.reason;
  if (typeof obj.status === 'string') return `Status: ${obj.status}`;
  return '';
}

export function generateCsv(entries: AuditTrailEntry[]): string {
  const header = 'WHO,WHAT,WHEN,WHY,TARGET_TYPE,TARGET_ID';
  const rows = entries.map((e) =>
    [
      escapeCsvField(e.who),
      escapeCsvField(e.what),
      escapeCsvField(e.when),
      escapeCsvField(e.why),
      escapeCsvField(e.targetType),
      escapeCsvField(e.targetId),
    ].join(','),
  );
  return [header, ...rows].join('\n');
}

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
