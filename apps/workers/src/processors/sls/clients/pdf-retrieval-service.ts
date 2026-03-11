export interface PdfRetrievalResult {
  found: boolean;
  source: string | null;
  pdfBuffer: Buffer | null;
  pdfUrl: string | null;
}

interface ArticleForRetrieval {
  doi: string | null;
  pmcId: string | null;
  pmid: string | null;
}

const SOURCE_TIMEOUT = 20_000;
const NOT_FOUND: PdfRetrievalResult = { found: false, source: null, pdfBuffer: null, pdfUrl: null };

export class PdfRetrievalService {
  constructor(private readonly email: string) {}

  async retrieve(article: ArticleForRetrieval): Promise<PdfRetrievalResult> {
    // Try sources in order of reliability/speed
    const sources = [
      () => this.tryPmcViaPmid(article.pmid),
      () => this.tryPmc(article.pmcId),
      () => this.tryUnpaywall(article.doi),
      () => this.trySemanticScholar(article.doi),
      () => this.tryEuropePmc(article.doi, article.pmid),
      () => this.tryCore(article.doi),
      () => this.tryDoiDirectPdf(article.doi),
    ];

    for (const trySource of sources) {
      try {
        const result = await trySource();
        if (result.found) return result;
      } catch {
        // Continue to next source
      }
    }

    return NOT_FOUND;
  }

  /**
   * PMC via PMID: convert PMID → PMC ID using NCBI ID converter, then fetch OA PDF.
   */
  private async tryPmcViaPmid(pmid: string | null): Promise<PdfRetrievalResult> {
    if (!pmid) return NOT_FOUND;

    // Step 1: Convert PMID to PMC ID via NCBI ID converter
    const converterUrl = `https://www.ncbi.nlm.nih.gov/pmc/utils/idconv/v1.0/?ids=${pmid}&format=json`;
    const converterRes = await fetchWithTimeout(converterUrl, SOURCE_TIMEOUT);
    if (!converterRes.ok) return NOT_FOUND;

    const converterData: any = await converterRes.json();
    const pmcId = converterData.records?.[0]?.pmcid;
    if (!pmcId) return NOT_FOUND;

    // Step 2: Use the OA service to get PDF link
    return this.tryPmc(pmcId);
  }

  /**
   * PMC Open Access: get PDF directly from PMC OA service.
   */
  private async tryPmc(pmcId: string | null): Promise<PdfRetrievalResult> {
    if (!pmcId) return NOT_FOUND;

    const url = `https://www.ncbi.nlm.nih.gov/pmc/utils/oa/oa.fcgi?id=${pmcId}`;
    const response = await fetchWithTimeout(url, SOURCE_TIMEOUT);

    if (!response.ok) return NOT_FOUND;

    const text = await response.text();
    const pdfUrlMatch = text.match(/href="([^"]+\.pdf)"/);

    if (!pdfUrlMatch?.[1]) return NOT_FOUND;

    const pdfUrl = pdfUrlMatch[1].startsWith('ftp')
      ? pdfUrlMatch[1].replace('ftp://', 'https://')
      : pdfUrlMatch[1];

    const pdfBuffer = await downloadPdf(pdfUrl);
    if (!pdfBuffer) return NOT_FOUND;

    return { found: true, source: 'PMC', pdfBuffer, pdfUrl };
  }

  /**
   * Unpaywall: lookup OA PDF by DOI. Checks multiple OA locations.
   */
  private async tryUnpaywall(doi: string | null): Promise<PdfRetrievalResult> {
    if (!doi) return NOT_FOUND;

    const url = `https://api.unpaywall.org/v2/${encodeURIComponent(doi)}?email=${this.email}`;
    const response = await fetchWithTimeout(url, SOURCE_TIMEOUT);

    if (!response.ok) return NOT_FOUND;

    const data: any = await response.json();

    // Try best OA location first, then all locations
    const locations = [data.best_oa_location, ...(data.oa_locations ?? [])].filter(Boolean);

    for (const loc of locations) {
      const pdfUrl = loc.url_for_pdf ?? loc.url_for_landing_page;
      if (!pdfUrl) continue;

      // Only try direct PDF URLs
      if (loc.url_for_pdf) {
        const pdfBuffer = await downloadPdf(loc.url_for_pdf);
        if (pdfBuffer)
          return { found: true, source: 'Unpaywall', pdfBuffer, pdfUrl: loc.url_for_pdf };
      }
    }

    return NOT_FOUND;
  }

  /**
   * Semantic Scholar: lookup paper by DOI and get open access PDF.
   */
  private async trySemanticScholar(doi: string | null): Promise<PdfRetrievalResult> {
    if (!doi) return NOT_FOUND;

    const url = `https://api.semanticscholar.org/graph/v1/paper/DOI:${encodeURIComponent(doi)}?fields=openAccessPdf`;
    const response = await fetchWithTimeout(url, SOURCE_TIMEOUT);

    if (!response.ok) return NOT_FOUND;

    const data: any = await response.json();
    const pdfUrl = data.openAccessPdf?.url;
    if (!pdfUrl) return NOT_FOUND;

    const pdfBuffer = await downloadPdf(pdfUrl);
    if (!pdfBuffer) return NOT_FOUND;

    return { found: true, source: 'SemanticScholar', pdfBuffer, pdfUrl };
  }

  /**
   * Europe PMC: search by DOI or PMID and find full-text PDF link.
   */
  private async tryEuropePmc(doi: string | null, pmid: string | null): Promise<PdfRetrievalResult> {
    const query = doi ? `DOI:${encodeURIComponent(doi)}` : pmid ? `EXT_ID:${pmid}` : null;
    if (!query) return NOT_FOUND;

    const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${query}&format=json`;
    const response = await fetchWithTimeout(url, SOURCE_TIMEOUT);

    if (!response.ok) return NOT_FOUND;

    const data: any = await response.json();
    const result = data.resultList?.result?.[0];

    // Try PDF URLs from fullTextUrlList
    const fullTextUrls = result?.fullTextUrlList?.fullTextUrl ?? [];
    const pdfEntry =
      fullTextUrls.find(
        (u: { documentStyle: string; availabilityCode: string }) =>
          u.documentStyle === 'pdf' && u.availabilityCode === 'OA',
      ) ?? fullTextUrls.find((u: { documentStyle: string }) => u.documentStyle === 'pdf');

    if (!pdfEntry?.url) return NOT_FOUND;

    const pdfBuffer = await downloadPdf(pdfEntry.url);
    if (!pdfBuffer) return NOT_FOUND;

    return { found: true, source: 'EuropePMC', pdfBuffer, pdfUrl: pdfEntry.url };
  }

  /**
   * CORE: search by DOI for open access full text PDF.
   */
  private async tryCore(doi: string | null): Promise<PdfRetrievalResult> {
    if (!doi) return NOT_FOUND;

    const apiKey = process.env['CORE_API_KEY'];
    if (!apiKey) return NOT_FOUND;

    const url = `https://api.core.ac.uk/v3/search/works?q=doi:"${encodeURIComponent(doi)}"&limit=1`;
    const response = await fetchWithTimeout(url, SOURCE_TIMEOUT, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) return NOT_FOUND;

    const data: any = await response.json();
    const result = data.results?.[0];
    const pdfUrl = result?.downloadUrl ?? result?.sourceFulltextUrls?.[0];
    if (!pdfUrl) return NOT_FOUND;

    const pdfBuffer = await downloadPdf(pdfUrl);
    if (!pdfBuffer) return NOT_FOUND;

    return { found: true, source: 'CORE', pdfBuffer, pdfUrl };
  }

  /**
   * DOI direct: follow DOI redirect and check if it leads to an open access PDF.
   */
  private async tryDoiDirectPdf(doi: string | null): Promise<PdfRetrievalResult> {
    if (!doi) return NOT_FOUND;

    // Request with Accept: application/pdf header — some publishers serve PDF directly
    const url = `https://doi.org/${encodeURIComponent(doi)}`;
    try {
      const response = await fetchWithTimeout(url, SOURCE_TIMEOUT, {
        headers: { Accept: 'application/pdf' },
        redirect: 'follow',
      });

      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('application/pdf')) return NOT_FOUND;

      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length < 1000 || !isPdfBuffer(buffer)) return NOT_FOUND;

      return { found: true, source: 'DOI-Direct', pdfBuffer: buffer, pdfUrl: response.url };
    } catch {
      return NOT_FOUND;
    }
  }
}

/**
 * Download a PDF URL and validate it's actually a PDF.
 */
async function downloadPdf(url: string): Promise<Buffer | null> {
  try {
    const response = await fetchWithTimeout(url, SOURCE_TIMEOUT, {
      redirect: 'follow',
    });

    if (!response.ok) return null;

    const buffer = Buffer.from(await response.arrayBuffer());

    // Validate it's a real PDF (>1KB and starts with %PDF)
    if (buffer.length < 1000 || !isPdfBuffer(buffer)) return null;

    return buffer;
  } catch {
    return null;
  }
}

function isPdfBuffer(buffer: Buffer): boolean {
  return buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46; // %PDF
}

async function fetchWithTimeout(
  url: string,
  timeout: number,
  options?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
