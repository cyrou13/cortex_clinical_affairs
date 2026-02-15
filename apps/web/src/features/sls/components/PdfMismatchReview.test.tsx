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

import { PdfMismatchReview } from './PdfMismatchReview';

const mockMismatches = [
  {
    id: 'art-1',
    title: 'Cervical Spine Outcomes',
    pdfStatus: 'MISMATCH',
    pdfVerificationResult: {
      extractedTitle: 'Different Title',
      extractedAuthors: ['Johnson'],
      mismatchReasons: ['Title mismatch: expected "Cervical Spine Outcomes", found "Different Title"'],
      confidence: 50,
    },
  },
  {
    id: 'art-2',
    title: 'Lumbar Fusion Study',
    pdfStatus: 'MISMATCH',
    pdfVerificationResult: {
      extractedTitle: 'Lumbar Fusion Study',
      extractedAuthors: ['Wrong Author'],
      mismatchReasons: ['Author mismatch'],
      confidence: 50,
    },
  },
];

describe('PdfMismatchReview', () => {
  const mockResolve = vi.fn().mockResolvedValue({ data: { resolvePdfMismatch: { articleId: 'art-1', newStatus: 'VERIFIED' } } });

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockReturnValue([mockResolve, { loading: false }]);
  });

  it('renders loading state', () => {
    mockUseQuery.mockReturnValue({ data: null, loading: true, error: null });
    render(<PdfMismatchReview sessionId="s-1" />);

    expect(screen.getByTestId('mismatch-loading')).toBeInTheDocument();
  });

  it('renders error state', () => {
    mockUseQuery.mockReturnValue({ data: null, loading: false, error: new Error('fail') });
    render(<PdfMismatchReview sessionId="s-1" />);

    expect(screen.getByTestId('mismatch-error')).toBeInTheDocument();
  });

  it('renders empty state', () => {
    mockUseQuery.mockReturnValue({ data: { pdfMismatches: [] }, loading: false, error: null });
    render(<PdfMismatchReview sessionId="s-1" />);

    expect(screen.getByTestId('mismatch-empty')).toBeInTheDocument();
  });

  it('renders mismatch cards', () => {
    mockUseQuery.mockReturnValue({ data: { pdfMismatches: mockMismatches }, loading: false, error: null });
    render(<PdfMismatchReview sessionId="s-1" />);

    expect(screen.getByTestId('pdf-mismatch-review')).toBeInTheDocument();
    expect(screen.getByTestId('mismatch-art-1')).toBeInTheDocument();
    expect(screen.getByTestId('mismatch-art-2')).toBeInTheDocument();
  });

  it('displays mismatch reasons', () => {
    mockUseQuery.mockReturnValue({ data: { pdfMismatches: mockMismatches }, loading: false, error: null });
    render(<PdfMismatchReview sessionId="s-1" />);

    const reasons = screen.getAllByTestId('mismatch-reason');
    expect(reasons[0]).toHaveTextContent('Title mismatch');
  });

  it('shows action buttons for each mismatch', () => {
    mockUseQuery.mockReturnValue({ data: { pdfMismatches: [mockMismatches[0]] }, loading: false, error: null });
    render(<PdfMismatchReview sessionId="s-1" />);

    expect(screen.getByTestId('mismatch-accept-btn')).toBeInTheDocument();
    expect(screen.getByTestId('mismatch-reject-btn')).toBeInTheDocument();
    expect(screen.getByTestId('mismatch-reupload-btn')).toBeInTheDocument();
  });

  it('calls resolve mutation on accept', async () => {
    mockUseQuery.mockReturnValue({ data: { pdfMismatches: [mockMismatches[0]] }, loading: false, error: null });
    render(<PdfMismatchReview sessionId="s-1" />);

    fireEvent.click(screen.getByTestId('mismatch-accept-btn'));

    await waitFor(() => {
      expect(mockResolve).toHaveBeenCalledWith({
        variables: { articleId: 'art-1', resolution: 'ACCEPT_MISMATCH' },
      });
    });
  });

  it('calls resolve mutation on reject', async () => {
    mockUseQuery.mockReturnValue({ data: { pdfMismatches: [mockMismatches[0]] }, loading: false, error: null });
    render(<PdfMismatchReview sessionId="s-1" />);

    fireEvent.click(screen.getByTestId('mismatch-reject-btn'));

    await waitFor(() => {
      expect(mockResolve).toHaveBeenCalledWith({
        variables: { articleId: 'art-1', resolution: 'REJECT_PDF' },
      });
    });
  });

  it('shows mismatch count in header', () => {
    mockUseQuery.mockReturnValue({ data: { pdfMismatches: mockMismatches }, loading: false, error: null });
    render(<PdfMismatchReview sessionId="s-1" />);

    expect(screen.getByTestId('pdf-mismatch-review')).toHaveTextContent('PDF Mismatches (2)');
  });
});
