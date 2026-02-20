import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@apollo/client', () => ({
  gql: (str: TemplateStringsArray) => str[0],
}));

const mockUseMutation = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

import { CellValidationOverlay } from './CellValidationOverlay';

describe('CellValidationOverlay', () => {
  const mockValidate = vi
    .fn()
    .mockResolvedValue({
      data: { validateCell: { cellId: 'c1', status: 'VALIDATED', value: 'Some value' } },
    });
  const mockCorrect = vi
    .fn()
    .mockResolvedValue({
      data: { correctCell: { cellId: 'c1', status: 'CORRECTED', value: 'new' } },
    });
  const mockFlag = vi
    .fn()
    .mockResolvedValue({ data: { flagCell: { cellId: 'c1', status: 'FLAGGED', reason: 'bad' } } });

  beforeEach(() => {
    vi.clearAllMocks();
    const mutationReturns = [
      [mockValidate, { loading: false }],
      [mockCorrect, { loading: false }],
      [mockFlag, { loading: false }],
    ];
    let callIndex = 0;
    mockUseMutation.mockImplementation(() => {
      const result = mutationReturns[callIndex % mutationReturns.length];
      callIndex++;
      return result;
    });
  });

  const defaultProps = {
    gridId: 'grid-1',
    articleId: 'art-1',
    columnId: 'col-1',
    value: 'Some value',
    aiExtractedValue: 'AI value',
    validationStatus: 'PENDING',
    confidenceLevel: 'HIGH',
  };

  it('renders cell validation wrapper', () => {
    render(<CellValidationOverlay {...defaultProps} />);
    expect(screen.getByTestId('cell-validation')).toBeInTheDocument();
  });

  it('shows AI indicator when AI extracted', () => {
    render(<CellValidationOverlay {...defaultProps} />);
    expect(screen.getByTestId('ai-indicator')).toBeInTheDocument();
  });

  it('does not show AI indicator when no AI value', () => {
    render(<CellValidationOverlay {...defaultProps} aiExtractedValue={null} />);
    expect(screen.queryByTestId('ai-indicator')).not.toBeInTheDocument();
  });

  it('shows confidence badge', () => {
    render(<CellValidationOverlay {...defaultProps} />);
    expect(screen.getByTestId('confidence-badge')).toHaveTextContent('H');
  });

  it('shows status icon for VALIDATED', () => {
    render(<CellValidationOverlay {...defaultProps} validationStatus="VALIDATED" />);
    expect(screen.getByTestId('status-icon')).toBeInTheDocument();
  });

  it('shows validation menu on button click', () => {
    render(<CellValidationOverlay {...defaultProps} />);
    fireEvent.click(screen.getByTestId('validation-menu-btn'));
    expect(screen.getByTestId('validation-menu')).toBeInTheDocument();
  });

  it('shows validate button in menu', () => {
    render(<CellValidationOverlay {...defaultProps} />);
    fireEvent.click(screen.getByTestId('validation-menu-btn'));
    expect(screen.getByTestId('validate-btn')).toBeInTheDocument();
  });

  it('shows flag button in menu', () => {
    render(<CellValidationOverlay {...defaultProps} />);
    fireEvent.click(screen.getByTestId('validation-menu-btn'));
    expect(screen.getByTestId('flag-btn')).toBeInTheDocument();
  });

  it('calls validate mutation', async () => {
    render(<CellValidationOverlay {...defaultProps} />);
    fireEvent.click(screen.getByTestId('validation-menu-btn'));
    fireEvent.click(screen.getByTestId('validate-btn'));

    await waitFor(() => {
      expect(mockValidate).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: { gridId: 'grid-1', articleId: 'art-1', columnId: 'col-1' },
        }),
      );
    });
  });

  it('shows flag reason input', () => {
    render(<CellValidationOverlay {...defaultProps} />);
    fireEvent.click(screen.getByTestId('validation-menu-btn'));
    fireEvent.click(screen.getByTestId('flag-btn'));
    expect(screen.getByTestId('flag-input')).toBeInTheDocument();
    expect(screen.getByTestId('flag-reason-input')).toBeInTheDocument();
  });
});
