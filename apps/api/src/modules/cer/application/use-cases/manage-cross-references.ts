import type { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../../../../shared/errors/index.js';

// ── Types ───────────────────────────────────────────────────────────────

interface ManageCrossReferencesInput {
  cerVersionId: string;
}

export type ReferenceType = 'BIBLIOGRAPHY' | 'EXTERNAL_DOC';

export interface CrossReferenceEntry {
  refNumber: string;
  type: ReferenceType;
  cerSectionId: string;
  hasTarget: boolean;
}

interface ManageCrossReferencesResult {
  cerVersionId: string;
  bibliographyRefs: CrossReferenceEntry[];
  externalDocRefs: CrossReferenceEntry[];
  orphanedReferences: CrossReferenceEntry[];
  unusedBibliographyEntries: string[];
  totalReferences: number;
}

// ── Use Case ────────────────────────────────────────────────────────────

export class ManageCrossReferencesUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: ManageCrossReferencesInput): Promise<ManageCrossReferencesResult> {
    const { cerVersionId } = input;

    // 1. Verify CER version exists
    const cerVersion = await (this.prisma as any).cerVersion.findUnique({
      where: { id: cerVersionId },
      select: { id: true },
    });

    if (!cerVersion) {
      throw new NotFoundError('CerVersion', cerVersionId);
    }

    // 2. Fetch all sections
    const sections = await (this.prisma as any).cerSection.findMany({
      where: { cerVersionId },
      select: {
        id: true,
        humanEditedContent: true,
        aiDraftContent: true,
      },
    });

    // 3. Extract and classify references
    const bibliographyRefs: CrossReferenceEntry[] = [];
    const externalDocRefs: CrossReferenceEntry[] = [];

    for (const section of sections) {
      const content = section.humanEditedContent ?? section.aiDraftContent ?? {};
      const text = typeof content === 'string' ? content : JSON.stringify(content);

      // [1], [2] = bibliography references
      const bibRefs = extractBibliographyRefs(text);
      for (const ref of bibRefs) {
        bibliographyRefs.push({
          refNumber: ref,
          type: 'BIBLIOGRAPHY',
          cerSectionId: section.id,
          hasTarget: false, // Will be resolved
        });
      }

      // [R1], [R2] = external document references
      const extRefs = extractExternalDocRefs(text);
      for (const ref of extRefs) {
        externalDocRefs.push({
          refNumber: ref,
          type: 'EXTERNAL_DOC',
          cerSectionId: section.id,
          hasTarget: false, // Will be resolved
        });
      }
    }

    // 4. Fetch bibliography entries to check for targets
    const bibEntries = await (this.prisma as any).bibliographyEntry.findMany({
      where: { cerVersionId },
      select: { orderIndex: true },
    }).catch(() => []);

    const bibIndexSet = new Set(
      bibEntries.map((e: { orderIndex: number }) => String(e.orderIndex)),
    );

    // Resolve bibliography references
    for (const ref of bibliographyRefs) {
      ref.hasTarget = bibIndexSet.has(ref.refNumber);
    }

    // 5. Fetch cross-reference targets for external docs
    const crossRefs = await (this.prisma as any).crossReference.findMany({
      where: { cerVersionId, type: 'EXTERNAL_DOC' },
      select: { refNumber: true },
    }).catch(() => []);

    const extRefSet = new Set(
      crossRefs.map((cr: { refNumber: string }) => cr.refNumber),
    );

    // Resolve external doc references
    for (const ref of externalDocRefs) {
      ref.hasTarget = extRefSet.has(ref.refNumber);
    }

    // 6. Find orphaned references (in text, no target)
    const orphanedReferences = [
      ...bibliographyRefs.filter((r) => !r.hasTarget),
      ...externalDocRefs.filter((r) => !r.hasTarget),
    ];

    // 7. Find unused bibliography entries (target in bibliography, not referenced in text)
    const referencedBibNumbers = new Set(bibliographyRefs.map((r) => r.refNumber));
    const unusedBibliographyEntries = bibEntries
      .filter((e: { orderIndex: number }) => !referencedBibNumbers.has(String(e.orderIndex)))
      .map((e: { orderIndex: number }) => String(e.orderIndex));

    return {
      cerVersionId,
      bibliographyRefs: deduplicateRefs(bibliographyRefs),
      externalDocRefs: deduplicateRefs(externalDocRefs),
      orphanedReferences,
      unusedBibliographyEntries,
      totalReferences: bibliographyRefs.length + externalDocRefs.length,
    };
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────

function extractBibliographyRefs(text: string): string[] {
  const regex = /\[(\d+)\]/g;
  const matches: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (!matches.includes(match[1])) {
      matches.push(match[1]);
    }
  }
  return matches;
}

function extractExternalDocRefs(text: string): string[] {
  const regex = /\[(R\d+)\]/g;
  const matches: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (!matches.includes(match[1])) {
      matches.push(match[1]);
    }
  }
  return matches;
}

function deduplicateRefs(refs: CrossReferenceEntry[]): CrossReferenceEntry[] {
  const seen = new Set<string>();
  return refs.filter((r) => {
    const key = `${r.refNumber}:${r.cerSectionId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
