import type { ArticleMetadata } from '@cortex/shared';
import type { DatabaseClient, DatabaseSearchResult } from './database-client.js';

const ESEARCH_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
const EFETCH_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi';
const EFETCH_BATCH_SIZE = 200;

export class PmcClient implements DatabaseClient {
  private readonly apiKey: string | undefined;

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env['PUBMED_API_KEY'];
  }

  async search(query: string): Promise<DatabaseSearchResult> {
    const searchResult = await this.esearch(query);

    if (searchResult.count === 0 || searchResult.idList.length === 0) {
      return { articles: [], totalCount: 0, database: 'PMC' };
    }

    const articles = await this.fetchArticles(searchResult.idList);

    return {
      articles,
      totalCount: searchResult.count,
      database: 'PMC',
    };
  }

  private async esearch(query: string): Promise<{ idList: string[]; count: number }> {
    const params = new URLSearchParams({
      db: 'pmc',
      term: query,
      retmode: 'json',
      retmax: '10000',
    });

    if (this.apiKey) {
      params.set('api_key', this.apiKey);
    }

    const response = await fetch(`${ESEARCH_BASE}?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`PMC esearch failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as {
      esearchresult?: {
        idlist?: string[];
        count?: string;
        ERROR?: string;
      };
    };

    const result = data.esearchresult;
    if (!result) {
      throw new Error('PMC esearch: missing esearchresult');
    }
    if (result.ERROR) {
      throw new Error(`PMC esearch error: ${result.ERROR}`);
    }

    return {
      idList: result.idlist ?? [],
      count: parseInt(result.count ?? '0', 10),
    };
  }

  private async fetchArticles(pmcIds: string[]): Promise<ArticleMetadata[]> {
    const allArticles: ArticleMetadata[] = [];

    for (let i = 0; i < pmcIds.length; i += EFETCH_BATCH_SIZE) {
      const batch = pmcIds.slice(i, i + EFETCH_BATCH_SIZE);
      const articles = await this.efetchBatch(batch);
      allArticles.push(...articles);
    }

    return allArticles;
  }

  private async efetchBatch(pmcIds: string[]): Promise<ArticleMetadata[]> {
    const params = new URLSearchParams({
      db: 'pmc',
      id: pmcIds.join(','),
      retmode: 'xml',
    });

    if (this.apiKey) {
      params.set('api_key', this.apiKey);
    }

    // Small delay to respect rate limits (3 req/s without key, 10 with)
    await new Promise((resolve) => setTimeout(resolve, this.apiKey ? 100 : 350));

    const response = await fetch(`${EFETCH_BASE}?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`PMC efetch failed: ${response.status} ${response.statusText}`);
    }

    const xml = await response.text();
    return this.parseEfetchXml(xml);
  }

  parseEfetchXml(xml: string): ArticleMetadata[] {
    const articles: ArticleMetadata[] = [];
    const articleBlocks = xml.split(/<article[\s>]/);

    for (const block of articleBlocks) {
      if (!block.includes('</article>')) continue;

      const article: ArticleMetadata = {
        title: '',
        sourceDatabase: 'PMC',
      };

      // Extract PMID from article-id
      const pmidMatch = block.match(/<article-id pub-id-type="pmid">([\s\S]*?)<\/article-id>/);
      if (pmidMatch?.[1]) article.pmid = pmidMatch[1].trim();

      // Extract DOI
      const doiMatch = block.match(/<article-id pub-id-type="doi">([\s\S]*?)<\/article-id>/);
      if (doiMatch?.[1]) article.doi = doiMatch[1].trim();

      // Extract article title
      const titleMatch = block.match(/<article-title>([\s\S]*?)<\/article-title>/);
      if (titleMatch?.[1]) article.title = stripXmlTags(titleMatch[1]).trim();

      // Extract abstract
      const abstractMatch = block.match(/<abstract[\s>]([\s\S]*?)<\/abstract>/);
      if (abstractMatch?.[1]) article.abstract = stripXmlTags(abstractMatch[1]).trim();

      // Extract authors from contrib-group
      const authors: string[] = [];
      const contribGroup = block.match(/<contrib-group>([\s\S]*?)<\/contrib-group>/);
      if (contribGroup?.[1]) {
        const nameRegex =
          /<name>[\s\S]*?<surname>([\s\S]*?)<\/surname>[\s\S]*?<given-names>([\s\S]*?)<\/given-names>[\s\S]*?<\/name>/g;
        let nameMatch: RegExpExecArray | null;
        while ((nameMatch = nameRegex.exec(contribGroup[1])) !== null) {
          const surname = nameMatch[1]?.trim() ?? '';
          const givenNames = nameMatch[2]?.trim() ?? '';
          if (surname || givenNames) authors.push(`${surname} ${givenNames}`.trim());
        }
      }
      if (authors.length > 0) article.authors = authors;

      // Extract journal title
      const journalMatch = block.match(/<journal-title>([\s\S]*?)<\/journal-title>/);
      if (journalMatch?.[1]) article.journal = stripXmlTags(journalMatch[1]).trim();

      // Extract publication date
      const pubDateMatch = block.match(
        /<pub-date[^>]*pub-type="(?:epub|ppub|collection)"[^>]*>([\s\S]*?)<\/pub-date>/,
      );
      if (pubDateMatch?.[1]) {
        const yearMatch = pubDateMatch[1].match(/<year>(\d{4})<\/year>/);
        const monthMatch = pubDateMatch[1].match(/<month>(\d+)<\/month>/);
        const dayMatch = pubDateMatch[1].match(/<day>(\d+)<\/day>/);
        const parts = [yearMatch?.[1], monthMatch?.[1], dayMatch?.[1]].filter(Boolean);
        if (parts.length > 0) article.publicationDate = parts.join(' ');
      }

      if (article.title || article.pmid) articles.push(article);
    }

    return articles;
  }
}

function stripXmlTags(text: string): string {
  return text.replace(/<[^>]+>/g, '');
}
