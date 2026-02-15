// ── Types ───────────────────────────────────────────────────────────────

export interface ArticleMetadata {
  title: string;
  authors: string[];
  journal: string;
  year: number;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
}

export type CitationStyle = 'VANCOUVER' | 'AUTHOR_YEAR';

// ── Service ─────────────────────────────────────────────────────────────

export class CitationFormatterService {
  format(article: ArticleMetadata, style: CitationStyle): string {
    switch (style) {
      case 'VANCOUVER':
        return this.formatVancouver(article);
      case 'AUTHOR_YEAR':
        return this.formatAuthorYear(article);
      default:
        throw new Error(`Unknown citation style: ${style}`);
    }
  }

  /**
   * Vancouver style:
   * "Author1, Author2, et al. Title. Journal. Year;Vol(Issue):Pages. DOI."
   */
  formatVancouver(article: ArticleMetadata): string {
    const parts: string[] = [];

    // Authors
    const authorStr = formatVancouverAuthors(article.authors);
    parts.push(authorStr);

    // Title (with period)
    parts.push(`${article.title}.`);

    // Journal + year/volume
    let journalPart = `${article.journal}.`;
    journalPart += ` ${article.year}`;

    if (article.volume) {
      journalPart += `;${article.volume}`;
      if (article.issue) {
        journalPart += `(${article.issue})`;
      }
    }

    if (article.pages) {
      journalPart += `:${article.pages}`;
    }

    journalPart += '.';
    parts.push(journalPart);

    // DOI
    if (article.doi) {
      parts.push(`DOI: ${article.doi}.`);
    }

    return parts.join(' ');
  }

  /**
   * Author-Year style:
   * "Author1 & Author2 (Year). Title. Journal, Vol(Issue), Pages."
   */
  formatAuthorYear(article: ArticleMetadata): string {
    const parts: string[] = [];

    // Authors + year
    const authorStr = formatAuthorYearAuthors(article.authors);
    parts.push(`${authorStr} (${article.year}).`);

    // Title
    parts.push(`${article.title}.`);

    // Journal, volume, pages
    let journalPart = article.journal;

    if (article.volume) {
      journalPart += `, ${article.volume}`;
      if (article.issue) {
        journalPart += `(${article.issue})`;
      }
    }

    if (article.pages) {
      journalPart += `, ${article.pages}`;
    }

    journalPart += '.';
    parts.push(journalPart);

    // DOI
    if (article.doi) {
      parts.push(`DOI: ${article.doi}.`);
    }

    return parts.join(' ');
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────

function formatVancouverAuthors(authors: string[]): string {
  if (authors.length === 0) return '';
  if (authors.length <= 6) {
    return authors.join(', ') + '.';
  }
  // More than 6: first 6 + et al.
  return authors.slice(0, 6).join(', ') + ', et al.';
}

function formatAuthorYearAuthors(authors: string[]): string {
  if (authors.length === 0) return '';
  if (authors.length === 1) return authors[0];
  if (authors.length === 2) return `${authors[0]} & ${authors[1]}`;
  return `${authors[0]} et al.`;
}
