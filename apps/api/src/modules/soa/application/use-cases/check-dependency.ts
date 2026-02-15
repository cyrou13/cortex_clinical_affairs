import type { PrismaClient } from '@prisma/client';

interface DependencyCheckResult {
  canProceed: boolean;
  warnings: string[];
}

export class CheckDependencyUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(projectId: string, soaType: string): Promise<DependencyCheckResult> {
    if (soaType !== 'SIMILAR_DEVICE') {
      return { canProceed: true, warnings: [] };
    }

    const clinicalSoas = await (this.prisma as any).soaAnalysis.findMany({
      where: {
        projectId,
        type: 'CLINICAL',
      },
      select: { id: true },
    });

    if (clinicalSoas.length === 0) {
      return {
        canProceed: true,
        warnings: [
          'No Clinical SOA exists for this project. Device SOA may be incomplete without Clinical SOA Section 6 conclusions.',
        ],
      };
    }

    const section6Finalized = await (this.prisma as any).thematicSection.findFirst({
      where: {
        soaAnalysisId: { in: clinicalSoas.map((s: { id: string }) => s.id) },
        sectionKey: 'CLINICAL_6',
        status: 'FINALIZED',
      },
    });

    if (!section6Finalized) {
      return {
        canProceed: true,
        warnings: [
          'Clinical SOA Section 6 (Conclusions & Residual Risks) is not finalized. Device SOA may be incomplete.',
        ],
      };
    }

    return { canProceed: true, warnings: [] };
  }
}
