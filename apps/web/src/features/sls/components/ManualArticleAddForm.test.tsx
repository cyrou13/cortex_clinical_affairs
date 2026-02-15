import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

vi.mock('@apollo/client', () => ({
  gql: (str: TemplateStringsArray) => str[0],
}));

const mockUseMutation = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

import { ManualArticleAddForm } from './ManualArticleAddForm';

describe('ManualArticleAddForm', () => {
  const mockMutate = vi.fn().mockResolvedValue({
    data: { addManualArticle: { articleId: 'art-new', title: 'Test', status: 'PENDING' } },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockReturnValue([mockMutate, { loading: false }]);
  });

  it('renders upload step initially', () => {
    render(<ManualArticleAddForm sessionId="s-1" />);

    expect(screen.getByTestId('manual-article-form')).toBeInTheDocument();
    expect(screen.getByTestId('manual-upload-zone')).toBeInTheDocument();
  });

  it('shows file input for PDF', () => {
    render(<ManualArticleAddForm sessionId="s-1" />);

    expect(screen.getByTestId('manual-file-input')).toBeInTheDocument();
  });

  it('shows extracting state on file upload', async () => {
    vi.useFakeTimers();
    render(<ManualArticleAddForm sessionId="s-1" />);

    const file = new File(['%PDF'], 'test.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByTestId('manual-file-input'), { target: { files: [file] } });

    expect(screen.getByTestId('extracting-label')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('shows edit form after extraction', async () => {
    vi.useFakeTimers();
    render(<ManualArticleAddForm sessionId="s-1" />);

    const file = new File(['%PDF'], 'test.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByTestId('manual-file-input'), { target: { files: [file] } });

    await act(async () => { vi.advanceTimersByTime(1100); });

    expect(screen.getByTestId('metadata-title')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('renders metadata fields in edit step', async () => {
    vi.useFakeTimers();
    render(<ManualArticleAddForm sessionId="s-1" />);

    const file = new File(['%PDF'], 'test.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByTestId('manual-file-input'), { target: { files: [file] } });

    await act(async () => { vi.advanceTimersByTime(1100); });

    expect(screen.getByTestId('metadata-title')).toBeInTheDocument();
    expect(screen.getByTestId('metadata-year')).toBeInTheDocument();
    expect(screen.getByTestId('metadata-journal')).toBeInTheDocument();
    expect(screen.getByTestId('metadata-doi')).toBeInTheDocument();
    expect(screen.getByTestId('metadata-pmid')).toBeInTheDocument();
    expect(screen.getByTestId('confirm-article-btn')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('has add author button', async () => {
    vi.useFakeTimers();
    render(<ManualArticleAddForm sessionId="s-1" />);

    const file = new File(['%PDF'], 'test.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByTestId('manual-file-input'), { target: { files: [file] } });

    await act(async () => { vi.advanceTimersByTime(1100); });

    expect(screen.getByTestId('add-author-btn')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('calls mutation on confirm', async () => {
    vi.useFakeTimers();
    render(<ManualArticleAddForm sessionId="s-1" />);

    const file = new File(['%PDF'], 'test.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByTestId('manual-file-input'), { target: { files: [file] } });

    await act(async () => { vi.advanceTimersByTime(1100); });
    vi.useRealTimers();

    expect(screen.getByTestId('confirm-article-btn')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('confirm-article-btn'));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            sessionId: 's-1',
          }),
        }),
      );
    });
  });

  it('shows done step after successful add', async () => {
    vi.useFakeTimers();
    render(<ManualArticleAddForm sessionId="s-1" />);

    const file = new File(['%PDF'], 'test.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByTestId('manual-file-input'), { target: { files: [file] } });

    await act(async () => { vi.advanceTimersByTime(1100); });
    vi.useRealTimers();

    expect(screen.getByTestId('confirm-article-btn')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('confirm-article-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('manual-add-done')).toBeInTheDocument();
      expect(screen.getByTestId('add-another-btn')).toBeInTheDocument();
    });
  });
});
