import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LockConfirmationDialog } from './LockConfirmationDialog';

const defaultProps = {
  includedCount: 641,
  excludedCount: 3880,
  pendingCount: 0,
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
};

describe('LockConfirmationDialog', () => {
  it('renders dialog with all elements', () => {
    render(<LockConfirmationDialog {...defaultProps} />);

    expect(screen.getByTestId('lock-confirmation-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('lock-dialog-content')).toBeInTheDocument();
    expect(screen.getByTestId('lock-recap')).toBeInTheDocument();
    expect(screen.getByTestId('lock-checkbox')).toBeInTheDocument();
    expect(screen.getByTestId('lock-confirm-btn')).toBeInTheDocument();
    expect(screen.getByTestId('lock-cancel-btn')).toBeInTheDocument();
  });

  it('displays article counts in recap', () => {
    render(<LockConfirmationDialog {...defaultProps} />);

    expect(screen.getByTestId('recap-included')).toHaveTextContent('641');
    expect(screen.getByTestId('recap-excluded')).toHaveTextContent('3880');
    expect(screen.getByTestId('recap-pending')).toHaveTextContent('0');
  });

  it('confirm button disabled by default', () => {
    render(<LockConfirmationDialog {...defaultProps} />);

    expect(screen.getByTestId('lock-confirm-btn')).toBeDisabled();
  });

  it('confirm button enabled after checkbox', () => {
    render(<LockConfirmationDialog {...defaultProps} />);

    fireEvent.click(screen.getByTestId('lock-checkbox'));

    expect(screen.getByTestId('lock-confirm-btn')).not.toBeDisabled();
  });

  it('calls onConfirm when confirmed', () => {
    const onConfirm = vi.fn();
    render(<LockConfirmationDialog {...defaultProps} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByTestId('lock-checkbox'));
    fireEvent.click(screen.getByTestId('lock-confirm-btn'));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when cancel clicked', () => {
    const onCancel = vi.fn();
    render(<LockConfirmationDialog {...defaultProps} onCancel={onCancel} />);

    fireEvent.click(screen.getByTestId('lock-cancel-btn'));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when backdrop clicked', () => {
    const onCancel = vi.fn();
    render(<LockConfirmationDialog {...defaultProps} onCancel={onCancel} />);

    fireEvent.click(screen.getByTestId('lock-dialog-backdrop'));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows loading state', () => {
    render(<LockConfirmationDialog {...defaultProps} loading={true} />);

    fireEvent.click(screen.getByTestId('lock-checkbox'));

    expect(screen.getByTestId('lock-confirm-btn')).toBeDisabled();
    expect(screen.getByTestId('lock-confirm-btn')).toHaveTextContent('Locking...');
  });

  it('contains irreversibility warning text', () => {
    render(<LockConfirmationDialog {...defaultProps} />);

    expect(screen.getByTestId('lock-checkbox-label')).toHaveTextContent(
      'I understand this action is irreversible',
    );
  });
});
