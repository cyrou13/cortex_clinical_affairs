import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockUseQuery = vi.fn();
vi.mock('@apollo/client', () => ({ gql: vi.fn((s: TemplateStringsArray) => s[0]) }));
vi.mock('@apollo/client/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

import { UpstreamModuleSelector } from './UpstreamModuleSelector';

const mockModules = [
  { id: 'sls-1', name: 'SLS Session 1', type: 'SLS', lockedAt: '2024-01-01', status: 'LOCKED' },
  { id: 'soa-1', name: 'Clinical SOA', type: 'SOA', lockedAt: '2024-02-01', status: 'LOCKED' },
  { id: 'val-1', name: 'Validation Study', type: 'VALIDATION', lockedAt: null, status: 'DRAFT' },
];

describe('UpstreamModuleSelector', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue({ data: { upstreamModules: mockModules }, loading: false });
  });

  it('renders the selector container', () => {
    render(
      <UpstreamModuleSelector projectId="p-1" selectedIds={[]} onSelectionChange={mockOnChange} />,
    );
    expect(screen.getByTestId('upstream-selector')).toBeInTheDocument();
  });

  it('shows all module items', () => {
    render(
      <UpstreamModuleSelector projectId="p-1" selectedIds={[]} onSelectionChange={mockOnChange} />,
    );
    const items = screen.getAllByTestId('module-item');
    expect(items).toHaveLength(3);
  });

  it('shows locked badge for locked modules', () => {
    render(
      <UpstreamModuleSelector projectId="p-1" selectedIds={[]} onSelectionChange={mockOnChange} />,
    );
    const badges = screen.getAllByTestId('locked-badge');
    expect(badges).toHaveLength(2);
  });

  it('shows lock date for locked modules', () => {
    render(
      <UpstreamModuleSelector projectId="p-1" selectedIds={[]} onSelectionChange={mockOnChange} />,
    );
    const dates = screen.getAllByTestId('lock-date');
    expect(dates).toHaveLength(2);
  });

  it('disables checkbox for non-locked modules', () => {
    render(
      <UpstreamModuleSelector projectId="p-1" selectedIds={[]} onSelectionChange={mockOnChange} />,
    );
    const checkboxes = screen.getAllByTestId('link-checkbox');
    expect(checkboxes[2]).toBeDisabled();
  });

  it('enables checkbox for locked modules', () => {
    render(
      <UpstreamModuleSelector projectId="p-1" selectedIds={[]} onSelectionChange={mockOnChange} />,
    );
    const checkboxes = screen.getAllByTestId('link-checkbox');
    expect(checkboxes[0]).not.toBeDisabled();
  });

  it('calls onSelectionChange when checkbox toggled', () => {
    render(
      <UpstreamModuleSelector projectId="p-1" selectedIds={[]} onSelectionChange={mockOnChange} />,
    );
    const checkboxes = screen.getAllByTestId('link-checkbox');
    fireEvent.click(checkboxes[0]!);
    expect(mockOnChange).toHaveBeenCalledWith(['sls-1']);
  });

  it('deselects when already selected', () => {
    render(
      <UpstreamModuleSelector
        projectId="p-1"
        selectedIds={['sls-1']}
        onSelectionChange={mockOnChange}
      />,
    );
    const checkboxes = screen.getAllByTestId('link-checkbox');
    fireEvent.click(checkboxes[0]!);
    expect(mockOnChange).toHaveBeenCalledWith([]);
  });
});
