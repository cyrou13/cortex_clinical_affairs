import type { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../../../../shared/errors/index.js';
import {
  CitationFormatterService,
  type ArticleMetadata,
  type CitationStyle,
} from '../../infrastructure/services/citation-formatter.js';

// ── Types ───────────────────────────────────────────────────────────────

interface ManageBibliographyInput {
  cerVersionId: string;
  citationStyle: CitationStyle;
  userId: string;
}

export interface BibliographyEntry {
  id: string;
  orderIndex: number;
  articleId: string;
  title: string;
  formattedCitation: string;
}

interface ManageBibliographyResult {
  cerVersionId: string;
  totalEntries: number;
  entries: BibliographyEntry[];
  citationStyle: CitationStyle;
}

// ── Use Case ────────────────────────────────────────────────────────────

export class ManageBibliographyUseCase {
  private readonly formatter: CitationFormatterService;

  constructor(
    private readonly prisma: PrismaClient,
    formatter?: CitationFormatterService,
  ) {
    this.formatter = formatter ?? new CitationFormatterService();
  }

  async execute(input: ManageBibliographyInput): Promise<ManageBibliographyResult> {
    const { cerVersionId, citationStyle, userId } = input;

    // 1. Verify CER version exists
    const cerVersion = await this.prisma.cerVersion.findUnique({
      where: { id: cerVersionId },
      select: { id: true },
    });

    if (!cerVersion) {
      throw new NotFoundError('CerVersion', cerVersionId);
    }

    // 2. Fetch all sections
    const sections = await this.prisma.cerSection.findMany({
      where: { cerVersionId },
      select: {
        id: true,
        humanEditedContent: true,
        aiDraftContent: true,
      },
      orderBy: { sectionNumber: 'asc' },
    });

    // 3. Extract all inline references from all sections
    const allRefNumbers = new Set<string>();
    for (const section of sections) {
      const content = section.humanEditedContent ?? section.aiDraftContent ?? {};
      const text = typeof content === 'string' ? content : JSON.stringify(content);
      const refs = extractNumericReferences(text);
      for (const ref of refs) {
        allRefNumbers.add(ref);
      }
    }

    // 4. Fetch claim traces to get article links
    const sectionIds = sections.map((s: { id: string }) => s.id);
    const claimTraces = await this.prisma.claimTrace.findMany({
      where: {
        cerSectionId: { in: sectionIds },
        slsArticleId: { not: null },
      },
      select: {
        refNumber: true,
        slsArticleId: true,
      },
    });

    // 5. Get unique article IDs
    const articleIdSet = new Set<string>();
    const refToArticleMap = new Map<string, string>();

    for (const trace of claimTraces) {
      if (trace.slsArticleId && allRefNumbers.has(trace.refNumber)) {
        articleIdSet.add(trace.slsArticleId);
        refToArticleMap.set(trace.refNumber, trace.slsArticleId);
      }
    }

    // 6. Fetch article metadata
    const articleIds = Array.from(articleIdSet);
    const articles = await this.prisma.article.findMany({
      where: { id: { in: articleIds } },
      select: {
        id: true,
        title: true,
        authors: true,
        journal: true,
        year: true,
        doi: true,
      },
    });

    const articleMap = new Map<string, Record<string, unknown>>();
    for (const a of articles) {
      articleMap.set(a.id, a);
    }

    // 7. Deduplicate and build bibliography entries
    const seenArticleIds = new Set<string>();
    const entries: BibliographyEntry[] = [];
    let orderIndex = 1;

    // Sort references numerically
    const sortedRefs = Array.from(allRefNumbers).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

    for (const ref of sortedRefs) {
      const articleId = refToArticleMap.get(ref);
      if (!articleId || seenArticleIds.has(articleId)) continue;

      seenArticleIds.add(articleId);
      const article = articleMap.get(articleId);
      if (!article) continue;

      const metadata: ArticleMetadata = {
        title: (article.title as string) ?? '',
        authors: parseAuthors(article.authors),
        journal: (article.journal as string) ?? '',
        year: (article.year as number) ?? 0,
        doi: article.doi as string | undefined,
      };

      const formattedCitation = this.formatter.format(metadata, citationStyle);

      entries.push({
        id: crypto.randomUUID(),
        orderIndex,
        articleId,
        title: metadata.title,
        formattedCitation,
      });

      orderIndex++;
    }

    // 8. Persist bibliography entries
    // Clear existing entries first
    await this.prisma.bibliographyEntry
      .deleteMany({
        where: { cerVersionId },
      })
      .catch(() => {});

    for (const entry of entries) {
      await this.prisma.bibliographyEntry.create({
        data: {
          id: entry.id,
          cerVersionId,
          orderIndex: entry.orderIndex,
          articleId: entry.articleId,
          title: entry.title,
          formattedCitation: entry.formattedCitation,
          citationStyle,
          createdById: userId,
        },
      });
    }

    return {
      cerVersionId,
      totalEntries: entries.length,
      entries,
      citationStyle,
    };
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────

function extractNumericReferences(text: string): string[] {
  const regex = /\[(\d+)\]/g;
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

function parseAuthors(authors: unknown): string[] {
  if (Array.isArray(authors)) return authors.map(String);
  if (typeof authors === 'string')
    return authors
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);
  return [];
}
