import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';

export const GET_EXTRACTION_GRID = gql`
  query GetExtractionGrid($soaAnalysisId: String!) {
    extractionGrid(soaAnalysisId: $soaAnalysisId) {
      id
      rows {
        id
        rowIndex
        deviceName
        cells {
          id
          columnId
          value
          confidenceLevel
          confidenceScore
          validationStatus
          sourceQuote
          pageNumber
        }
      }
      columns {
        id
        name
        category
        dataType
      }
    }
  }
`;

export const UPDATE_CELL = gql`
  mutation UpdateCell($input: UpdateCellInput!) {
    updateCell(input: $input) {
      id
      value
      validationStatus
      updatedAt
    }
  }
`;

interface Cell {
  id: string;
  columnId: string;
  value: string;
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNSCORED';
  confidenceScore?: number;
  validationStatus?: 'PENDING' | 'VALIDATED' | 'CORRECTED' | 'FLAGGED';
  sourceQuote?: string;
  pageNumber?: number;
}

interface Row {
  id: string;
  rowIndex: number;
  deviceName: string;
  cells: Cell[];
}

interface Column {
  id: string;
  name: string;
  category: string;
  dataType: string;
}

interface ExtractionGrid {
  id: string;
  rows: Row[];
  columns: Column[];
}

interface SelectedCell {
  rowId: string;
  columnId: string;
}

export function useExtractionGrid(soaAnalysisId: string) {
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);

  const { data, loading, error, refetch } = useQuery<any>(GET_EXTRACTION_GRID, {
    variables: { soaAnalysisId },
  });

  const [updateCell, { loading: updating }] = useMutation<any>(UPDATE_CELL);

  const grid: ExtractionGrid | null = data?.extractionGrid ?? null;

  const handleUpdateCell = async (cellId: string, value: string, validationStatus?: string) => {
    await updateCell({
      variables: {
        input: {
          cellId,
          value,
          validationStatus,
        },
      },
    });
    refetch();
  };

  const handleSelectCell = (rowId: string, columnId: string) => {
    setSelectedCell({ rowId, columnId });
  };

  const handleClearSelection = () => {
    setSelectedCell(null);
  };

  const getSelectedCell = (): Cell | null => {
    if (!selectedCell || !grid) return null;

    const row = grid.rows.find((r) => r.id === selectedCell.rowId);
    if (!row) return null;

    const cell = row.cells.find((c) => c.columnId === selectedCell.columnId);
    return cell ?? null;
  };

  return {
    grid,
    loading,
    error,
    selectedCell,
    selectedCellData: getSelectedCell(),
    updating,
    selectCell: handleSelectCell,
    clearSelection: handleClearSelection,
    updateCell: handleUpdateCell,
    refetch,
  };
}
