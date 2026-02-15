import { describe, it, expect } from 'vitest';
import { getSchemaForStudyType, validateXlsData, parseXlsContent } from './xls-parser-service.js';

describe('XlsParserService', () => {
  describe('getSchemaForStudyType', () => {
    it('returns STANDALONE schema with 4 columns', () => {
      const schema = getSchemaForStudyType('STANDALONE');
      expect(schema.columns).toHaveLength(4);
      expect(schema.columns.map((c) => c.name)).toContain('case_id');
      expect(schema.columns.map((c) => c.name)).toContain('ground_truth');
      expect(schema.columns.map((c) => c.name)).toContain('prediction');
      expect(schema.columns.map((c) => c.name)).toContain('confidence');
    });

    it('returns MRMC schema with 5 columns (includes reader_id)', () => {
      const schema = getSchemaForStudyType('MRMC');
      expect(schema.columns).toHaveLength(5);
      expect(schema.columns.map((c) => c.name)).toContain('reader_id');
    });

    it('throws for unknown study type', () => {
      expect(() => getSchemaForStudyType('UNKNOWN')).toThrow('Unknown study type');
    });
  });

  describe('validateXlsData', () => {
    const standaloneSchema = getSchemaForStudyType('STANDALONE');

    it('returns valid for correct data', () => {
      const headers = ['case_id', 'ground_truth', 'prediction', 'confidence'];
      const rows = [
        { case_id: 'C001', ground_truth: 'POSITIVE', prediction: 'POSITIVE', confidence: 0.95 },
        { case_id: 'C002', ground_truth: 'NEGATIVE', prediction: 'NEGATIVE', confidence: 0.88 },
      ];

      const result = validateXlsData(headers, rows, standaloneSchema);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.rowCount).toBe(2);
      expect(result.columnCount).toBe(4);
    });

    it('flags missing required column', () => {
      const headers = ['case_id', 'prediction'];
      const rows = [{ case_id: 'C001', prediction: 'POSITIVE' }];

      const result = validateXlsData(headers, rows, standaloneSchema);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('ground_truth'))).toBe(true);
    });

    it('warns about unknown columns', () => {
      const headers = ['case_id', 'ground_truth', 'prediction', 'extra_col'];
      const rows = [
        { case_id: 'C001', ground_truth: 'POSITIVE', prediction: 'POSITIVE', extra_col: 'foo' },
      ];

      const result = validateXlsData(headers, rows, standaloneSchema);
      expect(result.warnings.some((w) => w.includes('extra_col'))).toBe(true);
    });

    it('flags empty data file', () => {
      const headers = ['case_id', 'ground_truth', 'prediction'];
      const rows: Array<Record<string, unknown>> = [];

      const result = validateXlsData(headers, rows, standaloneSchema);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('no rows'))).toBe(true);
    });

    it('flags missing required values in rows', () => {
      const headers = ['case_id', 'ground_truth', 'prediction'];
      const rows = [{ case_id: 'C001', ground_truth: '', prediction: 'POSITIVE' }];

      const result = validateXlsData(headers, rows, standaloneSchema);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Row 1') && e.includes('ground_truth'))).toBe(
        true,
      );
    });

    it('flags invalid number types', () => {
      const headers = ['case_id', 'ground_truth', 'prediction', 'confidence'];
      const rows = [
        { case_id: 'C001', ground_truth: 'POS', prediction: 'POS', confidence: 'not-a-number' },
      ];

      const result = validateXlsData(headers, rows, standaloneSchema);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('confidence') && e.includes('number'))).toBe(
        true,
      );
    });

    it('allows null optional fields', () => {
      const headers = ['case_id', 'ground_truth', 'prediction', 'confidence'];
      const rows = [{ case_id: 'C001', ground_truth: 'POS', prediction: 'POS', confidence: null }];

      const result = validateXlsData(headers, rows, standaloneSchema);
      expect(result.valid).toBe(true);
    });

    it('validates MRMC schema with reader_id', () => {
      const mrmcSchema = getSchemaForStudyType('MRMC');
      const headers = ['case_id', 'reader_id', 'ground_truth', 'prediction'];
      const rows = [{ case_id: 'C001', reader_id: 'R1', ground_truth: 'POS', prediction: 'POS' }];

      const result = validateXlsData(headers, rows, mrmcSchema);
      expect(result.valid).toBe(true);
    });

    it('flags missing reader_id in MRMC schema', () => {
      const mrmcSchema = getSchemaForStudyType('MRMC');
      const headers = ['case_id', 'ground_truth', 'prediction'];
      const rows = [{ case_id: 'C001', ground_truth: 'POS', prediction: 'POS' }];

      const result = validateXlsData(headers, rows, mrmcSchema);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('reader_id'))).toBe(true);
    });
  });

  describe('parseXlsContent', () => {
    it('parses raw rows into named objects', () => {
      const headers = ['case_id', 'ground_truth', 'prediction'];
      const rawRows = [
        ['C001', 'POSITIVE', 'POSITIVE'],
        ['C002', 'NEGATIVE', 'NEGATIVE'],
      ];

      const result = parseXlsContent(headers, rawRows);
      expect(result.rowCount).toBe(2);
      expect(result.columnCount).toBe(3);
      expect(result.rows[0]).toEqual({
        case_id: 'C001',
        ground_truth: 'POSITIVE',
        prediction: 'POSITIVE',
      });
    });

    it('handles missing values as null', () => {
      const headers = ['case_id', 'ground_truth', 'prediction'];
      const rawRows = [['C001', 'POSITIVE']]; // prediction missing

      const result = parseXlsContent(headers, rawRows);
      expect(result.rows[0]?.prediction).toBeNull();
    });

    it('returns correct headers', () => {
      const headers = ['a', 'b', 'c'];
      const rawRows = [['1', '2', '3']];

      const result = parseXlsContent(headers, rawRows);
      expect(result.headers).toEqual(['a', 'b', 'c']);
    });

    it('handles empty data', () => {
      const result = parseXlsContent(['col'], []);
      expect(result.rowCount).toBe(0);
      expect(result.rows).toHaveLength(0);
    });
  });
});
