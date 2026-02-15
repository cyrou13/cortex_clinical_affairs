import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@apollo/client', () => ({
  gql: (str: TemplateStringsArray) => str[0],
}));

const mockUseQuery = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

import { ValidationDashboard } from './ValidationDashboard';

const mockStudyData = {
  validationStudy: {
    id: 'study-1',
    name: 'Performance Validation 2026',
    status: 'IN_PROGRESS',
    type: 'STANDALONE',
    soaAnalysis: {
      id: 'soa-1',
      name: 'Clinical SOA 2026',
    },
    protocol: {
      version: 2,
      status: 'APPROVED',
    },
    importCount: 3,
    results: {
      metCount: 4,
      totalCount: 6,
    },
    reports: [
      { id: 'r-1', type: 'VALIDATION_REPORT', generatedAt: '2026-02-14' },
    ],
  },
};

describe('ValidationDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dashboard with study name', () => {
    mockUseQuery.mockReturnValue({ data: mockStudyData, loading: false });
    render(<ValidationDashboard studyId="study-1" />);

    expect(screen.getByTestId('validation-dashboard')).toBeInTheDocument();
    expect(screen.getByText('Performance Validation 2026')).toBeInTheDocument();
  });

  it('displays status badge', () => {
    mockUseQuery.mockReturnValue({ data: mockStudyData, loading: false });
    render(<ValidationDashboard studyId="study-1" />);

    expect(screen.getByTestId('study-status')).toHaveTextContent('IN PROGRESS');
  });

  it('displays type badge', () => {
    mockUseQuery.mockReturnValue({ data: mockStudyData, loading: false });
    render(<ValidationDashboard studyId="study-1" />);

    expect(screen.getByTestId('study-type-badge')).toHaveTextContent('STANDALONE');
  });

  it('displays linked SOA reference', () => {
    mockUseQuery.mockReturnValue({ data: mockStudyData, loading: false });
    render(<ValidationDashboard studyId="study-1" />);

    expect(screen.getByTestId('soa-link')).toHaveTextContent('Clinical SOA 2026');
  });

  it('displays protocol version', () => {
    mockUseQuery.mockReturnValue({ data: mockStudyData, loading: false });
    render(<ValidationDashboard studyId="study-1" />);

    expect(screen.getByTestId('protocol-version')).toHaveTextContent('v2');
  });

  it('displays import count', () => {
    mockUseQuery.mockReturnValue({ data: mockStudyData, loading: false });
    render(<ValidationDashboard studyId="study-1" />);

    expect(screen.getByTestId('import-count')).toHaveTextContent('3');
  });

  it('displays results summary', () => {
    mockUseQuery.mockReturnValue({ data: mockStudyData, loading: false });
    render(<ValidationDashboard studyId="study-1" />);

    expect(screen.getByTestId('results-summary')).toHaveTextContent('4/6 met');
  });

  it('shows loading state', () => {
    mockUseQuery.mockReturnValue({ data: null, loading: true });
    render(<ValidationDashboard studyId="study-1" />);

    expect(screen.getByTestId('validation-loading')).toBeInTheDocument();
  });

  it('shows error state', () => {
    mockUseQuery.mockReturnValue({ data: null, loading: false, error: new Error('fail') });
    render(<ValidationDashboard studyId="study-1" />);

    expect(screen.getByTestId('validation-error')).toBeInTheDocument();
  });

  it('shows not found state', () => {
    mockUseQuery.mockReturnValue({ data: { validationStudy: null }, loading: false });
    render(<ValidationDashboard studyId="study-1" />);

    expect(screen.getByTestId('validation-not-found')).toBeInTheDocument();
  });

  it('displays reports list', () => {
    mockUseQuery.mockReturnValue({ data: mockStudyData, loading: false });
    render(<ValidationDashboard studyId="study-1" />);

    expect(screen.getByTestId('reports-list')).toBeInTheDocument();
    expect(screen.getByTestId('report-r-1')).toBeInTheDocument();
  });
});
