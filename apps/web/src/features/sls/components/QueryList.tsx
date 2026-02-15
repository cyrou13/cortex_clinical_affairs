import { useQuery, useMutation } from '@apollo/client/react';
import { Plus, Copy } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import { GET_SLS_QUERIES } from '../graphql/queries';
import { DUPLICATE_QUERY } from '../graphql/mutations';

interface SlsQuery {
  id: string;
  name: string;
  queryString: string;
  version: number;
  isActive: boolean;
  parentQueryId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface QueryListProps {
  sessionId: string;
  activeQueryId?: string;
  onSelect: (id: string) => void;
  onCreateNew: () => void;
}

export function QueryList({
  sessionId,
  activeQueryId,
  onSelect,
  onCreateNew,
}: QueryListProps) {
  const { data, loading } = useQuery<{ slsQueries: SlsQuery[] }>(
    GET_SLS_QUERIES,
    { variables: { sessionId } },
  );

  const [duplicateQuery] = useMutation(DUPLICATE_QUERY, {
    refetchQueries: [{ query: GET_SLS_QUERIES, variables: { sessionId } }],
  });

  const queries = data?.slsQueries ?? [];

  function handleDuplicate(e: React.MouseEvent, queryId: string) {
    e.stopPropagation();
    duplicateQuery({ variables: { id: queryId } });
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  return (
    <div data-testid="query-list" className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--cortex-text-primary)]">
          Queries
        </h3>
        <button
          type="button"
          onClick={onCreateNew}
          className="inline-flex items-center gap-1.5 rounded-md bg-[var(--cortex-blue-500)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--cortex-blue-600)]"
          data-testid="new-query-button"
        >
          <Plus size={14} />
          New Query
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <p className="py-4 text-center text-sm text-[var(--cortex-text-muted)]">
          Loading queries...
        </p>
      )}

      {/* Empty state */}
      {!loading && queries.length === 0 && (
        <div
          className="rounded-lg border border-dashed border-[var(--cortex-border)] py-8 text-center"
          data-testid="empty-query-list"
        >
          <p className="text-sm text-[var(--cortex-text-muted)]">
            No queries yet. Create one to start building your search strategy.
          </p>
        </div>
      )}

      {/* Query items */}
      {queries.map((query) => {
        const isActive = query.id === activeQueryId;
        return (
          <div
            key={query.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(query.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(query.id);
              }
            }}
            data-testid={`query-item-${query.id}`}
            className={cn(
              'flex w-full cursor-pointer items-start justify-between rounded-lg border px-4 py-3 text-left transition-colors',
              isActive
                ? 'border-[var(--cortex-blue-500)] bg-[var(--cortex-blue-50)]'
                : 'border-[var(--cortex-border)] hover:bg-[var(--cortex-bg-secondary)]',
            )}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium text-[var(--cortex-text-primary)]">
                  {query.name}
                </span>
                <span
                  className="inline-flex items-center rounded-full bg-[var(--cortex-blue-100)] px-2 py-0.5 text-[10px] font-medium text-[var(--cortex-blue-700)]"
                  data-testid={`version-badge-${query.id}`}
                >
                  v{query.version}
                </span>
                {query.isActive && (
                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                    Active
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-[var(--cortex-text-muted)]">
                Last edited {formatDate(query.updatedAt)}
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => handleDuplicate(e, query.id)}
              className="ml-2 rounded p-1 text-[var(--cortex-text-muted)] hover:bg-[var(--cortex-border)] hover:text-[var(--cortex-text-secondary)]"
              data-testid={`duplicate-button-${query.id}`}
              aria-label={`Duplicate ${query.name}`}
            >
              <Copy size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
