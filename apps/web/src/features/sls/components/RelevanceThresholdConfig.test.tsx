import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@apollo/client', () => ({
  gql: (str: TemplateStringsArray) => str[0],
}));

const mockUseQuery = vi.fn();
const mockConfigureThresholds = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: () => [mockConfigureThresholds, { loading: false }],
}));

import { RelevanceThresholdConfig } from './RelevanceThresholdConfig';

describe('RelevanceThresholdConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfigureThresholds.mockResolvedValue({
      data: {
        configureRelevanceThresholds: {
          likelyRelevantThreshold: 75,
          uncertainLowerThreshold: 40,
        },
      },
    });
    mockUseQuery.mockReturnValue({
      data: {
        relevanceThresholds: {
          likelyRelevantThreshold: 75,
          uncertainLowerThreshold: 40,
        },
      },
      loading: false,
    });
  });

  it('renders the threshold configuration', () => {
    render(<RelevanceThresholdConfig sessionId="sess-1" />);
    expect(screen.getByTestId('relevance-threshold-config')).toBeInTheDocument();
    expect(screen.getByText('Relevance Thresholds')).toBeInTheDocument();
  });

  it('renders upper and lower threshold inputs', () => {
    render(<RelevanceThresholdConfig sessionId="sess-1" />);
    expect(screen.getByTestId('upper-threshold-input')).toBeInTheDocument();
    expect(screen.getByTestId('lower-threshold-input')).toBeInTheDocument();
  });

  it('populates inputs from query data', () => {
    render(<RelevanceThresholdConfig sessionId="sess-1" />);
    expect(screen.getByTestId('upper-threshold-input')).toHaveValue(75);
    expect(screen.getByTestId('lower-threshold-input')).toHaveValue(40);
  });

  it('renders the visual preview bar', () => {
    render(<RelevanceThresholdConfig sessionId="sess-1" />);
    expect(screen.getByTestId('threshold-preview')).toBeInTheDocument();
    expect(screen.getByTestId('range-irrelevant')).toBeInTheDocument();
    expect(screen.getByTestId('range-uncertain')).toBeInTheDocument();
    expect(screen.getByTestId('range-relevant')).toBeInTheDocument();
  });

  it('renders range labels', () => {
    render(<RelevanceThresholdConfig sessionId="sess-1" />);
    expect(screen.getByText('Likely Irrelevant')).toBeInTheDocument();
    expect(screen.getByText('Uncertain')).toBeInTheDocument();
    expect(screen.getByText('Likely Relevant')).toBeInTheDocument();
  });

  it('shows save button', () => {
    render(<RelevanceThresholdConfig sessionId="sess-1" />);
    expect(screen.getByTestId('save-thresholds-button')).toBeInTheDocument();
  });

  it('disables save button when values have not changed', () => {
    render(<RelevanceThresholdConfig sessionId="sess-1" />);
    expect(screen.getByTestId('save-thresholds-button')).toBeDisabled();
  });

  it('enables save button when values change', () => {
    render(<RelevanceThresholdConfig sessionId="sess-1" />);
    fireEvent.change(screen.getByTestId('upper-threshold-input'), { target: { value: '80' } });
    expect(screen.getByTestId('save-thresholds-button')).not.toBeDisabled();
  });

  it('shows validation error when lower >= upper', () => {
    render(<RelevanceThresholdConfig sessionId="sess-1" />);
    fireEvent.change(screen.getByTestId('lower-threshold-input'), { target: { value: '80' } });
    expect(screen.getByTestId('threshold-validation-errors')).toBeInTheDocument();
    expect(screen.getByText('Lower threshold must be less than upper threshold')).toBeInTheDocument();
  });

  it('shows validation error when upper is out of range', () => {
    render(<RelevanceThresholdConfig sessionId="sess-1" />);
    fireEvent.change(screen.getByTestId('upper-threshold-input'), { target: { value: '150' } });
    expect(screen.getByTestId('threshold-validation-errors')).toBeInTheDocument();
    expect(screen.getByText('Upper threshold must be between 0 and 100')).toBeInTheDocument();
  });

  it('shows validation error when lower is out of range', () => {
    render(<RelevanceThresholdConfig sessionId="sess-1" />);
    fireEvent.change(screen.getByTestId('lower-threshold-input'), { target: { value: '-5' } });
    expect(screen.getByTestId('threshold-validation-errors')).toBeInTheDocument();
    expect(screen.getByText('Lower threshold must be between 0 and 100')).toBeInTheDocument();
  });

  it('disables save button when validation fails', () => {
    render(<RelevanceThresholdConfig sessionId="sess-1" />);
    fireEvent.change(screen.getByTestId('lower-threshold-input'), { target: { value: '90' } });
    expect(screen.getByTestId('save-thresholds-button')).toBeDisabled();
  });

  it('calls mutation on save', async () => {
    render(<RelevanceThresholdConfig sessionId="sess-1" />);
    fireEvent.change(screen.getByTestId('upper-threshold-input'), { target: { value: '80' } });
    fireEvent.click(screen.getByTestId('save-thresholds-button'));

    await waitFor(() => {
      expect(mockConfigureThresholds).toHaveBeenCalledWith({
        variables: {
          sessionId: 'sess-1',
          likelyRelevantThreshold: 80,
          uncertainLowerThreshold: 40,
        },
      });
    });
  });

  it('shows loading state', () => {
    mockUseQuery.mockReturnValue({ data: null, loading: true });
    render(<RelevanceThresholdConfig sessionId="sess-1" />);
    expect(screen.getByText('Loading thresholds...')).toBeInTheDocument();
  });

  it('uses default values when no data', () => {
    mockUseQuery.mockReturnValue({ data: null, loading: false });
    render(<RelevanceThresholdConfig sessionId="sess-1" />);
    expect(screen.getByTestId('upper-threshold-input')).toHaveValue(75);
    expect(screen.getByTestId('lower-threshold-input')).toHaveValue(40);
  });

  it('passes sessionId to useQuery', () => {
    render(<RelevanceThresholdConfig sessionId="sess-42" />);
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ variables: { sessionId: 'sess-42' } }),
    );
  });
});
