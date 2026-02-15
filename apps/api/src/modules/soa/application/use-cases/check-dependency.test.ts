import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CheckDependencyUseCase } from './check-dependency.js';

function makePrisma(overrides?: {
  clinicalSoas?: Array<Record<string, unknown>>;
  section6?: Record<string, unknown> | null;
}) {
  return {
    soaAnalysis: {
      findMany: vi.fn().mockResolvedValue(overrides?.clinicalSoas ?? []),
    },
    thematicSection: {
      findFirst: vi.fn().mockResolvedValue(
        overrides?.section6 !== undefined ? overrides.section6 : null,
      ),
    },
  } as any;
}

describe('CheckDependencyUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns no warnings for CLINICAL type', async () => {
    const prisma = makePrisma();
    const useCase = new CheckDependencyUseCase(prisma);

    const result = await useCase.execute('proj-1', 'CLINICAL');

    expect(result.canProceed).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it('returns no warnings for ALTERNATIVE type', async () => {
    const prisma = makePrisma();
    const useCase = new CheckDependencyUseCase(prisma);

    const result = await useCase.execute('proj-1', 'ALTERNATIVE');

    expect(result.canProceed).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it('warns when no Clinical SOA exists for SIMILAR_DEVICE', async () => {
    const prisma = makePrisma({ clinicalSoas: [] });
    const useCase = new CheckDependencyUseCase(prisma);

    const result = await useCase.execute('proj-1', 'SIMILAR_DEVICE');

    expect(result.canProceed).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('No Clinical SOA');
  });

  it('warns when Section 6 is not finalized', async () => {
    const prisma = makePrisma({
      clinicalSoas: [{ id: 'soa-1' }],
      section6: null,
    });
    const useCase = new CheckDependencyUseCase(prisma);

    const result = await useCase.execute('proj-1', 'SIMILAR_DEVICE');

    expect(result.canProceed).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('Section 6');
  });

  it('returns no warnings when Section 6 is finalized', async () => {
    const prisma = makePrisma({
      clinicalSoas: [{ id: 'soa-1' }],
      section6: { id: 'sec-6', status: 'FINALIZED' },
    });
    const useCase = new CheckDependencyUseCase(prisma);

    const result = await useCase.execute('proj-1', 'SIMILAR_DEVICE');

    expect(result.canProceed).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it('always allows proceeding (warning, not blocking)', async () => {
    const prisma = makePrisma({ clinicalSoas: [] });
    const useCase = new CheckDependencyUseCase(prisma);

    const result = await useCase.execute('proj-1', 'SIMILAR_DEVICE');

    expect(result.canProceed).toBe(true);
  });
});
