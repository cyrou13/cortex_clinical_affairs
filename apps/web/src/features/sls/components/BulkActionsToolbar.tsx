import { CheckCircle, XCircle, X } from 'lucide-react';

interface BulkActionsToolbarProps {
  selectedCount: number;
  onIncludeAll: () => void;
  onExcludeAll: () => void;
  onDeselectAll: () => void;
}

export function BulkActionsToolbar({
  selectedCount,
  onIncludeAll,
  onExcludeAll,
  onDeselectAll,
}: BulkActionsToolbarProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div
      className="flex items-center gap-3 rounded-t bg-[#07233C] px-4 py-2"
      data-testid="bulk-actions-toolbar"
    >
      <span className="text-sm font-medium text-white" data-testid="selected-count">
        {selectedCount} article{selectedCount > 1 ? 's' : ''} selected
      </span>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={onIncludeAll}
          className="inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium text-white hover:bg-white/10"
          data-testid="bulk-include-btn"
        >
          <CheckCircle size={14} />
          Include All
        </button>
        <button
          type="button"
          onClick={onExcludeAll}
          className="inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium text-white hover:bg-white/10"
          data-testid="bulk-exclude-btn"
        >
          <XCircle size={14} />
          Exclude All
        </button>
        <button
          type="button"
          onClick={onDeselectAll}
          className="inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white"
          data-testid="bulk-deselect-btn"
        >
          <X size={14} />
          Deselect
        </button>
      </div>
    </div>
  );
}
