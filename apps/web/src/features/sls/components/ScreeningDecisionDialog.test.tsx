import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScreeningDecisionDialog } from './ScreeningDecisionDialog';

const mockExclusionCodes = [
  { id: 'ec-1', code: 'E1', label: 'Wrong population' },
  { id: 'ec-2', code: 'E2', label: 'Wrong intervention' },
];

describe('ScreeningDecisionDialog', () => {
  const defaultProps = {
    articleId: 'art-1',
    decision: 'INCLUDED' as const,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dialog with "Include Article" title for INCLUDED decision', () => {
    render(<ScreeningDecisionDialog {...defaultProps} />);

    expect(screen.getByTestId('dialog-title')).toHaveTextContent('Include Article');
  });

  it('renders dialog with "Exclude Article" title for EXCLUDED decision', () => {
    render(<ScreeningDecisionDialog {...defaultProps} decision="EXCLUDED" exclusionCodes={mockExclusionCodes} />);

    expect(screen.getByTestId('dialog-title')).toHaveTextContent('Exclude Article');
  });

  it('renders dialog with "Skip Article" title for SKIPPED decision', () => {
    render(<ScreeningDecisionDialog {...defaultProps} decision="SKIPPED" />);

    expect(screen.getByTestId('dialog-title')).toHaveTextContent('Skip Article');
  });

  it('renders reason textarea', () => {
    render(<ScreeningDecisionDialog {...defaultProps} />);

    expect(screen.getByTestId('decision-reason-input')).toBeInTheDocument();
  });

  it('renders exclusion code dropdown for EXCLUDED decision', () => {
    render(
      <ScreeningDecisionDialog
        {...defaultProps}
        decision="EXCLUDED"
        exclusionCodes={mockExclusionCodes}
      />,
    );

    expect(screen.getByTestId('exclusion-code-select')).toBeInTheDocument();
    expect(screen.getByText('E1 - Wrong population')).toBeInTheDocument();
    expect(screen.getByText('E2 - Wrong intervention')).toBeInTheDocument();
  });

  it('does not render exclusion code dropdown for INCLUDED decision', () => {
    render(<ScreeningDecisionDialog {...defaultProps} />);

    expect(screen.queryByTestId('exclusion-code-select')).not.toBeInTheDocument();
  });

  it('pre-populates reason from aiReasoning', () => {
    render(
      <ScreeningDecisionDialog {...defaultProps} aiReasoning="AI suggests inclusion" />,
    );

    expect(screen.getByTestId('decision-reason-input')).toHaveValue('AI suggests inclusion');
  });

  it('calls onConfirm with reason when confirm clicked', () => {
    const onConfirm = vi.fn();
    render(<ScreeningDecisionDialog {...defaultProps} onConfirm={onConfirm} />);

    fireEvent.change(screen.getByTestId('decision-reason-input'), {
      target: { value: 'Relevant to PICO' },
    });
    fireEvent.click(screen.getByTestId('confirm-decision-btn'));

    expect(onConfirm).toHaveBeenCalledWith({ reason: 'Relevant to PICO' });
  });

  it('calls onConfirm with reason and exclusionCodeId for EXCLUDED', () => {
    const onConfirm = vi.fn();
    render(
      <ScreeningDecisionDialog
        {...defaultProps}
        decision="EXCLUDED"
        onConfirm={onConfirm}
        exclusionCodes={mockExclusionCodes}
      />,
    );

    fireEvent.change(screen.getByTestId('exclusion-code-select'), {
      target: { value: 'ec-1' },
    });
    fireEvent.change(screen.getByTestId('decision-reason-input'), {
      target: { value: 'Wrong population group' },
    });
    fireEvent.click(screen.getByTestId('confirm-decision-btn'));

    expect(onConfirm).toHaveBeenCalledWith({
      reason: 'Wrong population group',
      exclusionCodeId: 'ec-1',
    });
  });

  it('calls onCancel when cancel button clicked', () => {
    const onCancel = vi.fn();
    render(<ScreeningDecisionDialog {...defaultProps} onCancel={onCancel} />);

    fireEvent.click(screen.getByTestId('cancel-decision-btn'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('disables confirm when reason is empty for INCLUDED', () => {
    render(<ScreeningDecisionDialog {...defaultProps} />);

    const confirmBtn = screen.getByTestId('confirm-decision-btn');
    expect(confirmBtn).toBeDisabled();
  });

  it('disables confirm when exclusion code not selected for EXCLUDED', () => {
    render(
      <ScreeningDecisionDialog
        {...defaultProps}
        decision="EXCLUDED"
        exclusionCodes={mockExclusionCodes}
      />,
    );

    fireEvent.change(screen.getByTestId('decision-reason-input'), {
      target: { value: 'Some reason' },
    });

    const confirmBtn = screen.getByTestId('confirm-decision-btn');
    expect(confirmBtn).toBeDisabled();
  });

  it('enables confirm when both reason and exclusion code provided for EXCLUDED', () => {
    render(
      <ScreeningDecisionDialog
        {...defaultProps}
        decision="EXCLUDED"
        exclusionCodes={mockExclusionCodes}
      />,
    );

    fireEvent.change(screen.getByTestId('exclusion-code-select'), {
      target: { value: 'ec-1' },
    });
    fireEvent.change(screen.getByTestId('decision-reason-input'), {
      target: { value: 'Wrong population' },
    });

    const confirmBtn = screen.getByTestId('confirm-decision-btn');
    expect(confirmBtn).not.toBeDisabled();
  });
});
