import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@apollo/client', () => ({
  gql: (str: TemplateStringsArray) => str[0],
}));

const mockUseQuery = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

import { ExtractionProgressPanel } from './ExtractionProgressPanel';

const progressData = {
  extractionProgress: {
    total: 50,
    extracted: 20,
    reviewed: 15,
    flagged: 5,
    pending: 10,
  },
};

const emptyProgressData = {
  extractionProgress: {
    total: 0,
    extracted: 0,
    reviewed: 0,
    flagged: 0,
    pending: 0,
  },
};

describe('ExtractionProgressPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state', () => {
    mockUseQuery.mockReturnValue({ data: null, loading: true });
    render(<ExtractionProgressPanel soaAnalysisId="soa-1" />);

    expect(screen.getByTestId('extraction-progress-loading')).toBeInTheDocument();
  });

  it('renders the panel with progress data', () => {
    mockUseQuery.mockReturnValue({ data: progressData, loading: false });
    render(<ExtractionProgressPanel soaAnalysisId="soa-1" />);

    expect(screen.getByTestId('extraction-progress-panel')).toBeInTheDocument();
  });

  it('displays correct counts', () => {
    mockUseQuery.mockReturnValue({ data: progressData, loading: false });
    render(<ExtractionProgressPanel soaAnalysisId="soa-1" />);

    expect(screen.getByTestId('count-extracted')).toHaveTextContent('20');
    expect(screen.getByTestId('count-reviewed')).toHaveTextContent('15');
    expect(screen.getByTestId('count-flagged')).toHaveTextContent('5');
    expect(screen.getByTestId('count-pending')).toHaveTextContent('10');
  });

  it('renders all filter buttons', () => {
    mockUseQuery.mockReturnValue({ data: progressData, loading: false });
    render(<ExtractionProgressPanel soaAnalysisId="soa-1" />);

    expect(screen.getByTestId('filter-btn-ALL')).toBeInTheDocument();
    expect(screen.getByTestId('filter-btn-PENDING')).toBeInTheDocument();
    expect(screen.getByTestId('filter-btn-EXTRACTED')).toBeInTheDocument();
    expect(screen.getByTestId('filter-btn-REVIEWED')).toBeInTheDocument();
    expect(screen.getByTestId('filter-btn-FLAGGED')).toBeInTheDocument();
  });

  it('renders progress bar', () => {
    mockUseQuery.mockReturnValue({ data: progressData, loading: false });
    render(<ExtractionProgressPanel soaAnalysisId="soa-1" />);

    expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
  });

  it('displays correct percentage', () => {
    mockUseQuery.mockReturnValue({ data: progressData, loading: false });
    render(<ExtractionProgressPanel soaAnalysisId="soa-1" />);

    // (20 extracted + 15 reviewed) / 50 total = 70%
    expect(screen.getByTestId('progress-percentage')).toHaveTextContent('70%');
  });

  it('shows empty state when total is zero', () => {
    mockUseQuery.mockReturnValue({ data: emptyProgressData, loading: false });
    render(<ExtractionProgressPanel soaAnalysisId="soa-1" />);

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByTestId('empty-state')).toHaveTextContent('No articles to extract yet.');
  });

  it('displays total article count', () => {
    mockUseQuery.mockReturnValue({ data: progressData, loading: false });
    render(<ExtractionProgressPanel soaAnalysisId="soa-1" />);

    expect(screen.getByTestId('total-count')).toHaveTextContent('50 articles');
  });
});
