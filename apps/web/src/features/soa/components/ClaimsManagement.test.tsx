import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

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
      statementText: 'The device demonstrates equivalent safety to the predicate device.',
      thematicSectionId: null,
      createdAt: '2024-01-01',
    },
    {
      id: 'claim-2',
      statementText: 'Clinical performance meets or exceeds regulatory benchmarks.',
      thematicSectionId: null,
      createdAt: '2024-01-02',
    },
  ],
};

const emptyClaims = { claims: [] };

describe('ClaimsManagement', () => {
  const mockCreateClaim = vi.fn().mockResolvedValue({ data: { createClaim: { id: 'claim-new' } } });
  const mockLinkArticle = vi
    .fn()
    .mockResolvedValue({
      data: { linkClaimToArticle: { claimId: 'claim-1', articleId: 'art-2' } },
    });

  beforeEach(() => {
    vi.clearAllMocks();
    const mutationReturns = [
      [mockCreateClaim, { loading: false }],
      [mockLinkArticle, { loading: false }],
    ];
    let callIndex = 0;
    mockUseMutation.mockImplementation(() => {
      const result = mutationReturns[callIndex % mutationReturns.length];
      callIndex++;
      return result;
    });
  });

  it('renders the claims panel', () => {
    mockUseQuery.mockReturnValue({ data: mockClaims, loading: false });
    render(<ClaimsManagement soaAnalysisId="soa-1" />);

    expect(screen.getByTestId('claims-panel')).toBeInTheDocument();
  });

  it('displays the claims list', () => {
    mockUseQuery.mockReturnValue({ data: mockClaims, loading: false });
    render(<ClaimsManagement soaAnalysisId="soa-1" />);

    expect(screen.getByTestId('claims-list')).toBeInTheDocument();
    expect(screen.getByTestId('claim-claim-1')).toBeInTheDocument();
    expect(screen.getByTestId('claim-claim-2')).toBeInTheDocument();
  });

  it('shows create claim form when button clicked', () => {
    mockUseQuery.mockReturnValue({ data: mockClaims, loading: false });
    render(<ClaimsManagement soaAnalysisId="soa-1" />);

    fireEvent.click(screen.getByTestId('create-claim-btn'));

    expect(screen.getByTestId('claim-form')).toBeInTheDocument();
    expect(screen.getByTestId('claim-text-input')).toBeInTheDocument();
  });

  it('shows link article button for each claim', () => {
    mockUseQuery.mockReturnValue({ data: mockClaims, loading: false });
    render(<ClaimsManagement soaAnalysisId="soa-1" />);

    const linkButtons = screen.getAllByTestId('link-article-btn');
    expect(linkButtons.length).toBe(2);
  });

  it('displays claim statement text', () => {
    mockUseQuery.mockReturnValue({ data: mockClaims, loading: false });
    render(<ClaimsManagement soaAnalysisId="soa-1" />);

    expect(screen.getByTestId('claim-statement-claim-1')).toHaveTextContent(
      'The device demonstrates equivalent safety to the predicate device.',
    );
  });

  it('shows empty state when no claims', () => {
    mockUseQuery.mockReturnValue({ data: emptyClaims, loading: false });
    render(<ClaimsManagement soaAnalysisId="soa-1" />);

    expect(screen.getByTestId('no-claims')).toBeInTheDocument();
  });
});
