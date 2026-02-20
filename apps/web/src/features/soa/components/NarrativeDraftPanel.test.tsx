import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@apollo/client', () => ({
  gql: (str: TemplateStringsArray) => str[0],
}));

const mockUseMutation = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

import { NarrativeDraftPanel } from './NarrativeDraftPanel';

describe('NarrativeDraftPanel', () => {
  const mockGenerate = vi.fn().mockResolvedValue({
    data: {
      draftNarrative: {
        taskId: 'task-123',
      },
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockReturnValue([mockGenerate, { loading: false }]);
  });

  it('renders the narrative draft panel', () => {
    render(<NarrativeDraftPanel sectionId="sec-1" soaAnalysisId="soa-1" />);

    expect(screen.getByTestId('narrative-draft-panel')).toBeInTheDocument();
  });

  it('shows generate draft button initially', () => {
    render(<NarrativeDraftPanel sectionId="sec-1" soaAnalysisId="soa-1" />);

    expect(screen.getByTestId('generate-draft-btn')).toBeInTheDocument();
  });

  it('shows loading state when generating', () => {
    mockUseMutation.mockReturnValue([mockGenerate, { loading: true }]);

    render(<NarrativeDraftPanel sectionId="sec-1" soaAnalysisId="soa-1" />);

    expect(screen.getByTestId('draft-loading')).toBeInTheDocument();
  });

  it('shows task submitted message after generation', async () => {
    render(<NarrativeDraftPanel sectionId="sec-1" soaAnalysisId="soa-1" />);

    fireEvent.click(screen.getByTestId('generate-draft-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('draft-submitted')).toBeInTheDocument();
      expect(screen.getByTestId('draft-submitted')).toHaveTextContent('task-123');
    });
  });

  it('calls draftNarrative mutation with sectionId and soaAnalysisId', async () => {
    render(<NarrativeDraftPanel sectionId="sec-1" soaAnalysisId="soa-1" />);

    fireEvent.click(screen.getByTestId('generate-draft-btn'));

    await waitFor(() => {
      expect(mockGenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: { sectionId: 'sec-1', soaAnalysisId: 'soa-1' },
        }),
      );
    });
  });

  it('shows regenerate button after task is submitted', async () => {
    render(<NarrativeDraftPanel sectionId="sec-1" soaAnalysisId="soa-1" />);

    fireEvent.click(screen.getByTestId('generate-draft-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('regenerate-draft-btn')).toBeInTheDocument();
    });
  });

  it('disables generate button when locked', () => {
    render(<NarrativeDraftPanel sectionId="sec-1" soaAnalysisId="soa-1" locked />);

    expect(screen.getByTestId('generate-draft-btn')).toBeDisabled();
  });
});
