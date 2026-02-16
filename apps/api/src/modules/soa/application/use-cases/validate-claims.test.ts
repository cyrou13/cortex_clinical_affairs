import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ValidateClaimsUseCase } from './validate-claims.js';

const SOA_ID = 'soa-1';

function makePrisma(overrides?: {
  soa?: Record<string, unknown> | null;
  claims?: Array<Record<string, unknown>>;
}) {
  return {
    soaAnalysis: {
      findUnique: vi
        .fn()
        .mockResolvedValue(overrides?.soa !== undefined ? overrides.soa : { id: SOA_ID }),
    },
    claim: {
      findMany: vi.fn().mockResolvedValue(
        overrides?.claims ?? [
          {
            id: 'claim-1',
            statementText: 'Claim with links',
            claimArticleLinks: [{ id: 'link-1', articleId: 'art-1' }],
          },
          {
            id: 'claim-2',
            statementText: 'Claim without links',
            claimArticleLinks: [],
          },
          {
            id: 'claim-3',
            statementText: 'Another claim with links',
            claimArticleLinks: [
              { id: 'link-2', articleId: 'art-2' },
              { id: 'link-3', articleId: 'art-3' },
            ],
          },
        ],
      ),
    },
  } as any;
}

describe('ValidateClaimsUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates traceability report with correct statistics', async () => {
    const prisma = makePrisma();
    const useCase = new ValidateClaimsUseCase(prisma);

    const result = await useCase.getTraceabilityReport(SOA_ID);

    expect(result.totalClaims).toBe(3);
    expect(result.linkedClaims).toBe(2);
    expect(result.unlinkedClaims).toBe(1);
    expect(result.traceabilityPercentage).toBe(67); // 2/3 = 66.67 -> 67
    expect(result.unlinkedClaimsList).toHaveLength(1);
    expect(result.unlinkedClaimsList[0]!.claimId).toBe('claim-2');
  });

  it('returns 100% traceability when all claims are linked', async () => {
    const claims = [
      {
        id: 'claim-1',
        statementText: 'Claim 1',
        claimArticleLinks: [{ id: 'link-1' }],
      },
      {
        id: 'claim-2',
        statementText: 'Claim 2',
        claimArticleLinks: [{ id: 'link-2' }],
      },
    ];

    const prisma = makePrisma({ claims });
    const useCase = new ValidateClaimsUseCase(prisma);

    const result = await useCase.getTraceabilityReport(SOA_ID);

    expect(result.totalClaims).toBe(2);
    expect(result.linkedClaims).toBe(2);
    expect(result.unlinkedClaims).toBe(0);
    expect(result.traceabilityPercentage).toBe(100);
    expect(result.unlinkedClaimsList).toEqual([]);
  });

  it('returns 0% traceability when no claims are linked', async () => {
    const claims = [
      {
        id: 'claim-1',
        statementText: 'Claim 1',
        claimArticleLinks: [],
      },
      {
        id: 'claim-2',
        statementText: 'Claim 2',
        claimArticleLinks: [],
      },
    ];

    const prisma = makePrisma({ claims });
    const useCase = new ValidateClaimsUseCase(prisma);

    const result = await useCase.getTraceabilityReport(SOA_ID);

    expect(result.totalClaims).toBe(2);
    expect(result.linkedClaims).toBe(0);
    expect(result.unlinkedClaims).toBe(2);
    expect(result.traceabilityPercentage).toBe(0);
    expect(result.unlinkedClaimsList).toHaveLength(2);
  });

  it('returns 100% when no claims exist', async () => {
    const prisma = makePrisma({ claims: [] });
    const useCase = new ValidateClaimsUseCase(prisma);

    const result = await useCase.getTraceabilityReport(SOA_ID);

    expect(result.totalClaims).toBe(0);
    expect(result.linkedClaims).toBe(0);
    expect(result.unlinkedClaims).toBe(0);
    expect(result.traceabilityPercentage).toBe(100);
  });

  it('throws NotFoundError when SOA not found', async () => {
    const prisma = makePrisma({ soa: null });
    const useCase = new ValidateClaimsUseCase(prisma);

    await expect(useCase.getTraceabilityReport('missing')).rejects.toThrow('not found');
  });

  it('returns only unlinked claims', async () => {
    const prisma = makePrisma();
    const useCase = new ValidateClaimsUseCase(prisma);

    const result = await useCase.getUnlinkedClaims(SOA_ID);

    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('claim-2');
    expect(result[0]!.statementText).toBe('Claim without links');
  });
});
