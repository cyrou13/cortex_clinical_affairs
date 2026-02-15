import { useQuery, useMutation } from '@apollo/client/react';
import { X, RotateCcw } from 'lucide-react';
import { GET_QUERY_VERSIONS } from '../graphql/queries';
import { UPDATE_QUERY } from '../graphql/mutations';

interface QueryVersion {
  id: string;
  version: number;
  queryString: string;
  diff: string | null;
  createdAt: string;
  createdById: string;
}

interface QueryVersionHistoryProps {
  queryId: string;
  onClose: () => void;
  onRestore: (queryString: string) => void;
}

function DiffDisplay({ diff }: { diff: string }) {
  const lines = diff.split('\n');

  return (
    <div className="mt-2 rounded border border-[var(--cortex-border)] font-mono text-xs" data-testid="diff-display">
      {lines.map((line, index) => {
        let className = 'px-2 py-0.5';
        if (line.startsWith('+')) {
          className += ' bg-green-100 text-green-800';
        } else if (line.startsWith('-')) {
          className += ' bg-red-100 text-red-800';
        }
        return (
          <div key={index} className={className}>
            {line}
          </div>
        );
      })}
    </div>
  );
}

function formatTimestamp(dateString: string): string {
  return new Date(dateString).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function QueryVersionHistory({
  queryId,
  onClose,
  onRestore,
}: QueryVersionHistoryProps) {
  const { data, loading } = useQuery<{ queryVersions: QueryVersion[] }>(
    GET_QUERY_VERSIONS,
    { variables: { queryId } },
  );

  const [updateQuery] = useMutation(UPDATE_QUERY);

  const versions = data?.queryVersions ?? [];

  async function handleRestore(version: QueryVersion) {
    await updateQuery({
      variables: { id: queryId, queryString: version.queryString },
    });
    onRestore(version.queryString);
  }

  return (
    <div
      className="fixed inset-y-0 right-0 z-40 w-[380px] border-l border-[var(--cortex-border)] bg-white shadow-lg"
      data-testid="version-history-panel"
      role="dialog"
      aria-label="Version History"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--cortex-border)] px-4 py-3">
        <h3 className="text-sm font-semibold text-[var(--cortex-text-primary)]">
          Version History
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-[var(--cortex-text-muted)] hover:bg-[var(--cortex-bg-secondary)]"
          aria-label="Close version history"
          data-testid="close-version-history"
        >
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="h-full overflow-y-auto p-4 pb-20">
        {loading && (
          <p className="py-4 text-center text-sm text-[var(--cortex-text-muted)]">
            Loading versions...
          </p>
        )}

        {!loading && versions.length === 0 && (
          <p className="py-4 text-center text-sm text-[var(--cortex-text-muted)]" data-testid="no-versions">
            No version history available.
          </p>
        )}

        <div className="space-y-4">
          {versions.map((version) => (
            <div
              key={version.id}
              className="rounded-lg border border-[var(--cortex-border)] p-3"
              data-testid={`version-item-${version.id}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-sm font-medium text-[var(--cortex-text-primary)]">
                    Version {version.version}
                  </span>
                  <p className="mt-0.5 text-xs text-[var(--cortex-text-muted)]">
                    {formatTimestamp(version.createdAt)}
                  </p>
                  <p className="text-xs text-[var(--cortex-text-muted)]">
                    by {version.createdById}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRestore(version)}
                  className="inline-flex items-center gap-1 rounded border border-[var(--cortex-border)] px-2 py-1 text-xs font-medium text-[var(--cortex-text-secondary)] hover:bg-[var(--cortex-bg-secondary)]"
                  data-testid={`restore-button-${version.id}`}
                  aria-label={`Restore version ${version.version}`}
                >
                  <RotateCcw size={12} />
                  Restore
                </button>
              </div>

              {version.diff && <DiffDisplay diff={version.diff} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
