import type { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../../../../shared/errors/index.js';

interface TraceabilityReport {
  totalClaims: number;
  linkedClaims: number;
  unlinkedClaims: number;
  traceabilityPercentage: number;
  unlinkedClaimsList: Array<{
    claimId: string;
    statementText: string;
  }>;
}

export class ValidateClaimsUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async getTraceabilityReport(soaAnalysisId: string): Promise<TraceabilityReport> {
    const soa = await this.prisma.soaAnalysis.findUnique({
      where: { id: soaAnalysisId },
      select: { id: true },
    });

    if (!soa) {
      throw new NotFoundError('SoaAnalysis', soaAnalysisId);
    }

    // Get all claims with their article links
    const claims = await this.prisma.claim.findMany({
      where: { soaAnalysisId },
      include: {
        claimArticleLinks: true,
      },
    });

    const totalClaims = claims.length;
    const linkedClaims = claims.filter((claim) => claim.claimArticleLinks.length > 0);
    const unlinkedClaims = claims.filter((claim) => claim.claimArticleLinks.length === 0);

    const traceabilityPercentage =
      totalClaims > 0 ? Math.round((linkedClaims.length / totalClaims) * 100) : 100;

    return {
      totalClaims,
      linkedClaims: linkedClaims.length,
      unlinkedClaims: unlinkedClaims.length,
      traceabilityPercentage,
      unlinkedClaimsList: unlinkedClaims.map((claim) => ({
        claimId: claim.id,
        statementText: claim.statementText,
      })),
    };
  }

  async getUnlinkedClaims(soaAnalysisId: string) {
    const soa = await this.prisma.soaAnalysis.findUnique({
      where: { id: soaAnalysisId },
      select: { id: true },
    });

    if (!soa) {
      throw new NotFoundError('SoaAnalysis', soaAnalysisId);
    }

    const claims = await this.prisma.claim.findMany({
      where: { soaAnalysisId },
      include: {
        claimArticleLinks: true,
      },
    });

    return claims.filter((claim) => claim.claimArticleLinks.length === 0);
  }
}
