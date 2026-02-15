import { X } from 'lucide-react';

interface DatabaseProgress {
  database: string;
  progress: number;
  status: 'pending' | 'searching' | 'done' | 'failed';
}

interface SearchProgressIndicatorProps {
  databases: DatabaseProgress[];
  overallProgress: number;
  totalResults: number;
  eta: string | null;
  onCancel?: () => void;
}

export function SearchProgressIndicator({ databases, overallProgress, totalResults, eta, onCancel }: SearchProgressIndicatorProps) {
  return (
    <div className="space-y-3 rounded-lg border border-[var(--cortex-border)] p-4" data-testid="search-progress">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--cortex-text-primary)]">Search Progress</h3>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-xs text-[var(--cortex-text-secondary)] hover:bg-gray-100"
          data-testid="cancel-btn"
        >
          <X size={10} /> Cancel
        </button>
      </div>

      {/* Overall Progress */}
      <div data-testid="overall-counter">
        <div className="flex items-center justify-between text-xs text-[var(--cortex-text-muted)]">
          <span>{totalResults} results found</span>
          <span>{overallProgress}%</span>
        </div>
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-[var(--cortex-primary)] transition-all"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* Per-database Progress */}
      <div className="space-y-2">
        {databases.map((db) => (
          <div key={db.database} data-testid="db-progress-bar">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[var(--cortex-text-primary)]">{db.database}</span>
              <span className={`${
                db.status === 'done' ? 'text-emerald-600' : db.status === 'failed' ? 'text-red-500' : 'text-[var(--cortex-text-muted)]'
              }`}>
                {db.status === 'done' ? 'Complete' : db.status === 'failed' ? 'Failed' : `${db.progress}%`}
              </span>
            </div>
            <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className={`h-full rounded-full transition-all ${
                  db.status === 'done' ? 'bg-emerald-500' : db.status === 'failed' ? 'bg-red-500' : 'bg-[var(--cortex-primary)]'
                }`}
                style={{ width: `${db.progress}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* ETA */}
      {eta && (
        <div className="text-xs text-[var(--cortex-text-muted)]" data-testid="eta-display">
          Estimated time remaining: {eta}
        </div>
      )}
    </div>
  );
}
