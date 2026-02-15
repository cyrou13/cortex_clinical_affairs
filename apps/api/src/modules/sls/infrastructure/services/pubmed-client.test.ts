import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PubMedClient } from './pubmed-client.js';

// Sample XML responses
const ESEARCH_RESPONSE = {
  esearchresult: {
    count: '3',
    retmax: '3',
    retstart: '0',
    idlist: ['12345678', '23456789', '34567890'],
  },
};

const ESEARCH_EMPTY = {
  esearchresult: {
    count: '0',
    retmax: '0',
    retstart: '0',
    idlist: [],
  },
};

const ESEARCH_ERROR = {
  esearchresult: {
    ERROR: 'Invalid query syntax',
  },
};

const EFETCH_XML = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE PubmedArticleSet PUBLIC "-//NLM//DTD PubMedArticle//EN" "https://dtd.nlm.nih.gov/ncbi/pubmed/out/pubmed_190101.dtd">
<PubmedArticleSet>
<PubmedArticle>
  <MedlineCitation>
    <PMID Version="1">12345678</PMID>
    <Article>
      <Journal>
        <Title>Journal of Testing</Title>
        <JournalIssue>
          <PubDate>
            <Year>2024</Year>
            <Month>Jan</Month>
            <Day>15</Day>
          </PubDate>
        </JournalIssue>
      </Journal>
      <ArticleTitle>Test Article Title One</ArticleTitle>
      <Abstract>
        <AbstractText>This is the abstract text for article one.</AbstractText>
      </Abstract>
      <AuthorList>
        <Author>
          <LastName>Smith</LastName>
          <ForeName>John</ForeName>
        </Author>
        <Author>
          <LastName>Doe</LastName>
          <ForeName>Jane</ForeName>
        </Author>
      </AuthorList>
    </Article>
  </MedlineCitation>
  <PubmedData>
    <ArticleIdList>
      <ArticleId IdType="doi">10.1234/test.2024.001</ArticleId>
    </ArticleIdList>
  </PubmedData>
</PubmedArticle>
<PubmedArticle>
  <MedlineCitation>
    <PMID Version="1">23456789</PMID>
    <Article>
      <Journal>
        <Title>Another Journal</Title>
        <JournalIssue>
          <PubDate>
            <Year>2023</Year>
            <Month>Mar</Month>
          </PubDate>
        </JournalIssue>
      </Journal>
      <ArticleTitle>Second Test Article</ArticleTitle>
      <AuthorList>
        <Author>
          <LastName>Brown</LastName>
          <ForeName>Alice</ForeName>
        </Author>
      </AuthorList>
    </Article>
  </MedlineCitation>
</PubmedArticle>
</PubmedArticleSet>`;

describe('PubMedClient', () => {
  let client: PubMedClient;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    client = new PubMedClient('test-api-key');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('esearch', () => {
    it('returns search results on success', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(ESEARCH_RESPONSE),
      });

      const result = await client.esearch('spinal fusion');

      expect(result.idList).toEqual(['12345678', '23456789', '34567890']);
      expect(result.count).toBe(3);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('esearch.fcgi'),
      );
    });

    it('includes api_key in request when configured', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(ESEARCH_RESPONSE),
      });

      await client.esearch('test query');

      const url = fetchMock.mock.calls[0]![0] as string;
      expect(url).toContain('api_key=test-api-key');
    });

    it('handles empty results', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(ESEARCH_EMPTY),
      });

      const result = await client.esearch('nonexistent query');

      expect(result.idList).toEqual([]);
      expect(result.count).toBe(0);
    });

    it('throws on esearch API error', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(ESEARCH_ERROR),
      });

      await expect(client.esearch('bad query')).rejects.toThrow('PubMed esearch error');
    });

    it('throws on HTTP error', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      });

      await expect(client.esearch('test')).rejects.toThrow('PubMed esearch failed with status 429');
    });

    it('throws on missing esearchresult', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await expect(client.esearch('test')).rejects.toThrow('missing esearchresult');
    });
  });

  describe('parseEfetchXml', () => {
    it('parses article metadata from XML', () => {
      const articles = client.parseEfetchXml(EFETCH_XML);

      expect(articles).toHaveLength(2);

      const first = articles[0]!;
      expect(first.pmid).toBe('12345678');
      expect(first.title).toBe('Test Article Title One');
      expect(first.abstract).toBe('This is the abstract text for article one.');
      expect(first.authors).toEqual(['Smith John', 'Doe Jane']);
      expect(first.doi).toBe('10.1234/test.2024.001');
      expect(first.journal).toBe('Journal of Testing');
      expect(first.publicationDate).toBe('2024 Jan 15');
      expect(first.sourceDatabase).toBe('PUBMED');

      const second = articles[1]!;
      expect(second.pmid).toBe('23456789');
      expect(second.title).toBe('Second Test Article');
      expect(second.abstract).toBeUndefined();
      expect(second.authors).toEqual(['Brown Alice']);
      expect(second.doi).toBeUndefined();
      expect(second.publicationDate).toBe('2023 Mar');
    });

    it('returns empty array for empty XML', () => {
      const articles = client.parseEfetchXml('<?xml version="1.0"?><PubmedArticleSet></PubmedArticleSet>');
      expect(articles).toEqual([]);
    });

    it('handles XML with no articles', () => {
      const articles = client.parseEfetchXml('');
      expect(articles).toEqual([]);
    });
  });

  describe('fetchArticles', () => {
    it('fetches articles in a single batch for small lists', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(EFETCH_XML),
      });

      const articles = await client.fetchArticles(['12345678', '23456789']);

      expect(articles).toHaveLength(2);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const url = fetchMock.mock.calls[0]![0] as string;
      expect(url).toContain('12345678%2C23456789');
    });

    it('fetches articles in multiple batches for large lists', async () => {
      // Generate 300 PMIDs (should result in 2 batches of 200 + 100)
      const pmids = Array.from({ length: 300 }, (_, i) => String(10000000 + i));

      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(EFETCH_XML),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(EFETCH_XML),
        });

      const articles = await client.fetchArticles(pmids);

      // Each batch returns 2 articles from our mock XML
      expect(articles).toHaveLength(4);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('throws when efetch HTTP request fails', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(client.fetchArticles(['12345678'])).rejects.toThrow(
        'PubMed efetch failed with status 500',
      );
    });
  });

  describe('search', () => {
    it('performs full search pipeline (esearch + efetch)', async () => {
      // First call: esearch
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(ESEARCH_RESPONSE),
      });
      // Second call: efetch
      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(EFETCH_XML),
      });

      const result = await client.search('spinal fusion');

      expect(result.database).toBe('PUBMED');
      expect(result.totalCount).toBe(3);
      expect(result.articles).toHaveLength(2);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('returns empty result when no articles found', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(ESEARCH_EMPTY),
      });

      const result = await client.search('nonexistent');

      expect(result.articles).toEqual([]);
      expect(result.totalCount).toBe(0);
      expect(result.database).toBe('PUBMED');
      expect(fetchMock).toHaveBeenCalledTimes(1); // Only esearch, no efetch
    });
  });

  describe('rate limiting', () => {
    it('creates client with higher rate limit when API key is provided', () => {
      // This test just verifies construction doesn't throw
      const clientWithKey = new PubMedClient('some-key');
      expect(clientWithKey).toBeDefined();
    });

    it('creates client with lower rate limit without API key', () => {
      const clientWithoutKey = new PubMedClient(undefined);
      expect(clientWithoutKey).toBeDefined();
    });
  });
});
