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

import { GridConfigurator } from './GridConfigurator';

const mockColumns = [
  { id: 'col-1', name: 'author', displayName: 'Author', dataType: 'TEXT', orderIndex: 0 },
  { id: 'col-2', name: 'year', displayName: 'Year', dataType: 'NUMERIC', orderIndex: 1 },
];

const mockTemplates = [
  { id: 'tpl-clinical-default', name: 'Clinical SOA — Default', soaType: 'CLINICAL', columns: [] },
];

describe('GridConfigurator', () => {
  const mockCreateGrid = vi.fn().mockResolvedValue({ data: { createExtractionGrid: { gridId: 'grid-1', columnCount: 12 } } });
  const mockAddColumn = vi.fn().mockResolvedValue({ data: { addGridColumn: { columnId: 'col-new' } } });
  const mockRenameColumn = vi.fn().mockResolvedValue({ data: { renameGridColumn: { columnId: 'col-1', displayName: 'New Name' } } });
  const mockRemoveColumn = vi.fn().mockResolvedValue({ data: { removeGridColumn: { columnId: 'col-1', removed: true } } });

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue({ data: { gridTemplates: mockTemplates } });
    const mutationReturns = [
      [mockCreateGrid, { loading: false }],
      [mockAddColumn, { loading: false }],
      [mockRenameColumn, { loading: false }],
      [mockRemoveColumn, { loading: false }],
    ];
    let mutationCallIndex = 0;
    mockUseMutation.mockImplementation(() => {
      const result = mutationReturns[mutationCallIndex % mutationReturns.length];
      mutationCallIndex++;
      return result;
    });
  });

  it('shows template list when no grid exists', () => {
    render(<GridConfigurator soaAnalysisId="soa-1" columns={[]} />);
    expect(screen.getByTestId('template-list')).toBeInTheDocument();
  });

  it('shows create empty grid button', () => {
    render(<GridConfigurator soaAnalysisId="soa-1" columns={[]} />);
    expect(screen.getByTestId('create-empty-grid-btn')).toBeInTheDocument();
  });

  it('shows template buttons', () => {
    render(<GridConfigurator soaAnalysisId="soa-1" columns={[]} />);
    expect(screen.getByTestId('template-tpl-clinical-default')).toBeInTheDocument();
  });

  it('calls create mutation on template select', async () => {
    render(<GridConfigurator soaAnalysisId="soa-1" columns={[]} />);
    fireEvent.click(screen.getByTestId('template-tpl-clinical-default'));

    await waitFor(() => {
      expect(mockCreateGrid).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            templateId: 'tpl-clinical-default',
          }),
        }),
      );
    });
  });

  it('shows column list when grid exists', () => {
    render(<GridConfigurator soaAnalysisId="soa-1" gridId="grid-1" columns={mockColumns} />);
    expect(screen.getByTestId('column-list')).toBeInTheDocument();
    expect(screen.getByTestId('column-item-col-1')).toBeInTheDocument();
    expect(screen.getByTestId('column-item-col-2')).toBeInTheDocument();
  });

  it('shows add column button', () => {
    render(<GridConfigurator soaAnalysisId="soa-1" gridId="grid-1" columns={mockColumns} />);
    expect(screen.getByTestId('add-column-btn')).toBeInTheDocument();
  });

  it('shows add column form when clicked', () => {
    render(<GridConfigurator soaAnalysisId="soa-1" gridId="grid-1" columns={mockColumns} />);
    fireEvent.click(screen.getByTestId('add-column-btn'));
    expect(screen.getByTestId('add-column-form')).toBeInTheDocument();
    expect(screen.getByTestId('new-column-name')).toBeInTheDocument();
    expect(screen.getByTestId('new-column-type')).toBeInTheDocument();
  });

  it('shows rename/remove buttons per column', () => {
    render(<GridConfigurator soaAnalysisId="soa-1" gridId="grid-1" columns={mockColumns} />);
    expect(screen.getByTestId('rename-col-col-1')).toBeInTheDocument();
    expect(screen.getByTestId('remove-col-col-1')).toBeInTheDocument();
  });

  it('shows inline rename input when edit clicked', () => {
    render(<GridConfigurator soaAnalysisId="soa-1" gridId="grid-1" columns={mockColumns} />);
    fireEvent.click(screen.getByTestId('rename-col-col-1'));
    expect(screen.getByTestId('column-rename-input')).toBeInTheDocument();
  });

  it('shows column count', () => {
    render(<GridConfigurator soaAnalysisId="soa-1" gridId="grid-1" columns={mockColumns} />);
    expect(screen.getByTestId('grid-configurator')).toHaveTextContent('Columns (2)');
  });
});
