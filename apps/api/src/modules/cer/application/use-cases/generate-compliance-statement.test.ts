import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  GenerateComplianceStatementUseCase,
  generateStatementText,
} from './generate-compliance-statement.js';

const VERSION_ID = 'ver-1';
const USER_ID = 'user-1';

function makePrisma(overrides?: {
  cerVersion?: Record<string, unknown> | null;
  gsprRows?: Array<Record<string, unknown>>;
  existingSection?: Record<string, unknown> | null;
}) {
  return {
    cerVersion: {
      findUnique: vi
        .fn()
        .mockResolvedValue(
          overrides?.cerVersion !== undefined ? overrides.cerVersion : { id: VERSION_ID },
        ),
    },
    gsprMatrixRow: {
      findMany: vi.fn().mockResolvedValue(
        overrides?.gsprRows ?? [
          { gsprId: 'GSPR-1', title: 'Safety', status: 'COMPLIANT', notes: null },
          { gsprId: 'GSPR-2', title: 'Risk management', status: 'COMPLIANT', notes: null },
          { gsprId: 'GSPR-3', title: 'Design', status: 'PARTIAL', notes: 'Need more evidence' },
          {
            gsprId: 'GSPR-12',
            title: 'Biological',
            status: 'NOT_APPLICABLE',
            notes: 'No biological material',
          },
        ],
      ),
    },
    cerSection: {
      findFirst: vi
        .fn()
        .mockResolvedValue(
          overrides?.existingSection !== undefined ? overrides.existingSection : null,
        ),
      create: vi.fn().mockResolvedValue({ id: 'new-sec' }),
      update: vi.fn().mockResolvedValue({ id: 'existing-sec' }),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  } as any;
}

describe('GenerateComplianceStatementUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates compliance statement with correct summary', async () => {
    const prisma = makePrisma();
    const useCase = new GenerateComplianceStatementUseCase(prisma);

    const result = await useCase.execute({ cerVersionId: VERSION_ID, userId: USER_ID });

    expect(result.summary.compliant).toBe(2);
    expect(result.summary.partial).toBe(1);
    expect(result.summary.notApplicable).toBe(1);
    expect(result.summary.total).toBe(4);
  });

  it('identifies gaps for PARTIAL status rows', async () => {
    const prisma = makePrisma();
    const useCase = new GenerateComplianceStatementUseCase(prisma);

    const result = await useCase.execute({ cerVersionId: VERSION_ID, userId: USER_ID });

    expect(result.gaps).toHaveLength(1);
    expect(result.gaps[0]!.gsprId).toBe('GSPR-3');
  });

  it('generates conclusion mentioning gap count', async () => {
    const prisma = makePrisma();
    const useCase = new GenerateComplianceStatementUseCase(prisma);

    const result = await useCase.execute({ cerVersionId: VERSION_ID, userId: USER_ID });

    expect(result.conclusion).toContain('1 requirement(s) have partial compliance');
    expect(result.conclusion).toContain('GSPR-3');
  });

  it('generates full compliance conclusion when no gaps', async () => {
    const prisma = makePrisma({
      gsprRows: [
        { gsprId: 'GSPR-1', title: 'Safety', status: 'COMPLIANT', notes: null },
        { gsprId: 'GSPR-2', title: 'Risk', status: 'COMPLIANT', notes: null },
      ],
    });
    const useCase = new GenerateComplianceStatementUseCase(prisma);

    const result = await useCase.execute({ cerVersionId: VERSION_ID, userId: USER_ID });

    expect(result.conclusion).toContain('Full compliance');
    expect(result.gaps).toHaveLength(0);
  });

  it('throws NotFoundError when CER version not found', async () => {
    const prisma = makePrisma({ cerVersion: null });
    const useCase = new GenerateComplianceStatementUseCase(prisma);

    await expect(useCase.execute({ cerVersionId: 'missing', userId: USER_ID })).rejects.toThrow(
      'not found',
    );
  });

  it('throws ValidationError when no GSPR matrix exists', async () => {
    const prisma = makePrisma({ gsprRows: [] });
    const useCase = new GenerateComplianceStatementUseCase(prisma);

    await expect(useCase.execute({ cerVersionId: VERSION_ID, userId: USER_ID })).rejects.toThrow(
      'No GSPR matrix found',
    );
  });

  it('creates new CER section when none exists', async () => {
    const prisma = makePrisma();
    const useCase = new GenerateComplianceStatementUseCase(prisma);

    await useCase.execute({ cerVersionId: VERSION_ID, userId: USER_ID });

    expect(prisma.cerSection.create).toHaveBeenCalled();
    expect(prisma.cerSection.update).not.toHaveBeenCalled();
  });

  it('updates existing compliance section', async () => {
    const prisma = makePrisma({
      existingSection: { id: 'existing-sec' },
    });
    const useCase = new GenerateComplianceStatementUseCase(prisma);

    await useCase.execute({ cerVersionId: VERSION_ID, userId: USER_ID });

    expect(prisma.cerSection.update).toHaveBeenCalled();
    expect(prisma.cerSection.create).not.toHaveBeenCalled();
  });
});

describe('generateStatementText', () => {
  it('includes summary section', () => {
    const text = generateStatementText(
      { compliant: 2, partial: 1, notApplicable: 0, total: 3 },
      [{ gsprId: 'GSPR-3', title: 'Design', status: 'PARTIAL', notes: null }],
      'Conclusion text',
    );

    expect(text).toContain('GSPR COMPLIANCE STATEMENT');
    expect(text).toContain('Compliant: 2');
    expect(text).toContain('Partial compliance: 1');
  });

  it('includes identified gaps section', () => {
    const text = generateStatementText(
      { compliant: 1, partial: 1, notApplicable: 0, total: 2 },
      [{ gsprId: 'GSPR-3', title: 'Design', status: 'PARTIAL', notes: 'Need evidence' }],
      'Conclusion',
    );

    expect(text).toContain('IDENTIFIED GAPS');
    expect(text).toContain('GSPR-3');
    expect(text).toContain('Need evidence');
  });

  it('omits gaps section when no gaps', () => {
    const text = generateStatementText(
      { compliant: 2, partial: 0, notApplicable: 0, total: 2 },
      [],
      'Full compliance.',
    );

    expect(text).not.toContain('IDENTIFIED GAPS');
  });
});
