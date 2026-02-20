/**
 * Document parser for SOA import.
 * Extracts text from PDF and DOCX files.
 */

export interface ParsedDocument {
  fullText: string;
  pageCount: number;
  format: 'PDF' | 'DOCX';
}

export async function parseDocument(
  fileBuffer: Buffer,
  format: 'PDF' | 'DOCX',
): Promise<ParsedDocument> {
  if (format === 'PDF') {
    return parsePdf(fileBuffer);
  }
  return parseDocx(fileBuffer);
}

async function parsePdf(buffer: Buffer): Promise<ParsedDocument> {
  // Dynamic import to allow tree-shaking
  const pdfParse = (await import('pdf-parse')).default;
  const result = await pdfParse(buffer);

  return {
    fullText: result.text,
    pageCount: result.numpages,
    format: 'PDF',
  };
}

async function parseDocx(buffer: Buffer): Promise<ParsedDocument> {
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ buffer });

  // DOCX doesn't have native page count — estimate from content
  const estimatedPages = Math.max(1, Math.ceil(result.value.length / 3000));

  return {
    fullText: result.value,
    pageCount: estimatedPages,
    format: 'DOCX',
  };
}
