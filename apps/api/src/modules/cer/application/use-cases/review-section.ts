import type { PrismaClient, Prisma } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';
import type { EventBus, DomainEvent } from '../../../../shared/events/event-bus.js';

// ── Types ───────────────────────────────────────────────────────────────

export type SectionStatus = 'DRAFT' | 'REVIEWED' | 'FINALIZED';

interface ReviewSectionInput {
  cerSectionId: string;
  content: Record<string, unknown>; // Plate JSON
  targetStatus: SectionStatus;
  userId: string;
}

interface ReviewSectionResult {
  cerSectionId: string;
  status: SectionStatus;
  humanEditPercentage: number;
  wordCount: number;
}

const VALID_TRANSITIONS: Record<SectionStatus, SectionStatus[]> = {
  DRAFT: ['REVIEWED'],
  REVIEWED: ['FINALIZED', 'DRAFT'],
  FINALIZED: [],
};

// ── Use Case ────────────────────────────────────────────────────────────

export class ReviewSectionUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: ReviewSectionInput): Promise<ReviewSectionResult> {
    const { cerSectionId, content, targetStatus, userId } = input;

    // 1. Fetch section
    const section = await (this.prisma as any).cerSection.findUnique({
      where: { id: cerSectionId },
      select: {
        id: true,
        status: true,
        aiDraftContent: true,
        humanEditedContent: true,
        cerVersionId: true,
      },
    });

    if (!section) {
      throw new NotFoundError('CerSection', cerSectionId);
    }

    // 2. Validate status transition
    const currentStatus = section.status as SectionStatus;
    const allowedTransitions = VALID_TRANSITIONS[currentStatus] ?? [];

    if (!allowedTransitions.includes(targetStatus)) {
      throw new ValidationError(
        `Cannot transition from ${currentStatus} to ${targetStatus}`,
      );
    }

    // 3. Validate references for FINALIZED
    if (targetStatus === 'FINALIZED') {
      const refs = extractInlineReferences(JSON.stringify(content));
      if (refs.length > 0) {
        const claimTraces = await (this.prisma as any).claimTrace.findMany({
          where: {
            cerSectionId,
            refNumber: { in: refs },
          },
          select: { refNumber: true },
        });

        const tracedRefs = new Set(claimTraces.map((ct: { refNumber: string }) => ct.refNumber));
        const unverified = refs.filter((r) => !tracedRefs.has(r));

        if (unverified.length > 0) {
          throw new ValidationError(
            `Cannot finalize: ${unverified.length} unverified reference(s): ${unverified.join(', ')}`,
          );
        }
      }
    }

    // 4. Compute diff metrics
    const aiDraftText = section.aiDraftContent
      ? extractPlainText(section.aiDraftContent)
      : '';
    const humanText = extractPlainText(content);
    const humanEditPercentage = computeEditPercentage(aiDraftText, humanText);
    const wordCount = countWords(humanText);

    // 5. Update section
    const now = new Date();
    await (this.prisma as any).cerSection.update({
      where: { id: cerSectionId },
      data: {
        status: targetStatus,
        humanEditedContent: content as unknown as Prisma.InputJsonValue,
        humanEditPercentage,
        wordCount,
        updatedAt: now,
        updatedById: userId,
      },
    });

    // 6. Audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'cer.section.status-changed',
        targetType: 'cerSection',
        targetId: cerSectionId,
        before: { status: currentStatus } as unknown as Prisma.InputJsonValue,
        after: {
          status: targetStatus,
          humanEditPercentage,
          wordCount,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    // 7. Emit domain event
    const event: DomainEvent<{ cerSectionId: string; cerVersionId: string; fromStatus: string; toStatus: string }> = {
      eventType: 'cer.section.status-changed',
      aggregateId: cerSectionId,
      aggregateType: 'CerSection',
      data: {
        cerSectionId,
        cerVersionId: section.cerVersionId,
        fromStatus: currentStatus,
        toStatus: targetStatus,
      },
      metadata: {
        userId,
        timestamp: now.toISOString(),
        correlationId: crypto.randomUUID(),
        version: 1,
      },
    };

    void this.eventBus.publish(event);

    return {
      cerSectionId,
      status: targetStatus,
      humanEditPercentage,
      wordCount,
    };
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────

export function extractInlineReferences(text: string): string[] {
  const regex = /\[(\d+|R\d+)\]/g;
  const matches: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (!matches.includes(match[1])) {
      matches.push(match[1]);
    }
  }
  return matches;
}

export function extractPlainText(content: unknown): string {
  if (typeof content === 'string') return content;
  return JSON.stringify(content);
}

export function computeEditPercentage(aiDraft: string, humanEdited: string): number {
  if (!aiDraft || aiDraft.length === 0) return 100;
  if (aiDraft === humanEdited) return 0;

  const aiWords = aiDraft.split(/\s+/).filter(Boolean);
  const humanWords = humanEdited.split(/\s+/).filter(Boolean);

  if (aiWords.length === 0) return 100;

  // Simple word-level diff: count words that differ
  const maxLen = Math.max(aiWords.length, humanWords.length);
  let diffCount = Math.abs(aiWords.length - humanWords.length);

  const minLen = Math.min(aiWords.length, humanWords.length);
  for (let i = 0; i < minLen; i++) {
    if (aiWords[i] !== humanWords[i]) {
      diffCount++;
    }
  }

  return Math.round((diffCount / maxLen) * 100);
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}
