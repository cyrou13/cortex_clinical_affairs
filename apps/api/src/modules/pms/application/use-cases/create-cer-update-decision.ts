import type { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';
import { isValidCerUpdateConclusion } from '../../domain/value-objects/cer-update-conclusion.js';

interface CreateCerUpdateDecisionInput {
  pmsCycleId: string;
  benefitRiskReAssessment: string;
  conclusion: string;
  justification: string;
  materialChangesIdentified: boolean;
  materialChangesDescription?: string;
  userId: string;
}

interface CerUpdateDecisionResult {
  id: string;
  pmsCycleId: string;
  conclusion: string;
  status: string;
  justification: string;
  materialChangesIdentified: boolean;
}

export class CreateCerUpdateDecisionUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: CreateCerUpdateDecisionInput): Promise<CerUpdateDecisionResult> {
    if (!isValidCerUpdateConclusion(input.conclusion)) {
      throw new ValidationError(`Invalid CER update conclusion: ${input.conclusion}`);
    }

    if (!input.justification.trim()) {
      throw new ValidationError('Justification is required');
    }

    if (!input.benefitRiskReAssessment.trim()) {
      throw new ValidationError('Benefit-risk re-assessment is required');
    }

    const cycle = await this.prisma.pmsCycle.findUnique({
      where: { id: input.pmsCycleId },
      select: { id: true },
    });

    if (!cycle) {
      throw new NotFoundError('PmsCycle', input.pmsCycleId);
    }

    const decisionId = crypto.randomUUID();

    await this.prisma.cerUpdateDecision.create({
      data: {
        id: decisionId,
        pmsCycleId: input.pmsCycleId,
        benefitRiskReAssessment: input.benefitRiskReAssessment.trim(),
        conclusion: input.conclusion,
        justification: input.justification.trim(),
        materialChangesIdentified: input.materialChangesIdentified,
        materialChangesDescription: input.materialChangesDescription ?? null,
        status: 'DRAFT',
        decidedBy: input.userId,
      },
    });

    return {
      id: decisionId,
      pmsCycleId: input.pmsCycleId,
      conclusion: input.conclusion,
      status: 'DRAFT',
      justification: input.justification.trim(),
      materialChangesIdentified: input.materialChangesIdentified,
    };
  }
}
