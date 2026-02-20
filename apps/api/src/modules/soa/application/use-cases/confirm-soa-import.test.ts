import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfirmSoaImportUseCase } from './confirm-soa-import.js';
import type { SoaExtractedData } from '@cortex/shared';

// ---------------------------------------------------------------------------
// Fixture: a realistic SoaExtractedData with CLINICAL type, 2 articles,
// 1 section, 1 claim, 1 grid column, 1 grid cell.
// ---------------------------------------------------------------------------

const TEMP_ID_1 = 'tmp-article-1';
const TEMP_ID_2 = 'tmp-article-2';

const extractedData: SoaExtractedData = {
  soaType: 'CLINICAL',
  articles: [
    {
      tempId: TEMP_ID_1,
      title: 'Clinical Performance of Device X',
      authors: 'Smith J, Doe A',
      publicationYear: 2022,
      doi: '10.1234/test.2022.001',
      pmid: '12345678',
      journal: 'Journal of Medical Devices',
      abstract: 'A prospective study evaluating device X in 200 patients.',
    },
    {
      tempId: TEMP_ID_2,
      title: 'Safety Profile of Device X at 12 Months',
      authors: 'Doe A, Smith J',
      publicationYear: 2023,
      doi: '10.1234/test.2023.005',
      journal: 'European Medical Journal',
    },
  ],
  sections: [
    {
      sectionKey: 'clinical_performance',
      title: 'Clinical Performance',
      orderIndex: 0,
      narrativeContent: 'Device X demonstrated superior clinical performance...',
    },
  ],
  gridColumns: [
    {
      name: 'study_design',
      displayName: 'Study Design',
      dataType: 'TEXT',
      isRequired: true,
      orderIndex: 0,
    },
  ],
  gridCells: [
    {
      articleTempId: TEMP_ID_1,
      columnName: 'study_design',
      value: 'Prospective, multicenter RCT',
      sourceQuote: 'A prospective study...',
    },
  ],
  claims: [
    {
      statementText: 'Device X achieves ≥95% procedural success rate',
      thematicSectionKey: 'clinical_performance',
      articleTempIds: [TEMP_ID_1, TEMP_ID_2],
      sourceQuote: 'Procedural success was 97.5%',
    },
  ],
  similarDevices: [],
  qualityAssessments: [],
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
        { code: 'E1', label: 'Animal study', shortCode: 'E1', description: 'Non-human subjects' },
        { code: 'E2', label: 'Non-English', shortCode: 'E2' },
      ],
      articleTempIds: [TEMP_ID_1, TEMP_ID_2],
    },
  ],
};

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

function makeTxMock() {
  return {
    slsSession: { create: vi.fn().mockResolvedValue({ id: 'sess-new' }) },
    article: { create: vi.fn().mockResolvedValue({ id: 'art-new' }) },
    soaAnalysis: { create: vi.fn().mockResolvedValue({ id: 'soa-new' }) },
    soaSlsLink: { create: vi.fn().mockResolvedValue({ id: 'link-new' }) },
    thematicSection: { create: vi.fn().mockResolvedValue({ id: 'sec-new' }) },
    extractionGrid: { create: vi.fn().mockResolvedValue({ id: 'grid-new' }) },
    gridColumn: { create: vi.fn().mockResolvedValue({ id: 'col-new' }) },
    gridCell: { create: vi.fn().mockResolvedValue({ id: 'cell-new' }) },
    claim: { create: vi.fn().mockResolvedValue({ id: 'claim-new' }) },
    claimArticleLink: { create: vi.fn().mockResolvedValue({ id: 'cal-new' }) },
    similarDevice: { create: vi.fn().mockResolvedValue({ id: 'dev-new' }) },
    benchmark: { create: vi.fn().mockResolvedValue({ id: 'bench-new' }) },
    qualityAssessment: { create: vi.fn().mockResolvedValue({ id: 'qa-new' }) },
    slsQuery: { create: vi.fn().mockResolvedValue({ id: 'query-new' }) },
    queryExecution: { create: vi.fn().mockResolvedValue({ id: 'exec-new' }) },
    exclusionCode: { create: vi.fn().mockResolvedValue({ id: 'exc-new' }) },
  };
}

function makePrisma(overrides?: {
  soaImport?: Record<string, unknown> | null;
  txOverrides?: Partial<ReturnType<typeof makeTxMock>>;
}) {
  const defaultImport = {
    id: 'import-1',
    projectId: 'proj-1',
    status: 'REVIEW',
    sourceFileName: 'clinical-data.pdf',
    extractedData,
  };

  const soaImportRecord = overrides?.soaImport !== undefined ? overrides.soaImport : defaultImport;

  // Build a fresh tx mock and apply any per-test overrides
  const tx = { ...makeTxMock(), ...(overrides?.txOverrides ?? {}) };

  return {
    soaImport: {
      findUnique: vi.fn().mockResolvedValue(soaImportRecord),
      update: vi.fn().mockResolvedValue({ id: 'import-1', status: 'CONFIRMED' }),
    },
    project: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'proj-1',
        cepId: 'cep-1',
        cep: { id: 'cep-1' },
      }),
    },
    $transaction: vi
      .fn()
      .mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
        return callback(tx);
      }),
    // Expose tx so tests can assert on it
    _tx: tx,
  } as any;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ConfirmSoaImportUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('successfully confirms import and creates all entities', async () => {
    const prisma = makePrisma();
    const useCase = new ConfirmSoaImportUseCase(prisma);

    const result = await useCase.execute({
      importId: 'import-1',
      userId: 'user-1',
    });

    expect(result.soaAnalysisId).toBeDefined();
    expect(result.articleCount).toBe(2);
    expect(result.sessionIds).toHaveLength(1); // 1 slsSession in extractedData

    const tx = prisma._tx;

    // SLS session created once from slsSessions data
    expect(tx.slsSession.create).toHaveBeenCalledTimes(1);
    expect(tx.slsSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'SOA_CLINICAL',
          status: 'DRAFT',
          projectId: 'proj-1',
          cepId: 'cep-1',
          createdById: 'user-1',
          scopeFields: expect.objectContaining({ population: 'Adult patients' }),
        }),
      }),
    );

    // 1 query with 2 databases → 1 slsQuery + 2 queryExecutions
    expect(tx.slsQuery.create).toHaveBeenCalledTimes(1);
    expect(tx.slsQuery.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Primary search',
          queryString: '(device X) AND (safety OR efficacy)',
        }),
      }),
    );
    expect(tx.queryExecution.create).toHaveBeenCalledTimes(2);

    // 2 exclusion codes
    expect(tx.exclusionCode.create).toHaveBeenCalledTimes(2);
    expect(tx.exclusionCode.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ code: 'E1', label: 'Animal study' }),
      }),
    );

    // Both articles created
    expect(tx.article.create).toHaveBeenCalledTimes(2);
    expect(tx.article.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Clinical Performance of Device X',
          status: 'FINAL_INCLUDED',
          source: 'SOA_IMPORT',
        }),
      }),
    );

    // SOA analysis created
    expect(tx.soaAnalysis.create).toHaveBeenCalledTimes(1);
    expect(tx.soaAnalysis.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: 'proj-1',
          type: 'CLINICAL',
          status: 'DRAFT',
          createdById: 'user-1',
        }),
      }),
    );

    // SoaSlsLink created for the one session
    expect(tx.soaSlsLink.create).toHaveBeenCalledTimes(1);

    // Section created
    expect(tx.thematicSection.create).toHaveBeenCalledTimes(1);
    expect(tx.thematicSection.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sectionKey: 'clinical_performance',
          title: 'Clinical Performance',
          orderIndex: 0,
        }),
      }),
    );

    // Grid, column, cell created
    expect(tx.extractionGrid.create).toHaveBeenCalledTimes(1);
    expect(tx.gridColumn.create).toHaveBeenCalledTimes(1);
    expect(tx.gridCell.create).toHaveBeenCalledTimes(1);

    // Claim + 2 claim-article links
    expect(tx.claim.create).toHaveBeenCalledTimes(1);
    expect(tx.claim.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          statementText: 'Device X achieves ≥95% procedural success rate',
        }),
      }),
    );
    expect(tx.claimArticleLink.create).toHaveBeenCalledTimes(2);

    // SoaImport updated to CONFIRMED
    expect(prisma.soaImport.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'import-1' },
        data: expect.objectContaining({
          status: 'CONFIRMED',
          soaAnalysisId: expect.any(String),
        }),
      }),
    );
  });

  it('creates two SLS sessions when slsSessions has 2 entries', async () => {
    const deviceData: SoaExtractedData = {
      ...extractedData,
      soaType: 'SIMILAR_DEVICE',
      slsSessions: [
        {
          type: 'SOA_CLINICAL',
          name: 'Clinical search',
          scopeFields: { population: 'Adults' },
          queries: [],
          exclusionCodes: [],
          articleTempIds: [TEMP_ID_1],
        },
        {
          type: 'SOA_DEVICE',
          name: 'Device equivalence search',
          scopeFields: { subjectDevice: 'Device X' },
          queries: [
            {
              name: 'Q1',
              queryString: 'equivalent',
              databases: ['Embase'],
              dateFrom: undefined,
              dateTo: undefined,
            },
          ],
          exclusionCodes: [],
          articleTempIds: [TEMP_ID_2],
        },
      ],
    };

    const prisma = makePrisma({
      soaImport: {
        id: 'import-2',
        projectId: 'proj-1',
        status: 'REVIEW',
        sourceFileName: 'device-data.pdf',
        extractedData: deviceData,
      },
    });
    const useCase = new ConfirmSoaImportUseCase(prisma);

    const result = await useCase.execute({
      importId: 'import-2',
      userId: 'user-1',
    });

    expect(result.sessionIds).toHaveLength(2);
    expect(prisma._tx.slsSession.create).toHaveBeenCalledTimes(2);

    const sessionCalls = prisma._tx.slsSession.create.mock.calls as Array<
      [{ data: { type: string } }]
    >;
    const types = sessionCalls.map((call) => call[0].data.type);
    expect(types).toContain('SOA_CLINICAL');
    expect(types).toContain('SOA_DEVICE');

    // Device session has 1 query with 1 database
    expect(prisma._tx.slsQuery.create).toHaveBeenCalledTimes(1);
    expect(prisma._tx.queryExecution.create).toHaveBeenCalledTimes(1);
  });

  it('falls back to legacy session creation when slsSessions is empty', async () => {
    const legacyData: SoaExtractedData = {
      ...extractedData,
      slsSessions: [],
    };

    const prisma = makePrisma({
      soaImport: {
        id: 'import-3',
        projectId: 'proj-1',
        status: 'REVIEW',
        sourceFileName: 'legacy.pdf',
        extractedData: legacyData,
      },
    });
    const useCase = new ConfirmSoaImportUseCase(prisma);

    const result = await useCase.execute({
      importId: 'import-3',
      userId: 'user-1',
    });

    // Legacy: CLINICAL → 1 session, no queries/exclusions
    expect(result.sessionIds).toHaveLength(1);
    expect(prisma._tx.slsSession.create).toHaveBeenCalledTimes(1);
    expect(prisma._tx.slsSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'SOA_CLINICAL',
          cepId: 'cep-1',
        }),
      }),
    );
    expect(prisma._tx.slsQuery.create).not.toHaveBeenCalled();
    expect(prisma._tx.exclusionCode.create).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when import does not exist', async () => {
    const prisma = makePrisma({ soaImport: null });
    const useCase = new ConfirmSoaImportUseCase(prisma);

    await expect(useCase.execute({ importId: 'missing-import', userId: 'user-1' })).rejects.toThrow(
      'not found',
    );

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('throws ValidationError when import is not in REVIEW status', async () => {
    const prisma = makePrisma({
      soaImport: {
        id: 'import-1',
        projectId: 'proj-1',
        status: 'PROCESSING',
        sourceFileName: 'doc.pdf',
        extractedData,
      },
    });
    const useCase = new ConfirmSoaImportUseCase(prisma);

    await expect(useCase.execute({ importId: 'import-1', userId: 'user-1' })).rejects.toThrow(
      'REVIEW status',
    );

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('throws ValidationError when import is in CONFIRMED status', async () => {
    const prisma = makePrisma({
      soaImport: {
        id: 'import-1',
        projectId: 'proj-1',
        status: 'CONFIRMED',
        sourceFileName: 'doc.pdf',
        extractedData,
      },
    });
    const useCase = new ConfirmSoaImportUseCase(prisma);

    await expect(useCase.execute({ importId: 'import-1', userId: 'user-1' })).rejects.toThrow(
      'REVIEW status',
    );
  });

  it('correctly maps tempIds to real article IDs for grid cells', async () => {
    const prisma = makePrisma();
    const useCase = new ConfirmSoaImportUseCase(prisma);

    await useCase.execute({ importId: 'import-1', userId: 'user-1' });

    const tx = prisma._tx;

    // Grid cell must reference a real articleId, not a tempId
    const cellCreateCall = tx.gridCell.create.mock.calls[0][0] as {
      data: { articleId: string; aiExtractedValue: string | null };
    };
    expect(cellCreateCall.data.articleId).toBeDefined();
    expect(cellCreateCall.data.articleId).not.toBe(TEMP_ID_1);
    expect(cellCreateCall.data.aiExtractedValue).toBe('Prospective, multicenter RCT');
  });

  it('correctly maps tempIds to real article IDs for claim links', async () => {
    const prisma = makePrisma();
    const useCase = new ConfirmSoaImportUseCase(prisma);

    await useCase.execute({ importId: 'import-1', userId: 'user-1' });

    const tx = prisma._tx;

    // 2 articles → 2 claim-article links, each with a real articleId
    expect(tx.claimArticleLink.create).toHaveBeenCalledTimes(2);

    const linkCalls = tx.claimArticleLink.create.mock.calls as Array<
      [{ data: { articleId: string } }]
    >;
    for (const call of linkCalls) {
      expect(call[0].data.articleId).toBeDefined();
      expect(call[0].data.articleId).not.toBe(TEMP_ID_1);
      expect(call[0].data.articleId).not.toBe(TEMP_ID_2);
    }
  });

  it('uses editedData over extractedData when provided', async () => {
    const prisma = makePrisma();
    const useCase = new ConfirmSoaImportUseCase(prisma);

    const editedData: SoaExtractedData = {
      ...extractedData,
      articles: [
        {
          tempId: 'tmp-edited-1',
          title: 'Edited Article Title',
          authors: 'Edited Author',
          publicationYear: 2024,
        },
      ],
      gridCells: [],
      claims: [],
      sections: [],
      gridColumns: [],
    };

    const result = await useCase.execute({
      importId: 'import-1',
      editedData,
      userId: 'user-1',
    });

    expect(result.articleCount).toBe(1);
    expect(prisma._tx.article.create).toHaveBeenCalledTimes(1);
    expect(prisma._tx.article.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: 'Edited Article Title' }),
      }),
    );
  });

  it('skips grid cell creation when articleTempId does not map to a real article', async () => {
    const dataWithOrphanCell: SoaExtractedData = {
      ...extractedData,
      gridCells: [
        {
          articleTempId: 'tmp-nonexistent',
          columnName: 'study_design',
          value: 'Some value',
        },
      ],
    };

    const prisma = makePrisma({
      soaImport: {
        id: 'import-1',
        projectId: 'proj-1',
        status: 'REVIEW',
        sourceFileName: 'doc.pdf',
        extractedData: dataWithOrphanCell,
      },
    });
    const useCase = new ConfirmSoaImportUseCase(prisma);

    await useCase.execute({ importId: 'import-1', userId: 'user-1' });

    // Cell with unknown tempId should be silently skipped
    expect(prisma._tx.gridCell.create).not.toHaveBeenCalled();
  });

  it('skips claim-article link when articleTempId does not map to a real article', async () => {
    const dataWithOrphanLink: SoaExtractedData = {
      ...extractedData,
      claims: [
        {
          statementText: 'A claim with a missing article reference',
          thematicSectionKey: 'clinical_performance',
          articleTempIds: [TEMP_ID_1, 'tmp-ghost'],
        },
      ],
    };

    const prisma = makePrisma({
      soaImport: {
        id: 'import-1',
        projectId: 'proj-1',
        status: 'REVIEW',
        sourceFileName: 'doc.pdf',
        extractedData: dataWithOrphanLink,
      },
    });
    const useCase = new ConfirmSoaImportUseCase(prisma);

    await useCase.execute({ importId: 'import-1', userId: 'user-1' });

    // Only 1 valid link (TEMP_ID_1), the ghost is skipped
    expect(prisma._tx.claimArticleLink.create).toHaveBeenCalledTimes(1);
  });
});
