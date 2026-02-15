import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PdfRetrievalService } from './pdf-retrieval-service.js';

const originalFetch = globalThis.fetch;

function mockFetch(responses: Array<{ ok: boolean; body?: unknown; contentType?: string }>) {
  let callIndex = 0;
  globalThis.fetch = vi.fn().mockImplementation(() => {
    const resp = responses[callIndex] ?? { ok: false };
    callIndex++;
    return Promise.resolve({
      ok: resp.ok,
      text: () => Promise.resolve(typeof resp.body === 'string' ? resp.body : ''),
      json: () => Promise.resolve(resp.body),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(10)),
      headers: new Map([['content-type', resp.contentType ?? 'text/html']]),
    });
  });
}

describe('PdfRetrievalService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns not found when no sources match', async () => {
    mockFetch([{ ok: false }, { ok: false }, { ok: false }, { ok: false }]);
    const service = new PdfRetrievalService('test@example.com');

    const result = await service.retrieve({ doi: null, pmcId: null, pmid: null });

    expect(result.found).toBe(false);
    expect(result.source).toBeNull();
  });

  it('tries PMC first when pmcId available', async () => {
    mockFetch([
      { ok: true, body: '<OA><link href="https://pmc.example.com/article.pdf" />' },
      { ok: true }, // PDF download
    ]);
    const service = new PdfRetrievalService('test@example.com');

    const result = await service.retrieve({ doi: null, pmcId: 'PMC123', pmid: null });

    expect(result.found).toBe(true);
    expect(result.source).toBe('PMC');
  });

  it('falls back to Unpaywall when PMC skipped (no pmcId)', async () => {
    // pmcId=null → PMC skipped (no fetch call), Unpaywall is first fetch
    mockFetch([
      { ok: true, body: { best_oa_location: { url_for_pdf: 'https://unpaywall.example.com/pdf' } } },
      { ok: true }, // PDF download
    ]);
    const service = new PdfRetrievalService('test@example.com');

    const result = await service.retrieve({ doi: '10.1234/test', pmcId: null, pmid: null });

    expect(result.found).toBe(true);
    expect(result.source).toBe('Unpaywall');
  });

  it('falls back to EuropePMC when Unpaywall has no PDF', async () => {
    // pmcId=null → PMC skipped, Unpaywall returns no PDF, EuropePMC succeeds
    mockFetch([
      { ok: true, body: { best_oa_location: null } }, // Unpaywall: no PDF
      {
        ok: true,
        body: {
          resultList: {
            result: [{
              fullTextUrlList: {
                fullTextUrl: [{ documentStyle: 'pdf', url: 'https://europepmc.example.com/pdf' }],
              },
            }],
          },
        },
      },
      { ok: true }, // PDF download
    ]);
    const service = new PdfRetrievalService('test@example.com');

    const result = await service.retrieve({ doi: '10.1234/test', pmcId: null, pmid: null });

    expect(result.found).toBe(true);
    expect(result.source).toBe('EuropePMC');
  });

  it('skips PMC when no pmcId', async () => {
    mockFetch([
      { ok: true, body: { best_oa_location: { url_for_pdf: 'https://test.com/pdf' } } },
      { ok: true }, // PDF download
    ]);
    const service = new PdfRetrievalService('test@example.com');

    const result = await service.retrieve({ doi: '10.1234/test', pmcId: null, pmid: null });

    expect(result.found).toBe(true);
    expect(result.source).toBe('Unpaywall');
  });

  it('skips sources when doi is null', async () => {
    mockFetch([]);
    const service = new PdfRetrievalService('test@example.com');

    const result = await service.retrieve({ doi: null, pmcId: null, pmid: null });

    expect(result.found).toBe(false);
  });

  it('handles fetch errors gracefully', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const service = new PdfRetrievalService('test@example.com');

    const result = await service.retrieve({ doi: '10.1234/test', pmcId: 'PMC123', pmid: null });

    expect(result.found).toBe(false);
  });
});
