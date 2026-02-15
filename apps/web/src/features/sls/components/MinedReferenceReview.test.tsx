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

import { MinedReferenceReview } from './MinedReferenceReview';

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

describe('MinedReferenceReview', () => {
  const mockApprove = vi.fn().mockResolvedValue({ data: { approveMinedReference: { referenceId: 'ref-1', status: 'APPROVED' } } });
  const mockReject = vi.fn().mockResolvedValue({ data: { rejectMinedReference: { referenceId: 'ref-1', status: 'REJECTED' } } });

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation
      .mockReturnValueOnce([mockApprove, { loading: false }])
      .mockReturnValueOnce([mockReject, { loading: false }]);
  });

  it('renders loading state', () => {
    mockUseQuery.mockReturnValue({ data: null, loading: true, error: null });
    render(<MinedReferenceReview sessionId="s-1" />);

    expect(screen.getByTestId('references-loading')).toBeInTheDocument();
  });

  it('renders error state', () => {
    mockUseQuery.mockReturnValue({ data: null, loading: false, error: new Error('fail') });
    render(<MinedReferenceReview sessionId="s-1" />);

    expect(screen.getByTestId('references-error')).toBeInTheDocument();
  });

  it('renders empty state', () => {
    mockUseQuery.mockReturnValue({ data: { minedReferences: [] }, loading: false, error: null });
    render(<MinedReferenceReview sessionId="s-1" />);

    expect(screen.getByTestId('references-empty')).toBeInTheDocument();
  });

  it('renders reference table', () => {
    mockUseQuery.mockReturnValue({ data: { minedReferences: mockReferences }, loading: false, error: null });
    render(<MinedReferenceReview sessionId="s-1" />);

    expect(screen.getByTestId('mined-reference-review')).toBeInTheDocument();
    expect(screen.getByTestId('references-table')).toBeInTheDocument();
    expect(screen.getByTestId('ref-row-ref-1')).toBeInTheDocument();
    expect(screen.getByTestId('ref-row-ref-2')).toBeInTheDocument();
  });

  it('shows pending count badge', () => {
    mockUseQuery.mockReturnValue({ data: { minedReferences: mockReferences }, loading: false, error: null });
    render(<MinedReferenceReview sessionId="s-1" />);

    expect(screen.getByTestId('pending-count')).toHaveTextContent('2 pending');
  });

  it('shows validation badges', () => {
    mockUseQuery.mockReturnValue({ data: { minedReferences: mockReferences }, loading: false, error: null });
    render(<MinedReferenceReview sessionId="s-1" />);

    const badges = screen.getAllByTestId('validation-badge');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('shows duplicate indicator', () => {
    mockUseQuery.mockReturnValue({ data: { minedReferences: mockReferences }, loading: false, error: null });
    render(<MinedReferenceReview sessionId="s-1" />);

    expect(screen.getByTestId('duplicate-indicator')).toBeInTheDocument();
  });

  it('shows approve/reject buttons for pending references', () => {
    mockUseQuery.mockReturnValue({ data: { minedReferences: [mockReferences[0]] }, loading: false, error: null });
    render(<MinedReferenceReview sessionId="s-1" />);

    expect(screen.getByTestId('approve-ref-btn')).toBeInTheDocument();
    expect(screen.getByTestId('reject-ref-btn')).toBeInTheDocument();
  });

  it('shows status text for non-pending references', () => {
    mockUseQuery.mockReturnValue({ data: { minedReferences: [mockReferences[2]] }, loading: false, error: null });
    render(<MinedReferenceReview sessionId="s-1" />);

    expect(screen.getByTestId('approval-status')).toHaveTextContent('APPROVED');
  });

  it('calls approve mutation', async () => {
    mockUseQuery.mockReturnValue({ data: { minedReferences: [mockReferences[0]] }, loading: false, error: null });
    render(<MinedReferenceReview sessionId="s-1" />);

    fireEvent.click(screen.getByTestId('approve-ref-btn'));

    await waitFor(() => {
      expect(mockApprove).toHaveBeenCalledWith({
        variables: { referenceId: 'ref-1' },
      });
    });
  });

  it('shows total count in header', () => {
    mockUseQuery.mockReturnValue({ data: { minedReferences: mockReferences }, loading: false, error: null });
    render(<MinedReferenceReview sessionId="s-1" />);

    expect(screen.getByTestId('mined-reference-review')).toHaveTextContent('Mined References (3)');
  });
});
