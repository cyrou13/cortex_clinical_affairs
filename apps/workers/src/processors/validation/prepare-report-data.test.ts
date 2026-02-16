import { describe, it, expect, vi } from 'vitest';
import {
  validateReportPrerequisites,
  prepareValidationReportData,
  prepareClinicalBenefitData,
  type ReportDataAccess,
  type StudyData,
  type ProtocolData,
  type ValidationResult,
  type SoaComparison,
} from './prepare-report-data.js';

const STUDY_ID = 'study-1';

function makeStudy(overrides?: Partial<StudyData>): StudyData {
  return {
    id: STUDY_ID,
    name: 'Test Validation Study',
    studyType: 'STANDALONE',
    projectId: 'proj-1',
    protocol: null,
    results: [],
    soaComparisons: [],
    ...overrides,
  };
}

function makeProtocol(overrides?: Partial<ProtocolData>): ProtocolData {
  return {
    id: 'proto-1',
    version: '1.0',
    status: 'APPROVED',
    title: 'Test Protocol',
    description: 'Protocol description',
    studyType: 'STANDALONE',
    amendments: [],
    ...overrides,
  };
}

function makeResults(): ValidationResult[] {
  return [
    { id: 'r1', metricName: 'AUC', metricValue: 0.95, unit: '' },
    { id: 'r2', metricName: 'Sensitivity', metricValue: 92.5, unit: '%' },
    { id: 'r3', metricName: 'Specificity', metricValue: 98.1, unit: '%', subgroup: 'Male' },
  ];
}

function makeSoaComparisons(): SoaComparison[] {
  return [
    {
      articleTitle: 'Smith et al. 2024',
      metricName: 'AUC',
      soaValue: 0.92,
      validationValue: 0.95,
      delta: 0.03,
    },
  ];
}

function makeDataAccess(overrides?: Partial<ReportDataAccess>): ReportDataAccess {
  return {
    getStudy: vi.fn().mockResolvedValue(makeStudy()),
    getProtocol: vi.fn().mockResolvedValue(makeProtocol()),
    getResults: vi.fn().mockResolvedValue(makeResults()),
    getSoaComparisons: vi.fn().mockResolvedValue(makeSoaComparisons()),
    hasActiveImport: vi.fn().mockResolvedValue(true),
    hasResultsMapped: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe('validateReportPrerequisites', () => {
  it('returns valid when all prerequisites met', async () => {
    const dataAccess = makeDataAccess();

    const result = await validateReportPrerequisites(STUDY_ID, dataAccess);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns error when no protocol found', async () => {
    const dataAccess = makeDataAccess({
      getProtocol: vi.fn().mockResolvedValue(null),
    });

    const result = await validateReportPrerequisites(STUDY_ID, dataAccess);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('No protocol found for study');
  });

  it('returns error when protocol is not approved', async () => {
    const dataAccess = makeDataAccess({
      getProtocol: vi.fn().mockResolvedValue(makeProtocol({ status: 'DRAFT' })),
    });

    const result = await validateReportPrerequisites(STUDY_ID, dataAccess);

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('not approved');
  });

  it('returns error when no active import exists', async () => {
    const dataAccess = makeDataAccess({
      hasActiveImport: vi.fn().mockResolvedValue(false),
    });

    const result = await validateReportPrerequisites(STUDY_ID, dataAccess);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('No active data import exists for study');
  });

  it('returns error when results not mapped', async () => {
    const dataAccess = makeDataAccess({
      hasResultsMapped: vi.fn().mockResolvedValue(false),
    });

    const result = await validateReportPrerequisites(STUDY_ID, dataAccess);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Results have not been mapped for study');
  });

  it('accumulates multiple errors', async () => {
    const dataAccess = makeDataAccess({
      getProtocol: vi.fn().mockResolvedValue(null),
      hasActiveImport: vi.fn().mockResolvedValue(false),
      hasResultsMapped: vi.fn().mockResolvedValue(false),
    });

    const result = await validateReportPrerequisites(STUDY_ID, dataAccess);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(3);
  });
});

describe('prepareValidationReportData', () => {
  it('returns DocumentData with correct title and studyId', async () => {
    const dataAccess = makeDataAccess();

    const data = await prepareValidationReportData(STUDY_ID, dataAccess);

    expect(data.studyId).toBe(STUDY_ID);
    expect(data.projectId).toBe('proj-1');
    expect(data.title).toContain('Validation Report');
    expect(data.author).toBe('Cortex Clinical Affairs');
  });

  it('includes executive summary section', async () => {
    const dataAccess = makeDataAccess();

    const data = await prepareValidationReportData(STUDY_ID, dataAccess);

    const execSummary = data.sections.find((s) => s.heading.includes('Executive Summary'));
    expect(execSummary).toBeDefined();
    expect(execSummary!.content).toContain('Test Validation Study');
  });

  it('includes protocol summary when protocol exists', async () => {
    const dataAccess = makeDataAccess();

    const data = await prepareValidationReportData(STUDY_ID, dataAccess);

    const protocolSection = data.sections.find((s) => s.heading.includes('Protocol Summary'));
    expect(protocolSection).toBeDefined();
    expect(protocolSection!.content).toContain('Test Protocol');
  });

  it('includes amendments when present', async () => {
    const dataAccess = makeDataAccess({
      getProtocol: vi.fn().mockResolvedValue(
        makeProtocol({
          amendments: [
            { id: 'a1', version: '1.1', description: 'Added endpoint', createdAt: '2025-01-01' },
          ],
        }),
      ),
    });

    const data = await prepareValidationReportData(STUDY_ID, dataAccess);

    const amendmentSection = data.sections.find((s) => s.heading.includes('Amendments'));
    expect(amendmentSection).toBeDefined();
    expect(amendmentSection!.items).toHaveLength(1);
    expect(amendmentSection!.items![0]).toContain('Added endpoint');
  });

  it('includes results table', async () => {
    const dataAccess = makeDataAccess();

    const data = await prepareValidationReportData(STUDY_ID, dataAccess);

    const resultsTable = data.tables!.find((t) => t.title === 'Performance Metrics');
    expect(resultsTable).toBeDefined();
    expect(resultsTable!.rows).toHaveLength(3);
    expect(resultsTable!.headers).toContain('Metric');
  });

  it('includes SOA comparison table when comparisons exist', async () => {
    const dataAccess = makeDataAccess();

    const data = await prepareValidationReportData(STUDY_ID, dataAccess);

    const soaTable = data.tables!.find((t) => t.title === 'SOA Comparison Table');
    expect(soaTable).toBeDefined();
    expect(soaTable!.rows).toHaveLength(1);
  });

  it('handles missing protocol gracefully', async () => {
    const dataAccess = makeDataAccess({
      getProtocol: vi.fn().mockResolvedValue(null),
    });

    const data = await prepareValidationReportData(STUDY_ID, dataAccess);

    const protocolSection = data.sections.find((s) => s.heading.includes('Protocol Summary'));
    expect(protocolSection).toBeUndefined();
  });

  it('handles empty results', async () => {
    const dataAccess = makeDataAccess({
      getResults: vi.fn().mockResolvedValue([]),
    });

    const data = await prepareValidationReportData(STUDY_ID, dataAccess);

    const resultsTable = data.tables!.find((t) => t.title === 'Performance Metrics');
    expect(resultsTable).toBeUndefined();
  });

  it('handles empty SOA comparisons', async () => {
    const dataAccess = makeDataAccess({
      getSoaComparisons: vi.fn().mockResolvedValue([]),
    });

    const data = await prepareValidationReportData(STUDY_ID, dataAccess);

    const soaSection = data.sections.find((s) => s.heading.includes('SOA Comparison'));
    expect(soaSection).toBeUndefined();
  });

  it('throws when study not found', async () => {
    const dataAccess = makeDataAccess({
      getStudy: vi.fn().mockResolvedValue(null),
    });

    await expect(prepareValidationReportData(STUDY_ID, dataAccess)).rejects.toThrow(
      'Study not found',
    );
  });

  it('includes metadata in output', async () => {
    const dataAccess = makeDataAccess();

    const data = await prepareValidationReportData(STUDY_ID, dataAccess);

    expect(data.metadata).toBeDefined();
    expect(data.metadata!.studyType).toBe('STANDALONE');
    expect(data.metadata!.generatedAt).toBeDefined();
  });
});

describe('prepareClinicalBenefitData', () => {
  it('returns DocumentData for standalone study', async () => {
    const dataAccess = makeDataAccess();

    const data = await prepareClinicalBenefitData(STUDY_ID, dataAccess);

    expect(data.title).toContain('Clinical Benefit');
    expect(data.studyId).toBe(STUDY_ID);
  });

  it('includes MRMC-specific sections for MRMC study', async () => {
    const mrmcResults: ValidationResult[] = [
      { id: 'r1', metricName: 'AUC', metricValue: 0.93, unit: '', readerIndex: 0 },
      { id: 'r2', metricName: 'AUC', metricValue: 0.95, unit: '', readerIndex: 1 },
      { id: 'r3', metricName: 'AUC', metricValue: 0.91, unit: '', readerIndex: 2 },
    ];

    const dataAccess = makeDataAccess({
      getStudy: vi.fn().mockResolvedValue(makeStudy({ studyType: 'MRMC' })),
      getResults: vi.fn().mockResolvedValue(mrmcResults),
    });

    const data = await prepareClinicalBenefitData(STUDY_ID, dataAccess);

    const mrmcSection = data.sections.find((s) => s.heading.includes('Multi-Reader Multi-Case'));
    expect(mrmcSection).toBeDefined();
    expect(mrmcSection!.content).toContain('3 reader(s)');
  });

  it('includes standalone section for non-MRMC study', async () => {
    const dataAccess = makeDataAccess();

    const data = await prepareClinicalBenefitData(STUDY_ID, dataAccess);

    const standaloneSection = data.sections.find((s) => s.heading.includes('Standalone Analysis'));
    expect(standaloneSection).toBeDefined();
  });

  it('includes benefit quantification section', async () => {
    const dataAccess = makeDataAccess();

    const data = await prepareClinicalBenefitData(STUDY_ID, dataAccess);

    const benefitSection = data.sections.find((s) => s.heading.includes('Benefit Quantification'));
    expect(benefitSection).toBeDefined();
  });

  it('includes reader info in table for MRMC results', async () => {
    const mrmcResults: ValidationResult[] = [
      { id: 'r1', metricName: 'AUC', metricValue: 0.93, unit: '', readerIndex: 0 },
    ];

    const dataAccess = makeDataAccess({
      getStudy: vi.fn().mockResolvedValue(makeStudy({ studyType: 'MRMC' })),
      getResults: vi.fn().mockResolvedValue(mrmcResults),
    });

    const data = await prepareClinicalBenefitData(STUDY_ID, dataAccess);

    const table = data.tables!.find((t) => t.title === 'Clinical Performance Metrics');
    expect(table).toBeDefined();
    expect(table!.rows[0]).toContain('Reader 0');
  });

  it('throws when study not found', async () => {
    const dataAccess = makeDataAccess({
      getStudy: vi.fn().mockResolvedValue(null),
    });

    await expect(prepareClinicalBenefitData(STUDY_ID, dataAccess)).rejects.toThrow(
      'Study not found',
    );
  });

  it('marks metadata.isMRMC correctly', async () => {
    const dataAccess = makeDataAccess({
      getStudy: vi.fn().mockResolvedValue(makeStudy({ studyType: 'MRMC' })),
    });

    const data = await prepareClinicalBenefitData(STUDY_ID, dataAccess);

    expect(data.metadata!.isMRMC).toBe(true);
  });

  it('marks metadata.isMRMC false for standalone', async () => {
    const dataAccess = makeDataAccess();

    const data = await prepareClinicalBenefitData(STUDY_ID, dataAccess);

    expect(data.metadata!.isMRMC).toBe(false);
  });
});
