import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import {
  Layout,
  Copy,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Plus,
  FileText,
} from 'lucide-react';
import { GET_GRID_TEMPLATES } from '../graphql/queries';
import { DELETE_GRID_TEMPLATE } from '../graphql/mutations';

interface ColumnDef {
  name: string;
  displayName: string;
  dataType: string;
  isRequired: boolean;
  orderIndex: number;
}

interface Template {
  id: string;
  name: string;
  soaType: string;
  description?: string;
  isBuiltIn: boolean;
  columns: ColumnDef[];
}

interface TemplateSelectorProps {
  soaType: string;
  onSelectTemplate: (templateId: string) => void;
  onStartEmpty: () => void;
  onCreateNew: () => void;
  onDuplicate: (template: Template) => void;
  onEdit?: (template: Template) => void;
}

export function TemplateSelector({
  soaType,
  onSelectTemplate,
  onStartEmpty,
  onCreateNew,
  onDuplicate,
  onEdit,
}: TemplateSelectorProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { data, loading, refetch } = useQuery<{ gridTemplates: Template[] }>(GET_GRID_TEMPLATES, {
    variables: { soaType },
  });

  const [deleteTemplate] = useMutation(DELETE_GRID_TEMPLATE);

  const templates = data?.gridTemplates ?? [];

  const handleDelete = async (templateId: string) => {
    await deleteTemplate({ variables: { templateId } });
    setConfirmDeleteId(null);
    refetch();
  };

  if (loading) {
    return (
      <div className="space-y-3" data-testid="template-selector">
        <div className="text-sm text-[var(--cortex-text-muted)]">Loading templates...</div>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="template-selector">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--cortex-text-primary)]">
        <Layout size={14} /> Choose a Template
      </h3>

      <div className="space-y-2" data-testid="template-list">
        {templates.map((tpl) => (
          <div
            key={tpl.id}
            className="rounded border border-[var(--cortex-border)] bg-white"
            data-testid={`template-item-${tpl.id}`}
          >
            <div className="flex items-center gap-2 p-3">
              <button
                type="button"
                onClick={() => setExpandedId(expandedId === tpl.id ? null : tpl.id)}
                className="text-[var(--cortex-text-muted)]"
                data-testid={`expand-${tpl.id}`}
              >
                {expandedId === tpl.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{tpl.name}</span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      tpl.isBuiltIn ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                    }`}
                    data-testid={`badge-${tpl.id}`}
                  >
                    {tpl.isBuiltIn ? 'Built-in' : 'Custom'}
                  </span>
                  <span className="text-[10px] text-[var(--cortex-text-muted)]">
                    {tpl.columns.length} cols
                  </span>
                </div>
                {tpl.description && (
                  <p className="mt-0.5 text-xs text-[var(--cortex-text-muted)] truncate">
                    {tpl.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onSelectTemplate(tpl.id)}
                  className="rounded bg-blue-600 px-2.5 py-1 text-xs text-white hover:bg-blue-700"
                  data-testid={`use-${tpl.id}`}
                >
                  Use
                </button>
                <button
                  type="button"
                  onClick={() => onDuplicate(tpl)}
                  className="rounded border border-[var(--cortex-border)] p-1 text-[var(--cortex-text-muted)] hover:bg-gray-50"
                  data-testid={`duplicate-${tpl.id}`}
                  title="Duplicate"
                >
                  <Copy size={12} />
                </button>
                {!tpl.isBuiltIn && (
                  <>
                    <button
                      type="button"
                      onClick={() => onEdit?.(tpl)}
                      className="rounded border border-[var(--cortex-border)] p-1 text-[var(--cortex-text-muted)] hover:bg-gray-50"
                      data-testid={`edit-${tpl.id}`}
                      title="Edit"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(tpl.id)}
                      className="rounded border border-[var(--cortex-border)] p-1 text-[var(--cortex-text-muted)] hover:bg-red-50 hover:text-red-600"
                      data-testid={`delete-${tpl.id}`}
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Expanded column preview */}
            {expandedId === tpl.id && (
              <div
                className="border-t border-[var(--cortex-border)] bg-gray-50 px-3 py-2"
                data-testid={`columns-preview-${tpl.id}`}
              >
                <div className="flex flex-wrap gap-1">
                  {tpl.columns.map((col) => (
                    <span
                      key={col.name}
                      className="inline-flex items-center gap-1 rounded bg-white px-2 py-0.5 text-[10px] border border-gray-200"
                    >
                      {col.displayName}
                      <span className="text-gray-400">{col.dataType}</span>
                      {col.isRequired && <span className="text-red-400">*</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Delete confirmation */}
            {confirmDeleteId === tpl.id && (
              <div
                className="border-t border-red-200 bg-red-50 px-3 py-2 flex items-center justify-between"
                data-testid={`confirm-delete-${tpl.id}`}
              >
                <span className="text-xs text-red-700">Delete this template?</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => handleDelete(tpl.id)}
                    className="rounded bg-red-600 px-2 py-0.5 text-xs text-white"
                    data-testid={`confirm-delete-yes-${tpl.id}`}
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(null)}
                    className="rounded border px-2 py-0.5 text-xs"
                    data-testid={`confirm-delete-no-${tpl.id}`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {templates.length === 0 && (
          <div className="rounded border-2 border-dashed border-[var(--cortex-border)] p-4 text-center text-xs text-[var(--cortex-text-muted)]">
            No templates available for this SOA type.
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onStartEmpty}
          className="flex-1 rounded border-2 border-dashed border-[var(--cortex-border)] p-2.5 text-xs text-[var(--cortex-text-muted)] hover:bg-gray-50"
          data-testid="start-empty-btn"
        >
          <FileText size={12} className="mx-auto mb-1" />
          Start with empty grid
        </button>
        <button
          type="button"
          onClick={onCreateNew}
          className="flex-1 rounded border-2 border-dashed border-blue-300 p-2.5 text-xs text-blue-600 hover:bg-blue-50"
          data-testid="create-custom-btn"
        >
          <Plus size={12} className="mx-auto mb-1" />
          Create Custom Template
        </button>
      </div>
    </div>
  );
}
