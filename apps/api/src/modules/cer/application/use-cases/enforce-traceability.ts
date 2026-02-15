import type { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../../../../shared/errors/index.js';
import { TraceabilityViolationError } from '../../../../shared/errors/index.js';

// ── Types ───────────────────────────────────────────────────────────────

interface EnforceTraceabilityInput {
  cerVersionId: string;
}

interface UntracedClaim {
  refNumber: string;
  cerSectionId: string;
  sectionTitle: string;
}

interface EnforceTraceabilityResult {
  cerVersionId: string;
  totalClaims: number;
  tracedClaims: number;
  coveragePercentage: number;
  untracedClaims: UntracedClaim[];
  canFinalize: boolean;
}

// ── Use Case ────────────────────────────────────────────────────────────

export class EnforceTraceabilityUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: EnforceTraceabilityInput): Promise<EnforceTraceabilityResult> {
    const { cerVersionId } = input;

    // 1. Verify CER version exists
    const cerVersion = await this.prisma.cerVersion.findUnique({
      where: { id: cerVersionId },
      select: { id: true },
    });

    if (!cerVersion) {
      throw new NotFoundError('CerVersion', cerVersionId);
    }

    // 2. Fetch all sections for this CER version
    const sections = await this.prisma.cerSection.findMany({
      where: { cerVersionId },
      select: {
        id: true,
        title: true,
        humanEditedContent: true,
        aiDraftContent: true,
      },
    });

    // 3. Extract all inline references from all sections
    const allClaims: Array<{ refNumber: string; cerSectionId: string; sectionTitle: string }> = [];

    for (const section of sections) {
      const content = section.humanEditedContent ?? section.aiDraftContent ?? {};
      const contentText = typeof content === 'string' ? content : JSON.stringify(content);
      const refs = extractInlineReferences(contentText);

      for (const ref of refs) {
        allClaims.push({
          refNumber: ref,
          cerSectionId: section.id,
          sectionTitle: section.title,
        });
      }
    }

    // 4. Fetch all claim traces for sections in this CER version
    const sectionIds = sections.map((s: { id: string }) => s.id);
    const claimTraces = await this.prisma.claimTrace.findMany({
      where: { cerSectionId: { in: sectionIds } },
      select: { refNumber: true, cerSectionId: true },
    });

    // Build lookup: sectionId+refNumber -> traced
    const tracedSet = new Set(
      claimTraces.map(
        (ct: { refNumber: string; cerSectionId: string }) => `${ct.cerSectionId}:${ct.refNumber}`,
      ),
    );

    // 5. Classify
    const untracedClaims: UntracedClaim[] = [];
    let tracedCount = 0;

    for (const claim of allClaims) {
      const key = `${claim.cerSectionId}:${claim.refNumber}`;
      if (tracedSet.has(key)) {
        tracedCount++;
      } else {
        untracedClaims.push(claim);
      }
    }

    const totalClaims = allClaims.length;
    const coveragePercentage =
      totalClaims === 0 ? 100 : Math.round((tracedCount / totalClaims) * 100);
    const canFinalize = coveragePercentage === 100;

    return {
      cerVersionId,
      totalClaims,
      tracedClaims: tracedCount,
      coveragePercentage,
      untracedClaims,
      canFinalize,
    };
  }

  /**
   * Enforce traceability and throw if coverage is not 100%.
   * Used as a gate before CER finalization.
   */
  async enforceOrThrow(input: EnforceTraceabilityInput): Promise<EnforceTraceabilityResult> {
    const result = await this.execute(input);

    if (!result.canFinalize) {
      throw new TraceabilityViolationError(
        `Traceability coverage is ${result.coveragePercentage}% (required: 100%). ` +
          `${result.untracedClaims.length} untraced claim(s) found.`,
      );
    }

    return result;
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────

function extractInlineReferences(text: string): string[] {
  const regex = /\[(\d+|R\d+)\]/g;
  const matches: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const captured = match[1];
    if (captured && !matches.includes(captured)) {
      matches.push(captured);
    }
  }
  return matches;
}
