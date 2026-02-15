import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@apollo/client', () => ({
  gql: (str: TemplateStringsArray) => str[0],
}));

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

import { ResultsMappingTable } from './ResultsMappingTable';

const mockResultsData = {
  resultsMapping: {
    endpoints: [
      {
        name: 'Sensitivity',
        protocolTarget: '>= 95%',
        soaBenchmark: '93%',
        resultValue: '96.2',
        ci95Lower: '94.1',
        ci95Upper: '98.3',
        status: 'MET',
      },
      {
        name: 'Specificity',
        protocolTarget: '>= 90%',
        soaBenchmark: '88%',
        resultValue: '85.5',
        ci95Lower: '82.0',
        ci95Upper: '89.0',
        status: 'NOT_MET',
      },
      {
        name: 'AUC',
        protocolTarget: '>= 0.85',
        soaBenchmark: '0.82',
        resultValue: null,
        ci95Lower: null,
        ci95Upper: null,
        status: 'PENDING',
      },
    ],
    summary: { metCount: 1, totalCount: 3 },
  },
};

describe('ResultsMappingTable', () => {
  const mockRecompute = vi.fn().mockResolvedValue({
    data: { recomputeResults: { studyId: 'study-1', status: 'COMPLETED' } },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockReturnValue([mockRecompute, { loading: false }]);
  });

  it('renders the results mapping', () => {
    mockUseQuery.mockReturnValue({ data: mockResultsData, loading: false });
    render(<ResultsMappingTable studyId="study-1" />);

    expect(screen.getByTestId('results-mapping')).toBeInTheDocument();
  });

  it('displays endpoint rows', () => {
    mockUseQuery.mockReturnValue({ data: mockResultsData, loading: false });
    render(<ResultsMappingTable studyId="study-1" />);

    expect(screen.getByTestId('endpoint-row-Sensitivity')).toBeInTheDocument();
    expect(screen.getByTestId('endpoint-row-Specificity')).toBeInTheDocument();
    expect(screen.getByTestId('endpoint-row-AUC')).toBeInTheDocument();
  });

  it('shows MET status badge', () => {
    mockUseQuery.mockReturnValue({ data: mockResultsData, loading: false });
    render(<ResultsMappingTable studyId="study-1" />);

    expect(screen.getByTestId('status-MET')).toBeInTheDocument();
    expect(screen.getByTestId('status-MET')).toHaveTextContent('MET');
  });

  it('shows NOT_MET status badge', () => {
    mockUseQuery.mockReturnValue({ data: mockResultsData, loading: false });
    render(<ResultsMappingTable studyId="study-1" />);

    expect(screen.getByTestId('status-NOT_MET')).toBeInTheDocument();
  });

  it('shows PENDING status badge', () => {
    mockUseQuery.mockReturnValue({ data: mockResultsData, loading: false });
    render(<ResultsMappingTable studyId="study-1" />);

    expect(screen.getByTestId('status-PENDING')).toBeInTheDocument();
  });

  it('displays summary bar', () => {
    mockUseQuery.mockReturnValue({ data: mockResultsData, loading: false });
    render(<ResultsMappingTable studyId="study-1" />);

    expect(screen.getByTestId('summary-bar')).toBeInTheDocument();
    expect(screen.getByTestId('met-count')).toHaveTextContent('1');
    expect(screen.getByTestId('total-count')).toHaveTextContent('3');
  });

  it('displays confidence intervals', () => {
    mockUseQuery.mockReturnValue({ data: mockResultsData, loading: false });
    render(<ResultsMappingTable studyId="study-1" />);

    expect(screen.getByText('[94.1, 98.3]')).toBeInTheDocument();
  });

  it('shows recompute button', () => {
    mockUseQuery.mockReturnValue({ data: mockResultsData, loading: false });
    render(<ResultsMappingTable studyId="study-1" />);

    expect(screen.getByTestId('recompute-btn')).toBeInTheDocument();
  });

  it('calls recompute mutation', async () => {
    mockUseQuery.mockReturnValue({ data: mockResultsData, loading: false });
    render(<ResultsMappingTable studyId="study-1" />);

    fireEvent.click(screen.getByTestId('recompute-btn'));

    await waitFor(() => {
      expect(mockRecompute).toHaveBeenCalledWith({ variables: { studyId: 'study-1' } });
    });
  });

  it('shows loading state', () => {
    mockUseQuery.mockReturnValue({ data: null, loading: true });
    render(<ResultsMappingTable studyId="study-1" />);

    expect(screen.getByTestId('results-loading')).toBeInTheDocument();
  });

  it('shows empty state', () => {
    mockUseQuery.mockReturnValue({ data: { resultsMapping: { endpoints: [], summary: { metCount: 0, totalCount: 0 } } }, loading: false });
    render(<ResultsMappingTable studyId="study-1" />);

    expect(screen.getByTestId('no-results')).toBeInTheDocument();
  });
});
