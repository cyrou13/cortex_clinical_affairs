import type { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../../../../shared/errors/index.js';

// ── Types ───────────────────────────────────────────────────────────────

export interface GenerateDeltaInput {
  currentVersionId: string;
  previousVersionId: string;
}

export interface SectionDiff {
  sectionType: string;
  title: string;
  status: 'ADDED' | 'REMOVED' | 'MODIFIED' | 'UNCHANGED';
  addedCharacters: number;
  removedCharacters: number;
}

export interface DeltaSummaryResult {
  currentVersionId: string;
  previousVersionId: string;
  sectionsAdded: number;
  sectionsRemoved: number;
  sectionsModified: number;
  sectionsUnchanged: number;
  diffs: SectionDiff[];
  summaryText: string;
}

// ── Use Case ────────────────────────────────────────────────────────────

export class GenerateDeltaSummaryUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: GenerateDeltaInput): Promise<DeltaSummaryResult> {
    // Verify both versions exist
    const currentVersion = await this.prisma.cerVersion.findUnique({
      where: { id: input.currentVersionId },
      select: { id: true, versionNumber: true },
    });

    if (!currentVersion) {
      throw new NotFoundError('CerVersion', input.currentVersionId);
    }

    const previousVersion = await this.prisma.cerVersion.findUnique({
      where: { id: input.previousVersionId },
      select: { id: true, versionNumber: true },
    });

    if (!previousVersion) {
      throw new NotFoundError('CerVersion', input.previousVersionId);
    }

    // Load sections from both versions
    const currentSections = await this.prisma.cerSection.findMany({
      where: { cerVersionId: input.currentVersionId },
      orderBy: { orderIndex: 'asc' },
    });

    const previousSections = await this.prisma.cerSection.findMany({
      where: { cerVersionId: input.previousVersionId },
      orderBy: { orderIndex: 'asc' },
    });

    // Map previous sections by sectionType for comparison
    const previousMap = new Map<string, any>();
    for (const s of previousSections) {
      previousMap.set(s.sectionType, s);
    }

    const currentMap = new Map<string, any>();
    for (const s of currentSections) {
      currentMap.set(s.sectionType, s);
    }

    const diffs: SectionDiff[] = [];
    let sectionsAdded = 0;
    let sectionsRemoved = 0;
    let sectionsModified = 0;
    let sectionsUnchanged = 0;

    // Check current sections against previous
    for (const section of currentSections) {
      const prev = previousMap.get(section.sectionType);

      if (!prev) {
        sectionsAdded++;
        diffs.push({
          sectionType: section.sectionType,
          title: section.title,
          status: 'ADDED',
          addedCharacters: (section.content ?? '').length,
          removedCharacters: 0,
        });
      } else {
        const currentContent = section.content ?? '';
        const previousContent = prev.content ?? '';

        if (currentContent === previousContent) {
          sectionsUnchanged++;
          diffs.push({
            sectionType: section.sectionType,
            title: section.title,
            status: 'UNCHANGED',
            addedCharacters: 0,
            removedCharacters: 0,
          });
        } else {
          sectionsModified++;
          const { added, removed } = this.computeCharDiff(previousContent, currentContent);
          diffs.push({
            sectionType: section.sectionType,
            title: section.title,
            status: 'MODIFIED',
            addedCharacters: added,
            removedCharacters: removed,
          });
        }
      }
    }

    // Check for removed sections
    for (const section of previousSections) {
      if (!currentMap.has(section.sectionType)) {
        sectionsRemoved++;
        diffs.push({
          sectionType: section.sectionType,
          title: section.title,
          status: 'REMOVED',
          addedCharacters: 0,
          removedCharacters: (section.content ?? '').length,
        });
      }
    }

    // Generate summary text
    const summaryParts: string[] = [];
    summaryParts.push(
      `Delta between version ${previousVersion.versionNumber} and ${currentVersion.versionNumber}:`,
    );
    if (sectionsAdded > 0) summaryParts.push(`${sectionsAdded} section(s) added`);
    if (sectionsRemoved > 0) summaryParts.push(`${sectionsRemoved} section(s) removed`);
    if (sectionsModified > 0) summaryParts.push(`${sectionsModified} section(s) modified`);
    if (sectionsUnchanged > 0) summaryParts.push(`${sectionsUnchanged} section(s) unchanged`);

    const summaryText = summaryParts.join('. ') + '.';

    return {
      currentVersionId: input.currentVersionId,
      previousVersionId: input.previousVersionId,
      sectionsAdded,
      sectionsRemoved,
      sectionsModified,
      sectionsUnchanged,
      diffs,
      summaryText,
    };
  }

  private computeCharDiff(previous: string, current: string): { added: number; removed: number } {
    // Simple character-level diff approximation
    const prevLen = previous.length;
    const currLen = current.length;

    if (currLen > prevLen) {
      return { added: currLen - prevLen, removed: 0 };
    }
    if (currLen < prevLen) {
      return { added: 0, removed: prevLen - currLen };
    }

    // Same length but different content — count differing chars
    let diffCount = 0;
    for (let i = 0; i < currLen; i++) {
      if (current[i] !== previous[i]) diffCount++;
    }

    return { added: diffCount, removed: diffCount };
  }
}
