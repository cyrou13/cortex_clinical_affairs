import type { PrismaClient, Prisma } from '@prisma/client';
import { NotFoundError } from '../../../../shared/errors/index.js';

// ── Types ───────────────────────────────────────────────────────────────

interface SaveSectionContentInput {
  cerSectionId: string;
  content: Record<string, unknown>; // Plate JSON partial
  userId: string;
}

interface SaveSectionContentResult {
  cerSectionId: string;
  wordCount: number;
  savedAt: string;
}

// ── Use Case ────────────────────────────────────────────────────────────

export class SaveSectionContentUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: SaveSectionContentInput): Promise<SaveSectionContentResult> {
    const { cerSectionId, content, userId } = input;

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

    // 2. Merge content (idempotent — new content wins on conflict)
    const existingContent =
      section.humanEditedContent && typeof section.humanEditedContent === 'object'
        ? (section.humanEditedContent as Record<string, unknown>)
        : {};

    const mergedContent = { ...existingContent, ...content };

    // 3. Compute word count
    const wordCount = countWordsFromContent(mergedContent);

    // 4. Track AI vs human content
    const aiDraftText = section.aiDraftContent
      ? extractTextFromContent(section.aiDraftContent)
      : '';
    const humanText = extractTextFromContent(mergedContent);
    const humanEditPercentage = computeEditPct(aiDraftText, humanText);

    // 5. Persist
    const now = new Date();
    await (this.prisma as any).cerSection.update({
      where: { id: cerSectionId },
      data: {
        humanEditedContent: mergedContent as unknown as Prisma.InputJsonValue,
        wordCount,
        humanEditPercentage,
        updatedAt: now,
        updatedById: userId,
      },
    });

    return {
      cerSectionId,
      wordCount,
      savedAt: now.toISOString(),
    };
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────

function extractTextFromContent(content: unknown): string {
  if (typeof content === 'string') return content;
  return JSON.stringify(content);
}

function countWordsFromContent(content: unknown): number {
  const text = extractTextFromContent(content);
  return text.split(/\s+/).filter(Boolean).length;
}

function computeEditPct(aiDraft: string, humanEdited: string): number {
  if (!aiDraft || aiDraft.length === 0) return 100;
  if (aiDraft === humanEdited) return 0;

  const aiWords = aiDraft.split(/\s+/).filter(Boolean);
  const humanWords = humanEdited.split(/\s+/).filter(Boolean);

  if (aiWords.length === 0) return 100;

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
