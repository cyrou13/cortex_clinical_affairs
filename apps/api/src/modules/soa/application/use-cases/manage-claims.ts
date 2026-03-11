import type { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';

interface CreateClaimInput {
  soaAnalysisId: string;
  statementText: string;
  thematicSectionId?: string;
  userId: string;
}

interface LinkClaimToArticleInput {
  claimId: string;
  articleId: string;
  sourceQuote?: string;
}

export class ManageClaimsUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async createClaim(input: CreateClaimInput) {
    const soa = await this.prisma.soaAnalysis.findUnique({
      where: { id: input.soaAnalysisId },
      select: { id: true, status: true },
    });

    if (!soa) {
      throw new NotFoundError('SoaAnalysis', input.soaAnalysisId);
    }

    if (soa.status === 'LOCKED') {
      throw new ValidationError('Cannot create claim on a locked SOA analysis');
    }

    if (!input.statementText.trim()) {
      throw new ValidationError('Claim statement text is required');
    }

    if (input.thematicSectionId) {
      const section = await this.prisma.thematicSection.findUnique({
        where: { id: input.thematicSectionId },
        select: { id: true, soaAnalysisId: true },
      });

      if (!section || section.soaAnalysisId !== input.soaAnalysisId) {
        throw new NotFoundError('ThematicSection', input.thematicSectionId);
      }
    }

    const claim = await this.prisma.claim.create({
      data: {
        id: crypto.randomUUID(),
        soaAnalysisId: input.soaAnalysisId,
        statementText: input.statementText.trim(),
        thematicSectionId: input.thematicSectionId ?? null,
        createdById: input.userId,
      },
    });

    return claim;
  }

  async linkClaimToArticle(input: LinkClaimToArticleInput) {
    const claim = await this.prisma.claim.findUnique({
      where: { id: input.claimId },
      include: {
        soaAnalysis: { select: { id: true, status: true } },
      },
    });

    if (!claim) {
      throw new NotFoundError('Claim', input.claimId);
    }

    if (claim.soaAnalysis?.status === 'LOCKED') {
      throw new ValidationError('Cannot link claim on a locked SOA analysis');
    }

    const article = await this.prisma.article.findUnique({
      where: { id: input.articleId },
      select: { id: true },
    });

    if (!article) {
      throw new NotFoundError('Article', input.articleId);
    }

    const link = await this.prisma.claimArticleLink.create({
      data: {
        id: crypto.randomUUID(),
        claimId: input.claimId,
        articleId: input.articleId,
        sourceQuote: input.sourceQuote ?? null,
      },
    });

    return link;
  }

  async getClaimsForAnalysis(soaAnalysisId: string) {
    const soa = await this.prisma.soaAnalysis.findUnique({
      where: { id: soaAnalysisId },
      select: { id: true },
    });

    if (!soa) {
      throw new NotFoundError('SoaAnalysis', soaAnalysisId);
    }

    const claims = await (this.prisma as any).claim.findMany({
      where: { soaAnalysisId },
      include: {
        claimArticleLinks: {
          include: {
            article: { select: { id: true, title: true } },
          },
        },
        thematicSection: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return claims;
  }
}
