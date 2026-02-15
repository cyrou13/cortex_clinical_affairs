import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { UnresolvedClaimsList } from './UnresolvedClaimsList';

const mockClaims = [
  {
    id: 'c-1',
    text: 'Device shows improved efficacy over predicate',
    sectionNumber: 3,
    sectionTitle: 'Clinical Data',
  },
  {
    id: 'c-2',
    text: 'No adverse events reported in 5-year follow-up',
    sectionNumber: 7,
    sectionTitle: 'Post-Market Data',
  },
  {
    id: 'c-3',
    text: 'Biocompatibility testing meets ISO 10993',
    sectionNumber: 5,
    sectionTitle: 'Preclinical Data',
  },
];

describe('UnresolvedClaimsList', () => {
  it('renders the claims list', () => {
    render(<UnresolvedClaimsList claims={mockClaims} />);
    expect(screen.getByTestId('unresolved-claims')).toBeInTheDocument();
  });

  it('shows claim items', () => {
    render(<UnresolvedClaimsList claims={mockClaims} />);
    const items = screen.getAllByTestId('claim-item');
    expect(items).toHaveLength(3);
  });

  it('shows claim section numbers', () => {
    render(<UnresolvedClaimsList claims={mockClaims} />);
    const sections = screen.getAllByTestId('claim-section');
    expect(sections[0]).toHaveTextContent('S3');
  });

  it('shows link source buttons', () => {
    render(<UnresolvedClaimsList claims={mockClaims} />);
    const btns = screen.getAllByTestId('link-source-btn');
    expect(btns).toHaveLength(3);
  });

  it('calls onLinkSource with claim id', () => {
    const onLink = vi.fn();
    render(<UnresolvedClaimsList claims={mockClaims} onLinkSource={onLink} />);
    const btns = screen.getAllByTestId('link-source-btn');
    fireEvent.click(btns[0]!);
    expect(onLink).toHaveBeenCalledWith('c-1');
  });

  it('shows empty state when no claims', () => {
    render(<UnresolvedClaimsList claims={[]} />);
    expect(screen.getByText('All claims resolved.')).toBeInTheDocument();
  });
});
