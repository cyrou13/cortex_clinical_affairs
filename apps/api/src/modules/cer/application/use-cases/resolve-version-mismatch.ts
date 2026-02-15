import type { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';

type ResolutionAction = 'acknowledge' | 'update-reference';

interface ResolveVersionMismatchInput {
  sectionId: string;
  action: ResolutionAction;
  userId: string;
}

interface ResolveVersionMismatchResult {
  sectionId: string;
  action: ResolutionAction;
  resolved: boolean;
}

const VALID_ACTIONS: ResolutionAction[] = ['acknowledge', 'update-reference'];

export class ResolveVersionMismatchUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: ResolveVersionMismatchInput): Promise<ResolveVersionMismatchResult> {
    const { sectionId, action, userId } = input;

    if (!VALID_ACTIONS.includes(action)) {
      throw new ValidationError(`Invalid resolution action: ${action}`);
    }

    // Fetch section
    const section = await (this.prisma as any).cerSection.findUnique({
      where: { id: sectionId },
      select: {
        id: true,
        versionMismatchWarning: true,
        cerVersion: { select: { id: true, status: true } },
      },
    });

    if (!section) {
      throw new NotFoundError('CerSection', sectionId);
    }

    if (section.cerVersion?.status === 'LOCKED') {
      throw new ValidationError('Cannot resolve mismatch on a locked CER version');
    }

    if (!section.versionMismatchWarning) {
      throw new ValidationError('Section does not have a version mismatch warning');
    }

    // Clear the warning
    await (this.prisma as any).cerSection.update({
      where: { id: sectionId },
      data: {
        versionMismatchWarning: false,
        mismatchResolvedAt: new Date().toISOString(),
        mismatchResolvedById: userId,
        mismatchResolutionAction: action,
      },
    });

    return {
      sectionId,
      action,
      resolved: true,
    };
  }
}
