import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImportSoaDocumentProcessor } from './import-soa-document.js';

vi.mock('./document-parser.js', () => ({
  parseDocument: vi.fn().mockResolvedValue({
    fullText: 'Sample SOA document content about clinical evaluation...',
    pageCount: 10,
    format: 'PDF',
  }),
}));

function makeMockJob(metadata?: Partial<any>) {
  return {
    data: {
      taskId: 'task-1',
      type: 'soa.import-document',
      metadata: {
        importId: 'import-1',
        projectId: 'project-1',
        storageKey: 'imports/project-1/import-1/source.pdf',
        sourceFormat: 'PDF',
        fileName: 'test-soa.pdf',
        ...metadata,
      },
      createdBy: 'user-1',
    },
    updateProgress: vi.fn(),
  } as any;
}

function makeMockRedis() {
  return {
    get: vi.fn().mockResolvedValue(null),
    publish: vi.fn(),
  } as any;
}

function makeMockPrisma() {
  return {
    soaImport: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'import-1',
        sourceStorageKey: 'imports/project-1/import-1/source.pdf',
        extractedData: { _rawFileContent: Buffer.from('fake pdf content').toString('base64') },
      }),
      update: vi.fn().mockResolvedValue({ id: 'import-1' }),
    },
  } as any;
}

function makeMockLlmService() {
  return {
    complete: vi
      .fn()
      // Phase 1: SOA type + articles + slsSessions
      .mockResolvedValueOnce({
        content: JSON.stringify({
          soaType: 'CLINICAL',
          articles: [
            {
              tempId: 'art-1',
              title: 'Clinical Trial of Device X',
              authors: 'Smith et al.',
              publicationYear: 2022,
              doi: '10.1234/abc',
              pmid: '12345678',
              journal: 'Medical Journal',
              abstract: 'A randomized controlled trial...',
            },
            {
              tempId: 'art-2',
              title: 'Long-term Follow-up Study',
              authors: 'Jones et al.',
              publicationYear: 2023,
              doi: null,
              pmid: null,
              journal: 'Clinical Reviews',
              abstract: 'Five-year follow-up data...',
            },
          ],
          slsSessions: [
            {
              type: 'SOA_CLINICAL',
              name: 'Clinical literature search',
              scopeFields: { population: 'Adult patients', intervention: 'Device X' },
              queries: [
                {
                  name: 'Primary search',
                  queryString: '(device X) AND (safety OR efficacy)',
                  databases: ['PubMed', 'Embase'],
                  dateFrom: '2015-01-01',
                  dateTo: '2024-12-31',
                },
              ],
              exclusionCodes: [
                {
                  code: 'E1',
                  label: 'Animal study',
                  shortCode: 'E1',
                  description: 'Non-human subjects',
                },
                { code: 'E2', label: 'Non-English', shortCode: 'E2' },
              ],
              articleTempIds: ['art-1', 'art-2'],
            },
          ],
        }),
        usage: { promptTokens: 500, completionTokens: 200, totalTokens: 700 },
        cost: 0.003,
        model: 'gpt-4',
        provider: 'openai',
        cached: false,
        latencyMs: 2000,
      })
      // Phase 2: sections + claims
      .mockResolvedValueOnce({
        content: JSON.stringify({
          sections: [
            {
              sectionKey: 'clinical_background',
              title: 'Clinical Background',
              orderIndex: 0,
              narrativeContent: 'Overview of the clinical context...',
            },
            {
              sectionKey: 'clinical_data_review',
              title: 'Clinical Data Review',
              orderIndex: 1,
              narrativeContent: 'Summary of clinical evidence...',
            },
          ],
          claims: [
            {
              statementText: 'Device X demonstrates equivalent safety to comparator.',
              thematicSectionKey: 'clinical_data_review',
              articleTempIds: ['art-1'],
              sourceQuote: 'No significant difference in adverse events was observed.',
            },
          ],
        }),
        usage: { promptTokens: 600, completionTokens: 300, totalTokens: 900 },
        cost: 0.004,
        model: 'gpt-4',
        provider: 'openai',
        cached: false,
        latencyMs: 2500,
      })
      // Phase 3: grid + similar devices + quality assessments
      .mockResolvedValueOnce({
        content: JSON.stringify({
          gridColumns: [
            {
              name: 'study_type',
              displayName: 'Study Type',
              dataType: 'TEXT',
              isRequired: false,
              orderIndex: 0,
            },
            {
              name: 'sample_size',
              displayName: 'Sample Size',
              dataType: 'NUMERIC',
              isRequired: false,
              orderIndex: 1,
            },
          ],
          gridCells: [
            {
              articleTempId: 'art-1',
              columnName: 'study_type',
              value: 'RCT',
              sourceQuote: 'randomized controlled trial',
            },
            {
              articleTempId: 'art-2',
              columnName: 'study_type',
              value: 'Prospective cohort',
              sourceQuote: null,
            },
          ],
          similarDevices: [],
          qualityAssessments: [],
        }),
        usage: { promptTokens: 700, completionTokens: 400, totalTokens: 1100 },
        cost: 0.005,
        model: 'gpt-4',
        provider: 'openai',
        cached: false,
        latencyMs: 3000,
      }),
  } as any;
}

describe('ImportSoaDocumentProcessor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('processes document through 3 LLM phases and updates import to REVIEW', async () => {
    const redis = makeMockRedis();
    const prisma = makeMockPrisma();
    const llmService = makeMockLlmService();
    const processor = new ImportSoaDocumentProcessor(redis, prisma, llmService);

    const job = makeMockJob();
    const result = await processor.process(job);

    expect(result).toEqual({ importId: 'import-1', status: 'REVIEW' });
    expect(llmService.complete).toHaveBeenCalledTimes(3);

    expect(prisma.soaImport.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'import-1' },
        data: expect.objectContaining({
          status: 'REVIEW',
          extractedData: expect.objectContaining({
            soaType: 'CLINICAL',
            articles: expect.arrayContaining([
              expect.objectContaining({ tempId: 'art-1', title: 'Clinical Trial of Device X' }),
              expect.objectContaining({ tempId: 'art-2', title: 'Long-term Follow-up Study' }),
            ]),
            sections: expect.arrayContaining([
              expect.objectContaining({ sectionKey: 'clinical_background' }),
              expect.objectContaining({ sectionKey: 'clinical_data_review' }),
            ]),
            gridColumns: expect.arrayContaining([expect.objectContaining({ name: 'study_type' })]),
            gridCells: expect.arrayContaining([
              expect.objectContaining({ articleTempId: 'art-1', columnName: 'study_type' }),
            ]),
            claims: expect.arrayContaining([
              expect.objectContaining({ statementText: expect.stringContaining('Device X') }),
            ]),
            similarDevices: [],
            qualityAssessments: [],
            slsSessions: expect.arrayContaining([
              expect.objectContaining({
                type: 'SOA_CLINICAL',
                name: 'Clinical literature search',
              }),
            ]),
          }),
          gapReport: expect.objectContaining({
            items: expect.any(Array),
            summary: expect.objectContaining({ totalGaps: expect.any(Number) }),
          }),
        }),
      }),
    );
  });

  it('reports progress at each phase', async () => {
    const redis = makeMockRedis();
    const prisma = makeMockPrisma();
    const llmService = makeMockLlmService();
    const processor = new ImportSoaDocumentProcessor(redis, prisma, llmService);

    const job = makeMockJob();
    await processor.process(job);

    // Should publish progress events at each major stage
    expect(redis.publish).toHaveBeenCalledWith(
      'task:progress:user-1',
      expect.stringContaining('Parsing document'),
    );
    expect(redis.publish).toHaveBeenCalledWith(
      'task:progress:user-1',
      expect.stringContaining('Phase 1'),
    );
    expect(redis.publish).toHaveBeenCalledWith(
      'task:progress:user-1',
      expect.stringContaining('Phase 2'),
    );
    expect(redis.publish).toHaveBeenCalledWith(
      'task:progress:user-1',
      expect.stringContaining('Phase 3'),
    );
    expect(redis.publish).toHaveBeenCalledWith(
      'task:progress:user-1',
      expect.stringContaining('Import complete'),
    );

    // Progress should start at 5 and end at 100
    expect(job.updateProgress).toHaveBeenCalledWith(5);
    expect(job.updateProgress).toHaveBeenCalledWith(100);
  });

  it('handles cancellation between phases', async () => {
    const redis = makeMockRedis();
    // Not cancelled before phase 1, cancelled after phase 1 completes
    redis.get
      .mockResolvedValueOnce(null) // after document parsing
      .mockResolvedValueOnce('1'); // after phase 1 — trigger cancellation
    const prisma = makeMockPrisma();
    const llmService = makeMockLlmService();
    const processor = new ImportSoaDocumentProcessor(redis, prisma, llmService);

    const job = makeMockJob();
    const result = await processor.process(job);

    expect(result).toEqual({ importId: 'import-1', status: 'CANCELLED' });
    // Phase 1 ran, but phases 2 and 3 should not have run
    expect(llmService.complete).toHaveBeenCalledTimes(1);
    expect(prisma.soaImport.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'import-1' },
        data: { status: 'CANCELLED' },
      }),
    );
  });

  it('marks import as FAILED on LLM error', async () => {
    const redis = makeMockRedis();
    const prisma = makeMockPrisma();
    const llmService = {
      complete: vi.fn().mockRejectedValue(new Error('LLM service unavailable')),
    } as any;
    const processor = new ImportSoaDocumentProcessor(redis, prisma, llmService);

    const job = makeMockJob();
    await expect(processor.process(job)).rejects.toThrow('LLM service unavailable');

    expect(prisma.soaImport.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'import-1' },
        data: expect.objectContaining({ status: 'FAILED' }),
      }),
    );
    // Should not have been updated to REVIEW
    expect(prisma.soaImport.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'REVIEW' }),
      }),
    );
  });

  it('includes slsSessions with 2 sessions in extractedData for SIMILAR_DEVICE', async () => {
    const redis = makeMockRedis();
    const prisma = makeMockPrisma();
    const llmService = {
      complete: vi
        .fn()
        .mockResolvedValueOnce({
          content: JSON.stringify({
            soaType: 'SIMILAR_DEVICE',
            articles: [
              { tempId: 'art-1', title: 'Article Clinical', authors: 'A' },
              { tempId: 'art-2', title: 'Article Device', authors: 'B' },
            ],
            slsSessions: [
              {
                type: 'SOA_CLINICAL',
                name: 'Clinical search',
                scopeFields: { population: 'Adults' },
                queries: [{ name: 'Q1', queryString: 'device AND safety', databases: ['PubMed'] }],
                exclusionCodes: [{ code: 'E1', label: 'Animal', shortCode: 'E1' }],
                articleTempIds: ['art-1'],
              },
              {
                type: 'SOA_DEVICE',
                name: 'Device equivalence search',
                scopeFields: { subjectDevice: 'Device X' },
                queries: [{ name: 'Q2', queryString: 'equivalent device', databases: ['Embase'] }],
                exclusionCodes: [],
                articleTempIds: ['art-2'],
              },
            ],
          }),
          usage: { promptTokens: 500, completionTokens: 200, totalTokens: 700 },
          cost: 0.003,
          model: 'gpt-4',
          provider: 'openai',
          cached: false,
          latencyMs: 2000,
        })
        .mockResolvedValueOnce({
          content: JSON.stringify({ sections: [], claims: [] }),
          usage: { promptTokens: 100, completionTokens: 100, totalTokens: 200 },
          cost: 0.001,
          model: 'gpt-4',
          provider: 'openai',
          cached: false,
          latencyMs: 1000,
        })
        .mockResolvedValueOnce({
          content: JSON.stringify({
            gridColumns: [],
            gridCells: [],
            similarDevices: [],
            qualityAssessments: [],
          }),
          usage: { promptTokens: 100, completionTokens: 100, totalTokens: 200 },
          cost: 0.001,
          model: 'gpt-4',
          provider: 'openai',
          cached: false,
          latencyMs: 1000,
        }),
    } as any;

    const processor = new ImportSoaDocumentProcessor(redis, prisma, llmService);
    await processor.process(makeMockJob());

    const updateCall = prisma.soaImport.update.mock.calls[0]?.[0];
    const extracted = updateCall?.data?.extractedData;

    expect(extracted.slsSessions).toHaveLength(2);
    expect(extracted.slsSessions[0].type).toBe('SOA_CLINICAL');
    expect(extracted.slsSessions[1].type).toBe('SOA_DEVICE');
    expect(extracted.slsSessions[0].articleTempIds).toEqual(['art-1']);
    expect(extracted.slsSessions[1].articleTempIds).toEqual(['art-2']);
  });

  it('generates gap report with expected items', async () => {
    const redis = makeMockRedis();
    const prisma = makeMockPrisma();
    const llmService = makeMockLlmService();
    const processor = new ImportSoaDocumentProcessor(redis, prisma, llmService);

    const job = makeMockJob();
    await processor.process(job);

    const updateCall = prisma.soaImport.update.mock.calls[0]?.[0];
    const gapReport = updateCall?.data?.gapReport;

    const categories = gapReport.items.map((i: any) => i.category);

    // Sessions have queries → Search Strategy INFO should NOT appear
    expect(categories).not.toContain('Search Strategy');
    // Should always include INFO items for deduplication, PRISMA
    expect(categories).toContain('Deduplication');
    expect(categories).toContain('PRISMA');

    // SLS Sessions extracted → no "SLS Sessions" HIGH gap
    expect(categories).not.toContain('SLS Sessions');

    // All 2 articles lack PDFs → PDF Availability gap present
    expect(categories).toContain('PDF Availability');

    // All 2 articles lack AI scores → AI Scoring gap present
    expect(categories).toContain('AI Scoring');

    // All 2 articles lack screening decisions → Screening gap present
    expect(categories).toContain('Screening');

    // art-2 has no DOI or PMID → Article Identification gap present
    expect(categories).toContain('Article Identification');

    // 1 grid cell has no sourceQuote (art-2/study_type) → Data Traceability gap present
    expect(categories).toContain('Data Traceability');

    // Both articles have no quality assessments → Quality Assessment gap present
    expect(categories).toContain('Quality Assessment');

    // Summary counts should be consistent
    expect(gapReport.summary.totalGaps).toBe(gapReport.items.length);
    expect(gapReport.summary.highCount).toBe(
      gapReport.items.filter((i: any) => i.severity === 'HIGH').length,
    );
    expect(gapReport.summary.infoCount).toBe(
      gapReport.items.filter((i: any) => i.severity === 'INFO').length,
    );
  });
});
