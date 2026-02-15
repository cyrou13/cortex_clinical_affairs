/**
 * HybridEngine — orchestrates template-based + programmatic DOCX generation.
 *
 * This module manages the registry of document types and delegates
 * document generation to the appropriate data preparation + rendering pipeline.
 *
 * NOTE: Actual DOCX serialization is stubbed. The architecture supports
 * swapping in docx/carbone npm packages when installed.
 */

import { DocxBuilder, type DocxDocument } from './docx-builder.js';

// ── Document Types ──────────────────────────────────────────────────────

export const DOCUMENT_TYPES = [
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
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export interface DocumentData {
  studyId?: string;
  projectId?: string;
  title: string;
  author: string;
  sections: DocumentSection[];
  tables?: DocumentTableData[];
  metadata?: Record<string, unknown>;
}

export interface DocumentSection {
  heading: string;
  level: 1 | 2 | 3;
  content?: string;
  items?: string[];
  listType?: 'numbered' | 'bullet';
}

export interface DocumentTableData {
  title?: string;
  headers: string[];
  rows: string[][];
}

// ── Data Preparation Function Type ──────────────────────────────────────

export type DataPreparationFn = (data: DocumentData, builder: DocxBuilder) => DocxDocument;

// ── Default Preparation Functions ───────────────────────────────────────

function prepareGenericDocument(data: DocumentData, builder: DocxBuilder): DocxDocument {
  builder.setTitle(data.title);
  builder.setAuthor(data.author);

  for (const section of data.sections) {
    builder.createHeading(section.heading, section.level);
    if (section.content) {
      builder.createParagraph(section.content);
    }
    if (section.items && section.items.length > 0) {
      if (section.listType === 'numbered') {
        builder.createNumberedList(section.items);
      } else {
        builder.createBulletList(section.items);
      }
    }
  }

  if (data.tables) {
    for (const table of data.tables) {
      if (table.title) {
        builder.createHeading(table.title, 3);
      }
      builder.createTable(table.headers, table.rows);
    }
  }

  return builder.build();
}

function prepareValidationReport(data: DocumentData, builder: DocxBuilder): DocxDocument {
  builder.setTitle(data.title || 'Validation Report');
  builder.setAuthor(data.author);

  builder.createHeading('Validation Report', 1);
  builder.createParagraph(
    `Study ID: ${data.studyId ?? 'N/A'} | Project ID: ${data.projectId ?? 'N/A'}`,
  );

  for (const section of data.sections) {
    builder.createHeading(section.heading, section.level);
    if (section.content) {
      builder.createParagraph(section.content);
    }
    if (section.items && section.items.length > 0) {
      if (section.listType === 'numbered') {
        builder.createNumberedList(section.items);
      } else {
        builder.createBulletList(section.items);
      }
    }
  }

  if (data.tables) {
    builder.addPageBreak();
    builder.createHeading('Data Tables', 1);
    for (const table of data.tables) {
      if (table.title) {
        builder.createHeading(table.title, 2);
      }
      builder.createTable(table.headers, table.rows);
    }
  }

  return builder.build();
}

function prepareClinicalBenefit(data: DocumentData, builder: DocxBuilder): DocxDocument {
  builder.setTitle(data.title || 'Clinical Benefit Report');
  builder.setAuthor(data.author);

  builder.createHeading('Clinical Benefit Assessment', 1);
  builder.createParagraph(
    `Study ID: ${data.studyId ?? 'N/A'}`,
  );

  for (const section of data.sections) {
    builder.createHeading(section.heading, section.level);
    if (section.content) {
      builder.createParagraph(section.content);
    }
    if (section.items && section.items.length > 0) {
      if (section.listType === 'numbered') {
        builder.createNumberedList(section.items);
      } else {
        builder.createBulletList(section.items);
      }
    }
  }

  if (data.tables) {
    builder.addPageBreak();
    for (const table of data.tables) {
      if (table.title) {
        builder.createHeading(table.title, 2);
      }
      builder.createTable(table.headers, table.rows);
    }
  }

  return builder.build();
}

// ── Document Type Registry ──────────────────────────────────────────────

const DOCUMENT_TYPE_REGISTRY: Record<DocumentType, DataPreparationFn> = {
  VALIDATION_REPORT: prepareValidationReport,
  CLINICAL_BENEFIT: prepareClinicalBenefit,
  ALGORITHMIC_FAIRNESS: prepareGenericDocument,
  LABELING_VALIDATION: prepareGenericDocument,
  BENEFIT_QUANTIFICATION: prepareGenericDocument,
  PATCH_VALIDATION: prepareGenericDocument,
  FDA_18CVS: prepareGenericDocument,
  CER_MDR: prepareGenericDocument,
  CEP: prepareGenericDocument,
  PCCP: prepareGenericDocument,
  PMCF_REPORT: prepareGenericDocument,
  PSUR: prepareGenericDocument,
};

// ── Hybrid Engine ───────────────────────────────────────────────────────

export class HybridEngine {
  private registry: Record<string, DataPreparationFn>;

  constructor() {
    this.registry = { ...DOCUMENT_TYPE_REGISTRY };
  }

  /**
   * Register a custom preparation function for a document type.
   */
  registerType(type: DocumentType, prepareFn: DataPreparationFn): void {
    this.registry[type] = prepareFn;
  }

  /**
   * Generate a DOCX document buffer for the given type and data.
   *
   * Steps:
   * 1. Look up the data preparation function from the registry
   * 2. Build the DocxDocument structure
   * 3. Serialize to a Buffer (stubbed — returns JSON representation)
   */
  async generateDocument(type: DocumentType, data: DocumentData): Promise<Buffer> {
    const prepareFn = this.registry[type];
    if (!prepareFn) {
      throw new Error(`Unknown document type: ${type}`);
    }

    const builder = new DocxBuilder();
    const document = prepareFn(data, builder);

    // Stub serialization: in production this would use docx/carbone
    // to produce actual DOCX bytes. For now we serialize the structure.
    const serialized = JSON.stringify(document);
    return Buffer.from(serialized, 'utf-8');
  }

  /**
   * Check if a document type is registered.
   */
  isTypeRegistered(type: string): boolean {
    return type in this.registry;
  }

  /**
   * Get all registered document types.
   */
  getRegisteredTypes(): string[] {
    return Object.keys(this.registry);
  }
}
