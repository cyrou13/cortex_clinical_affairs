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
      generateNarrativeDraft: {
        draftId: 'draft-1',
        content: 'This is the AI-generated narrative draft content for the clinical evaluation.',
        status: 'GENERATED',
      },
    },
  });
  const mockAccept = vi.fn().mockResolvedValue({
    data: { acceptNarrativeDraft: { sectionId: 'sec-1', status: 'ACCEPTED' } },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    const mutationReturns = [
      [mockGenerate, { loading: false }],
      [mockAccept, { loading: false }],
    ];
    let callIndex = 0;
    mockUseMutation.mockImplementation(() => {
      const result = mutationReturns[callIndex % mutationReturns.length];
      callIndex++;
      return result;
    });
  });

  it('renders the narrative draft panel', () => {
    render(<NarrativeDraftPanel sectionId="sec-1" />);

    expect(screen.getByTestId('narrative-draft-panel')).toBeInTheDocument();
  });

  it('shows generate draft button initially', () => {
    render(<NarrativeDraftPanel sectionId="sec-1" />);

    expect(screen.getByTestId('generate-draft-btn')).toBeInTheDocument();
  });

  it('shows loading state when generating', () => {
    const mutationReturns = [
      [mockGenerate, { loading: true }],
      [mockAccept, { loading: false }],
    ];
    let callIndex = 0;
    mockUseMutation.mockImplementation(() => {
      const result = mutationReturns[callIndex % mutationReturns.length];
      callIndex++;
      return result;
    });

    render(<NarrativeDraftPanel sectionId="sec-1" />);

    expect(screen.getByTestId('draft-loading')).toBeInTheDocument();
  });

  it('shows draft preview after generation', async () => {
    render(<NarrativeDraftPanel sectionId="sec-1" />);

    fireEvent.click(screen.getByTestId('generate-draft-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('draft-preview')).toBeInTheDocument();
      expect(screen.getByTestId('draft-preview')).toHaveTextContent(
        'This is the AI-generated narrative draft content',
      );
    });
  });

  it('shows accept and edit buttons after generation', async () => {
    render(<NarrativeDraftPanel sectionId="sec-1" />);

    fireEvent.click(screen.getByTestId('generate-draft-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('accept-draft-btn')).toBeInTheDocument();
      expect(screen.getByTestId('edit-draft-btn')).toBeInTheDocument();
    });
  });

  it('calls accept mutation on accept', async () => {
    render(<NarrativeDraftPanel sectionId="sec-1" />);

    fireEvent.click(screen.getByTestId('generate-draft-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('accept-draft-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('accept-draft-btn'));

    await waitFor(() => {
      expect(mockAccept).toHaveBeenCalledWith(
        expect.objectContaining({ variables: { draftId: 'draft-1' } }),
      );
    });
  });

  it('disables generate button when locked', () => {
    render(<NarrativeDraftPanel sectionId="sec-1" locked />);

    expect(screen.getByTestId('generate-draft-btn')).toBeDisabled();
  });
});
