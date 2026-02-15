import { FileText, Plus, Edit, Trash2 } from 'lucide-react';

interface ExternalDocument {
  id: string;
  title: string;
  type: string;
  version: string;
  date: string;
  summary: string;
}

interface ExternalDocumentListProps {
  documents: ExternalDocument[];
  onAdd?: () => void;
  onEdit?: (id: string) => void;
  onRemove?: (id: string) => void;
}

export function ExternalDocumentList({ documents, onAdd, onEdit, onRemove }: ExternalDocumentListProps) {
  return (
    <div className="space-y-3" data-testid="external-doc-list">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--cortex-text-primary)]">
          <FileText size={14} /> External Documents
        </h3>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1 rounded bg-[var(--cortex-primary)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
          data-testid="add-doc-btn"
        >
          <Plus size={12} /> Add Document
        </button>
      </div>

      {documents.length === 0 ? (
        <p className="py-4 text-center text-sm text-[var(--cortex-text-muted)]" data-testid="no-docs">No external documents.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[var(--cortex-border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--cortex-border)] bg-gray-50">
                <th className="px-3 py-2 text-left font-medium text-[var(--cortex-text-muted)]">Title</th>
                <th className="px-3 py-2 text-left font-medium text-[var(--cortex-text-muted)]">Type</th>
                <th className="px-3 py-2 text-left font-medium text-[var(--cortex-text-muted)]">Version</th>
                <th className="px-3 py-2 text-left font-medium text-[var(--cortex-text-muted)]">Date</th>
                <th className="px-3 py-2 text-left font-medium text-[var(--cortex-text-muted)]">Summary</th>
                <th className="px-3 py-2 text-right font-medium text-[var(--cortex-text-muted)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--cortex-border)]">
              {documents.map((doc) => (
                <tr key={doc.id} data-testid="doc-row">
                  <td className="px-3 py-2 text-[var(--cortex-text-primary)]">{doc.title}</td>
                  <td className="px-3 py-2 text-[var(--cortex-text-muted)]">{doc.type}</td>
                  <td className="px-3 py-2 text-[var(--cortex-text-muted)]">v{doc.version}</td>
                  <td className="px-3 py-2 text-[var(--cortex-text-muted)]">{doc.date}</td>
                  <td className="max-w-xs truncate px-3 py-2 text-[var(--cortex-text-muted)]">{doc.summary}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => onEdit?.(doc.id)}
                        className="rounded p-1 text-[var(--cortex-text-muted)] hover:bg-gray-100 hover:text-[var(--cortex-primary)]"
                        data-testid="edit-doc-btn"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemove?.(doc.id)}
                        className="rounded p-1 text-[var(--cortex-text-muted)] hover:bg-red-50 hover:text-red-500"
                        data-testid="remove-doc-btn"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
