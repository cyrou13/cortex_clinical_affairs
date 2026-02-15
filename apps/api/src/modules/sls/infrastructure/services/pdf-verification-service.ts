export interface PdfVerificationResult {
  verified: boolean;
  confidence: number;
  extractedTitle: string;
  extractedAuthors: string[];
  mismatchReasons: string[];
}

interface ArticleMetadata {
  title: string;
  authors: Array<{ firstName?: string; lastName: string }>;
}

export class PdfVerificationService {
  async verify(
    pdfText: string,
    metadata: ArticleMetadata,
  ): Promise<PdfVerificationResult> {
    const extractedTitle = this.extractTitle(pdfText);
    const extractedAuthors = this.extractAuthors(pdfText);

    const titleMatch = this.fuzzyMatch(
      this.normalize(extractedTitle),
      this.normalize(metadata.title),
    ) > 0.80;

    const authorMatch = metadata.authors.length === 0 || metadata.authors.some((a) =>
      extractedAuthors.some(
        (ea) => ea.toLowerCase().includes(a.lastName.toLowerCase()),
      ),
    );

    const mismatchReasons: string[] = [];
    if (!titleMatch) {
      mismatchReasons.push(
        `Title mismatch: expected "${metadata.title}", found "${extractedTitle}"`,
      );
    }
    if (!authorMatch) {
      mismatchReasons.push(
        `Author mismatch: expected "${metadata.authors[0]?.lastName}", not found in PDF`,
      );
    }

    return {
      verified: titleMatch && authorMatch,
      confidence: (titleMatch ? 50 : 0) + (authorMatch ? 50 : 0),
      extractedTitle,
      extractedAuthors,
      mismatchReasons,
    };
  }

  private extractTitle(text: string): string {
    // Take the first significant line of text as the title
    const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 10);
    return lines[0] ?? '';
  }

  private extractAuthors(text: string): string[] {
    // Look for author-like patterns in the first few lines
    const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    const authorLine = lines.slice(1, 5).find((l) => l.includes(',') && !l.includes('doi'));
    if (!authorLine) return [];

    return authorLine
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 2 && s.length < 50 && !s.includes('@'));
  }

  private normalize(s: string): string {
    return s
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private fuzzyMatch(a: string, b: string): number {
    if (a === b) return 1;
    if (a.length === 0 || b.length === 0) return 0;

    // Simple Jaccard similarity on word sets
    const wordsA = new Set(a.split(' '));
    const wordsB = new Set(b.split(' '));

    let intersection = 0;
    for (const w of wordsA) {
      if (wordsB.has(w)) intersection++;
    }

    const union = new Set([...wordsA, ...wordsB]).size;
    return union > 0 ? intersection / union : 0;
  }
}
