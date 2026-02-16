import type { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';

interface LaunchMiniLiteratureSearchInput {
  validationStudyId: string;
  userId: string;
  searchTerm: string;
}

interface LaunchMiniLiteratureSearchResult {
  slsSessionId: string;
  validationStudyId: string;
}

/**
 * Launch Mini Literature Search for MRMC Validation Studies
 *
 * Creates an ad-hoc SLS session linked to the validation study
 * for methodology justification (FR35a, FR35b)
 */
export class LaunchMiniLiteratureSearchUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: LaunchMiniLiteratureSearchInput): Promise<LaunchMiniLiteratureSearchResult> {
    const { validationStudyId, userId, searchTerm } = input;

    // Verify study exists and is MRMC type
    const study = await this.prisma.validationStudy.findUnique({
      where: { id: validationStudyId },
      select: { id: true, type: true, status: true, projectId: true },
    });

    if (!study) {
      throw new NotFoundError('ValidationStudy', validationStudyId);
    }

    if (study.type !== 'MRMC') {
      throw new ValidationError('Mini literature search is only available for MRMC studies');
    }

    if (study.status === 'LOCKED') {
      throw new ValidationError('Cannot launch mini literature search for locked study');
    }

    // Create ad-hoc SLS session (using ungenerated model pattern)
    const slsSessionId = crypto.randomUUID();
    await (this.prisma as any).slsSession.create({
      data: {
        id: slsSessionId,
        projectId: study.projectId,
        type: 'ad_hoc',
        name: `Mini Literature Search: ${searchTerm}`,
        searchTerm,
        status: 'DRAFT',
        createdById: userId,
      },
    });

    // Link SLS session to validation study
    await this.prisma.validationStudy.update({
      where: { id: validationStudyId },
      data: { slsSessionId },
    });

    return {
      slsSessionId,
      validationStudyId,
    };
  }
}
