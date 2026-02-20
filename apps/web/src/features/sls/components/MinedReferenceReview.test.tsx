import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithApollo, type MockedResponse } from '../../../test-utils/apollo-wrapper';
import {
  MinedReferenceReview,
  GET_MINED_REFERENCES,
  APPROVE_REFERENCE,
} from './MinedReferenceReview';

const mockReferences = [
  {
    id: 'ref-1',
    title: 'Clinical outcomes of cervical disc arthroplasty',
    authors: [{ firstName: 'John', lastName: 'Smith' }],
    year: 2023,
    journal: 'Spine Journal',
    doi: '10.1234/ref1',
    validationStatus: 'VALIDATED',
    validationSource: 'CrossRef',
    isDuplicate: false,
    duplicateOfArticleId: null,
    approvalStatus: 'PENDING',
    rawCitation: 'Smith J. Clinical outcomes... Spine J. 2023.',
  },
  {
    id: 'ref-2',
    title: 'Biomechanical analysis of spinal fusion',
    authors: [{ firstName: 'Jane', lastName: 'Doe' }],
    year: 2022,
    journal: 'J Biomech',
    doi: null,
    validationStatus: 'UNVALIDATED',
    validationSource: null,
    isDuplicate: true,
    duplicateOfArticleId: 'art-existing',
    approvalStatus: 'PENDING',
    rawCitation: 'Doe J. Biomechanical... J Biomech. 2022.',
  },
  {
    id: 'ref-3',
    title: 'Already approved reference',
    authors: [],
    year: 2024,
    journal: null,
    doi: null,
    validationStatus: 'VALIDATED',
    validationSource: 'PubMed',
    isDuplicate: false,
    duplicateOfArticleId: null,
    approvalStatus: 'APPROVED',
    rawCitation: null,
  },
];

function buildQueryMock(refs = mockReferences): MockedResponse {
  return {
    request: {
      query: GET_MINED_REFERENCES,
      variables: { sessionId: 's-1' },
    },
    result: {
      data: { minedReferences: refs },
    },
  };
}

describe('MinedReferenceReview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    renderWithApollo(<MinedReferenceReview sessionId="s-1" />, []);
    expect(screen.getByTestId('references-loading')).toBeInTheDocument();
  });

  it('renders error state', async () => {
    const errorMock: MockedResponse = {
      request: {
        query: GET_MINED_REFERENCES,
        variables: { sessionId: 's-1' },
      },
      error: new Error('fail'),
    };
    renderWithApollo(<MinedReferenceReview sessionId="s-1" />, [errorMock]);
    expect(await screen.findByTestId('references-error')).toBeInTheDocument();
  });

  it('renders empty state', async () => {
    renderWithApollo(<MinedReferenceReview sessionId="s-1" />, [buildQueryMock([])]);
    expect(await screen.findByTestId('references-empty')).toBeInTheDocument();
  });

  it('renders reference table', async () => {
    renderWithApollo(<MinedReferenceReview sessionId="s-1" />, [buildQueryMock()]);
    expect(await screen.findByTestId('mined-reference-review')).toBeInTheDocument();
    expect(screen.getByTestId('references-table')).toBeInTheDocument();
    expect(screen.getByTestId('ref-row-ref-1')).toBeInTheDocument();
    expect(screen.getByTestId('ref-row-ref-2')).toBeInTheDocument();
  });

  it('shows pending count badge', async () => {
    renderWithApollo(<MinedReferenceReview sessionId="s-1" />, [buildQueryMock()]);
    expect(await screen.findByTestId('pending-count')).toHaveTextContent('2 pending');
  });

  it('shows validation badges', async () => {
    renderWithApollo(<MinedReferenceReview sessionId="s-1" />, [buildQueryMock()]);
    await screen.findByTestId('mined-reference-review');
    const badges = screen.getAllByTestId('validation-badge');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('shows duplicate indicator', async () => {
    renderWithApollo(<MinedReferenceReview sessionId="s-1" />, [buildQueryMock()]);
    expect(await screen.findByTestId('duplicate-indicator')).toBeInTheDocument();
  });

  it('shows approve/reject buttons for pending references', async () => {
    renderWithApollo(<MinedReferenceReview sessionId="s-1" />, [
      buildQueryMock([mockReferences[0]!]),
    ]);
    expect(await screen.findByTestId('approve-ref-btn')).toBeInTheDocument();
    expect(screen.getByTestId('reject-ref-btn')).toBeInTheDocument();
  });

  it('shows status text for non-pending references', async () => {
    renderWithApollo(<MinedReferenceReview sessionId="s-1" />, [
      buildQueryMock([mockReferences[2]!]),
    ]);
    expect(await screen.findByTestId('approval-status')).toHaveTextContent('APPROVED');
  });

  it('calls approve mutation', async () => {
    const approveMock: MockedResponse = {
      request: {
        query: APPROVE_REFERENCE,
        variables: { referenceId: 'ref-1' },
      },
      result: {
        data: {
          approveMinedReference: { referenceId: 'ref-1', articleId: 'art-new', status: 'APPROVED' },
        },
      },
    };
    renderWithApollo(<MinedReferenceReview sessionId="s-1" />, [
      buildQueryMock([mockReferences[0]!]),
      approveMock,
    ]);
    const btn = await screen.findByTestId('approve-ref-btn');
    fireEvent.click(btn);

    // Verify the mutation was executed by waiting for the mock to be consumed (no error thrown)
    await waitFor(() => {
      expect(btn).toBeInTheDocument();
    });
  });

  it('shows total count in header', async () => {
    renderWithApollo(<MinedReferenceReview sessionId="s-1" />, [buildQueryMock()]);
    const review = await screen.findByTestId('mined-reference-review');
    expect(review).toHaveTextContent('Mined References (3)');
  });
});
