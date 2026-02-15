import type { PrismaClient, EvaluatorRole as PrismaEvaluatorRole } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';

// ── Types ───────────────────────────────────────────────────────────────

export const EVALUATOR_ROLES = ['WRITTEN_BY', 'VERIFIED_BY', 'APPROVED_BY'] as const;
export type EvaluatorRole = (typeof EVALUATOR_ROLES)[number];

export interface AssignEvaluatorInput {
  cerVersionId: string;
  sectionId: string;
  userId: string;
  role: string;
  assignedBy: string;
}

export interface RemoveEvaluatorInput {
  evaluatorId: string;
  removedBy: string;
}

export interface EvaluatorResult {
  id: string;
  cerVersionId: string;
  sectionId: string;
  userId: string;
  role: string;
}

// ── Use Case ────────────────────────────────────────────────────────────

export class ManageEvaluatorsUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async assign(input: AssignEvaluatorInput): Promise<EvaluatorResult> {
    // Validate role
    if (!EVALUATOR_ROLES.includes(input.role as EvaluatorRole)) {
      throw new ValidationError(`Invalid evaluator role: ${input.role}`);
    }

    // Verify CER version exists
    const cerVersion = await this.prisma.cerVersion.findUnique({
      where: { id: input.cerVersionId },
      select: { id: true },
    });

    if (!cerVersion) {
      throw new NotFoundError('CerVersion', input.cerVersionId);
    }

    // Verify section exists
    const section = await this.prisma.cerSection.findUnique({
      where: { id: input.sectionId },
      select: { id: true, cerVersionId: true },
    });

    if (!section) {
      throw new NotFoundError('CerSection', input.sectionId);
    }

    if (section.cerVersionId !== input.cerVersionId) {
      throw new ValidationError('Section does not belong to this CER version');
    }

    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundError('User', input.userId);
    }

    // Check one role per type per section
    const existingAssignment = await this.prisma.evaluator.findFirst({
      where: {
        cerVersionId: input.cerVersionId,
        sectionId: input.sectionId,
        role: input.role as PrismaEvaluatorRole,
      },
      select: { id: true, userId: true },
    });

    if (existingAssignment) {
      throw new ValidationError(`Role ${input.role} is already assigned for this section`);
    }

    // Separation of duties: APPROVED_BY must not be same as WRITTEN_BY
    if (input.role === 'APPROVED_BY') {
      const writtenBy = await this.prisma.evaluator.findFirst({
        where: {
          cerVersionId: input.cerVersionId,
          sectionId: input.sectionId,
          role: 'WRITTEN_BY',
        },
        select: { userId: true },
      });

      if (writtenBy && writtenBy.userId === input.userId) {
        throw new ValidationError(
          'APPROVED_BY must not be the same person as WRITTEN_BY (separation of duties)',
        );
      }
    }

    if (input.role === 'WRITTEN_BY') {
      const approvedBy = await this.prisma.evaluator.findFirst({
        where: {
          cerVersionId: input.cerVersionId,
          sectionId: input.sectionId,
          role: 'APPROVED_BY',
        },
        select: { userId: true },
      });

      if (approvedBy && approvedBy.userId === input.userId) {
        throw new ValidationError(
          'WRITTEN_BY must not be the same person as APPROVED_BY (separation of duties)',
        );
      }
    }

    const evaluatorId = crypto.randomUUID();

    const evaluator = await this.prisma.evaluator.create({
      data: {
        id: evaluatorId,
        cerVersionId: input.cerVersionId,
        sectionId: input.sectionId,
        userId: input.userId,
        role: input.role as PrismaEvaluatorRole,
        assignedById: input.assignedBy,
      },
    });

    return {
      id: evaluator.id,
      cerVersionId: evaluator.cerVersionId,
      sectionId: evaluator.sectionId ?? '',
      userId: evaluator.userId,
      role: evaluator.role,
    };
  }

  async remove(input: RemoveEvaluatorInput): Promise<{ deleted: boolean }> {
    const evaluator = await this.prisma.evaluator.findUnique({
      where: { id: input.evaluatorId },
      select: { id: true, signedAt: true },
    });

    if (!evaluator) {
      throw new NotFoundError('Evaluator', input.evaluatorId);
    }

    if (evaluator.signedAt) {
      throw new ValidationError('Cannot remove evaluator who has already signed');
    }

    await this.prisma.evaluator.delete({
      where: { id: input.evaluatorId },
    });

    return { deleted: true };
  }

  async listBySection(cerVersionId: string, sectionId: string): Promise<EvaluatorResult[]> {
    const evaluators = await this.prisma.evaluator.findMany({
      where: { cerVersionId, sectionId },
      orderBy: { createdAt: 'asc' },
    });

    return evaluators.map((e: any) => ({
      id: e.id,
      cerVersionId: e.cerVersionId,
      sectionId: e.sectionId,
      userId: e.userId,
      role: e.role,
    }));
  }
}
