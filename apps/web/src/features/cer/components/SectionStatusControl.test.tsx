import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockUseMutation = vi.fn();
vi.mock('@apollo/client', () => ({ gql: vi.fn((s: TemplateStringsArray) => s[0]) }));
vi.mock('@apollo/client/react', () => ({
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

import { SectionStatusControl } from './SectionStatusControl';

describe('SectionStatusControl', () => {
  const mockUpdate = vi.fn().mockResolvedValue({ data: { updateSectionStatus: { sectionId: 's-1', status: 'REVIEWED' } } });

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockReturnValue([mockUpdate, { loading: false }]);
  });

  it('renders the status control', () => {
    render(<SectionStatusControl sectionId="s-1" currentStatus="DRAFT" hasUnresolvedClaims={false} />);
    expect(screen.getByTestId('section-status-control')).toBeInTheDocument();
  });

  it('shows status dropdown', () => {
    render(<SectionStatusControl sectionId="s-1" currentStatus="DRAFT" hasUnresolvedClaims={false} />);
    expect(screen.getByTestId('status-dropdown')).toBeInTheDocument();
  });

  it('shows all status options', () => {
    render(<SectionStatusControl sectionId="s-1" currentStatus="DRAFT" hasUnresolvedClaims={false} />);
    const options = screen.getAllByTestId('status-option');
    expect(options).toHaveLength(3);
  });

  it('calls mutation when status changed to non-finalized', async () => {
    render(<SectionStatusControl sectionId="s-1" currentStatus="DRAFT" hasUnresolvedClaims={false} />);
    fireEvent.change(screen.getByTestId('status-dropdown'), { target: { value: 'REVIEWED' } });
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  it('shows confirmation dialog when changing to FINALIZED', () => {
    render(<SectionStatusControl sectionId="s-1" currentStatus="REVIEWED" hasUnresolvedClaims={false} />);
    fireEvent.change(screen.getByTestId('status-dropdown'), { target: { value: 'FINALIZED' } });
    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
  });

  it('shows warning when unresolved claims exist', () => {
    render(<SectionStatusControl sectionId="s-1" currentStatus="DRAFT" hasUnresolvedClaims={true} />);
    expect(screen.getByText(/Resolve all claims/)).toBeInTheDocument();
  });

  it('calls onStatusChanged after successful update', async () => {
    const onChange = vi.fn();
    render(<SectionStatusControl sectionId="s-1" currentStatus="DRAFT" hasUnresolvedClaims={false} onStatusChanged={onChange} />);
    fireEvent.change(screen.getByTestId('status-dropdown'), { target: { value: 'REVIEWED' } });
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith('REVIEWED');
    });
  });
});
