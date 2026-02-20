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

const SOURCE_TIMEOUT = 15_000;

export class PdfRetrievalService {
  constructor(private readonly email: string) {}

  async retrieve(article: ArticleForRetrieval): Promise<PdfRetrievalResult> {
    const sources = [
      () => this.tryPmc(article.pmcId),
      () => this.tryUnpaywall(article.doi),
      () => this.tryEuropePmc(article.doi),
    ];

    for (const trySource of sources) {
      try {
        const result = await trySource();
        if (result.found) return result;
      } catch {
        // Continue to next source
      }
    }

    return { found: false, source: null, pdfBuffer: null, pdfUrl: null };
  }

  private async tryPmc(pmcId: string | null): Promise<PdfRetrievalResult> {
    if (!pmcId) return { found: false, source: null, pdfBuffer: null, pdfUrl: null };

    const url = `https://www.ncbi.nlm.nih.gov/pmc/utils/oa/oa.fcgi?id=${pmcId}`;
    const response = await fetchWithTimeout(url, SOURCE_TIMEOUT);

    if (!response.ok) {
      return { found: false, source: null, pdfBuffer: null, pdfUrl: null };
    }

    const text = await response.text();
    const pdfUrlMatch = text.match(/href="([^"]+\.pdf)"/);

    if (!pdfUrlMatch) {
      return { found: false, source: null, pdfBuffer: null, pdfUrl: null };
    }

    const pdfUrl = pdfUrlMatch[1]!;
    const pdfResponse = await fetchWithTimeout(pdfUrl, SOURCE_TIMEOUT);
    const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());

    return { found: true, source: 'PMC', pdfBuffer, pdfUrl };
  }

  private async tryUnpaywall(doi: string | null): Promise<PdfRetrievalResult> {
    if (!doi) return { found: false, source: null, pdfBuffer: null, pdfUrl: null };

    const url = `https://api.unpaywall.org/v2/${encodeURIComponent(doi)}?email=${this.email}`;
    const response = await fetchWithTimeout(url, SOURCE_TIMEOUT);

    if (!response.ok) {
      return { found: false, source: null, pdfBuffer: null, pdfUrl: null };
    }

    const data: any = await response.json();
    const pdfUrl = data.best_oa_location?.url_for_pdf;

    if (!pdfUrl) {
      return { found: false, source: null, pdfBuffer: null, pdfUrl: null };
    }

    const pdfResponse = await fetchWithTimeout(pdfUrl, SOURCE_TIMEOUT);
    const contentType = pdfResponse.headers.get('content-type') ?? '';
    if (!contentType.includes('application/pdf')) {
      return { found: false, source: null, pdfBuffer: null, pdfUrl: null };
    }

    const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());
    return { found: true, source: 'Unpaywall', pdfBuffer, pdfUrl };
  }

  private async tryEuropePmc(doi: string | null): Promise<PdfRetrievalResult> {
    if (!doi) return { found: false, source: null, pdfBuffer: null, pdfUrl: null };

    const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=DOI:${encodeURIComponent(doi)}&format=json`;
    const response = await fetchWithTimeout(url, SOURCE_TIMEOUT);

    if (!response.ok) {
      return { found: false, source: null, pdfBuffer: null, pdfUrl: null };
    }

    const data: any = await response.json();
    const result = data.resultList?.result?.[0];
    const pdfUrl = result?.fullTextUrlList?.fullTextUrl?.find(
      (u: { documentStyle: string }) => u.documentStyle === 'pdf',
    )?.url;

    if (!pdfUrl) {
      return { found: false, source: null, pdfBuffer: null, pdfUrl: null };
    }

    const pdfResponse = await fetchWithTimeout(pdfUrl, SOURCE_TIMEOUT);
    const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());

    return { found: true, source: 'EuropePMC', pdfBuffer, pdfUrl };
  }
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
