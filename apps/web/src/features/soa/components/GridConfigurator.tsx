import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { Plus, GripVertical, Pencil, Trash2, Layout } from 'lucide-react';

export const GET_GRID_TEMPLATES = gql`
  query GetGridTemplates {
    gridTemplates {
      id
      name
      soaType
      columns {
        name
        displayName
        dataType
      }
    }
  }
`;

export const CREATE_EXTRACTION_GRID = gql`
  mutation CreateExtractionGrid($soaAnalysisId: String!, $name: String!, $templateId: String) {
    createExtractionGrid(soaAnalysisId: $soaAnalysisId, name: $name, templateId: $templateId) {
      gridId
      columnCount
    }
  }
`;

export const ADD_GRID_COLUMN = gql`
  mutation AddGridColumn($gridId: String!, $name: String!, $displayName: String!, $dataType: String!) {
    addGridColumn(gridId: $gridId, name: $name, displayName: $displayName, dataType: $dataType) {
      columnId
    }
  }
`;

export const RENAME_GRID_COLUMN = gql`
  mutation RenameGridColumn($gridId: String!, $columnId: String!, $newName: String!) {
    renameGridColumn(gridId: $gridId, columnId: $columnId, newName: $newName) {
      columnId
      displayName
    }
  }
`;

export const REMOVE_GRID_COLUMN = gql`
  mutation RemoveGridColumn($gridId: String!, $columnId: String!) {
    removeGridColumn(gridId: $gridId, columnId: $columnId) {
      columnId
      removed
    }
  }
`;

interface Column {
  id: string;
  name: string;
  displayName: string;
  dataType: string;
  orderIndex: number;
}

interface GridConfiguratorProps {
  soaAnalysisId: string;
  gridId?: string;
  columns: Column[];
  onGridCreated?: (gridId: string) => void;
  onColumnChanged?: () => void;
}

const DATA_TYPES = [
  { value: 'TEXT', label: 'Text' },
  { value: 'NUMERIC', label: 'Numeric' },
  { value: 'BOOLEAN', label: 'Boolean' },
  { value: 'DATE', label: 'Date' },
];

export function GridConfigurator({
  soaAnalysisId,
  gridId,
  columns,
  onGridCreated,
  onColumnChanged,
}: GridConfiguratorProps) {
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColType, setNewColType] = useState('TEXT');
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const { data: templatesData } = useQuery(GET_GRID_TEMPLATES);
  const [createGrid, { loading: creating }] = useMutation(CREATE_EXTRACTION_GRID);
  const [addColumn] = useMutation(ADD_GRID_COLUMN);
  const [renameColumn] = useMutation(RENAME_GRID_COLUMN);
  const [removeColumn] = useMutation(REMOVE_GRID_COLUMN);

  const templates = templatesData?.gridTemplates ?? [];

  const handleCreateFromTemplate = async (templateId: string) => {
    const result = await createGrid({
      variables: { soaAnalysisId, name: 'Extraction Grid', templateId },
    });
    if (result.data?.createExtractionGrid) {
      onGridCreated?.(result.data.createExtractionGrid.gridId);
    }
  };

  const handleAddColumn = async () => {
    if (!gridId || !newColName.trim()) return;
    await addColumn({
      variables: {
        gridId,
        name: newColName.toLowerCase().replace(/\s+/g, '_'),
        displayName: newColName.trim(),
        dataType: newColType,
      },
    });
    setNewColName('');
    setShowAddColumn(false);
    onColumnChanged?.();
  };

  const handleRename = async (columnId: string) => {
    if (!gridId || !editingName.trim()) return;
    await renameColumn({
      variables: { gridId, columnId, newName: editingName.trim() },
    });
    setEditingColumnId(null);
    onColumnChanged?.();
  };

  const handleRemove = async (columnId: string) => {
    if (!gridId) return;
    await removeColumn({ variables: { gridId, columnId } });
    onColumnChanged?.();
  };

  if (!gridId) {
    return (
      <div className="space-y-3" data-testid="grid-configurator">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--cortex-text-primary)]">
          <Layout size={14} /> Create Extraction Grid
        </h3>
        <div className="space-y-2" data-testid="template-list">
          {templates.map((t: { id: string; name: string }) => (
            <button
              key={t.id}
              type="button"
              onClick={() => handleCreateFromTemplate(t.id)}
              disabled={creating}
              className="w-full rounded border border-[var(--cortex-border)] p-3 text-left text-sm hover:bg-[var(--cortex-bg-muted)]"
              data-testid={`template-${t.id}`}
            >
              {t.name}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={async () => {
            const result = await createGrid({
              variables: { soaAnalysisId, name: 'Custom Grid' },
            });
            if (result.data?.createExtractionGrid) {
              onGridCreated?.(result.data.createExtractionGrid.gridId);
            }
          }}
          className="w-full rounded border-2 border-dashed border-[var(--cortex-border)] p-3 text-sm text-[var(--cortex-text-muted)]"
          data-testid="create-empty-grid-btn"
        >
          Start with empty grid
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="grid-configurator">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--cortex-text-primary)]">
          Columns ({columns.length})
        </h3>
        <button
          type="button"
          onClick={() => setShowAddColumn(true)}
          className="inline-flex items-center gap-1 text-xs text-blue-600"
          data-testid="add-column-btn"
        >
          <Plus size={12} /> Add Column
        </button>
      </div>

      <div className="space-y-1" data-testid="column-list">
        {columns.map((col) => (
          <div
            key={col.id}
            className="flex items-center gap-2 rounded border border-[var(--cortex-border)] p-2"
            data-testid={`column-item-${col.id}`}
          >
            <GripVertical size={14} className="cursor-grab text-[var(--cortex-text-muted)]" />
            {editingColumnId === col.id ? (
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={() => handleRename(col.id)}
                onKeyDown={(e) => e.key === 'Enter' && handleRename(col.id)}
                className="flex-1 rounded border px-2 py-0.5 text-sm"
                data-testid="column-rename-input"
                autoFocus
              />
            ) : (
              <span className="flex-1 text-sm">{col.displayName}</span>
            )}
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
              {col.dataType}
            </span>
            <button
              type="button"
              onClick={() => {
                setEditingColumnId(col.id);
                setEditingName(col.displayName);
              }}
              className="text-[var(--cortex-text-muted)] hover:text-blue-600"
              data-testid={`rename-col-${col.id}`}
            >
              <Pencil size={12} />
            </button>
            <button
              type="button"
              onClick={() => handleRemove(col.id)}
              className="text-[var(--cortex-text-muted)] hover:text-red-600"
              data-testid={`remove-col-${col.id}`}
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>

      {showAddColumn && (
        <div className="rounded border border-blue-200 bg-blue-50 p-3 space-y-2" data-testid="add-column-form">
          <input
            type="text"
            value={newColName}
            onChange={(e) => setNewColName(e.target.value)}
            placeholder="Column name"
            className="w-full rounded border px-2 py-1.5 text-sm"
            data-testid="new-column-name"
          />
          <select
            value={newColType}
            onChange={(e) => setNewColType(e.target.value)}
            className="w-full rounded border px-2 py-1.5 text-sm"
            data-testid="new-column-type"
          >
            {DATA_TYPES.map((dt) => (
              <option key={dt.value} value={dt.value}>{dt.label}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAddColumn}
              className="rounded bg-blue-600 px-3 py-1 text-xs text-white"
              data-testid="confirm-add-column"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setShowAddColumn(false)}
              className="rounded border px-3 py-1 text-xs"
              data-testid="cancel-add-column"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
