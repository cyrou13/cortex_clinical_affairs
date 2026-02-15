import type { ArticleMetadata, DeduplicationStats } from '@cortex/shared';

export interface DeduplicationResult {
  uniqueArticles: ArticleMetadata[];
  duplicates: Array<{
    article: ArticleMetadata;
    duplicateOf: ArticleMetadata;
    matchType: 'doi' | 'pmid' | 'title';
  }>;
  stats: DeduplicationStats;
}

/**
 * Normalize a title for comparison:
 * - lowercase
 * - remove punctuation except hyphens
 * - remove extra whitespace
 * - remove common prefixes (The, A, An)
 */
export function normalizeTitle(title: string): string {
  let normalized = title.toLowerCase();
  // Remove punctuation except hyphens
  normalized = normalized.replace(/[^\w\s-]/g, '');
  // Collapse whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();
  // Remove common leading articles
  normalized = normalized.replace(/^(the|a|an)\s+/i, '');
  return normalized;
}

/**
 * Compute Jaccard similarity between two strings (based on word bigrams).
 * Returns a value between 0 and 1.
 */
export function jaccardSimilarity(a: string, b: string): number {
  const bigramsA = getBigrams(a);
  const bigramsB = getBigrams(b);

  if (bigramsA.size === 0 && bigramsB.size === 0) return 1;
  if (bigramsA.size === 0 || bigramsB.size === 0) return 0;

  let intersection = 0;
  for (const bigram of bigramsA) {
    if (bigramsB.has(bigram)) {
      intersection++;
    }
  }

  const union = bigramsA.size + bigramsB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function getBigrams(str: string): Set<string> {
  const bigrams = new Set<string>();
  const words = str.split(/\s+/);
  for (let i = 0; i < words.length - 1; i++) {
    bigrams.add(`${words[i]} ${words[i + 1]}`);
  }
  // Also add character bigrams for single-word strings
  if (words.length <= 1 && str.length >= 2) {
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.add(str.slice(i, i + 2));
    }
  }
  return bigrams;
}

/**
 * Extract the last name of the first author from an authors array.
 * Returns null if no authors or empty.
 */
function getFirstAuthorLastName(authors?: string[]): string | null {
  if (!authors || authors.length === 0) return null;
  const firstAuthor = authors[0];
  if (!firstAuthor) return null;
  // Try to extract last name: "Smith J" -> "smith", "John Smith" -> "smith"
  const parts = firstAuthor.trim().split(/\s+/);
  // Convention: last name is usually first token (Smith J) or last token (John Smith)
  // Use the first token as it's the most common format in medical literature
  const lastName = parts[0];
  return lastName ? lastName.toLowerCase() : null;
}

/**
 * Extract year from publicationDate string.
 */
function extractYear(publicationDate?: string): number | null {
  if (!publicationDate) return null;
  const match = publicationDate.match(/(\d{4})/);
  return match ? parseInt(match[1]!, 10) : null;
}

/**
 * Count the number of non-null/non-undefined metadata fields.
 * Used to pick the article with most complete metadata when duplicates are found.
 */
function metadataCompleteness(article: ArticleMetadata): number {
  let count = 0;
  if (article.title) count++;
  if (article.abstract) count++;
  if (article.authors && article.authors.length > 0) count++;
  if (article.doi) count++;
  if (article.pmid) count++;
  if (article.publicationDate) count++;
  if (article.journal) count++;
  if (article.sourceDatabase) count++;
  return count;
}

/**
 * Pick the article with the most complete metadata.
 */
function pickBestArticle(a: ArticleMetadata, b: ArticleMetadata): ArticleMetadata {
  return metadataCompleteness(a) >= metadataCompleteness(b) ? a : b;
}

/**
 * Deduplicate a set of new articles against each other and against existing articles.
 *
 * 3-tier deduplication (priority order -- first match wins):
 *   1. DOI exact match (case-insensitive, trimmed)
 *   2. PMID exact match
 *   3. Title fuzzy match >95% similarity AND same first author last name AND same year
 */
export function deduplicate(
  newArticles: ArticleMetadata[],
  existingArticles: ArticleMetadata[],
): DeduplicationResult {
  const uniqueArticles: ArticleMetadata[] = [];
  const duplicates: DeduplicationResult['duplicates'] = [];

  let duplicatesByDoi = 0;
  let duplicatesByPmid = 0;
  let duplicatesByTitle = 0;

  // Build indexes for existing articles
  const doiIndex = new Map<string, ArticleMetadata>();
  const pmidIndex = new Map<string, ArticleMetadata>();
  const titleIndex: Array<{
    article: ArticleMetadata;
    normalizedTitle: string;
    firstAuthorLastName: string | null;
    year: number | null;
  }> = [];

  for (const article of existingArticles) {
    if (article.doi) {
      doiIndex.set(article.doi.trim().toLowerCase(), article);
    }
    if (article.pmid) {
      pmidIndex.set(article.pmid.trim(), article);
    }
    titleIndex.push({
      article,
      normalizedTitle: normalizeTitle(article.title),
      firstAuthorLastName: getFirstAuthorLastName(article.authors),
      year: extractYear(article.publicationDate),
    });
  }

  for (const newArticle of newArticles) {
    let isDuplicate = false;

    // Tier 1: DOI exact match
    if (newArticle.doi) {
      const normalizedDoi = newArticle.doi.trim().toLowerCase();
      const existing = doiIndex.get(normalizedDoi);
      if (existing) {
        duplicatesByDoi++;
        duplicates.push({
          article: newArticle,
          duplicateOf: existing,
          matchType: 'doi',
        });
        // Keep the article with more complete metadata in the index
        const best = pickBestArticle(existing, newArticle);
        doiIndex.set(normalizedDoi, best);
        isDuplicate = true;
      }
    }

    // Tier 2: PMID exact match
    if (!isDuplicate && newArticle.pmid) {
      const normalizedPmid = newArticle.pmid.trim();
      const existing = pmidIndex.get(normalizedPmid);
      if (existing) {
        duplicatesByPmid++;
        duplicates.push({
          article: newArticle,
          duplicateOf: existing,
          matchType: 'pmid',
        });
        const best = pickBestArticle(existing, newArticle);
        pmidIndex.set(normalizedPmid, best);
        isDuplicate = true;
      }
    }

    // Tier 3: Title fuzzy match + same first author last name + same year
    if (!isDuplicate) {
      const newNormalized = normalizeTitle(newArticle.title);
      const newFirstAuthor = getFirstAuthorLastName(newArticle.authors);
      const newYear = extractYear(newArticle.publicationDate);

      for (const entry of titleIndex) {
        const similarity = jaccardSimilarity(newNormalized, entry.normalizedTitle);
        if (
          similarity > 0.95 &&
          newFirstAuthor !== null &&
          entry.firstAuthorLastName !== null &&
          newFirstAuthor === entry.firstAuthorLastName &&
          newYear !== null &&
          entry.year !== null &&
          newYear === entry.year
        ) {
          duplicatesByTitle++;
          duplicates.push({
            article: newArticle,
            duplicateOf: entry.article,
            matchType: 'title',
          });
          isDuplicate = true;
          break;
        }
      }
    }

    if (!isDuplicate) {
      uniqueArticles.push(newArticle);

      // Add to indexes for dedup within the new batch
      if (newArticle.doi) {
        doiIndex.set(newArticle.doi.trim().toLowerCase(), newArticle);
      }
      if (newArticle.pmid) {
        pmidIndex.set(newArticle.pmid.trim(), newArticle);
      }
      titleIndex.push({
        article: newArticle,
        normalizedTitle: normalizeTitle(newArticle.title),
        firstAuthorLastName: getFirstAuthorLastName(newArticle.authors),
        year: extractYear(newArticle.publicationDate),
      });
    }
  }

  const totalBefore = newArticles.length + existingArticles.length;
  const totalAfter = uniqueArticles.length + existingArticles.length;

  return {
    uniqueArticles,
    duplicates,
    stats: {
      totalBefore,
      totalAfter,
      duplicatesByDoi,
      duplicatesByPmid,
      duplicatesByTitle,
    },
  };
}
