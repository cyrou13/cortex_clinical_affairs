import { ValidationError } from '../../../../shared/errors/index.js';

export interface ExternalDocumentData {
  id: string;
  cerVersionId: string;
  title: string;
  version: string;
  date: string;
  summary: string;
  documentType: string;
  createdAt: string;
  updatedAt: string;
}

const VALID_DOCUMENT_TYPES = [
  'STANDARD',
  'GUIDANCE',
  'REGULATION',
  'TECHNICAL_REPORT',
  'CLINICAL_STUDY',
  'OTHER',
] as const;

export type DocumentType = (typeof VALID_DOCUMENT_TYPES)[number];

export function createExternalDocument(
  cerVersionId: string,
  title: string,
  version: string,
  date: string,
  summary: string,
  documentType: string,
): ExternalDocumentData {
  validateExternalDoc({ title, version, date, summary, documentType });

  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    cerVersionId,
    title: title.trim(),
    version: version.trim(),
    date,
    summary: summary.trim(),
    documentType,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateExternalDocument(
  doc: ExternalDocumentData,
  updates: Partial<Pick<ExternalDocumentData, 'title' | 'version' | 'date' | 'summary' | 'documentType'>>,
): ExternalDocumentData {
  const merged = {
    title: updates.title ?? doc.title,
    version: updates.version ?? doc.version,
    date: updates.date ?? doc.date,
    summary: updates.summary ?? doc.summary,
    documentType: updates.documentType ?? doc.documentType,
  };

  validateExternalDoc(merged);

  return {
    ...doc,
    ...merged,
    title: merged.title.trim(),
    version: merged.version.trim(),
    summary: merged.summary.trim(),
    updatedAt: new Date().toISOString(),
  };
}

export function validateExternalDoc(doc: {
  title: string;
  version: string;
  date: string;
  summary: string;
  documentType: string;
}): void {
  if (!doc.title.trim()) {
    throw new ValidationError('External document title is required');
  }

  if (!doc.version.trim()) {
    throw new ValidationError('External document version is required');
  }

  if (!doc.date.trim()) {
    throw new ValidationError('External document date is required');
  }

  if (!doc.summary.trim()) {
    throw new ValidationError('External document summary is required');
  }

  if (!VALID_DOCUMENT_TYPES.includes(doc.documentType as DocumentType)) {
    throw new ValidationError(`Invalid document type: ${doc.documentType}`);
  }
}
