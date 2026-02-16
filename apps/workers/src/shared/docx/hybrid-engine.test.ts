import { describe, it, expect, beforeEach } from 'vitest';
import { HybridEngine, DOCUMENT_TYPES, type DocumentData } from './hybrid-engine.js';

function makeDocumentData(overrides?: Partial<DocumentData>): DocumentData {
  return {
    studyId: 'study-1',
    projectId: 'proj-1',
    title: 'Test Report',
    author: 'Test Author',
    sections: [
      { heading: 'Introduction', level: 1, content: 'This is the introduction.' },
      { heading: 'Methods', level: 1, content: 'Study methods described here.' },
    ],
    tables: [
      {
        title: 'Results',
        headers: ['Metric', 'Value'],
        rows: [['AUC', '0.95']],
      },
    ],
    ...overrides,
  };
}

describe('HybridEngine', () => {
  let engine: HybridEngine;

  beforeEach(() => {
    engine = new HybridEngine();
  });

  describe('DOCUMENT_TYPES', () => {
    it('contains all 12 document types', () => {
      expect(DOCUMENT_TYPES).toHaveLength(12);
    });

    it('includes VALIDATION_REPORT and CLINICAL_BENEFIT', () => {
      expect(DOCUMENT_TYPES).toContain('VALIDATION_REPORT');
      expect(DOCUMENT_TYPES).toContain('CLINICAL_BENEFIT');
    });

    it('includes all expected types', () => {
      const expected = [
        'VALIDATION_REPORT',
        'CLINICAL_BENEFIT',
        'ALGORITHMIC_FAIRNESS',
        'LABELING_VALIDATION',
        'BENEFIT_QUANTIFICATION',
        'PATCH_VALIDATION',
        'FDA_18CVS',
        'CER_MDR',
        'CEP',
        'PCCP',
        'PMCF_REPORT',
        'PSUR',
      ];
      for (const type of expected) {
        expect(DOCUMENT_TYPES).toContain(type);
      }
    });
  });

  describe('generateDocument', () => {
    it('generates a buffer for VALIDATION_REPORT', async () => {
      const data = makeDocumentData();
      const buffer = await engine.generateDocument('VALIDATION_REPORT', data);

      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('generates a buffer for CLINICAL_BENEFIT', async () => {
      const data = makeDocumentData({ title: 'Clinical Benefit Report' });
      const buffer = await engine.generateDocument('CLINICAL_BENEFIT', data);

      expect(Buffer.isBuffer(buffer)).toBe(true);
      const parsed = JSON.parse(buffer.toString('utf-8'));
      expect(parsed.metadata.title).toBe('Clinical Benefit Report');
    });

    it('generates a buffer for ALGORITHMIC_FAIRNESS using generic handler', async () => {
      const data = makeDocumentData({ title: 'Fairness Report' });
      const buffer = await engine.generateDocument('ALGORITHMIC_FAIRNESS', data);

      expect(Buffer.isBuffer(buffer)).toBe(true);
    });

    it('includes document structure in serialized output', async () => {
      const data = makeDocumentData();
      const buffer = await engine.generateDocument('VALIDATION_REPORT', data);
      const parsed = JSON.parse(buffer.toString('utf-8'));

      expect(parsed.elements).toBeDefined();
      expect(Array.isArray(parsed.elements)).toBe(true);
      expect(parsed.elements.length).toBeGreaterThan(0);
      expect(parsed.metadata).toBeDefined();
      expect(parsed.pageSetup).toBeDefined();
    });

    it('VALIDATION_REPORT includes study ID in content', async () => {
      const data = makeDocumentData({ studyId: 'VS-42' });
      const buffer = await engine.generateDocument('VALIDATION_REPORT', data);
      const content = buffer.toString('utf-8');

      expect(content).toContain('VS-42');
    });

    it('CLINICAL_BENEFIT includes study ID in content', async () => {
      const data = makeDocumentData({ studyId: 'VS-99' });
      const buffer = await engine.generateDocument('CLINICAL_BENEFIT', data);
      const content = buffer.toString('utf-8');

      expect(content).toContain('VS-99');
    });

    it('handles document data with no tables', async () => {
      const data = makeDocumentData({ tables: undefined });
      const buffer = await engine.generateDocument('VALIDATION_REPORT', data);

      expect(Buffer.isBuffer(buffer)).toBe(true);
    });

    it('handles document data with empty sections', async () => {
      const data = makeDocumentData({ sections: [] });
      const buffer = await engine.generateDocument('VALIDATION_REPORT', data);

      expect(Buffer.isBuffer(buffer)).toBe(true);
    });

    it('handles sections with list items', async () => {
      const data = makeDocumentData({
        sections: [
          {
            heading: 'Key Points',
            level: 1,
            items: ['Point 1', 'Point 2'],
            listType: 'numbered',
          },
          {
            heading: 'Notes',
            level: 2,
            items: ['Note A', 'Note B'],
            listType: 'bullet',
          },
        ],
      });
      const buffer = await engine.generateDocument('VALIDATION_REPORT', data);
      const parsed = JSON.parse(buffer.toString('utf-8'));

      const listElements = parsed.elements.filter(
        (e: { type: string }) => e.type === 'numbered-list' || e.type === 'bullet-list',
      );
      expect(listElements.length).toBeGreaterThanOrEqual(2);
    });

    it('generates documents for all registered types', async () => {
      const data = makeDocumentData();
      for (const type of DOCUMENT_TYPES) {
        const buffer = await engine.generateDocument(type, data);
        expect(Buffer.isBuffer(buffer)).toBe(true);
        expect(buffer.length).toBeGreaterThan(0);
      }
    });
  });

  describe('registerType', () => {
    it('allows registering a custom preparation function', async () => {
      engine.registerType('VALIDATION_REPORT', (data, builder) => {
        builder.setTitle('Custom Title');
        builder.createHeading('Custom', 1);
        return builder.build();
      });

      const data = makeDocumentData();
      const buffer = await engine.generateDocument('VALIDATION_REPORT', data);
      const parsed = JSON.parse(buffer.toString('utf-8'));

      expect(parsed.metadata.title).toBe('Custom Title');
    });
  });

  describe('isTypeRegistered', () => {
    it('returns true for known document types', () => {
      expect(engine.isTypeRegistered('VALIDATION_REPORT')).toBe(true);
      expect(engine.isTypeRegistered('CLINICAL_BENEFIT')).toBe(true);
      expect(engine.isTypeRegistered('PSUR')).toBe(true);
    });

    it('returns false for unknown types', () => {
      expect(engine.isTypeRegistered('UNKNOWN_TYPE')).toBe(false);
    });
  });

  describe('getRegisteredTypes', () => {
    it('returns all 12 registered types', () => {
      const types = engine.getRegisteredTypes();
      expect(types).toHaveLength(12);
      expect(types).toContain('VALIDATION_REPORT');
      expect(types).toContain('PSUR');
    });
  });
});
