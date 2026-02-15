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

import { CreateSoaDialog } from './CreateSoaDialog';

const mockSessions = [
  { id: 'sess-1', name: 'SLS Session 1', lockedAt: '2024-01-01' },
  { id: 'sess-2', name: 'SLS Session 2', lockedAt: '2024-01-02' },
];

describe('CreateSoaDialog', () => {
  const mockCreate = vi.fn().mockResolvedValue({
    data: { createSoaAnalysis: { soaAnalysisId: 'soa-1', name: 'Test', type: 'CLINICAL', sectionCount: 6 } },
  });
  const mockOnClose = vi.fn();
  const mockOnCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockReturnValue([mockCreate, { loading: false }]);
    mockUseQuery.mockImplementation((_query: unknown, opts: { variables?: { soaType?: string } }) => {
      if (opts?.variables && 'soaType' in opts.variables) {
        return { data: { checkDeviceSoaDependency: { canProceed: true, warnings: [] } } };
      }
      return { data: { lockedSlsSessions: mockSessions } };
    });
  });

  it('does not render when closed', () => {
    render(<CreateSoaDialog projectId="p-1" open={false} onClose={mockOnClose} />);
    expect(screen.queryByTestId('create-soa-dialog')).not.toBeInTheDocument();
  });

  it('renders dialog when open', () => {
    render(<CreateSoaDialog projectId="p-1" open={true} onClose={mockOnClose} />);
    expect(screen.getByTestId('create-soa-dialog')).toBeInTheDocument();
  });

  it('shows SOA type options', () => {
    render(<CreateSoaDialog projectId="p-1" open={true} onClose={mockOnClose} />);
    expect(screen.getByTestId('soa-type-CLINICAL')).toBeInTheDocument();
    expect(screen.getByTestId('soa-type-SIMILAR_DEVICE')).toBeInTheDocument();
    expect(screen.getByTestId('soa-type-ALTERNATIVE')).toBeInTheDocument();
  });

  it('shows locked SLS sessions', () => {
    render(<CreateSoaDialog projectId="p-1" open={true} onClose={mockOnClose} />);
    expect(screen.getByTestId('session-picker')).toBeInTheDocument();
    expect(screen.getByTestId('session-check-sess-1')).toBeInTheDocument();
    expect(screen.getByTestId('session-check-sess-2')).toBeInTheDocument();
  });

  it('shows no sessions message when none available', () => {
    mockUseQuery.mockImplementation(() => ({
      data: { lockedSlsSessions: [] },
    }));
    render(<CreateSoaDialog projectId="p-1" open={true} onClose={mockOnClose} />);
    expect(screen.getByTestId('no-sessions-msg')).toBeInTheDocument();
  });

  it('disables create button when form incomplete', () => {
    render(<CreateSoaDialog projectId="p-1" open={true} onClose={mockOnClose} />);
    expect(screen.getByTestId('create-soa-btn')).toBeDisabled();
  });

  it('enables create button when form is valid', () => {
    render(<CreateSoaDialog projectId="p-1" open={true} onClose={mockOnClose} />);
    fireEvent.change(screen.getByTestId('soa-name-input'), { target: { value: 'My SOA' } });
    fireEvent.click(screen.getByTestId('session-check-sess-1'));
    expect(screen.getByTestId('create-soa-btn')).not.toBeDisabled();
  });

  it('calls mutation on submit', async () => {
    render(<CreateSoaDialog projectId="p-1" open={true} onClose={mockOnClose} onCreated={mockOnCreated} />);
    fireEvent.change(screen.getByTestId('soa-name-input'), { target: { value: 'My SOA' } });
    fireEvent.click(screen.getByTestId('session-check-sess-1'));
    fireEvent.click(screen.getByTestId('create-soa-btn'));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            input: expect.objectContaining({
              name: 'My SOA',
              type: 'CLINICAL',
            }),
          }),
        }),
      );
    });
  });

  it('shows dependency warning for SIMILAR_DEVICE', () => {
    mockUseQuery.mockImplementation((_query: unknown, opts: { variables?: { soaType?: string } }) => {
      if (opts?.variables && 'soaType' in opts.variables) {
        return {
          data: {
            checkDeviceSoaDependency: {
              canProceed: true,
              warnings: ['Clinical SOA Section 6 not finalized'],
            },
          },
        };
      }
      return { data: { lockedSlsSessions: mockSessions } };
    });

    render(<CreateSoaDialog projectId="p-1" open={true} onClose={mockOnClose} />);
    fireEvent.click(screen.getByTestId('soa-type-SIMILAR_DEVICE'));
    expect(screen.getByTestId('dependency-warning')).toBeInTheDocument();
  });

  it('calls onClose when cancel clicked', () => {
    render(<CreateSoaDialog projectId="p-1" open={true} onClose={mockOnClose} />);
    fireEvent.click(screen.getByTestId('cancel-btn'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('has name input field', () => {
    render(<CreateSoaDialog projectId="p-1" open={true} onClose={mockOnClose} />);
    expect(screen.getByTestId('soa-name-input')).toBeInTheDocument();
  });
});
