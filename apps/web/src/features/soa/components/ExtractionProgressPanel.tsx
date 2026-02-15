import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { BarChart3, Filter } from 'lucide-react';

export const GET_EXTRACTION_PROGRESS = gql`
  query GetExtractionProgress($soaAnalysisId: String!) {
    extractionProgress(soaAnalysisId: $soaAnalysisId) {
      total
      extracted
      reviewed
      flagged
      pending
    }
  }
`;

type FilterStatus = 'ALL' | 'PENDING' | 'EXTRACTED' | 'REVIEWED' | 'FLAGGED';

const FILTER_OPTIONS: FilterStatus[] = ['ALL', 'PENDING', 'EXTRACTED', 'REVIEWED', 'FLAGGED'];

interface ExtractionProgressPanelProps {
  soaAnalysisId: string;
  onFilterChange?: (filter: FilterStatus) => void;
}

export function ExtractionProgressPanel({
  soaAnalysisId,
  onFilterChange,
}: ExtractionProgressPanelProps) {
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('ALL');

  const { data, loading } = useQuery<any>(GET_EXTRACTION_PROGRESS, {
    variables: { soaAnalysisId },
  });

  const handleFilterClick = (filter: FilterStatus) => {
    setActiveFilter(filter);
    onFilterChange?.(filter);
  };

  if (loading) {
    return (
      <div
        className="py-6 text-center text-sm text-[var(--cortex-text-muted)]"
        data-testid="extraction-progress-loading"
      >
        Loading extraction progress...
      </div>
    );
  }

  const progress = data?.extractionProgress;
  const total = progress?.total ?? 0;
  const extracted = progress?.extracted ?? 0;
  const reviewed = progress?.reviewed ?? 0;
  const flagged = progress?.flagged ?? 0;
  const pending = progress?.pending ?? 0;

  const completedCount = extracted + reviewed;
  const percentage = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  return (
    <div
      className="space-y-4 rounded-lg border border-[var(--cortex-border)] p-4"
      data-testid="extraction-progress-panel"
    >
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--cortex-text-primary)]">
          <BarChart3 size={14} /> Extraction Progress
        </h3>
        <span className="text-xs text-[var(--cortex-text-muted)]" data-testid="total-count">
          {total} articles
        </span>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-gray-200"
          data-testid="progress-bar"
        >
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div
          className="text-right text-xs font-medium text-[var(--cortex-text-muted)]"
          data-testid="progress-percentage"
        >
          {percentage}%
        </div>
      </div>

      {/* Counts */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="rounded border border-[var(--cortex-border)] p-2">
          <div className="text-lg font-bold text-blue-600" data-testid="count-extracted">
            {extracted}
          </div>
          <div className="text-[10px] text-[var(--cortex-text-muted)]">Extracted</div>
        </div>
        <div className="rounded border border-[var(--cortex-border)] p-2">
          <div className="text-lg font-bold text-emerald-600" data-testid="count-reviewed">
            {reviewed}
          </div>
          <div className="text-[10px] text-[var(--cortex-text-muted)]">Reviewed</div>
        </div>
        <div className="rounded border border-[var(--cortex-border)] p-2">
          <div className="text-lg font-bold text-red-600" data-testid="count-flagged">
            {flagged}
          </div>
          <div className="text-[10px] text-[var(--cortex-text-muted)]">Flagged</div>
        </div>
        <div className="rounded border border-[var(--cortex-border)] p-2">
          <div className="text-lg font-bold text-gray-500" data-testid="count-pending">
            {pending}
          </div>
          <div className="text-[10px] text-[var(--cortex-text-muted)]">Pending</div>
        </div>
      </div>

      {/* Filter buttons */}
      <div className="flex items-center gap-1">
        <Filter size={12} className="text-[var(--cortex-text-muted)]" />
        {FILTER_OPTIONS.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => handleFilterClick(filter)}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              activeFilter === filter
                ? 'bg-[#07233C] text-white'
                : 'bg-gray-100 text-[var(--cortex-text-secondary)] hover:bg-gray-200'
            }`}
            data-testid={`filter-btn-${filter}`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {total === 0 && (
        <div
          className="py-4 text-center text-sm text-[var(--cortex-text-muted)]"
          data-testid="empty-state"
        >
          No articles to extract yet.
        </div>
      )}
    </div>
  );
}
