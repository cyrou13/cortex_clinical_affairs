import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithApollo, type MockedResponse } from '../../../test-utils/apollo-wrapper';
import { GET_RELEVANCE_THRESHOLDS } from '../graphql/queries';
import { CONFIGURE_RELEVANCE_THRESHOLDS } from '../graphql/mutations';
import { RelevanceThresholdConfig } from './RelevanceThresholdConfig';

function buildQueryMock(sessionId = 'sess-1'): MockedResponse {
  return {
    request: {
      query: GET_RELEVANCE_THRESHOLDS,
      variables: { sessionId },
    },
    result: {
      data: {
        relevanceThresholds: {
          likelyRelevantThreshold: 75,
          uncertainLowerThreshold: 40,
        },
      },
    },
  };
}

describe('RelevanceThresholdConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the threshold configuration', async () => {
    renderWithApollo(<RelevanceThresholdConfig sessionId="sess-1" />, [buildQueryMock()]);
    await screen.findByText('Relevance Thresholds');
    expect(screen.getByTestId('relevance-threshold-config')).toBeInTheDocument();
  });

  it('renders upper and lower threshold inputs', async () => {
    renderWithApollo(<RelevanceThresholdConfig sessionId="sess-1" />, [buildQueryMock()]);
    await screen.findByTestId('upper-threshold-input');
    expect(screen.getByTestId('lower-threshold-input')).toBeInTheDocument();
  });

  it('populates inputs from query data', async () => {
    renderWithApollo(<RelevanceThresholdConfig sessionId="sess-1" />, [buildQueryMock()]);
    await screen.findByTestId('upper-threshold-input');
    // Wait for the useEffect to populate from query data
    await waitFor(() => {
      expect(screen.getByTestId('upper-threshold-input')).toHaveValue(75);
    });
    expect(screen.getByTestId('lower-threshold-input')).toHaveValue(40);
  });

  it('renders the visual preview bar', async () => {
    renderWithApollo(<RelevanceThresholdConfig sessionId="sess-1" />, [buildQueryMock()]);
    await screen.findByTestId('threshold-preview');
    expect(screen.getByTestId('range-irrelevant')).toBeInTheDocument();
    expect(screen.getByTestId('range-uncertain')).toBeInTheDocument();
    expect(screen.getByTestId('range-relevant')).toBeInTheDocument();
  });

  it('renders range labels', async () => {
    renderWithApollo(<RelevanceThresholdConfig sessionId="sess-1" />, [buildQueryMock()]);
    await screen.findByText('Likely Irrelevant');
    expect(screen.getByText('Uncertain')).toBeInTheDocument();
    expect(screen.getByText('Likely Relevant')).toBeInTheDocument();
  });

  it('shows save button', async () => {
    renderWithApollo(<RelevanceThresholdConfig sessionId="sess-1" />, [buildQueryMock()]);
    await screen.findByTestId('save-thresholds-button');
  });

  it('disables save button when values have not changed', async () => {
    renderWithApollo(<RelevanceThresholdConfig sessionId="sess-1" />, [buildQueryMock()]);
    await screen.findByTestId('save-thresholds-button');
    // Wait for useEffect to set isDirty=false after data loads
    await waitFor(() => {
      expect(screen.getByTestId('save-thresholds-button')).toBeDisabled();
    });
  });

  it('enables save button when values change', async () => {
    renderWithApollo(<RelevanceThresholdConfig sessionId="sess-1" />, [buildQueryMock()]);
    await screen.findByTestId('upper-threshold-input');
    await waitFor(() => {
      expect(screen.getByTestId('upper-threshold-input')).toHaveValue(75);
    });
    fireEvent.change(screen.getByTestId('upper-threshold-input'), { target: { value: '80' } });
    expect(screen.getByTestId('save-thresholds-button')).not.toBeDisabled();
  });

  it('shows validation error when lower >= upper', async () => {
    renderWithApollo(<RelevanceThresholdConfig sessionId="sess-1" />, [buildQueryMock()]);
    await screen.findByTestId('lower-threshold-input');
    await waitFor(() => {
      expect(screen.getByTestId('lower-threshold-input')).toHaveValue(40);
    });
    fireEvent.change(screen.getByTestId('lower-threshold-input'), { target: { value: '80' } });
    expect(screen.getByTestId('threshold-validation-errors')).toBeInTheDocument();
    expect(
      screen.getByText('Lower threshold must be less than upper threshold'),
    ).toBeInTheDocument();
  });

  it('shows validation error when upper is out of range', async () => {
    renderWithApollo(<RelevanceThresholdConfig sessionId="sess-1" />, [buildQueryMock()]);
    await screen.findByTestId('upper-threshold-input');
    await waitFor(() => {
      expect(screen.getByTestId('upper-threshold-input')).toHaveValue(75);
    });
    fireEvent.change(screen.getByTestId('upper-threshold-input'), { target: { value: '150' } });
    expect(screen.getByTestId('threshold-validation-errors')).toBeInTheDocument();
    expect(screen.getByText('Upper threshold must be between 0 and 100')).toBeInTheDocument();
  });

  it('shows validation error when lower is out of range', async () => {
    renderWithApollo(<RelevanceThresholdConfig sessionId="sess-1" />, [buildQueryMock()]);
    await screen.findByTestId('lower-threshold-input');
    await waitFor(() => {
      expect(screen.getByTestId('lower-threshold-input')).toHaveValue(40);
    });
    fireEvent.change(screen.getByTestId('lower-threshold-input'), { target: { value: '-5' } });
    expect(screen.getByTestId('threshold-validation-errors')).toBeInTheDocument();
    expect(screen.getByText('Lower threshold must be between 0 and 100')).toBeInTheDocument();
  });

  it('disables save button when validation fails', async () => {
    renderWithApollo(<RelevanceThresholdConfig sessionId="sess-1" />, [buildQueryMock()]);
    await screen.findByTestId('lower-threshold-input');
    await waitFor(() => {
      expect(screen.getByTestId('lower-threshold-input')).toHaveValue(40);
    });
    fireEvent.change(screen.getByTestId('lower-threshold-input'), { target: { value: '90' } });
    expect(screen.getByTestId('save-thresholds-button')).toBeDisabled();
  });

  it('calls mutation on save', async () => {
    const saveMock: MockedResponse = {
      request: {
        query: CONFIGURE_RELEVANCE_THRESHOLDS,
        variables: {
          sessionId: 'sess-1',
          likelyRelevantThreshold: 80,
          uncertainLowerThreshold: 40,
        },
      },
      result: {
        data: {
          configureRelevanceThresholds: {
            likelyRelevantThreshold: 80,
            uncertainLowerThreshold: 40,
          },
        },
      },
    };
    renderWithApollo(<RelevanceThresholdConfig sessionId="sess-1" />, [
      buildQueryMock(),
      saveMock,
      buildQueryMock(),
    ]);
    await screen.findByTestId('upper-threshold-input');
    await waitFor(() => {
      expect(screen.getByTestId('upper-threshold-input')).toHaveValue(75);
    });
    fireEvent.change(screen.getByTestId('upper-threshold-input'), { target: { value: '80' } });
    fireEvent.click(screen.getByTestId('save-thresholds-button'));

    // After saving, isDirty resets so button should become disabled again
    await waitFor(() => {
      expect(screen.getByTestId('save-thresholds-button')).toBeDisabled();
    });
  });

  it('shows loading state', () => {
    renderWithApollo(<RelevanceThresholdConfig sessionId="sess-1" />, []);
    expect(screen.getByText('Loading thresholds...')).toBeInTheDocument();
  });

  it('uses default values when no data', async () => {
    const noDataMock: MockedResponse = {
      request: {
        query: GET_RELEVANCE_THRESHOLDS,
        variables: { sessionId: 'sess-1' },
      },
      result: {
        data: { relevanceThresholds: null },
      },
    };
    renderWithApollo(<RelevanceThresholdConfig sessionId="sess-1" />, [noDataMock]);
    await screen.findByTestId('upper-threshold-input');
    expect(screen.getByTestId('upper-threshold-input')).toHaveValue(75);
    expect(screen.getByTestId('lower-threshold-input')).toHaveValue(40);
  });

  it('fetches thresholds for the given sessionId', async () => {
    const mocks: MockedResponse[] = [buildQueryMock('sess-42')];
    renderWithApollo(<RelevanceThresholdConfig sessionId="sess-42" />, mocks);
    // If the variables don't match, MockedProvider won't resolve data
    await screen.findByText('Relevance Thresholds');
  });
});
