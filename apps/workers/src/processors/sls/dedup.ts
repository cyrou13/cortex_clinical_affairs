import type { ArticleMetadata } from '@cortex/shared';

/**
 * Lightweight deduplication for the worker. Checks DOI > PMID > normalized title.
 */
export interface ExistingArticleKey {
  doi?: string | null;
  pmid?: string | null;
  title: string;
}

export class DeduplicationIndex {
  private readonly doiSet = new Set<string>();
  private readonly pmidSet = new Set<string>();
  private readonly titleSet = new Set<string>();

  addExisting(articles: ExistingArticleKey[]): void {
    for (const a of articles) {
      if (a.doi) this.doiSet.add(a.doi.trim().toLowerCase());
      if (a.pmid) this.pmidSet.add(a.pmid.trim());
      if (a.title) this.titleSet.add(normalizeTitle(a.title));
    }
  }

  /**
   * Returns true if the article is a duplicate. If not, registers it in the index.
   */
  isDuplicate(article: ArticleMetadata): boolean {
    if (article.doi) {
      const normalizedDoi = article.doi.trim().toLowerCase();
      if (this.doiSet.has(normalizedDoi)) return true;
    }

    if (article.pmid) {
      const normalizedPmid = article.pmid.trim();
      if (this.pmidSet.has(normalizedPmid)) return true;
    }

    const normalizedTitle = normalizeTitle(article.title);
    if (normalizedTitle && this.titleSet.has(normalizedTitle)) return true;

    // Register in index
    if (article.doi) this.doiSet.add(article.doi.trim().toLowerCase());
    if (article.pmid) this.pmidSet.add(article.pmid.trim());
    if (normalizedTitle) this.titleSet.add(normalizedTitle);

    return false;
  }
}

function normalizeTitle(title: string): string {
  let normalized = title.toLowerCase();
  normalized = normalized.replace(/[^\w\s-]/g, '');
  normalized = normalized.replace(/\s+/g, ' ').trim();
  normalized = normalized.replace(/^(the|a|an)\s+/i, '');
  return normalized;
}
