import { describe, it, expect } from 'vitest';
import {
  createExternalDocument,
  updateExternalDocument,
  validateExternalDoc,
} from './external-document.js';
import type { ExternalDocumentData } from './external-document.js';

function makeDoc(overrides?: Partial<ExternalDocumentData>): ExternalDocumentData {
  return {
    id: 'doc-1',
    cerVersionId: 'cer-1',
    title: 'IEC 62304:2015',
    version: '2.0',
    date: '2015-06-01',
    summary: 'Medical device software lifecycle processes',
    documentType: 'STANDARD',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('ExternalDocument entity', () => {
  describe('createExternalDocument', () => {
    it('creates a document with valid fields', () => {
      const doc = createExternalDocument(
        'cer-1',
        'IEC 62304',
        '2.0',
        '2015-06-01',
        'Software lifecycle standard',
        'STANDARD',
      );
      expect(doc.cerVersionId).toBe('cer-1');
      expect(doc.title).toBe('IEC 62304');
      expect(doc.version).toBe('2.0');
      expect(doc.documentType).toBe('STANDARD');
      expect(doc.id).toBeTruthy();
    });

    it('trims title and summary', () => {
      const doc = createExternalDocument(
        'cer-1',
        '  IEC 62304  ',
        '2.0',
        '2015-06-01',
        '  Summary  ',
        'STANDARD',
      );
      expect(doc.title).toBe('IEC 62304');
      expect(doc.summary).toBe('Summary');
    });

    it('throws for empty title', () => {
      expect(() =>
        createExternalDocument('cer-1', '', '2.0', '2015-06-01', 'Summary', 'STANDARD'),
      ).toThrow('title is required');
    });

    it('throws for empty version', () => {
      expect(() =>
        createExternalDocument('cer-1', 'Title', '', '2015-06-01', 'Summary', 'STANDARD'),
      ).toThrow('version is required');
    });

    it('throws for empty date', () => {
      expect(() =>
        createExternalDocument('cer-1', 'Title', '1.0', '', 'Summary', 'STANDARD'),
      ).toThrow('date is required');
    });

    it('throws for empty summary', () => {
      expect(() =>
        createExternalDocument('cer-1', 'Title', '1.0', '2015-06-01', '  ', 'STANDARD'),
      ).toThrow('summary is required');
    });

    it('throws for invalid document type', () => {
      expect(() =>
        createExternalDocument('cer-1', 'Title', '1.0', '2015-06-01', 'Summary', 'INVALID'),
      ).toThrow('Invalid document type');
    });

    it('accepts GUIDANCE document type', () => {
      const doc = createExternalDocument(
        'cer-1',
        'MDCG 2020-5',
        '1.0',
        '2020-04-01',
        'Guidance on clinical evaluation',
        'GUIDANCE',
      );
      expect(doc.documentType).toBe('GUIDANCE');
    });
  });

  describe('updateExternalDocument', () => {
    it('updates title while keeping other fields', () => {
      const doc = makeDoc();
      const updated = updateExternalDocument(doc, { title: 'Updated Title' });
      expect(updated.title).toBe('Updated Title');
      expect(updated.version).toBe('2.0');
    });

    it('updates multiple fields', () => {
      const doc = makeDoc();
      const updated = updateExternalDocument(doc, {
        title: 'New Title',
        version: '3.0',
      });
      expect(updated.title).toBe('New Title');
      expect(updated.version).toBe('3.0');
    });

    it('updates the updatedAt timestamp', () => {
      const doc = makeDoc();
      const updated = updateExternalDocument(doc, { title: 'New' });
      expect(updated.updatedAt).not.toBe(doc.updatedAt);
    });

    it('throws for invalid update (empty title)', () => {
      const doc = makeDoc();
      expect(() => updateExternalDocument(doc, { title: '  ' })).toThrow('title is required');
    });
  });

  describe('validateExternalDoc', () => {
    it('does not throw for valid doc', () => {
      expect(() =>
        validateExternalDoc({
          title: 'Title',
          version: '1.0',
          date: '2024-01-01',
          summary: 'Summary',
          documentType: 'STANDARD',
        }),
      ).not.toThrow();
    });

    it('validates all document types', () => {
      const validTypes = [
        'STANDARD',
        'GUIDANCE',
        'REGULATION',
        'TECHNICAL_REPORT',
        'CLINICAL_STUDY',
        'OTHER',
      ];
      for (const type of validTypes) {
        expect(() =>
          validateExternalDoc({
            title: 'T',
            version: '1',
            date: '2024',
            summary: 'S',
            documentType: type,
          }),
        ).not.toThrow();
      }
    });
  });
});
