import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExportAuditTrailUseCase, generateCsv } from './export-audit-trail.js';

const VERSION_ID = 'ver-1';

function makePrisma(overrides?: {
  cerVersion?: Record<string, unknown> | null;
  sections?: Array<Record<string, unknown>>;
  auditEntries?: Array<Record<string, unknown>>;
}) {
  return {
    cerVersion: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.cerVersion !== undefined
          ? overrides.cerVersion
          : { id: VERSION_ID },
      ),
    },
    cerSection: {
      findMany: vi.fn().mockResolvedValue(
        overrides?.sections ?? [{ id: 'sec-1' }, { id: 'sec-2' }],
      ),
    },
    auditLog: {
      findMany: vi.fn().mockResolvedValue(
        overrides?.auditEntries ?? [
          {
            userId: 'user-1',
            action: 'cer.section.status-changed',
            createdAt: '2026-01-15T10:00:00Z',
            targetType: 'cerSection',
            targetId: 'sec-1',
            after: { status: 'REVIEWED' },
          },
          {
            userId: 'user-2',
            action: 'cer.section.status-changed',
            createdAt: '2026-01-16T10:00:00Z',
            targetType: 'cerSection',
            targetId: 'sec-2',
            after: { status: 'FINALIZED' },
          },
        ],
      ),
    },
  } as any;
}

describe('ExportAuditTrailUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports audit trail entries for CER version', async () => {
    const prisma = makePrisma();
    const useCase = new ExportAuditTrailUseCase(prisma);

    const result = await useCase.execute({ cerVersionId: VERSION_ID });

    expect(result.cerVersionId).toBe(VERSION_ID);
    expect(result.entries).toHaveLength(2);
    expect(result.totalCount).toBe(2);
    expect(result.format).toBe('JSON');
  });

  it('maps entries to WHO/WHAT/WHEN/WHY format', async () => {
    const prisma = makePrisma();
    const useCase = new ExportAuditTrailUseCase(prisma);

    const result = await useCase.execute({ cerVersionId: VERSION_ID });

    expect(result.entries[0].who).toBe('user-1');
    expect(result.entries[0].what).toBe('cer.section.status-changed');
    expect(result.entries[0].when).toBe('2026-01-15T10:00:00Z');
    expect(result.entries[0].why).toContain('REVIEWED');
  });

  it('throws NotFoundError when CER version not found', async () => {
    const prisma = makePrisma({ cerVersion: null });
    const useCase = new ExportAuditTrailUseCase(prisma);

    await expect(
      useCase.execute({ cerVersionId: 'missing' }),
    ).rejects.toThrow('not found');
  });

  it('generates CSV data when format is CSV', async () => {
    const prisma = makePrisma();
    const useCase = new ExportAuditTrailUseCase(prisma);

    const result = await useCase.execute({ cerVersionId: VERSION_ID, format: 'CSV' });

    expect(result.format).toBe('CSV');
    expect(result.csvData).toBeDefined();
    expect(result.csvData).toContain('WHO,WHAT,WHEN,WHY');
    expect(result.csvData).toContain('user-1');
  });

  it('does not include csvData when format is JSON', async () => {
    const prisma = makePrisma();
    const useCase = new ExportAuditTrailUseCase(prisma);

    const result = await useCase.execute({ cerVersionId: VERSION_ID, format: 'JSON' });

    expect(result.csvData).toBeUndefined();
  });

  it('returns empty entries when no audit logs found', async () => {
    const prisma = makePrisma({ auditEntries: [] });
    const useCase = new ExportAuditTrailUseCase(prisma);

    const result = await useCase.execute({ cerVersionId: VERSION_ID });

    expect(result.entries).toEqual([]);
    expect(result.totalCount).toBe(0);
  });

  it('includes exportedAt timestamp', async () => {
    const prisma = makePrisma();
    const useCase = new ExportAuditTrailUseCase(prisma);

    const result = await useCase.execute({ cerVersionId: VERSION_ID });

    expect(result.exportedAt).toBeDefined();
    expect(new Date(result.exportedAt).getTime()).not.toBeNaN();
  });

  it('applies date range filter', async () => {
    const prisma = makePrisma();
    const useCase = new ExportAuditTrailUseCase(prisma);

    await useCase.execute({
      cerVersionId: VERSION_ID,
      filters: {
        dateRange: { from: '2026-01-01T00:00:00Z', to: '2026-12-31T23:59:59Z' },
      },
    });

    const whereArg = prisma.auditLog.findMany.mock.calls[0][0].where;
    expect(whereArg.createdAt).toBeDefined();
    expect(whereArg.createdAt.gte).toBeInstanceOf(Date);
  });
});

describe('generateCsv', () => {
  it('generates CSV with header and rows', () => {
    const entries = [
      { who: 'user-1', what: 'action', when: '2026-01-01', why: 'reason', targetType: 'cerSection', targetId: 'sec-1' },
    ];
    const csv = generateCsv(entries);
    expect(csv).toContain('WHO,WHAT,WHEN,WHY');
    expect(csv).toContain('user-1');
  });

  it('escapes fields containing commas', () => {
    const entries = [
      { who: 'user,1', what: 'action', when: '2026-01-01', why: 'reason', targetType: 't', targetId: 'id' },
    ];
    const csv = generateCsv(entries);
    expect(csv).toContain('"user,1"');
  });

  it('returns only header for empty entries', () => {
    const csv = generateCsv([]);
    expect(csv).toBe('WHO,WHAT,WHEN,WHY,TARGET_TYPE,TARGET_ID');
  });
});
