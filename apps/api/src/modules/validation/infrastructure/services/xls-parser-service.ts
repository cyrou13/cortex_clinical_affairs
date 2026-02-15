import { ValidationError } from '../../../../shared/errors/index.js';

export interface XlsColumn {
  name: string;
  type: 'string' | 'number' | 'boolean';
  required: boolean;
}

export interface XlsSchema {
  columns: XlsColumn[];
}

export interface XlsValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  rowCount: number;
  columnCount: number;
}

export interface XlsParsedData {
  headers: string[];
  rows: Array<Record<string, unknown>>;
  rowCount: number;
  columnCount: number;
}

const STANDALONE_SCHEMA: XlsSchema = {
  columns: [
    { name: 'case_id', type: 'string', required: true },
    { name: 'ground_truth', type: 'string', required: true },
    { name: 'prediction', type: 'string', required: true },
    { name: 'confidence', type: 'number', required: false },
  ],
};

const MRMC_SCHEMA: XlsSchema = {
  columns: [
    { name: 'case_id', type: 'string', required: true },
    { name: 'reader_id', type: 'string', required: true },
    { name: 'ground_truth', type: 'string', required: true },
    { name: 'prediction', type: 'string', required: true },
    { name: 'confidence', type: 'number', required: false },
  ],
};

export function getSchemaForStudyType(studyType: string): XlsSchema {
  switch (studyType) {
    case 'STANDALONE':
      return STANDALONE_SCHEMA;
    case 'MRMC':
      return MRMC_SCHEMA;
    default:
      throw new ValidationError(`Unknown study type for schema: ${studyType}`);
  }
}

export function validateXlsData(
  headers: string[],
  rows: Array<Record<string, unknown>>,
  schema: XlsSchema,
): XlsValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required columns
  for (const col of schema.columns) {
    if (col.required && !headers.includes(col.name)) {
      errors.push(`Missing required column: ${col.name}`);
    }
  }

  // Check for unknown columns
  const knownColumns = new Set(schema.columns.map((c) => c.name));
  for (const header of headers) {
    if (!knownColumns.has(header)) {
      warnings.push(`Unknown column will be ignored: ${header}`);
    }
  }

  if (rows.length === 0) {
    errors.push('Data file contains no rows');
  }

  // Validate row data types
  const columnTypeMap = new Map(schema.columns.map((c) => [c.name, c]));
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    for (const col of schema.columns) {
      if (!col.required && (row[col.name] === undefined || row[col.name] === null)) {
        continue;
      }
      if (col.required && (row[col.name] === undefined || row[col.name] === null || row[col.name] === '')) {
        errors.push(`Row ${i + 1}: missing required value for column "${col.name}"`);
        continue;
      }
      if (col.type === 'number' && row[col.name] !== undefined && row[col.name] !== null) {
        const num = Number(row[col.name]);
        if (isNaN(num)) {
          errors.push(`Row ${i + 1}: column "${col.name}" expected number, got "${row[col.name]}"`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    rowCount: rows.length,
    columnCount: headers.length,
  };
}

export function parseXlsContent(
  headers: string[],
  rawRows: unknown[][],
): XlsParsedData {
  const rows: Array<Record<string, unknown>> = [];

  for (const rawRow of rawRows) {
    const row: Record<string, unknown> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = rawRow[j] ?? null;
    }
    rows.push(row);
  }

  return {
    headers,
    rows,
    rowCount: rows.length,
    columnCount: headers.length,
  };
}
