import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@apollo/client', () => ({
  gql: (str: TemplateStringsArray) => str[0],
}));

const mockUseQuery = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

import { ComparisonTable } from './ComparisonTable';

const mockComparisonData = {
  comparisonTable: {
    headers: ['Target Device', 'Similar Device A', 'Similar Device B'],
    rows: [
      { metricName: 'Accuracy', values: ['95.5%', '93.2%', '96.8%'] },
      { metricName: 'Response Time', values: ['1.2ms', '1.5ms', '1.1ms'] },
    ],
    metricNames: ['Accuracy', 'Response Time'],
  },
};

describe('ComparisonTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    mockUseQuery.mockReturnValue({ data: null, loading: true, error: null });
    render(<ComparisonTable soaAnalysisId="soa-1" />);

    expect(screen.getByTestId('comparison-loading')).toBeInTheDocument();
  });

  it('renders error state', () => {
    mockUseQuery.mockReturnValue({ data: null, loading: false, error: new Error('Failed') });
    render(<ComparisonTable soaAnalysisId="soa-1" />);

    expect(screen.getByTestId('comparison-error')).toBeInTheDocument();
  });

  it('renders empty state when no data', () => {
    mockUseQuery.mockReturnValue({ data: {}, loading: false, error: null });
    render(<ComparisonTable soaAnalysisId="soa-1" />);

    expect(screen.getByTestId('comparison-empty')).toBeInTheDocument();
  });

  it('renders table with headers', () => {
    mockUseQuery.mockReturnValue({ data: mockComparisonData, loading: false, error: null });
    render(<ComparisonTable soaAnalysisId="soa-1" />);

    expect(screen.getByTestId('comparison-table')).toBeInTheDocument();
    expect(screen.getByTestId('target-device-header')).toHaveTextContent('Target Device');
    expect(screen.getByTestId('similar-device-header-1')).toHaveTextContent('Similar Device A');
    expect(screen.getByTestId('similar-device-header-2')).toHaveTextContent('Similar Device B');
  });

  it('displays metric rows', () => {
    mockUseQuery.mockReturnValue({ data: mockComparisonData, loading: false, error: null });
    render(<ComparisonTable soaAnalysisId="soa-1" />);

    expect(screen.getByTestId('metric-row-0')).toBeInTheDocument();
    expect(screen.getByTestId('metric-row-1')).toBeInTheDocument();
    expect(screen.getByText('Accuracy')).toBeInTheDocument();
    expect(screen.getByText('Response Time')).toBeInTheDocument();
  });

  it('highlights target device column', () => {
    mockUseQuery.mockReturnValue({ data: mockComparisonData, loading: false, error: null });
    render(<ComparisonTable soaAnalysisId="soa-1" />);

    const targetHeader = screen.getByTestId('target-device-header');
    expect(targetHeader).toHaveClass('bg-blue-50');
  });
});
