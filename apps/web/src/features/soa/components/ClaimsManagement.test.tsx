import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@apollo/client', () => ({
  gql: (str: TemplateStringsArray) => str[0],
}));

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

import { ClaimsManagement } from './ClaimsManagement';

const mockClaims = {
  claims: [
    {
      id: 'claim-1',
      soaAnalysisId: 'soa-1',
      statementText: 'The device demonstrates equivalent safety to the predicate device.',
      thematicSectionId: null,
      status: 'DRAFT',
      evidenceStrength: 'HIGH',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
    {
      id: 'claim-2',
      soaAnalysisId: 'soa-1',
      statementText: 'Clinical performance meets or exceeds regulatory benchmarks.',
      thematicSectionId: null,
      status: 'APPROVED',
      evidenceStrength: 'MEDIUM',
      createdAt: '2024-01-02',
      updatedAt: '2024-01-02',
    },
  ],
};

const emptyClaims = { claims: [] };

describe('ClaimsManagement', () => {
  const mockCreateClaim = vi.fn().mockResolvedValue({ data: { createClaim: { id: 'claim-new' } } });
  const mockGenerateClaims = vi
    .fn()
    .mockResolvedValue({ data: { generateClaims: { taskId: 'task-1', sectionCount: 2 } } });
  const mockUpdateClaimStatus = vi
    .fn()
    .mockResolvedValue({ data: { updateClaimStatus: { id: 'claim-1', status: 'APPROVED' } } });
  const mockLinkArticle = vi
    .fn()
    .mockResolvedValue({
      data: { linkClaimToArticle: { claimId: 'claim-1', articleId: 'art-2' } },
    });

  beforeEach(() => {
    vi.clearAllMocks();
    const mutationReturns = [
      [mockCreateClaim, { loading: false }],
      [mockGenerateClaims, { loading: false }],
      [mockUpdateClaimStatus, { loading: false }],
      [mockLinkArticle, { loading: false }],
    ];
    let callIndex = 0;
    mockUseMutation.mockImplementation(() => {
      const result = mutationReturns[callIndex % mutationReturns.length];
      callIndex++;
      return result;
    });
  });

  it('renders claims panel', () => {
    mockUseQuery.mockReturnValue({ data: mockClaims, loading: false, refetch: vi.fn() });
    render(<ClaimsManagement soaAnalysisId="soa-1" gridId={null} />);

    expect(screen.getByTestId('claims-panel')).toBeInTheDocument();
  });

  it('shows claims list with claims', () => {
    mockUseQuery.mockReturnValue({ data: mockClaims, loading: false, refetch: vi.fn() });
    render(<ClaimsManagement soaAnalysisId="soa-1" gridId={null} />);

    expect(screen.getByTestId('claims-list')).toBeInTheDocument();
    expect(screen.getByTestId('claim-claim-1')).toBeInTheDocument();
    expect(screen.getByTestId('claim-claim-2')).toBeInTheDocument();
  });

  it('displays claim statement text', () => {
    mockUseQuery.mockReturnValue({ data: mockClaims, loading: false, refetch: vi.fn() });
    render(<ClaimsManagement soaAnalysisId="soa-1" gridId={null} />);

    expect(screen.getByTestId('claim-statement-claim-1')).toHaveTextContent(
      'The device demonstrates equivalent safety to the predicate device.',
    );
  });

  it('shows summary cards when claims exist', () => {
    mockUseQuery.mockReturnValue({ data: mockClaims, loading: false, refetch: vi.fn() });
    render(<ClaimsManagement soaAnalysisId="soa-1" gridId={null} />);

    expect(screen.getByTestId('claims-summary')).toBeInTheDocument();
  });

  it('shows generate button when gridId provided', () => {
    mockUseQuery.mockReturnValue({ data: mockClaims, loading: false, refetch: vi.fn() });
    render(<ClaimsManagement soaAnalysisId="soa-1" gridId="grid-1" />);

    expect(screen.getByTestId('generate-claims-btn')).toBeInTheDocument();
  });

  it('hides generate button when no gridId', () => {
    mockUseQuery.mockReturnValue({ data: mockClaims, loading: false, refetch: vi.fn() });
    render(<ClaimsManagement soaAnalysisId="soa-1" gridId={null} />);

    expect(screen.queryByTestId('generate-claims-btn')).not.toBeInTheDocument();
  });

  it('shows empty state when no claims', () => {
    mockUseQuery.mockReturnValue({ data: emptyClaims, loading: false, refetch: vi.fn() });
    render(<ClaimsManagement soaAnalysisId="soa-1" gridId={null} />);

    expect(screen.getByTestId('no-claims')).toBeInTheDocument();
  });

  it('hides approve/reject buttons when locked', () => {
    mockUseQuery.mockReturnValue({ data: mockClaims, loading: false, refetch: vi.fn() });
    render(<ClaimsManagement soaAnalysisId="soa-1" gridId="grid-1" locked={true} />);

    expect(screen.queryByTestId('approve-claim-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('reject-claim-1')).not.toBeInTheDocument();
  });

  it('hides generate button when locked', () => {
    mockUseQuery.mockReturnValue({ data: mockClaims, loading: false, refetch: vi.fn() });
    render(<ClaimsManagement soaAnalysisId="soa-1" gridId="grid-1" locked={true} />);

    expect(screen.queryByTestId('generate-claims-btn')).not.toBeInTheDocument();
  });

  it('shows approve and reject buttons for DRAFT claims when not locked', () => {
    mockUseQuery.mockReturnValue({ data: mockClaims, loading: false, refetch: vi.fn() });
    render(<ClaimsManagement soaAnalysisId="soa-1" gridId={null} />);

    // claim-1 is DRAFT so should have approve/reject
    expect(screen.getByTestId('approve-claim-1')).toBeInTheDocument();
    expect(screen.getByTestId('reject-claim-1')).toBeInTheDocument();

    // claim-2 is APPROVED so should NOT have approve/reject
    expect(screen.queryByTestId('approve-claim-2')).not.toBeInTheDocument();
    expect(screen.queryByTestId('reject-claim-2')).not.toBeInTheDocument();
  });

  it('shows add claim button when not locked', () => {
    mockUseQuery.mockReturnValue({ data: emptyClaims, loading: false, refetch: vi.fn() });
    render(<ClaimsManagement soaAnalysisId="soa-1" gridId={null} />);

    expect(screen.getByTestId('create-claim-btn')).toBeInTheDocument();
  });

  it('hides add claim button when locked', () => {
    mockUseQuery.mockReturnValue({ data: emptyClaims, loading: false, refetch: vi.fn() });
    render(<ClaimsManagement soaAnalysisId="soa-1" gridId={null} locked={true} />);

    expect(screen.queryByTestId('create-claim-btn')).not.toBeInTheDocument();
  });
});
