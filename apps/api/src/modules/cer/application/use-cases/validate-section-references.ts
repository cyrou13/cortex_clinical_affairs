import type { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../../../../shared/errors/index.js';

// ── Types ───────────────────────────────────────────────────────────────

interface ValidateSectionReferencesInput {
  cerSectionId: string;
}

interface ReferenceValidation {
  refNumber: string;
  hasClaimTrace: boolean;
}

interface ValidateSectionReferencesResult {
  cerSectionId: string;
  totalReferences: number;
  verifiedCount: number;
  unverifiedReferences: string[];
  orphanedTraces: string[];
  traceabilityCoverage: number; // 0-100 percentage
}

// ── Use Case ────────────────────────────────────────────────────────────

export class ValidateSectionReferencesUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: ValidateSectionReferencesInput): Promise<ValidateSectionReferencesResult> {
    const { cerSectionId } = input;

    // 1. Fetch section
    const section = await (this.prisma as any).cerSection.findUnique({
      where: { id: cerSectionId },
      select: {
        id: true,
        humanEditedContent: true,
        aiDraftContent: true,
      },
    });

    if (!section) {
      throw new NotFoundError('CerSection', cerSectionId);
    }

    // 2. Extract references from content
    const content = section.humanEditedContent ?? section.aiDraftContent ?? {};
    const contentText = typeof content === 'string' ? content : JSON.stringify(content);
    const inlineRefs = extractInlineReferences(contentText);

    // 3. Fetch all claim traces for this section
    const claimTraces = await (this.prisma as any).claimTrace.findMany({
      where: { cerSectionId },
      select: { refNumber: true },
    });

    const tracedRefSet = new Set(
      claimTraces.map((ct: { refNumber: string }) => ct.refNumber),
    );

    // 4. Classify references
    const validations: ReferenceValidation[] = inlineRefs.map((ref) => ({
      refNumber: ref,
      hasClaimTrace: tracedRefSet.has(ref),
    }));

    const unverifiedReferences = validations
      .filter((v) => !v.hasClaimTrace)
      .map((v) => v.refNumber);

    const verifiedCount = validations.filter((v) => v.hasClaimTrace).length;

    // 5. Find orphaned traces (traces with no corresponding inline reference)
    const inlineRefSet = new Set(inlineRefs);
    const orphanedTraces = claimTraces
      .filter((ct: { refNumber: string }) => !inlineRefSet.has(ct.refNumber))
      .map((ct: { refNumber: string }) => ct.refNumber);

    // 6. Compute traceability coverage
    const totalReferences = inlineRefs.length;
    const traceabilityCoverage =
      totalReferences === 0 ? 100 : Math.round((verifiedCount / totalReferences) * 100);

    return {
      cerSectionId,
      totalReferences,
      verifiedCount,
      unverifiedReferences,
      orphanedTraces,
      traceabilityCoverage,
    };
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────

function extractInlineReferences(text: string): string[] {
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
