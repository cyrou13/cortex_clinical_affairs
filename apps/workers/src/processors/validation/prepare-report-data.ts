/**
 * Report Data Preparation — aggregates data for validation reports.
 *
 * Gathers protocol, amendments, results, and SOA comparison data
 * from the database and structures it for DOCX generation.
 */

import type { DocumentData, DocumentSection, DocumentTableData } from '../../shared/docx/hybrid-engine.js';

// ── Types ───────────────────────────────────────────────────────────────

export interface ProtocolData {
  id: string;
  version: string;
  status: string;
  title: string;
  description: string | null;
  studyType: string;
  amendments: AmendmentData[];
}

export interface AmendmentData {
  id: string;
  version: string;
  description: string;
  createdAt: string;
}

export interface ValidationResult {
  id: string;
  metricName: string;
  metricValue: number;
  unit: string;
  subgroup?: string;
  readerIndex?: number;
}

export interface SoaComparison {
  articleTitle: string;
  metricName: string;
  soaValue: number;
  validationValue: number;
  delta: number;
}

export interface StudyData {
  id: string;
  name: string;
  studyType: string;
  projectId: string;
  protocol: ProtocolData | null;
  results: ValidationResult[];
  soaComparisons: SoaComparison[];
}

export interface PrerequisiteCheckResult {
  valid: boolean;
  errors: string[];
}

// ── Data Access Interface ───────────────────────────────────────────────

export interface ReportDataAccess {
  getStudy(studyId: string): Promise<StudyData | null>;
  getProtocol(studyId: string): Promise<ProtocolData | null>;
  getResults(studyId: string): Promise<ValidationResult[]>;
  getSoaComparisons(studyId: string): Promise<SoaComparison[]>;
  hasActiveImport(studyId: string): Promise<boolean>;
  hasResultsMapped(studyId: string): Promise<boolean>;
}

// ── Prerequisite Validation ─────────────────────────────────────────────

export async function validateReportPrerequisites(
  studyId: string,
  dataAccess: ReportDataAccess,
): Promise<PrerequisiteCheckResult> {
  const errors: string[] = [];

  const protocol = await dataAccess.getProtocol(studyId);

  if (!protocol) {
    errors.push('No protocol found for study');
  } else if (protocol.status !== 'APPROVED') {
    errors.push(`Protocol is not approved (current status: ${protocol.status})`);
  }

  const hasImport = await dataAccess.hasActiveImport(studyId);
  if (!hasImport) {
    errors.push('No active data import exists for study');
  }

  const hasMapped = await dataAccess.hasResultsMapped(studyId);
  if (!hasMapped) {
    errors.push('Results have not been mapped for study');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ── Validation Report Data Preparation ──────────────────────────────────

export async function prepareValidationReportData(
  studyId: string,
  dataAccess: ReportDataAccess,
): Promise<DocumentData> {
  const study = await dataAccess.getStudy(studyId);
  if (!study) {
    throw new Error(`Study not found: ${studyId}`);
  }

  const protocol = await dataAccess.getProtocol(studyId);
  const results = await dataAccess.getResults(studyId);
  const soaComparisons = await dataAccess.getSoaComparisons(studyId);

  const sections: DocumentSection[] = [];

  // Executive summary
  sections.push({
    heading: '1. Executive Summary',
    level: 1,
    content: `This validation report presents the results of the ${study.studyType} validation study "${study.name}" (ID: ${study.id}).`,
  });

  // Protocol summary
  if (protocol) {
    sections.push({
      heading: '2. Protocol Summary',
      level: 1,
      content: `Protocol: ${protocol.title} (v${protocol.version}). Status: ${protocol.status}.`,
    });

    if (protocol.description) {
      sections.push({
        heading: '2.1 Description',
        level: 2,
        content: protocol.description,
      });
    }

    if (protocol.amendments.length > 0) {
      sections.push({
        heading: '2.2 Amendments',
        level: 2,
        items: protocol.amendments.map(
          (a) => `v${a.version}: ${a.description} (${a.createdAt})`,
        ),
        listType: 'numbered',
      });
    }
  }

  // Results
  sections.push({
    heading: '3. Results',
    level: 1,
    content: `A total of ${results.length} metric(s) were evaluated.`,
  });

  // SOA Comparison
  if (soaComparisons.length > 0) {
    sections.push({
      heading: '4. SOA Comparison',
      level: 1,
      content: 'Comparison of validation results against state of the art benchmarks.',
    });
  }

  // Build tables
  const tables: DocumentTableData[] = [];

  if (results.length > 0) {
    tables.push({
      title: 'Performance Metrics',
      headers: ['Metric', 'Value', 'Unit', 'Subgroup'],
      rows: results.map((r) => [
        r.metricName,
        String(r.metricValue),
        r.unit,
        r.subgroup ?? 'Overall',
      ]),
    });
  }

  if (soaComparisons.length > 0) {
    tables.push({
      title: 'SOA Comparison Table',
      headers: ['Article', 'Metric', 'SOA Value', 'Validation Value', 'Delta'],
      rows: soaComparisons.map((c) => [
        c.articleTitle,
        c.metricName,
        String(c.soaValue),
        String(c.validationValue),
        String(c.delta),
      ]),
    });
  }

  return {
    studyId: study.id,
    projectId: study.projectId,
    title: `Validation Report — ${study.name}`,
    author: 'Cortex Clinical Affairs',
    sections,
    tables,
    metadata: {
      studyType: study.studyType,
      protocolVersion: protocol?.version ?? null,
      generatedAt: new Date().toISOString(),
    },
  };
}

// ── Clinical Benefit Data Preparation ───────────────────────────────────

export async function prepareClinicalBenefitData(
  studyId: string,
  dataAccess: ReportDataAccess,
): Promise<DocumentData> {
  const study = await dataAccess.getStudy(studyId);
  if (!study) {
    throw new Error(`Study not found: ${studyId}`);
  }

  const results = await dataAccess.getResults(studyId);
  const soaComparisons = await dataAccess.getSoaComparisons(studyId);

  const sections: DocumentSection[] = [];

  sections.push({
    heading: '1. Clinical Benefit Overview',
    level: 1,
    content: `Assessment of clinical benefit for study "${study.name}" (${study.studyType}).`,
  });

  // MRMC-specific content
  if (study.studyType === 'MRMC') {
    const readerResults = results.filter((r) => r.readerIndex !== undefined);
    const uniqueReaders = new Set(readerResults.map((r) => r.readerIndex));

    sections.push({
      heading: '2. Multi-Reader Multi-Case Analysis',
      level: 1,
      content: `MRMC study involving ${uniqueReaders.size} reader(s) and ${results.length} metric observations.`,
    });

    sections.push({
      heading: '2.1 Reader-Level Performance',
      level: 2,
      content: 'Individual reader performance metrics are detailed below.',
    });
  } else {
    sections.push({
      heading: '2. Standalone Analysis',
      level: 1,
      content: 'Performance metrics from standalone validation.',
    });
  }

  // Benefit quantification
  sections.push({
    heading: '3. Benefit Quantification',
    level: 1,
    content: soaComparisons.length > 0
      ? 'Clinical benefit is quantified by comparison to state of the art performance.'
      : 'No SOA comparison data available for benefit quantification.',
  });

  const tables: DocumentTableData[] = [];

  if (results.length > 0) {
    tables.push({
      title: 'Clinical Performance Metrics',
      headers: ['Metric', 'Value', 'Unit', 'Reader', 'Subgroup'],
      rows: results.map((r) => [
        r.metricName,
        String(r.metricValue),
        r.unit,
        r.readerIndex !== undefined ? `Reader ${r.readerIndex}` : 'N/A',
        r.subgroup ?? 'Overall',
      ]),
    });
  }

  if (soaComparisons.length > 0) {
    tables.push({
      title: 'Benefit vs. State of the Art',
      headers: ['Article', 'Metric', 'SOA', 'Validation', 'Delta'],
      rows: soaComparisons.map((c) => [
        c.articleTitle,
        c.metricName,
        String(c.soaValue),
        String(c.validationValue),
        String(c.delta),
      ]),
    });
  }

  return {
    studyId: study.id,
    projectId: study.projectId,
    title: `Clinical Benefit Report — ${study.name}`,
    author: 'Cortex Clinical Affairs',
    sections,
    tables,
    metadata: {
      studyType: study.studyType,
      isMRMC: study.studyType === 'MRMC',
      generatedAt: new Date().toISOString(),
    },
  };
}
