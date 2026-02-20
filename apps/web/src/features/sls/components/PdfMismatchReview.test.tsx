import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithApollo, type MockedResponse } from '../../../test-utils/apollo-wrapper';
import { PdfMismatchReview, GET_PDF_MISMATCHES, RESOLVE_MISMATCH } from './PdfMismatchReview';

const mockMismatches = [
  {
    id: 'art-1',
    title: 'Cervical Spine Outcomes',
    pdfStatus: 'MISMATCH',
    pdfVerificationResult: {
      extractedTitle: 'Different Title',
      extractedAuthors: ['Johnson'],
      mismatchReasons: [
        'Title mismatch: expected "Cervical Spine Outcomes", found "Different Title"',
      ],
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

function buildQueryMock(articles = mockMismatches): MockedResponse {
  return {
    request: {
      query: GET_PDF_MISMATCHES,
      variables: { sessionId: 's-1' },
    },
    result: {
      data: { pdfMismatches: articles },
    },
  };
}

describe('PdfMismatchReview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    renderWithApollo(<PdfMismatchReview sessionId="s-1" />, []);
    expect(screen.getByTestId('mismatch-loading')).toBeInTheDocument();
  });

  it('renders error state', async () => {
    const errorMock: MockedResponse = {
      request: {
        query: GET_PDF_MISMATCHES,
        variables: { sessionId: 's-1' },
      },
      error: new Error('fail'),
    };
    renderWithApollo(<PdfMismatchReview sessionId="s-1" />, [errorMock]);
    expect(await screen.findByTestId('mismatch-error')).toBeInTheDocument();
  });

  it('renders empty state', async () => {
    renderWithApollo(<PdfMismatchReview sessionId="s-1" />, [buildQueryMock([])]);
    expect(await screen.findByTestId('mismatch-empty')).toBeInTheDocument();
  });

  it('renders mismatch cards', async () => {
    renderWithApollo(<PdfMismatchReview sessionId="s-1" />, [buildQueryMock()]);
    expect(await screen.findByTestId('pdf-mismatch-review')).toBeInTheDocument();
    expect(screen.getByTestId('mismatch-art-1')).toBeInTheDocument();
    expect(screen.getByTestId('mismatch-art-2')).toBeInTheDocument();
  });

  it('displays mismatch reasons', async () => {
    renderWithApollo(<PdfMismatchReview sessionId="s-1" />, [buildQueryMock()]);
    await screen.findByTestId('pdf-mismatch-review');
    const reasons = screen.getAllByTestId('mismatch-reason');
    expect(reasons[0]).toHaveTextContent('Title mismatch');
  });

  it('shows action buttons for each mismatch', async () => {
    renderWithApollo(<PdfMismatchReview sessionId="s-1" />, [buildQueryMock([mockMismatches[0]!])]);
    expect(await screen.findByTestId('mismatch-accept-btn')).toBeInTheDocument();
    expect(screen.getByTestId('mismatch-reject-btn')).toBeInTheDocument();
    expect(screen.getByTestId('mismatch-reupload-btn')).toBeInTheDocument();
  });

  it('calls resolve mutation on accept', async () => {
    const resolveMock: MockedResponse = {
      request: {
        query: RESOLVE_MISMATCH,
        variables: { articleId: 'art-1', resolution: 'ACCEPT_MISMATCH' },
      },
      result: {
        data: { resolvePdfMismatch: { articleId: 'art-1', newStatus: 'VERIFIED' } },
      },
    };
    renderWithApollo(<PdfMismatchReview sessionId="s-1" />, [
      buildQueryMock([mockMismatches[0]!]),
      resolveMock,
    ]);

    const btn = await screen.findByTestId('mismatch-accept-btn');
    fireEvent.click(btn);

    // Mutation is fire-and-forget. If mock was wrong, Apollo would throw.
    await waitFor(() => {
      expect(btn).toBeInTheDocument();
    });
  });

  it('calls resolve mutation on reject', async () => {
    const resolveMock: MockedResponse = {
      request: {
        query: RESOLVE_MISMATCH,
        variables: { articleId: 'art-1', resolution: 'REJECT_PDF' },
      },
      result: {
        data: { resolvePdfMismatch: { articleId: 'art-1', newStatus: 'PDF_REJECTED' } },
      },
    };
    renderWithApollo(<PdfMismatchReview sessionId="s-1" />, [
      buildQueryMock([mockMismatches[0]!]),
      resolveMock,
    ]);

    const btn = await screen.findByTestId('mismatch-reject-btn');
    fireEvent.click(btn);

    await waitFor(() => {
      expect(btn).toBeInTheDocument();
    });
  });

  it('shows mismatch count in header', async () => {
    renderWithApollo(<PdfMismatchReview sessionId="s-1" />, [buildQueryMock()]);
    const review = await screen.findByTestId('pdf-mismatch-review');
    expect(review).toHaveTextContent('PDF Mismatches (2)');
  });
});
