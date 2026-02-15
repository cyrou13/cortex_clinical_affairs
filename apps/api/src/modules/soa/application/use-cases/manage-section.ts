import type { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';

interface UpdateContentResult {
  sectionId: string;
  status: string;
  updatedAt: string;
}

interface FinalizeSectionResult {
  sectionId: string;
  status: 'FINALIZED';
  finalizedAt: string;
}

interface SectionProgressResult {
  soaAnalysisId: string;
  totalSections: number;
  counts: Record<string, number>;
  completionPercentage: number;
}

export class ManageSectionUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async updateContent(
    sectionId: string,
    narrativeContent: string,
    userId: string,
  ): Promise<UpdateContentResult> {
    const section = await this.prisma.thematicSection.findUnique({
      where: { id: sectionId },
      include: { soaAnalysis: { select: { status: true } } },
    });

    if (!section) {
      throw new NotFoundError('ThematicSection', sectionId);
    }

    if (section.soaAnalysis?.status === 'LOCKED') {
      throw new ValidationError('Cannot update content on a locked SOA analysis');
    }

    if (section.status === 'FINALIZED') {
      throw new ValidationError('Cannot update content on a finalized section');
    }

    const updatedAt = new Date().toISOString();

    await this.prisma.thematicSection.update({
      where: { id: sectionId },
      data: {
        narrativeContent,
        status: 'IN_PROGRESS',
        updatedById: userId,
        updatedAt,
      },
    });

    return {
      sectionId,
      status: 'IN_PROGRESS',
      updatedAt,
    };
  }

  async finalizeSection(sectionId: string, userId: string): Promise<FinalizeSectionResult> {
    const section = await this.prisma.thematicSection.findUnique({
      where: { id: sectionId },
      include: { soaAnalysis: { select: { status: true } } },
    });

    if (!section) {
      throw new NotFoundError('ThematicSection', sectionId);
    }

    if (section.soaAnalysis?.status === 'LOCKED') {
      throw new ValidationError('Cannot finalize section on a locked SOA analysis');
    }

    if (!section.narrativeContent || !section.narrativeContent.trim()) {
      throw new ValidationError('Cannot finalize section with empty narrative content');
    }

    const finalizedAt = new Date().toISOString();

    await this.prisma.thematicSection.update({
      where: { id: sectionId },
      data: {
        status: 'FINALIZED',
        updatedById: userId,
        updatedAt: finalizedAt,
      },
    });

    return {
      sectionId,
      status: 'FINALIZED',
      finalizedAt,
    };
  }

  async getProgress(soaAnalysisId: string): Promise<SectionProgressResult> {
    const soaAnalysis = await this.prisma.soaAnalysis.findUnique({
      where: { id: soaAnalysisId },
      select: { id: true },
    });

    if (!soaAnalysis) {
      throw new NotFoundError('SoaAnalysis', soaAnalysisId);
    }

    const sections = await this.prisma.thematicSection.findMany({
      where: { soaAnalysisId },
      select: { id: true, status: true },
    });

    const counts: Record<string, number> = {
      DRAFT: 0,
      IN_PROGRESS: 0,
      FINALIZED: 0,
    };

    for (const section of sections as Array<{ id: string; status: string }>) {
      const status = section.status;
      counts[status] = (counts[status] ?? 0) + 1;
    }

    const totalSections = sections.length;
    const finalizedCount = counts.FINALIZED ?? 0;
    const completionPercentage =
      totalSections > 0 ? Math.round((finalizedCount / totalSections) * 100) : 0;

    return {
      soaAnalysisId,
      totalSections,
      counts,
      completionPercentage,
    };
  }
}
