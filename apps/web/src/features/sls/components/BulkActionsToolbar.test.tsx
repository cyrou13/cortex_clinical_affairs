import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BulkActionsToolbar } from './BulkActionsToolbar';

describe('BulkActionsToolbar', () => {
  const defaultProps = {
    selectedCount: 5,
    onIncludeAll: vi.fn(),
    onExcludeAll: vi.fn(),
    onDeselectAll: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when selectedCount is 0', () => {
    const { container } = render(<BulkActionsToolbar {...defaultProps} selectedCount={0} />);

    expect(container.innerHTML).toBe('');
  });

  it('renders toolbar when selectedCount > 0', () => {
    render(<BulkActionsToolbar {...defaultProps} />);

    expect(screen.getByTestId('bulk-actions-toolbar')).toBeInTheDocument();
  });

  it('shows correct count text', () => {
    render(<BulkActionsToolbar {...defaultProps} selectedCount={12} />);

    expect(screen.getByTestId('selected-count')).toHaveTextContent('12 articles selected');
  });

  it('shows singular text for 1 article', () => {
    render(<BulkActionsToolbar {...defaultProps} selectedCount={1} />);

    expect(screen.getByTestId('selected-count')).toHaveTextContent('1 article selected');
  });

  it('calls onIncludeAll when Include All clicked', () => {
    const onIncludeAll = vi.fn();
    render(<BulkActionsToolbar {...defaultProps} onIncludeAll={onIncludeAll} />);

    fireEvent.click(screen.getByTestId('bulk-include-btn'));
    expect(onIncludeAll).toHaveBeenCalledTimes(1);
  });

  it('calls onExcludeAll when Exclude All clicked', () => {
    const onExcludeAll = vi.fn();
    render(<BulkActionsToolbar {...defaultProps} onExcludeAll={onExcludeAll} />);

    fireEvent.click(screen.getByTestId('bulk-exclude-btn'));
    expect(onExcludeAll).toHaveBeenCalledTimes(1);
  });

  it('calls onDeselectAll when Deselect clicked', () => {
    const onDeselectAll = vi.fn();
    render(<BulkActionsToolbar {...defaultProps} onDeselectAll={onDeselectAll} />);

    fireEvent.click(screen.getByTestId('bulk-deselect-btn'));
    expect(onDeselectAll).toHaveBeenCalledTimes(1);
  });

  it('has dark background styling', () => {
    render(<BulkActionsToolbar {...defaultProps} />);

    const toolbar = screen.getByTestId('bulk-actions-toolbar');
    expect(toolbar.className).toContain('bg-[#07233C]');
  });
});
