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
  deviceComparison: {
    targetDevice: {
      id: 'device-1',
      name: 'Target Device',
      manufacturer: 'Acme Corp',
    },
    similarDevices: [
      {
        id: 'device-2',
        name: 'Similar Device A',
        manufacturer: 'TechMed',
      },
      {
        id: 'device-3',
        name: 'Similar Device B',
        manufacturer: 'MediTech',
      },
    ],
    metrics: [
      {
        name: 'Accuracy',
        category: 'Performance',
        values: [
          { deviceId: 'device-1', value: '95.5', unit: '%' },
          { deviceId: 'device-2', value: '93.2', unit: '%' },
          { deviceId: 'device-3', value: '96.8', unit: '%' },
        ],
      },
      {
        name: 'Response Time',
        category: 'Performance',
        values: [
          { deviceId: 'device-1', value: '1.2', unit: 'ms' },
          { deviceId: 'device-2', value: '1.5', unit: 'ms' },
          { deviceId: 'device-3', value: '1.1', unit: 'ms' },
        ],
      },
    ],
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

  it('renders comparison table with devices and metrics', () => {
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

  it('shows variance indicators for similar devices', () => {
    mockUseQuery.mockReturnValue({ data: mockComparisonData, loading: false, error: null });
    render(<ComparisonTable soaAnalysisId="soa-1" />);

    const varianceIcons = screen.getAllByTestId('variance-icon');
    expect(varianceIcons.length).toBeGreaterThan(0);
  });

  it('highlights target device column', () => {
    mockUseQuery.mockReturnValue({ data: mockComparisonData, loading: false, error: null });
    render(<ComparisonTable soaAnalysisId="soa-1" />);

    const targetHeader = screen.getByTestId('target-device-header');
    expect(targetHeader).toHaveClass('bg-blue-50');
  });
});
