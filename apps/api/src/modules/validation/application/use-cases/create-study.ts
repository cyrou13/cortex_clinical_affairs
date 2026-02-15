import type { PrismaClient } from '@prisma/client';
import { isValidStudyType } from '../../domain/value-objects/study-type.js';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';
import { LinkSoaBenchmarksUseCase } from './link-soa-benchmarks.js';

interface CreateStudyInput {
  projectId: string;
  name: string;
  type: string;
  description?: string;
  soaAnalysisId: string;
  userId: string;
}

interface CreateStudyResult {
  validationStudyId: string;
  name: string;
  type: string;
  soaAnalysisId: string;
  benchmarkCount: number;
}

export class CreateStudyUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: CreateStudyInput): Promise<CreateStudyResult> {
    if (!isValidStudyType(input.type)) {
      throw new ValidationError(`Invalid study type: ${input.type}`);
    }

    if (!input.name.trim()) {
      throw new ValidationError('Study name is required');
    }

    // Verify project exists
    const project = await this.prisma.project.findUnique({
      where: { id: input.projectId },
      select: { id: true },
    });

    if (!project) {
      throw new NotFoundError('Project', input.projectId);
    }

    // Verify SOA exists and is locked
    const soa = await this.prisma.soaAnalysis.findUnique({
      where: { id: input.soaAnalysisId },
      select: { id: true, status: true, projectId: true },
    });

    if (!soa) {
      throw new NotFoundError('SoaAnalysis', input.soaAnalysisId);
    }

    if (soa.status !== 'LOCKED') {
      throw new ValidationError('SOA analysis must be locked before creating a validation study');
    }

    if (soa.projectId !== input.projectId) {
      throw new ValidationError('SOA analysis does not belong to this project');
    }

    const studyId = crypto.randomUUID();

    await this.prisma.validationStudy.create({
      data: {
        id: studyId,
        projectId: input.projectId,
        name: input.name.trim(),
        type: input.type,
        status: 'DRAFT',
        description: input.description ?? null,
        soaAnalysisId: input.soaAnalysisId,
        createdById: input.userId,
      },
    });

    // Auto-import benchmarks from SOA
    const linkBenchmarks = new LinkSoaBenchmarksUseCase(this.prisma);
    const benchmarkResult = await linkBenchmarks.execute({
      validationStudyId: studyId,
      soaAnalysisId: input.soaAnalysisId,
    });

    return {
      validationStudyId: studyId,
      name: input.name.trim(),
      type: input.type,
      soaAnalysisId: input.soaAnalysisId,
      benchmarkCount: benchmarkResult.importedCount,
    };
  }
}
