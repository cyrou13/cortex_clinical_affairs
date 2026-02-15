import type { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';
import type { EventBus } from '../../../../shared/events/event-bus.js';
import { createDocumentSignedEvent } from '../../domain/events/cer-events.js';
import type { ChecksumService } from '../../../../shared/services/checksum-service.js';

// ── Types ───────────────────────────────────────────────────────────────

export interface ESignInput {
  userId: string;
  cerVersionId: string;
  action: string;
}

export interface ESignResult {
  signatureId: string;
  userId: string;
  cerVersionId: string;
  documentHash: string;
  signedAt: string;
}

// ── Use Case ────────────────────────────────────────────────────────────

export class ESignDocumentUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly eventBus: EventBus,
    private readonly checksumService: ChecksumService,
  ) {}

  async execute(input: ESignInput): Promise<ESignResult> {
    // Verify CER version exists
    const cerVersion = await (this.prisma as any).cerVersion.findUnique({
      where: { id: input.cerVersionId },
      select: { id: true },
    });

    if (!cerVersion) {
      throw new NotFoundError('CerVersion', input.cerVersionId);
    }

    // Find evaluator record for this user and CER version
    const evaluator = await (this.prisma as any).evaluator.findFirst({
      where: {
        cerVersionId: input.cerVersionId,
        userId: input.userId,
      },
      select: {
        id: true,
        cvFilePath: true,
        coiDeclaredAt: true,
        signedAt: true,
      },
    });

    if (!evaluator) {
      throw new NotFoundError('Evaluator', input.userId);
    }

    // Validate COI declared
    if (!evaluator.coiDeclaredAt) {
      throw new ValidationError('COI declaration must be completed before signing');
    }

    // Validate CV uploaded
    if (!evaluator.cvFilePath) {
      throw new ValidationError('CV must be uploaded before signing');
    }

    // Already signed check
    if (evaluator.signedAt) {
      throw new ValidationError('Document has already been signed by this evaluator');
    }

    // Compute document hash from all sections
    const sections = await (this.prisma as any).cerSection.findMany({
      where: { cerVersionId: input.cerVersionId },
      select: { content: true },
      orderBy: { orderIndex: 'asc' },
    });

    const documentHash = this.checksumService.computeDocumentHash(
      sections.map((s: any) => ({ content: s.content ?? '' })),
    );

    const now = new Date();
    const signatureId = crypto.randomUUID();

    // Create ESignature record
    await (this.prisma as any).eSignature.create({
      data: {
        id: signatureId,
        cerVersionId: input.cerVersionId,
        userId: input.userId,
        documentHash,
        action: input.action,
        signedAt: now,
      },
    });

    // Update evaluator record
    await (this.prisma as any).evaluator.update({
      where: { id: evaluator.id },
      data: {
        signedAt: now,
        signatureHash: documentHash,
      },
    });

    // Emit event
    const event = createDocumentSignedEvent(
      {
        cerVersionId: input.cerVersionId,
        userId: input.userId,
        documentHash,
        action: input.action,
      },
      input.userId,
      crypto.randomUUID(),
    );
    void this.eventBus.publish(event);

    return {
      signatureId,
      userId: input.userId,
      cerVersionId: input.cerVersionId,
      documentHash,
      signedAt: now.toISOString(),
    };
  }
}
