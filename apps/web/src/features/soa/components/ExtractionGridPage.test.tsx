import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@apollo/client', () => ({
  gql: (str: TemplateStringsArray) => str[0],
}));

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

import { ExtractionGridPage } from './ExtractionGridPage';

const mockColumns = [
  { id: 'col-1', name: 'author', displayName: 'Author', dataType: 'TEXT', orderIndex: 0 },
  { id: 'col-2', name: 'year', displayName: 'Year', dataType: 'NUMERIC', orderIndex: 1 },
];

const mockCells = [
  { id: 'c1', articleId: 'art-1', gridColumnId: 'col-1', value: 'Smith J', aiExtractedValue: null, confidenceLevel: null, validationStatus: 'PENDING' },
  { id: 'c2', articleId: 'art-1', gridColumnId: 'col-2', value: '2023', aiExtractedValue: null, confidenceLevel: null, validationStatus: 'PENDING' },
  { id: 'c3', articleId: 'art-2', gridColumnId: 'col-1', value: 'Doe A', aiExtractedValue: null, confidenceLevel: null, validationStatus: 'PENDING' },
  { id: 'c4', articleId: 'art-2', gridColumnId: 'col-2', value: '2022', aiExtractedValue: null, confidenceLevel: null, validationStatus: 'PENDING' },
];

describe('ExtractionGridPage', () => {
  const mockUpdateCell = vi.fn().mockResolvedValue({ data: { updateGridCell: { cellId: 'c1', value: 'new', validationStatus: 'PENDING' } } });

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockReturnValue([mockUpdateCell, { loading: false }]);
  });

  it('renders loading state', () => {
    mockUseQuery.mockReturnValue({ data: null, loading: true });
    render(<ExtractionGridPage gridId="grid-1" />);
    expect(screen.getByTestId('grid-loading')).toBeInTheDocument();
  });

  it('renders table with columns', () => {
    mockUseQuery.mockImplementation((_q: unknown, opts: { variables?: { offset?: number } }) => {
      if (opts?.variables && 'offset' in opts.variables) {
        return { data: { extractionGridCells: { items: mockCells, total: 2, offset: 0, limit: 100 } }, loading: false };
      }
      return { data: { extractionGrid: { id: 'grid-1', name: 'Grid', columns: mockColumns } }, loading: false };
    });
    render(<ExtractionGridPage gridId="grid-1" />);
    expect(screen.getByTestId('extraction-table')).toBeInTheDocument();
    expect(screen.getByTestId('col-header-col-1')).toHaveTextContent('Author');
    expect(screen.getByTestId('col-header-col-2')).toHaveTextContent('Year');
  });

  it('renders rows with cell values', () => {
    mockUseQuery.mockImplementation((_q: unknown, opts: { variables?: { offset?: number } }) => {
      if (opts?.variables && 'offset' in opts.variables) {
        return { data: { extractionGridCells: { items: mockCells, total: 2, offset: 0, limit: 100 } }, loading: false };
      }
      return { data: { extractionGrid: { id: 'grid-1', name: 'Grid', columns: mockColumns } }, loading: false };
    });
    render(<ExtractionGridPage gridId="grid-1" />);
    expect(screen.getByTestId('grid-row-art-1')).toBeInTheDocument();
    expect(screen.getByTestId('grid-row-art-2')).toBeInTheDocument();
    expect(screen.getByTestId('cell-art-1-col-1')).toHaveTextContent('Smith J');
  });

  it('shows article count', () => {
    mockUseQuery.mockImplementation((_q: unknown, opts: { variables?: { offset?: number } }) => {
      if (opts?.variables && 'offset' in opts.variables) {
        return { data: { extractionGridCells: { items: mockCells, total: 2, offset: 0, limit: 100 } }, loading: false };
      }
      return { data: { extractionGrid: { id: 'grid-1', name: 'Grid', columns: mockColumns } }, loading: false };
    });
    render(<ExtractionGridPage gridId="grid-1" />);
    expect(screen.getByTestId('article-count')).toHaveTextContent('2 articles');
  });

  it('shows cell editor on click', () => {
    mockUseQuery.mockImplementation((_q: unknown, opts: { variables?: { offset?: number } }) => {
      if (opts?.variables && 'offset' in opts.variables) {
        return { data: { extractionGridCells: { items: mockCells, total: 2, offset: 0, limit: 100 } }, loading: false };
      }
      return { data: { extractionGrid: { id: 'grid-1', name: 'Grid', columns: mockColumns } }, loading: false };
    });
    render(<ExtractionGridPage gridId="grid-1" />);
    fireEvent.click(screen.getByTestId('cell-art-1-col-1'));
    expect(screen.getByTestId('cell-editor')).toBeInTheDocument();
  });

  it('does not allow editing when locked', () => {
    mockUseQuery.mockImplementation((_q: unknown, opts: { variables?: { offset?: number } }) => {
      if (opts?.variables && 'offset' in opts.variables) {
        return { data: { extractionGridCells: { items: mockCells, total: 2, offset: 0, limit: 100 } }, loading: false };
      }
      return { data: { extractionGrid: { id: 'grid-1', name: 'Grid', columns: mockColumns } }, loading: false };
    });
    render(<ExtractionGridPage gridId="grid-1" soaStatus="LOCKED" />);
    fireEvent.click(screen.getByTestId('cell-art-1-col-1'));
    expect(screen.queryByTestId('cell-editor')).not.toBeInTheDocument();
  });

  it('shows export button', () => {
    mockUseQuery.mockImplementation((_q: unknown, opts: { variables?: { offset?: number } }) => {
      if (opts?.variables && 'offset' in opts.variables) {
        return { data: { extractionGridCells: { items: [], total: 0, offset: 0, limit: 100 } }, loading: false };
      }
      return { data: { extractionGrid: { id: 'grid-1', name: 'Grid', columns: mockColumns } }, loading: false };
    });
    render(<ExtractionGridPage gridId="grid-1" />);
    expect(screen.getByTestId('export-btn')).toBeInTheDocument();
  });

  it('shows AI pre-fill button (disabled)', () => {
    mockUseQuery.mockImplementation((_q: unknown, opts: { variables?: { offset?: number } }) => {
      if (opts?.variables && 'offset' in opts.variables) {
        return { data: { extractionGridCells: { items: [], total: 0, offset: 0, limit: 100 } }, loading: false };
      }
      return { data: { extractionGrid: { id: 'grid-1', name: 'Grid', columns: mockColumns } }, loading: false };
    });
    render(<ExtractionGridPage gridId="grid-1" />);
    expect(screen.getByTestId('ai-prefill-btn')).toBeDisabled();
  });

  it('shows no columns message when empty', () => {
    mockUseQuery.mockImplementation((_q: unknown, opts: { variables?: { offset?: number } }) => {
      if (opts?.variables && 'offset' in opts.variables) {
        return { data: { extractionGridCells: { items: [], total: 0, offset: 0, limit: 100 } }, loading: false };
      }
      return { data: { extractionGrid: { id: 'grid-1', name: 'Grid', columns: [] } }, loading: false };
    });
    render(<ExtractionGridPage gridId="grid-1" />);
    expect(screen.getByTestId('no-columns')).toBeInTheDocument();
  });
});
