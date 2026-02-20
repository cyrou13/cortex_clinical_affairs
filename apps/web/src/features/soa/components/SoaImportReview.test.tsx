import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@apollo/client', () => ({
  gql: (str: TemplateStringsArray) => str[0],
}));

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

const mockNavigate = vi.fn();

vi.mock('../../../router', () => ({
  navigate: (...args: unknown[]) => mockNavigate(...args),
}));

import { SoaImportReview } from './SoaImportReview';

const mockExtractedData = {
  soaType: 'CLINICAL',
  articles: [
    {
      tempId: 'a1',
      title: 'Article 1',
      authors: 'Smith J',
      publicationYear: 2022,
      doi: null,
      pmid: null,
      journal: 'Lancet',
    },
    {
      tempId: 'a2',
      title: 'Article 2',
      authors: 'Doe A',
      publicationYear: 2023,
      doi: '10.1234/x',
      pmid: '12345',
      journal: 'NEJM',
    },
  ],
  sections: [
    {
      sectionKey: 'CLINICAL_1',
      title: 'Scope & Objectives',
      orderIndex: 0,
      narrativeContent: 'Some content.',
    },
    { sectionKey: 'CLINICAL_2', title: 'Clinical Background', orderIndex: 1, narrativeContent: '' },
  ],
  gridColumns: [],
  gridCells: [],
  claims: [
    {
      statementText: 'Claim A',
      thematicSectionKey: 'S1',
      articleTempIds: ['a1'],
      sourceQuote: null,
    },
  ],
  similarDevices: [],
  slsSessions: [
    {
      type: 'SOA_CLINICAL',
      name: 'Clinical literature search',
      scopeFields: { population: 'Adult patients', intervention: 'Device X' },
      queries: [
        {
          name: 'Primary search',
          queryString: '(device X) AND safety',
          databases: ['PubMed', 'Embase'],
          dateFrom: '2015-01-01',
          dateTo: '2024-12-31',
        },
      ],
      exclusionCodes: [
        { code: 'E1', label: 'Animal study', shortCode: 'E1', description: 'Non-human' },
        { code: 'E2', label: 'Non-English', shortCode: 'E2' },
      ],
      articleTempIds: ['a1', 'a2'],
    },
  ],
};

const mockGapReport = {
  summary: { totalGaps: 2, highCount: 1, mediumCount: 1, lowCount: 0, infoCount: 0 },
  items: [
    {
      severity: 'HIGH',
      category: 'Missing data',
      description: 'Section 3 incomplete',
      details: null,
      count: null,
    },
    {
      severity: 'MEDIUM',
      category: 'Quality',
      description: 'Low confidence cells',
      details: 'Review recommended',
      count: 5,
    },
  ],
};

const mockImportReview = {
  id: 'import-1',
  projectId: 'p-1',
  status: 'REVIEW',
  sourceFileName: 'soa-2024.pdf',
  sourceFormat: 'PDF',
  extractedData: mockExtractedData,
  gapReport: mockGapReport,
  taskId: 'task-1',
  soaAnalysisId: null,
};

describe('SoaImportReview', () => {
  const mockConfirm = vi.fn();
  const mockCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockImplementation((query: unknown) => {
      const queryStr = String(query);
      if (queryStr.includes('confirmSoaImport') || queryStr.includes('ConfirmSoaImport')) {
        return [mockConfirm, { loading: false }];
      }
      return [mockCancel, { loading: false }];
    });
  });

  it('shows loading state when query is loading', () => {
    mockUseQuery.mockReturnValue({ data: null, loading: true, error: null });
    mockUseMutation.mockReturnValue([mockConfirm, { loading: false }]);

    render(<SoaImportReview importId="import-1" projectId="p-1" />);
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('shows error state when query fails', () => {
    mockUseQuery.mockReturnValue({ data: null, loading: false, error: new Error('Network error') });
    mockUseMutation.mockReturnValue([mockConfirm, { loading: false }]);

    render(<SoaImportReview importId="import-1" projectId="p-1" />);
    expect(screen.getByTestId('error')).toBeInTheDocument();
    expect(screen.getByTestId('error')).toHaveTextContent('Network error');
  });

  it('shows not found state when import is null', () => {
    mockUseQuery.mockReturnValue({ data: { soaImport: null }, loading: false, error: null });
    mockUseMutation.mockReturnValue([mockConfirm, { loading: false }]);

    render(<SoaImportReview importId="import-1" projectId="p-1" />);
    expect(screen.getByTestId('not-found')).toBeInTheDocument();
  });

  it('shows processing state when status is PROCESSING', () => {
    mockUseQuery.mockReturnValue({
      data: {
        soaImport: {
          ...mockImportReview,
          status: 'PROCESSING',
          extractedData: null,
          gapReport: null,
        },
      },
      loading: false,
      error: null,
    });
    mockUseMutation.mockReturnValue([mockConfirm, { loading: false }]);

    render(<SoaImportReview importId="import-1" projectId="p-1" />);
    expect(screen.getByTestId('processing')).toBeInTheDocument();
    expect(screen.getByTestId('processing')).toHaveTextContent('Extraction en cours');
  });

  it('shows source file name in processing state', () => {
    mockUseQuery.mockReturnValue({
      data: {
        soaImport: {
          ...mockImportReview,
          status: 'PROCESSING',
          extractedData: null,
          gapReport: null,
        },
      },
      loading: false,
      error: null,
    });
    mockUseMutation.mockReturnValue([mockConfirm, { loading: false }]);

    render(<SoaImportReview importId="import-1" projectId="p-1" />);
    expect(screen.getByTestId('processing')).toHaveTextContent('soa-2024.pdf');
  });

  it('shows failed state when status is FAILED', () => {
    mockUseQuery.mockReturnValue({
      data: {
        soaImport: { ...mockImportReview, status: 'FAILED', extractedData: null, gapReport: null },
      },
      loading: false,
      error: null,
    });
    mockUseMutation.mockReturnValue([mockConfirm, { loading: false }]);

    render(<SoaImportReview importId="import-1" projectId="p-1" />);
    expect(screen.getByTestId('failed')).toBeInTheDocument();
    expect(screen.getByTestId('failed')).toHaveTextContent("L'extraction a échoué");
  });

  it('shows confirmed state when status is CONFIRMED', () => {
    mockUseQuery.mockReturnValue({
      data: {
        soaImport: {
          ...mockImportReview,
          status: 'CONFIRMED',
          soaAnalysisId: 'soa-99',
          extractedData: null,
          gapReport: null,
        },
      },
      loading: false,
      error: null,
    });
    mockUseMutation.mockReturnValue([mockConfirm, { loading: false }]);

    render(<SoaImportReview importId="import-1" projectId="p-1" />);
    expect(screen.getByTestId('confirmed')).toBeInTheDocument();
    expect(screen.getByTestId('confirmed')).toHaveTextContent('Import confirmé');
  });

  it('shows review UI with tabs when status is REVIEW', () => {
    mockUseQuery.mockReturnValue({
      data: { soaImport: mockImportReview },
      loading: false,
      error: null,
    });

    render(<SoaImportReview importId="import-1" projectId="p-1" />);
    expect(screen.getByTestId('soa-import-review')).toBeInTheDocument();
  });

  it('renders all 7 tab buttons in REVIEW state', () => {
    mockUseQuery.mockReturnValue({
      data: { soaImport: mockImportReview },
      loading: false,
      error: null,
    });

    render(<SoaImportReview importId="import-1" projectId="p-1" />);
    expect(screen.getByTestId('tab-sessions')).toBeInTheDocument();
    expect(screen.getByTestId('tab-articles')).toBeInTheDocument();
    expect(screen.getByTestId('tab-sections')).toBeInTheDocument();
    expect(screen.getByTestId('tab-grid')).toBeInTheDocument();
    expect(screen.getByTestId('tab-claims')).toBeInTheDocument();
    expect(screen.getByTestId('tab-devices')).toBeInTheDocument();
    expect(screen.getByTestId('tab-gaps')).toBeInTheDocument();
  });

  it('shows sessions tab content by default', () => {
    mockUseQuery.mockReturnValue({
      data: { soaImport: mockImportReview },
      loading: false,
      error: null,
    });

    render(<SoaImportReview importId="import-1" projectId="p-1" />);
    expect(screen.getByTestId('sessions-tab')).toBeInTheDocument();
    expect(screen.queryByTestId('articles-tab')).not.toBeInTheDocument();
  });

  it('renders session scope fields, queries, and exclusion codes', () => {
    mockUseQuery.mockReturnValue({
      data: { soaImport: mockImportReview },
      loading: false,
      error: null,
    });

    render(<SoaImportReview importId="import-1" projectId="p-1" />);
    // Session badge
    expect(screen.getByTestId('session-badge-0')).toHaveTextContent('Clinical');
    // Scope fields
    expect(screen.getByTestId('session-scope-0')).toBeInTheDocument();
    expect(screen.getByTestId('session-scope-0')).toHaveTextContent('population');
    expect(screen.getByTestId('session-scope-0')).toHaveTextContent('Adult patients');
    // Queries
    expect(screen.getByTestId('session-queries-0')).toBeInTheDocument();
    expect(screen.getByTestId('session-queries-0')).toHaveTextContent('Primary search');
    expect(screen.getByTestId('session-queries-0')).toHaveTextContent('(device X) AND safety');
    expect(screen.getByTestId('session-queries-0')).toHaveTextContent('PubMed');
    // Exclusion codes
    expect(screen.getByTestId('session-exclusions-0')).toBeInTheDocument();
    expect(screen.getByTestId('session-exclusions-0')).toHaveTextContent('E1: Animal study');
    expect(screen.getByTestId('session-exclusions-0')).toHaveTextContent('E2: Non-English');
  });

  it('switches to sections tab on click', () => {
    mockUseQuery.mockReturnValue({
      data: { soaImport: mockImportReview },
      loading: false,
      error: null,
    });

    render(<SoaImportReview importId="import-1" projectId="p-1" />);
    fireEvent.click(screen.getByTestId('tab-sections'));
    expect(screen.getByTestId('sections-tab')).toBeInTheDocument();
    expect(screen.queryByTestId('sessions-tab')).not.toBeInTheDocument();
  });

  it('switches to claims tab on click', () => {
    mockUseQuery.mockReturnValue({
      data: { soaImport: mockImportReview },
      loading: false,
      error: null,
    });

    render(<SoaImportReview importId="import-1" projectId="p-1" />);
    fireEvent.click(screen.getByTestId('tab-claims'));
    expect(screen.getByTestId('claims-tab')).toBeInTheDocument();
  });

  it('shows stats bar with session, article and section counts', () => {
    mockUseQuery.mockReturnValue({
      data: { soaImport: mockImportReview },
      loading: false,
      error: null,
    });

    render(<SoaImportReview importId="import-1" projectId="p-1" />);
    expect(screen.getByTestId('stats-bar')).toBeInTheDocument();
    expect(screen.getByTestId('stats-bar')).toHaveTextContent('1 sessions');
    expect(screen.getByTestId('stats-bar')).toHaveTextContent('2 articles');
    expect(screen.getByTestId('stats-bar')).toHaveTextContent('2 sections');
  });

  it('shows confirm and cancel buttons in REVIEW state', () => {
    mockUseQuery.mockReturnValue({
      data: { soaImport: mockImportReview },
      loading: false,
      error: null,
    });

    render(<SoaImportReview importId="import-1" projectId="p-1" />);
    expect(screen.getByTestId('confirm-import')).toBeInTheDocument();
    expect(screen.getByTestId('cancel-import')).toBeInTheDocument();
  });

  it('calls confirm mutation on confirm button click', () => {
    mockUseQuery.mockReturnValue({
      data: { soaImport: mockImportReview },
      loading: false,
      error: null,
    });
    // First call = confirmSoaImport, second call = cancelSoaImport
    let callCount = 0;
    mockUseMutation.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return [mockConfirm, { loading: false }];
      return [mockCancel, { loading: false }];
    });

    render(<SoaImportReview importId="import-1" projectId="p-1" />);
    fireEvent.click(screen.getByTestId('confirm-import'));

    expect(mockConfirm).toHaveBeenCalledWith({ variables: { importId: 'import-1' } });
  });

  it('calls cancel mutation on cancel button click', () => {
    mockUseQuery.mockReturnValue({
      data: { soaImport: mockImportReview },
      loading: false,
      error: null,
    });
    let callCount = 0;
    mockUseMutation.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return [mockConfirm, { loading: false }];
      return [mockCancel, { loading: false }];
    });

    render(<SoaImportReview importId="import-1" projectId="p-1" />);
    fireEvent.click(screen.getByTestId('cancel-import'));

    expect(mockCancel).toHaveBeenCalledWith({ variables: { importId: 'import-1' } });
  });

  it('navigates to SOA page when confirm mutation completes', () => {
    mockUseQuery.mockReturnValue({
      data: { soaImport: mockImportReview },
      loading: false,
      error: null,
    });

    let capturedOnCompleted: ((data: unknown) => void) | undefined;
    let callCount = 0;
    mockUseMutation.mockImplementation(
      (_query: unknown, opts?: { onCompleted?: (data: unknown) => void }) => {
        callCount++;
        if (callCount === 1) {
          capturedOnCompleted = opts?.onCompleted;
          return [mockConfirm, { loading: false }];
        }
        return [mockCancel, { loading: false }];
      },
    );

    render(<SoaImportReview importId="import-1" projectId="p-1" />);

    if (capturedOnCompleted) {
      capturedOnCompleted({ confirmSoaImport: { soaAnalysisId: 'soa-99' } });
      expect(mockNavigate).toHaveBeenCalledWith('/projects/p-1/soa/soa-99');
    }
  });

  it('navigates to SOA list when cancel mutation completes', () => {
    mockUseQuery.mockReturnValue({
      data: { soaImport: mockImportReview },
      loading: false,
      error: null,
    });

    let capturedOnCompleted: ((data: unknown) => void) | undefined;
    let callCount = 0;
    mockUseMutation.mockImplementation(
      (_query: unknown, opts?: { onCompleted?: (data: unknown) => void }) => {
        callCount++;
        if (callCount === 1) {
          return [mockConfirm, { loading: false }];
        }
        capturedOnCompleted = opts?.onCompleted;
        return [mockCancel, { loading: false }];
      },
    );

    render(<SoaImportReview importId="import-1" projectId="p-1" />);

    if (capturedOnCompleted) {
      capturedOnCompleted({});
      expect(mockNavigate).toHaveBeenCalledWith('/projects/p-1/soa');
    }
  });
});
