import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@apollo/client', () => ({
  gql: (str: TemplateStringsArray) => str[0],
}));

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

import { useExtractionGrid } from './useExtractionGrid';

const mockGridData = {
  extractionGrid: {
    id: 'grid-1',
    rows: [
      {
        id: 'row-1',
        rowIndex: 0,
        deviceName: 'Device A',
        cells: [
          {
            id: 'cell-1',
            columnId: 'col-1',
            value: '95.5',
            confidenceLevel: 'HIGH',
            confidenceScore: 98,
            validationStatus: 'VALIDATED',
            sourceQuote: 'The accuracy is 95.5%',
            pageNumber: 10,
          },
          {
            id: 'cell-2',
            columnId: 'col-2',
            value: 'Yes',
            confidenceLevel: 'MEDIUM',
            confidenceScore: 75,
            validationStatus: 'PENDING',
          },
        ],
      },
      {
        id: 'row-2',
        rowIndex: 1,
        deviceName: 'Device B',
        cells: [
          {
            id: 'cell-3',
            columnId: 'col-1',
            value: '92.3',
            confidenceLevel: 'MEDIUM',
            confidenceScore: 80,
            validationStatus: 'CORRECTED',
          },
        ],
      },
    ],
    columns: [
      {
        id: 'col-1',
        name: 'Accuracy',
        category: 'Performance',
        dataType: 'NUMBER',
      },
      {
        id: 'col-2',
        name: 'FDA Approved',
        category: 'Regulatory',
        dataType: 'BOOLEAN',
      },
    ],
  },
};

describe('useExtractionGrid', () => {
  const mockUpdate = vi.fn().mockResolvedValue({
    data: {
      updateCell: {
        id: 'cell-1',
        value: '96.0',
        validationStatus: 'VALIDATED',
        updatedAt: '2026-02-15',
      },
    },
  });
  const mockRefetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockReturnValue([mockUpdate, { loading: false }]);
  });

  it('returns loading state', () => {
    mockUseQuery.mockReturnValue({ data: null, loading: true, error: null, refetch: mockRefetch });

    const { result } = renderHook(() => useExtractionGrid('soa-1'));

    expect(result.current.loading).toBe(true);
    expect(result.current.grid).toBeNull();
  });

  it('returns error state', () => {
    const error = new Error('Failed');
    mockUseQuery.mockReturnValue({ data: null, loading: false, error, refetch: mockRefetch });

    const { result } = renderHook(() => useExtractionGrid('soa-1'));

    expect(result.current.error).toBe(error);
    expect(result.current.grid).toBeNull();
  });

  it('returns grid data', () => {
    mockUseQuery.mockReturnValue({
      data: mockGridData,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { result } = renderHook(() => useExtractionGrid('soa-1'));

    expect(result.current.grid).toEqual(mockGridData.extractionGrid);
    expect(result.current.loading).toBe(false);
  });

  it('handles cell selection', () => {
    mockUseQuery.mockReturnValue({
      data: mockGridData,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { result } = renderHook(() => useExtractionGrid('soa-1'));

    act(() => {
      result.current.selectCell('row-1', 'col-1');
    });

    expect(result.current.selectedCell).toEqual({ rowId: 'row-1', columnId: 'col-1' });
  });

  it('returns selected cell data', () => {
    mockUseQuery.mockReturnValue({
      data: mockGridData,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { result } = renderHook(() => useExtractionGrid('soa-1'));

    act(() => {
      result.current.selectCell('row-1', 'col-1');
    });

    expect(result.current.selectedCellData).toEqual({
      id: 'cell-1',
      columnId: 'col-1',
      value: '95.5',
      confidenceLevel: 'HIGH',
      confidenceScore: 98,
      validationStatus: 'VALIDATED',
      sourceQuote: 'The accuracy is 95.5%',
      pageNumber: 10,
    });
  });

  it('clears cell selection', () => {
    mockUseQuery.mockReturnValue({
      data: mockGridData,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { result } = renderHook(() => useExtractionGrid('soa-1'));

    act(() => {
      result.current.selectCell('row-1', 'col-1');
    });

    expect(result.current.selectedCell).not.toBeNull();

    act(() => {
      result.current.clearSelection();
    });

    expect(result.current.selectedCell).toBeNull();
    expect(result.current.selectedCellData).toBeNull();
  });

  it('updates cell value', async () => {
    mockUseQuery.mockReturnValue({
      data: mockGridData,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { result } = renderHook(() => useExtractionGrid('soa-1'));

    await act(async () => {
      await result.current.updateCell('cell-1', '96.0', 'VALIDATED');
    });

    expect(mockUpdate).toHaveBeenCalledWith({
      variables: {
        input: {
          cellId: 'cell-1',
          value: '96.0',
          validationStatus: 'VALIDATED',
        },
      },
    });

    expect(mockRefetch).toHaveBeenCalled();
  });

  it('returns null for selected cell data when no selection', () => {
    mockUseQuery.mockReturnValue({
      data: mockGridData,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { result } = renderHook(() => useExtractionGrid('soa-1'));

    expect(result.current.selectedCellData).toBeNull();
  });

  it('returns null for selected cell data when cell not found', () => {
    mockUseQuery.mockReturnValue({
      data: mockGridData,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { result } = renderHook(() => useExtractionGrid('soa-1'));

    act(() => {
      result.current.selectCell('row-999', 'col-999');
    });

    expect(result.current.selectedCellData).toBeNull();
  });
});
