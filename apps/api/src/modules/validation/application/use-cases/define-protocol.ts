import type { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';

interface DefineProtocolInput {
  validationStudyId: string;
  summary?: string;
  endpoints?: string;
  sampleSizeJustification?: string;
  statisticalStrategy?: string;
  userId: string;
}

interface DefineProtocolResult {
  protocolId: string;
  version: string;
  status: string;
  isNew: boolean;
}

export class DefineProtocolUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: DefineProtocolInput): Promise<DefineProtocolResult> {
    const { validationStudyId, userId } = input;

    // Verify study exists
    const study = await this.prisma.validationStudy.findUnique({
      where: { id: validationStudyId },
      select: { id: true, status: true },
    });

    if (!study) {
      throw new NotFoundError('ValidationStudy', validationStudyId);
    }

    if (study.status === 'LOCKED') {
      throw new ValidationError('Cannot define protocol for a locked validation study');
    }

    // Check if protocol already exists for this study
    const existingProtocol = await this.prisma.protocol.findFirst({
      where: { validationStudyId },
      select: { id: true, version: true, status: true },
    });

    if (existingProtocol) {
      if (existingProtocol.status === 'APPROVED') {
        throw new ValidationError('Protocol is approved. Use amend-protocol to make changes.');
      }

      // Update existing draft protocol
      await this.prisma.protocol.update({
        where: { id: existingProtocol.id },
        data: {
          summary: input.summary ?? undefined,
          endpoints: input.endpoints ?? undefined,
          sampleSizeJustification: input.sampleSizeJustification ?? undefined,
          statisticalStrategy: input.statisticalStrategy ?? undefined,
          updatedAt: new Date(),
        },
      });

      return {
        protocolId: existingProtocol.id,
        version: existingProtocol.version,
        status: existingProtocol.status,
        isNew: false,
      };
    }

    // Create new protocol
    const protocolId = crypto.randomUUID();
    await this.prisma.protocol.create({
      data: {
        id: protocolId,
        validationStudyId,
        version: '1.0',
        status: 'DRAFT',
        summary: input.summary ?? null,
        endpoints: input.endpoints ?? null,
        sampleSizeJustification: input.sampleSizeJustification ?? null,
        statisticalStrategy: input.statisticalStrategy ?? null,
        createdById: userId,
      },
    });

    return {
      protocolId,
      version: '1.0',
      status: 'DRAFT',
      isNew: true,
    };
  }
}
