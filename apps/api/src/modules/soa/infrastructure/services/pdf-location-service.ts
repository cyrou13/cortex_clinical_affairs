interface PdfLocationData {
  page: number;
  textOffset?: number;
  highlightText?: string;
}

interface PdfLocationUrl {
  url: string;
  page: number;
}

export class PdfLocationService {
  static buildDeepLink(articleId: string, locationData: PdfLocationData): PdfLocationUrl {
    const params = new URLSearchParams({
      articleId,
      page: String(locationData.page),
    });

    if (locationData.highlightText) {
      params.set('highlight', locationData.highlightText);
    }

    return {
      url: `/pdf-viewer?${params.toString()}`,
      page: locationData.page,
    };
  }

  static mapConfidenceScore(score: number): 'HIGH' | 'MEDIUM' | 'LOW' {
    if (score >= 80) return 'HIGH';
    if (score >= 50) return 'MEDIUM';
    return 'LOW';
  }

  static parseLocationData(raw: unknown): PdfLocationData | null {
    if (!raw || typeof raw !== 'object') return null;
    const data = raw as Record<string, unknown>;
    if (typeof data.page !== 'number') return null;
    return {
      page: data.page,
      textOffset: typeof data.textOffset === 'number' ? data.textOffset : undefined,
      highlightText: typeof data.highlightText === 'string' ? data.highlightText : undefined,
    };
  }
}
