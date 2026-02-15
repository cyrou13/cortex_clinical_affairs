import type { PrismaClient, Prisma } from '@prisma/client';
import { NotFoundError } from '../../../../shared/errors/index.js';
import type { EventBus, DomainEvent } from '../../../../shared/events/event-bus.js';

// ── Types ───────────────────────────────────────────────────────────────

interface RenumberReferencesInput {
  cerVersionId: string;
  userId: string;
}

interface RenumberMapping {
  oldNumber: string;
  newNumber: string;
  type: 'BIBLIOGRAPHY' | 'EXTERNAL_DOC';
}

interface RenumberReferencesResult {
  cerVersionId: string;
  mappings: RenumberMapping[];
  sectionsUpdated: number;
  bibliographyEntriesUpdated: number;
  crossReferencesUpdated: number;
}

// ── Use Case ────────────────────────────────────────────────────────────

export class RenumberReferencesUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: RenumberReferencesInput): Promise<RenumberReferencesResult> {
    const { cerVersionId, userId } = input;

    // 1. Verify CER version exists
    const cerVersion = await (this.prisma as any).cerVersion.findUnique({
      where: { id: cerVersionId },
      select: { id: true },
    });

    if (!cerVersion) {
      throw new NotFoundError('CerVersion', cerVersionId);
    }

    // 2. Fetch sections ordered by section number
    const sections = await (this.prisma as any).cerSection.findMany({
      where: { cerVersionId },
      select: {
        id: true,
        sectionNumber: true,
        humanEditedContent: true,
        aiDraftContent: true,
      },
      orderBy: { sectionNumber: 'asc' },
    });

    // 3. Collect all references in order of appearance
    const bibRefsInOrder: string[] = [];
    const extRefsInOrder: string[] = [];

    for (const section of sections) {
      const content = section.humanEditedContent ?? section.aiDraftContent ?? {};
      const text = typeof content === 'string' ? content : JSON.stringify(content);

      // Collect bibliography refs in order of appearance
      const bibMatches = text.matchAll(/\[(\d+)\]/g);
      for (const match of bibMatches) {
        if (!bibRefsInOrder.includes(match[1])) {
          bibRefsInOrder.push(match[1]);
        }
      }

      // Collect external doc refs in order of appearance
      const extMatches = text.matchAll(/\[(R\d+)\]/g);
      for (const match of extMatches) {
        if (!extRefsInOrder.includes(match[1])) {
          extRefsInOrder.push(match[1]);
        }
      }
    }

    // 4. Build renumber mappings
    const mappings: RenumberMapping[] = [];
    const bibMap = new Map<string, string>();
    const extMap = new Map<string, string>();

    bibRefsInOrder.forEach((oldNum, index) => {
      const newNum = String(index + 1);
      if (oldNum !== newNum) {
        mappings.push({ oldNumber: oldNum, newNumber: newNum, type: 'BIBLIOGRAPHY' });
      }
      bibMap.set(oldNum, newNum);
    });

    extRefsInOrder.forEach((oldNum, index) => {
      const newNum = `R${index + 1}`;
      if (oldNum !== newNum) {
        mappings.push({ oldNumber: oldNum, newNumber: newNum, type: 'EXTERNAL_DOC' });
      }
      extMap.set(oldNum, newNum);
    });

    // 5. Update inline references in section content
    let sectionsUpdated = 0;

    for (const section of sections) {
      const content = section.humanEditedContent ?? section.aiDraftContent;
      if (!content) continue;

      const originalText = typeof content === 'string' ? content : JSON.stringify(content);
      let updatedText = originalText;

      // Replace in two passes to avoid collisions:
      // First pass: replace old refs with temporary placeholders
      for (const [oldNum, newNum] of bibMap) {
        if (oldNum === newNum) continue;
        updatedText = updatedText.replace(
          new RegExp(`\\[${escapeRegex(oldNum)}\\]`, 'g'),
          `[__BIB_${newNum}__]`,
        );
      }

      for (const [oldNum, newNum] of extMap) {
        if (oldNum === newNum) continue;
        updatedText = updatedText.replace(
          new RegExp(`\\[${escapeRegex(oldNum)}\\]`, 'g'),
          `[__EXT_${newNum}__]`,
        );
      }

      // Second pass: replace placeholders with final numbers
      for (const [, newNum] of bibMap) {
        updatedText = updatedText.replace(
          new RegExp(`\\[__BIB_${escapeRegex(newNum)}__\\]`, 'g'),
          `[${newNum}]`,
        );
      }

      for (const [, newNum] of extMap) {
        updatedText = updatedText.replace(
          new RegExp(`\\[__EXT_${escapeRegex(newNum)}__\\]`, 'g'),
          `[${newNum}]`,
        );
      }

      if (updatedText !== originalText) {
        const updatedContent = typeof content === 'string'
          ? updatedText
          : JSON.parse(updatedText);

        await (this.prisma as any).cerSection.update({
          where: { id: section.id },
          data: {
            humanEditedContent: (typeof updatedContent === 'string'
              ? updatedContent
              : updatedContent) as unknown as Prisma.InputJsonValue,
            updatedAt: new Date(),
            updatedById: userId,
          },
        });

        sectionsUpdated++;
      }
    }

    // 6. Update bibliography entries
    let bibliographyEntriesUpdated = 0;

    for (const [oldNum, newNum] of bibMap) {
      if (oldNum === newNum) continue;

      const updated = await (this.prisma as any).bibliographyEntry.updateMany({
        where: {
          cerVersionId,
          orderIndex: parseInt(oldNum, 10),
        },
        data: {
          orderIndex: parseInt(newNum, 10),
        },
      }).catch(() => ({ count: 0 }));

      bibliographyEntriesUpdated += updated.count ?? 0;
    }

    // 7. Update cross-references
    let crossReferencesUpdated = 0;

    for (const [oldNum, newNum] of extMap) {
      if (oldNum === newNum) continue;

      const updated = await (this.prisma as any).crossReference.updateMany({
        where: {
          cerVersionId,
          refNumber: oldNum,
        },
        data: {
          refNumber: newNum,
        },
      }).catch(() => ({ count: 0 }));

      crossReferencesUpdated += updated.count ?? 0;
    }

    // 8. Emit event
    if (mappings.length > 0) {
      const event: DomainEvent<{ cerVersionId: string; mappingCount: number }> = {
        eventType: 'cer.references.renumbered',
        aggregateId: cerVersionId,
        aggregateType: 'CerVersion',
        data: {
          cerVersionId,
          mappingCount: mappings.length,
        },
        metadata: {
          userId,
          timestamp: new Date().toISOString(),
          correlationId: crypto.randomUUID(),
          version: 1,
        },
      };

      void this.eventBus.publish(event);
    }

    // 9. Audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'cer.references.renumbered',
        targetType: 'cerVersion',
        targetId: cerVersionId,
        before: null as unknown as Prisma.InputJsonValue,
        after: {
          mappingCount: mappings.length,
          sectionsUpdated,
          bibliographyEntriesUpdated,
          crossReferencesUpdated,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      cerVersionId,
      mappings,
      sectionsUpdated,
      bibliographyEntriesUpdated,
      crossReferencesUpdated,
    };
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
