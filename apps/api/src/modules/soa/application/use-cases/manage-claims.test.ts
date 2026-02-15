import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ManageClaimsUseCase } from './manage-claims.js';

const SOA_ID = 'soa-1';
const CLAIM_ID = 'claim-1';
const ARTICLE_ID = 'art-1';
const SECTION_ID = 'sec-1';
const USER_ID = 'user-1';

function makePrisma(overrides?: {
  soa?: Record<string, unknown> | null;
  claim?: Record<string, unknown> | null;
  article?: Record<string, unknown> | null;
  section?: Record<string, unknown> | null;
  claims?: Array<Record<string, unknown>>;
}) {
  return {
    soaAnalysis: {
      findUnique: vi
        .fn()
        .mockResolvedValue(
          overrides?.soa !== undefined ? overrides.soa : { id: SOA_ID, status: 'IN_PROGRESS' },
        ),
    },
    thematicSection: {
      findUnique: vi
        .fn()
        .mockResolvedValue(
          overrides?.section !== undefined
            ? overrides.section
            : { id: SECTION_ID, soaAnalysisId: SOA_ID },
        ),
    },
    claim: {
      create: vi.fn().mockResolvedValue({
        id: CLAIM_ID,
        statementText: 'Device is safe',
        soaAnalysisId: SOA_ID,
      }),
      findUnique: vi.fn().mockResolvedValue(
        overrides?.claim !== undefined
          ? overrides.claim
          : {
              id: CLAIM_ID,
              soaAnalysis: { id: SOA_ID, status: 'IN_PROGRESS' },
            },
      ),
      findMany: vi.fn().mockResolvedValue(
        overrides?.claims ?? [
          {
            id: CLAIM_ID,
            statementText: 'Device is safe',
            claimArticleLinks: [{ id: 'link-1', article: { id: ARTICLE_ID, title: 'Study 1' } }],
            thematicSection: { id: SECTION_ID, title: 'Safety' },
          },
        ],
      ),
    },
    article: {
      findUnique: vi
        .fn()
        .mockResolvedValue(
          overrides?.article !== undefined ? overrides.article : { id: ARTICLE_ID },
        ),
    },
    claimArticleLink: {
      create: vi.fn().mockResolvedValue({
        id: 'link-1',
        claimId: CLAIM_ID,
        articleId: ARTICLE_ID,
      }),
    },
  } as any;
}

describe('ManageClaimsUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a claim for the SOA analysis', async () => {
    const prisma = makePrisma();
    const useCase = new ManageClaimsUseCase(prisma);

    const result = await useCase.createClaim({
      soaAnalysisId: SOA_ID,
      statementText: 'Device is safe',
      thematicSectionId: SECTION_ID,
      userId: USER_ID,
    });

    expect(result.id).toBe(CLAIM_ID);
    expect(prisma.claim.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          soaAnalysisId: SOA_ID,
          statementText: 'Device is safe',
          thematicSectionId: SECTION_ID,
        }),
      }),
    );
  });

  it('throws NotFoundError when SOA not found for createClaim', async () => {
    const prisma = makePrisma({ soa: null });
    const useCase = new ManageClaimsUseCase(prisma);

    await expect(
      useCase.createClaim({
        soaAnalysisId: 'missing',
        statementText: 'Claim text',
        userId: USER_ID,
      }),
    ).rejects.toThrow('not found');
  });

  it('throws ValidationError when SOA is locked for createClaim', async () => {
    const prisma = makePrisma({ soa: { id: SOA_ID, status: 'LOCKED' } });
    const useCase = new ManageClaimsUseCase(prisma);

    await expect(
      useCase.createClaim({
        soaAnalysisId: SOA_ID,
        statementText: 'Claim text',
        userId: USER_ID,
      }),
    ).rejects.toThrow('locked');
  });

  it('links a claim to an article', async () => {
    const prisma = makePrisma();
    const useCase = new ManageClaimsUseCase(prisma);

    const result = await useCase.linkClaimToArticle({
      claimId: CLAIM_ID,
      articleId: ARTICLE_ID,
      sourceQuote: 'The device showed no adverse effects.',
    });

    expect(result.id).toBe('link-1');
    expect(prisma.claimArticleLink.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          claimId: CLAIM_ID,
          articleId: ARTICLE_ID,
          sourceQuote: 'The device showed no adverse effects.',
        }),
      }),
    );
  });

  it('throws NotFoundError when claim not found for linkClaimToArticle', async () => {
    const prisma = makePrisma({ claim: null });
    const useCase = new ManageClaimsUseCase(prisma);

    await expect(
      useCase.linkClaimToArticle({
        claimId: 'missing',
        articleId: ARTICLE_ID,
      }),
    ).rejects.toThrow('not found');
  });

  it('returns claims with linked articles', async () => {
    const prisma = makePrisma();
    const useCase = new ManageClaimsUseCase(prisma);

    const result = await useCase.getClaimsForAnalysis(SOA_ID);

    expect(result).toHaveLength(1);
    expect((result[0] as any)!.claimArticleLinks).toHaveLength(1);
    expect(prisma.claim.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { soaAnalysisId: SOA_ID },
        include: expect.objectContaining({
          claimArticleLinks: expect.any(Object),
        }),
      }),
    );
  });
});
