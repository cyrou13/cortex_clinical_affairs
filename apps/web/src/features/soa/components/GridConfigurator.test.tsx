import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@apollo/client', () => ({
  gql: (str: TemplateStringsArray) => str[0],
}));

const mockUseMutation = vi.fn();
const mockUseQuery = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

// Mock child components
vi.mock('./TemplateSelector', () => ({
  TemplateSelector: (props: any) => (
    <div data-testid="template-selector-mock">
      <button data-testid="mock-select-tpl" onClick={() => props.onSelectTemplate('tpl-1')}>
        Select
      </button>
      <button data-testid="mock-start-empty" onClick={() => props.onStartEmpty()}>
        Empty
      </button>
      <button data-testid="mock-create-new" onClick={() => props.onCreateNew()}>
        Create
      </button>
    </div>
  ),
}));

vi.mock('./TemplateEditor', () => ({
  TemplateEditor: (props: any) => (
    <div data-testid="template-editor-mock">
      <button data-testid="mock-editor-save" onClick={() => props.onSave()}>
        Save
      </button>
      <button data-testid="mock-editor-cancel" onClick={() => props.onCancel()}>
        Cancel
      </button>
    </div>
  ),
}));

import { GridConfigurator } from './GridConfigurator';

const mockColumns = [
  { id: 'col-1', name: 'author', displayName: 'Author', dataType: 'TEXT', orderIndex: 0 },
  { id: 'col-2', name: 'year', displayName: 'Year', dataType: 'NUMERIC', orderIndex: 1 },
];

describe('GridConfigurator', () => {
  const mockCreateGrid = vi
    .fn()
    .mockResolvedValue({ data: { createExtractionGrid: { gridId: 'grid-1', columnCount: 2 } } });
  const mockAddColumn = vi
    .fn()
    .mockResolvedValue({ data: { addGridColumn: { columnId: 'col-new' } } });
  const mockRenameColumn = vi
    .fn()
    .mockResolvedValue({
      data: { renameGridColumn: { columnId: 'col-1', displayName: 'New Name' } },
    });
  const mockRemoveColumn = vi
    .fn()
    .mockResolvedValue({ data: { removeGridColumn: { columnId: 'col-1', removed: true } } });

  beforeEach(() => {
    vi.clearAllMocks();
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
    mockUseQuery.mockReturnValue({
      data: { gridTemplates: [] },
      loading: false,
      refetch: vi.fn(),
    });
  });

  it('shows template selector when soaType is provided and no grid exists', () => {
    render(<GridConfigurator soaAnalysisId="soa-1" soaType="CLINICAL" columns={[]} />);
    expect(screen.getByTestId('template-selector-mock')).toBeInTheDocument();
  });

  it('shows create empty grid button when no soaType and no grid', () => {
    render(<GridConfigurator soaAnalysisId="soa-1" columns={[]} />);
    expect(screen.getByTestId('create-empty-grid-btn')).toBeInTheDocument();
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

  it('opens template editor when create new is triggered', () => {
    render(<GridConfigurator soaAnalysisId="soa-1" soaType="CLINICAL" columns={[]} />);
    fireEvent.click(screen.getByTestId('mock-create-new'));
    expect(screen.getByTestId('template-editor-mock')).toBeInTheDocument();
  });
});
