import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { AlertTriangle } from 'lucide-react';
import { PmsStatusBadge } from './StatusBadge';
import { GET_GAP_REGISTRY_ENTRIES } from '../graphql/queries';
import { POPULATE_GAP_REGISTRY } from '../graphql/mutations';

interface GapEntry {
  id: string;
  pmsPlanId: string;
  sourceModule: string;
  sourceId: string | null;
  description: string;
  severity: string;
  recommendedActivity: string;
  status: string;
  manuallyCreated: boolean;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolutionNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface GapRegistryProps {
  pmsPlanId: string;
}

export function GapRegistry({ pmsPlanId }: GapRegistryProps) {
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string | null>(null);

  const { data, loading, error } = useQuery<{ gapRegistryEntries: GapEntry[] }>(
    GET_GAP_REGISTRY_ENTRIES,
    {
      variables: {
        pmsPlanId,
        ...(filterStatus ? { status: filterStatus } : {}),
        ...(filterSeverity ? { severity: filterSeverity } : {}),
      },
    },
  );

  const [populateGaps, { loading: populating }] = useMutation(POPULATE_GAP_REGISTRY, {
    variables: { pmsPlanId },
    refetchQueries: [{ query: GET_GAP_REGISTRY_ENTRIES, variables: { pmsPlanId } }],
  });

  if (loading) {
    return (
      <div data-testid="gap-loading" className="flex items-center justify-center p-12">
        <p className="text-[var(--cortex-text-muted)]">Loading gap registry...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="gap-error" className="flex items-center justify-center p-12">
        <p className="text-[var(--cortex-error)]">
          Failed to load gap registry: {error.message}
        </p>
      </div>
    );
  }

  const entries = data?.gapRegistryEntries ?? [];

  return (
    <div data-testid="gap-registry" className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle size={20} className="text-amber-500" />
          <h2 className="text-lg font-semibold text-[var(--cortex-text-primary)]">
            Gap Registry
          </h2>
          <span className="text-sm text-[var(--cortex-text-muted)]">
            {entries.length} {entries.length === 1 ? 'gap' : 'gaps'}
          </span>
        </div>
        <button
          data-testid="populate-gaps-btn"
          onClick={() => populateGaps()}
          disabled={populating}
          className="rounded-md bg-[var(--cortex-blue-500)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--cortex-blue-600)] disabled:opacity-50"
        >
          {populating ? 'Populating...' : 'Populate from Modules'}
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2" data-testid="gap-filters">
        <select
          data-testid="filter-status"
          value={filterStatus ?? ''}
          onChange={(e) => setFilterStatus(e.target.value || null)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">All statuses</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
        </select>
        <select
          data-testid="filter-severity"
          value={filterSeverity ?? ''}
          onChange={(e) => setFilterSeverity(e.target.value || null)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">All severities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>
      </div>

      {entries.length === 0 ? (
        <div data-testid="gap-empty" className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--cortex-border)] p-12">
          <AlertTriangle size={32} className="mb-2 text-[var(--cortex-text-muted)]" />
          <p className="text-sm text-[var(--cortex-text-secondary)]">
            No gap entries found.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              data-testid={`gap-entry-${entry.id}`}
              className="rounded-lg border border-[var(--cortex-border)] bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--cortex-text-primary)]">
                    {entry.description}
                  </p>
                  <p className="mt-1 text-xs text-[var(--cortex-text-muted)]">
                    Source: {entry.sourceModule}
                    {entry.manuallyCreated && ' (manual)'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <PmsStatusBadge status={entry.severity} />
                  <PmsStatusBadge status={entry.status} />
                </div>
              </div>
              <p className="mt-2 text-xs text-[var(--cortex-text-secondary)]">
                Recommended: {entry.recommendedActivity}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
