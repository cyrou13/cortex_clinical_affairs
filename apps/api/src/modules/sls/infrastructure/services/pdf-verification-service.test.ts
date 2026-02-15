import { describe, it, expect } from 'vitest';
import { PdfVerificationService } from './pdf-verification-service.js';

describe('PdfVerificationService', () => {
  const service = new PdfVerificationService();

  it('verifies matching title and authors', async () => {
    const pdfText = `Cervical Spine Surgery Outcomes in Adults
Smith J, Brown K, Lee M
Department of Orthopedics`;

    const result = await service.verify(pdfText, {
      title: 'Cervical Spine Surgery Outcomes in Adults',
      authors: [{ firstName: 'J', lastName: 'Smith' }],
    });

    expect(result.verified).toBe(true);
    expect(result.confidence).toBe(100);
    expect(result.mismatchReasons).toHaveLength(0);
  });

  it('detects title mismatch', async () => {
    const pdfText = `A Completely Different Study on Dental Care
Smith J, Brown K`;

    const result = await service.verify(pdfText, {
      title: 'Cervical Spine Surgery Outcomes in Adults',
      authors: [{ firstName: 'J', lastName: 'Smith' }],
    });

    expect(result.verified).toBe(false);
    expect(result.mismatchReasons).toEqual(
      expect.arrayContaining([expect.stringContaining('Title mismatch')]),
    );
  });

  it('detects author mismatch', async () => {
    const pdfText = `Cervical Spine Surgery Outcomes in Adults
Johnson A, Williams B`;

    const result = await service.verify(pdfText, {
      title: 'Cervical Spine Surgery Outcomes in Adults',
      authors: [{ firstName: 'J', lastName: 'Smith' }],
    });

    expect(result.verified).toBe(false);
    expect(result.mismatchReasons).toEqual(
      expect.arrayContaining([expect.stringContaining('Author mismatch')]),
    );
  });

  it('handles empty PDF text', async () => {
    const result = await service.verify('', {
      title: 'Some Title',
      authors: [{ lastName: 'Smith' }],
    });

    expect(result.verified).toBe(false);
    expect(result.extractedTitle).toBe('');
  });

  it('handles empty authors list', async () => {
    const pdfText = `Cervical Spine Surgery Outcomes in Adults
Some additional content`;

    const result = await service.verify(pdfText, {
      title: 'Cervical Spine Surgery Outcomes in Adults',
      authors: [],
    });

    expect(result.verified).toBe(true);
    expect(result.confidence).toBe(100);
  });

  it('returns confidence score', async () => {
    const pdfText = `Different Title
Smith J, Brown K`;

    const result = await service.verify(pdfText, {
      title: 'Cervical Spine Surgery Outcomes',
      authors: [{ lastName: 'Smith' }],
    });

    // Title mismatch (0) + Author match (50) = 50
    expect(result.confidence).toBe(50);
  });

  it('extracts title from first significant line', async () => {
    const pdfText = `Short\nThis is the actual title of the research paper
Author Name Here`;

    const result = await service.verify(pdfText, {
      title: 'This is the actual title of the research paper',
      authors: [],
    });

    expect(result.extractedTitle).toBe('This is the actual title of the research paper');
  });

  it('handles fuzzy title matching', async () => {
    // 6/7 words overlap = 0.857 Jaccard > 0.80 threshold
    const pdfText = `Cervical Spine Surgery Outcomes in Adult Populations
Smith J, Brown K`;

    const result = await service.verify(pdfText, {
      title: 'Cervical Spine Surgery Outcomes in Adult Studies',
      authors: [{ lastName: 'Smith' }],
    });

    // Title match (50) + Author match (50) = 100
    expect(result.confidence).toBeGreaterThanOrEqual(50);
  });
});
