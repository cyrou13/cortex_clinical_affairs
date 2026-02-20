import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { Plus, GripVertical, Pencil, Trash2, Layout } from 'lucide-react';
import { CREATE_EXTRACTION_GRID, ADD_GRID_COLUMN } from '../graphql/mutations';
import { TemplateSelector } from './TemplateSelector';
import { TemplateEditor } from './TemplateEditor';

const RENAME_GRID_COLUMN = gql`
  mutation RenameGridColumn($gridId: String!, $columnId: String!, $newName: String!) {
    renameGridColumn(gridId: $gridId, columnId: $columnId, newName: $newName) {
      columnId
      displayName
    }
  }
`;

const REMOVE_GRID_COLUMN = gql`
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

interface ColumnDef {
  name: string;
  displayName: string;
  dataType: string;
  isRequired: boolean;
  orderIndex: number;
}

interface TemplateData {
  id: string;
  name: string;
  soaType: string;
  description?: string;
  isBuiltIn: boolean;
  columns: ColumnDef[];
}

interface GridConfiguratorProps {
  soaAnalysisId: string;
  soaType?: string;
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
  soaType,
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
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
  const [editorInitialData, setEditorInitialData] = useState<TemplateData | undefined>(undefined);

  const [createGrid, { loading: creating }] = useMutation<any>(CREATE_EXTRACTION_GRID);
  const [addColumn] = useMutation(ADD_GRID_COLUMN);
  const [renameColumn] = useMutation(RENAME_GRID_COLUMN);
  const [removeColumn] = useMutation(REMOVE_GRID_COLUMN);

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

  const handleSelectTemplate = async (templateId: string) => {
    const result = await createGrid({
      variables: { soaAnalysisId, name: 'Extraction Grid', templateId },
    });
    if (result.data?.createExtractionGrid) {
      onGridCreated?.(result.data.createExtractionGrid.gridId);
    }
  };

  const handleStartEmpty = async () => {
    const result = await createGrid({
      variables: { soaAnalysisId, name: 'Custom Grid' },
    });
    if (result.data?.createExtractionGrid) {
      onGridCreated?.(result.data.createExtractionGrid.gridId);
    }
  };

  const handleCreateNew = () => {
    setEditorMode('create');
    setEditorInitialData(undefined);
    setShowTemplateEditor(true);
  };

  const handleDuplicate = (template: TemplateData) => {
    setEditorMode('create');
    setEditorInitialData({
      ...template,
      id: undefined as any,
      name: `${template.name} (Copy)`,
    });
    setShowTemplateEditor(true);
  };

  const handleEdit = (template: TemplateData) => {
    setEditorMode('edit');
    setEditorInitialData(template);
    setShowTemplateEditor(true);
  };

  if (!gridId) {
    return (
      <div data-testid="grid-configurator">
        {soaType ? (
          <TemplateSelector
            soaType={soaType}
            onSelectTemplate={handleSelectTemplate}
            onStartEmpty={handleStartEmpty}
            onCreateNew={handleCreateNew}
            onDuplicate={handleDuplicate}
            onEdit={handleEdit}
          />
        ) : (
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--cortex-text-primary)]">
              <Layout size={14} /> Create Extraction Grid
            </h3>
            <button
              type="button"
              disabled={creating}
              onClick={handleStartEmpty}
              className="w-full rounded border-2 border-dashed border-[var(--cortex-border)] p-3 text-sm text-[var(--cortex-text-muted)] hover:bg-gray-50"
              data-testid="create-empty-grid-btn"
            >
              Start with empty grid
            </button>
          </div>
        )}

        {showTemplateEditor && (
          <TemplateEditor
            mode={editorMode}
            initialData={editorInitialData}
            defaultSoaType={soaType}
            onSave={() => setShowTemplateEditor(false)}
            onCancel={() => setShowTemplateEditor(false)}
          />
        )}
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
        <div
          className="rounded border border-blue-200 bg-blue-50 p-3 space-y-2"
          data-testid="add-column-form"
        >
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
              <option key={dt.value} value={dt.value}>
                {dt.label}
              </option>
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
