import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Plus, Trash2, GripVertical, X, Save } from 'lucide-react';
import { CREATE_GRID_TEMPLATE, UPDATE_GRID_TEMPLATE } from '../graphql/mutations';

interface ColumnDef {
  name: string;
  displayName: string;
  dataType: string;
  isRequired: boolean;
  orderIndex: number;
}

interface TemplateEditorProps {
  mode: 'create' | 'edit';
  initialData?: {
    id?: string;
    name: string;
    soaType: string;
    description?: string;
    columns: ColumnDef[];
  };
  defaultSoaType?: string;
  onSave: () => void;
  onCancel: () => void;
}

const DATA_TYPES = [
  { value: 'TEXT', label: 'Text' },
  { value: 'NUMERIC', label: 'Numeric' },
  { value: 'BOOLEAN', label: 'Boolean' },
  { value: 'DATE', label: 'Date' },
  { value: 'ENUM', label: 'Enum' },
];

const SOA_TYPES = [
  { value: 'CLINICAL', label: 'Clinical' },
  { value: 'SIMILAR_DEVICE', label: 'Similar Device' },
  { value: 'ALTERNATIVE', label: 'Alternative' },
];

export function TemplateEditor({
  mode,
  initialData,
  defaultSoaType,
  onSave,
  onCancel,
}: TemplateEditorProps) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [soaType, setSoaType] = useState(initialData?.soaType ?? defaultSoaType ?? 'CLINICAL');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [columns, setColumns] = useState<ColumnDef[]>(
    initialData?.columns ?? [
      { name: 'author', displayName: 'Author', dataType: 'TEXT', isRequired: true, orderIndex: 0 },
      { name: 'year', displayName: 'Year', dataType: 'NUMERIC', isRequired: true, orderIndex: 1 },
    ],
  );

  const [createTemplate, { loading: creating }] = useMutation(CREATE_GRID_TEMPLATE);
  const [updateTemplate, { loading: updating }] = useMutation(UPDATE_GRID_TEMPLATE);

  const saving = creating || updating;

  const addColumn = () => {
    setColumns([
      ...columns,
      {
        name: `column_${columns.length}`,
        displayName: '',
        dataType: 'TEXT',
        isRequired: false,
        orderIndex: columns.length,
      },
    ]);
  };

  const removeColumn = (index: number) => {
    setColumns(columns.filter((_, i) => i !== index).map((col, i) => ({ ...col, orderIndex: i })));
  };

  const updateColumn = (index: number, field: keyof ColumnDef, value: string | boolean) => {
    setColumns(
      columns.map((col, i) => {
        if (i !== index) return col;
        const updated = { ...col, [field]: value };
        if (field === 'displayName' && typeof value === 'string') {
          updated.name = value
            .toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_]/g, '');
        }
        return updated;
      }),
    );
  };

  const handleSave = async () => {
    if (!name.trim() || columns.length === 0) return;

    const columnsPayload = columns.map((col, idx) => ({
      name: col.name,
      displayName: col.displayName,
      dataType: col.dataType,
      isRequired: col.isRequired,
      orderIndex: idx,
    }));

    if (mode === 'edit' && initialData?.id) {
      await updateTemplate({
        variables: {
          templateId: initialData.id,
          name: name.trim(),
          description: description.trim() || null,
          columns: columnsPayload,
        },
      });
    } else {
      await createTemplate({
        variables: {
          name: name.trim(),
          soaType,
          description: description.trim() || null,
          columns: columnsPayload,
        },
      });
    }

    onSave();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      data-testid="template-editor"
    >
      <div
        className="w-full max-w-2xl rounded-lg bg-white shadow-xl"
        data-testid="template-editor-dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--cortex-border)] px-5 py-3">
          <h2 className="text-base font-semibold text-[var(--cortex-text-primary)]">
            {mode === 'create' ? 'Create Custom Template' : 'Edit Template'}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="text-[var(--cortex-text-muted)] hover:text-[var(--cortex-text-primary)]"
            data-testid="template-editor-close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-auto px-5 py-4 space-y-4">
          {/* Name */}
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cortex-text-secondary)]">
              Template Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Clinical Performance Grid"
              className="w-full rounded border border-[var(--cortex-border)] px-3 py-2 text-sm"
              data-testid="template-name-input"
            />
          </div>

          {/* SOA Type */}
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cortex-text-secondary)]">
              SOA Type
            </label>
            <select
              value={soaType}
              onChange={(e) => setSoaType(e.target.value)}
              disabled={mode === 'edit'}
              className="w-full rounded border border-[var(--cortex-border)] px-3 py-2 text-sm"
              data-testid="template-soa-type"
            >
              {SOA_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cortex-text-secondary)]">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this template's purpose..."
              rows={2}
              className="w-full rounded border border-[var(--cortex-border)] px-3 py-2 text-sm resize-none"
              data-testid="template-description"
            />
          </div>

          {/* Columns */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-medium text-[var(--cortex-text-secondary)]">
                Columns ({columns.length})
              </label>
              <button
                type="button"
                onClick={addColumn}
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                data-testid="add-template-column"
              >
                <Plus size={12} /> Add Column
              </button>
            </div>

            <div className="space-y-2" data-testid="template-columns">
              {columns.map((col, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 rounded border border-[var(--cortex-border)] p-2"
                  data-testid={`template-col-${idx}`}
                >
                  <GripVertical size={14} className="text-[var(--cortex-text-muted)]" />
                  <input
                    type="text"
                    value={col.displayName}
                    onChange={(e) => updateColumn(idx, 'displayName', e.target.value)}
                    placeholder="Column name"
                    className="flex-1 rounded border px-2 py-1 text-sm"
                    data-testid={`col-name-${idx}`}
                  />
                  <select
                    value={col.dataType}
                    onChange={(e) => updateColumn(idx, 'dataType', e.target.value)}
                    className="rounded border px-2 py-1 text-xs"
                    data-testid={`col-type-${idx}`}
                  >
                    {DATA_TYPES.map((dt) => (
                      <option key={dt.value} value={dt.value}>
                        {dt.label}
                      </option>
                    ))}
                  </select>
                  <label className="inline-flex items-center gap-1 text-xs text-[var(--cortex-text-muted)]">
                    <input
                      type="checkbox"
                      checked={col.isRequired}
                      onChange={(e) => updateColumn(idx, 'isRequired', e.target.checked)}
                      data-testid={`col-required-${idx}`}
                    />
                    Req
                  </label>
                  <button
                    type="button"
                    onClick={() => removeColumn(idx)}
                    className="text-[var(--cortex-text-muted)] hover:text-red-600"
                    data-testid={`remove-template-col-${idx}`}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-[var(--cortex-border)] px-5 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-[var(--cortex-border)] px-4 py-2 text-sm"
            data-testid="template-cancel-btn"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !name.trim() || columns.length === 0}
            className="inline-flex items-center gap-1.5 rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            data-testid="template-save-btn"
          >
            <Save size={14} />
            {saving ? 'Saving...' : mode === 'create' ? 'Create Template' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
