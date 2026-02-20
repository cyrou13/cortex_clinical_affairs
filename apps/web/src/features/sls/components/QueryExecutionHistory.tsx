import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { ChevronDown, ChevronRight, Clock, Database } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import { GET_QUERY_EXECUTIONS } from '../graphql/queries';

type ExecutionStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';

interface QueryExecution {
  id: string;
  queryId: string;
  database: string;
  status: ExecutionStatus;
  articlesFound: number | null;
  articlesImported: number | null;
  reproducibilityStatement: string | null;
  errorMessage: string | null;
  executedAt: string;
  completedAt: string | null;
}

const statusConfig: Record<ExecutionStatus, { label: string; className: string }> = {
  PENDING: {
    label: 'Pending',
    className: 'bg-gray-100 text-gray-600',
  },
  RUNNING: {
    label: 'Running',
    className: 'bg-amber-100 text-amber-700',
  },
  SUCCESS: {
    label: 'Success',
    className: 'bg-emerald-100 text-emerald-700',
  },
  FAILED: {
    label: 'Failed',
    className: 'bg-red-100 text-red-700',
  },
  CANCELLED: {
    label: 'Cancelled',
    className: 'bg-gray-100 text-gray-600',
  },
};

const databaseLabels: Record<string, string> = {
  PUBMED: 'PubMed',
  PMC: 'PubMed Central',
  GOOGLE_SCHOLAR: 'Google Scholar',
  CLINICAL_TRIALS: 'ClinicalTrials.gov',
};

interface QueryExecutionHistoryProps {
  queryId: string;
}

export function QueryExecutionHistory({ queryId }: QueryExecutionHistoryProps) {
  const { data, loading } = useQuery<{
    queryExecutions: QueryExecution[];
  }>(GET_QUERY_EXECUTIONS, {
    variables: { queryId },
  });

  const executions = data?.queryExecutions ?? [];

  if (loading) {
    return (
      <div className="rounded-lg bg-white p-4 shadow-sm" data-testid="execution-history">
        <p className="text-sm text-[var(--cortex-text-muted)]">Loading execution history...</p>
      </div>
    );
  }

  if (executions.length === 0) {
    return (
      <div className="rounded-lg bg-white p-4 shadow-sm" data-testid="execution-history">
        <div data-testid="empty-state" className="py-6 text-center">
          <Database
            size={32}
            className="mx-auto mb-2 text-[var(--cortex-text-muted)]"
            aria-hidden="true"
          />
          <p className="text-sm text-[var(--cortex-text-muted)]">No executions yet</p>
          <p className="mt-1 text-xs text-[var(--cortex-text-muted)]">
            Execute this query to see results here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white p-4 shadow-sm" data-testid="execution-history">
      <h3 className="mb-3 text-sm font-medium text-[var(--cortex-text-secondary)]">
        Execution History
      </h3>

      <div className="space-y-2">
        {executions.map((execution) => (
          <ExecutionRow key={execution.id} execution={execution} />
        ))}
      </div>
    </div>
  );
}

function ExecutionRow({ execution }: { execution: QueryExecution }) {
  const [expanded, setExpanded] = useState(false);
  const config = statusConfig[execution.status] ?? statusConfig.PENDING;
  const dbLabel = databaseLabels[execution.database] ?? execution.database;

  return (
    <div
      className="rounded-md border border-gray-100"
      data-testid={`execution-row-${execution.id}`}
    >
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2 text-left"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        data-testid={`execution-toggle-${execution.id}`}
      >
        <div className="flex items-center gap-3">
          {expanded ? (
            <ChevronDown size={14} aria-hidden="true" />
          ) : (
            <ChevronRight size={14} aria-hidden="true" />
          )}

          <span
            role="status"
            className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
              config.className,
            )}
          >
            {config.label}
          </span>

          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-[var(--cortex-text-secondary)]">
            {dbLabel}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-[var(--cortex-text-muted)]">
          {execution.articlesFound !== null && (
            <span data-testid={`articles-found-${execution.id}`}>
              {execution.articlesFound.toLocaleString()} found
            </span>
          )}
          {execution.articlesImported !== null && (
            <span data-testid={`articles-imported-${execution.id}`}>
              {execution.articlesImported.toLocaleString()} imported
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Clock size={12} aria-hidden="true" />
            {formatDate(execution.executedAt)}
          </span>
        </div>
      </button>

      {expanded && (
        <div
          className="border-t border-gray-100 px-3 py-2"
          data-testid={`execution-details-${execution.id}`}
        >
          {execution.reproducibilityStatement && (
            <div className="mb-2">
              <p className="text-xs font-medium text-[var(--cortex-text-secondary)]">
                Reproducibility Statement
              </p>
              <p
                className="mt-1 text-xs text-[var(--cortex-text-primary)]"
                data-testid={`reproducibility-${execution.id}`}
              >
                {execution.reproducibilityStatement}
              </p>
            </div>
          )}

          {execution.errorMessage && (
            <div>
              <p className="text-xs font-medium text-red-600">Error</p>
              <p
                className="mt-1 text-xs text-red-500"
                data-testid={`error-message-${execution.id}`}
              >
                {execution.errorMessage}
              </p>
            </div>
          )}

          {!execution.reproducibilityStatement && !execution.errorMessage && (
            <p className="text-xs text-[var(--cortex-text-muted)]">No additional details</p>
          )}
        </div>
      )}
    </div>
  );
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}
