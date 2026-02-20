import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { Table, Download, Sparkles } from 'lucide-react';
import { GET_GRID_COLUMNS, GET_GRID_CELLS } from '../graphql/queries';
import { UPDATE_GRID_CELL } from '../graphql/mutations';

interface Column {
  id: string;
  name: string;
  displayName: string;
  dataType: string;
  orderIndex: number;
}

interface Cell {
  id: string;
  articleId: string;
  gridColumnId: string;
  value: string | null;
  aiExtractedValue: string | null;
  confidenceLevel: string | null;
  validationStatus: string;
}

interface ExtractionGridPageProps {
  gridId: string;
  soaStatus?: string;
}

export function ExtractionGridPage({ gridId, soaStatus }: ExtractionGridPageProps) {
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const { data: columnsData, loading: colsLoading } = useQuery<any>(GET_GRID_COLUMNS, {
    variables: { gridId },
  });

  const { data: cellsData, loading: cellsLoading } = useQuery<any>(GET_GRID_CELLS, {
    variables: { gridId },
  });

  const [updateCell] = useMutation(UPDATE_GRID_CELL);

  const isLocked = soaStatus === 'LOCKED';

  if (colsLoading || cellsLoading) {
    return (
      <div
        className="py-8 text-center text-sm text-[var(--cortex-text-muted)]"
        data-testid="grid-loading"
      >
        Loading extraction grid...
      </div>
    );
  }

  const columns: Column[] = [...(columnsData?.gridColumns ?? [])].sort(
    (a: Column, b: Column) => a.orderIndex - b.orderIndex,
  );
  const cells: Cell[] = cellsData?.gridCells ?? [];

  const articleIds = [...new Set(cells.map((c) => c.articleId))];
  const totalArticles = articleIds.length;

  const getCellValue = (articleId: string, columnId: string) => {
    const cell = cells.find((c) => c.articleId === articleId && c.gridColumnId === columnId);
    return cell?.value ?? cell?.aiExtractedValue ?? '';
  };

  const getCellKey = (articleId: string, columnId: string) => `${articleId}-${columnId}`;

  const handleCellClick = (articleId: string, columnId: string) => {
    if (isLocked) return;
    const key = getCellKey(articleId, columnId);
    setEditingCell(key);
    setEditValue(getCellValue(articleId, columnId));
  };

  const handleCellBlur = async (articleId: string, columnId: string) => {
    setEditingCell(null);
    await updateCell({
      variables: { gridId, articleId, columnId, value: editValue || null },
    });
  };

  const handleExport = () => {
    const header = columns.map((c) => c.displayName).join(',');
    const rows = articleIds.map((artId) =>
      columns.map((col) => `"${getCellValue(artId, col.id).replace(/"/g, '""')}"`).join(','),
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'extraction-grid.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4" data-testid="extraction-grid-page">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Table size={16} className="text-[var(--cortex-blue-500)]" />
          <h3 className="text-lg font-semibold text-[var(--cortex-text-primary)]">
            Extraction Grid
          </h3>
          <span className="text-xs text-[var(--cortex-text-muted)]" data-testid="article-count">
            {totalArticles} articles
          </span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-1 rounded border px-3 py-1.5 text-xs opacity-50"
            data-testid="ai-prefill-btn"
          >
            <Sparkles size={12} /> AI Pre-fill
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1 rounded border border-[var(--cortex-border)] px-3 py-1.5 text-xs hover:bg-gray-50"
            data-testid="export-btn"
          >
            <Download size={12} /> Export CSV
          </button>
        </div>
      </div>

      {columns.length === 0 ? (
        <div
          className="py-8 text-center text-sm text-[var(--cortex-text-muted)]"
          data-testid="no-columns"
        >
          No columns configured. Add columns or select a template.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--cortex-border)]">
          <table className="w-full text-sm" data-testid="extraction-table">
            <thead>
              <tr className="bg-blue-800 text-white">
                {columns.map((col) => (
                  <th
                    key={col.id}
                    className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium"
                    data-testid={`col-header-${col.id}`}
                  >
                    {col.displayName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {articleIds.map((artId, rowIdx) => (
                <tr
                  key={artId}
                  className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-[#F8F9FA]'}
                  data-testid={`grid-row-${artId}`}
                >
                  {columns.map((col) => {
                    const cellKey = getCellKey(artId, col.id);
                    const isEditing = editingCell === cellKey;
                    return (
                      <td
                        key={col.id}
                        className="border-r border-[#ECF0F1] px-3 py-1.5 text-[var(--cortex-text-primary)]"
                        onClick={() => handleCellClick(artId, col.id)}
                        data-testid={`cell-${artId}-${col.id}`}
                      >
                        {isEditing ? (
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleCellBlur(artId, col.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === 'Tab') {
                                handleCellBlur(artId, col.id);
                              }
                            }}
                            className="w-full border-none bg-blue-50 px-1 py-0.5 text-sm outline-none"
                            data-testid="cell-editor"
                            autoFocus
                          />
                        ) : (
                          getCellValue(artId, col.id) || <span className="text-gray-300">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
