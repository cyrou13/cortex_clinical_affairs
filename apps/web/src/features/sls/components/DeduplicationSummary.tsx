import { CheckCircle, Copy, FileText } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';

export interface DeduplicationStats {
  importedCount: number;
  duplicateCount: number;
  stats: {
    totalBefore: number;
    totalAfter: number;
    duplicatesByDoi: number;
    duplicatesByPmid: number;
    duplicatesByTitle: number;
  };
}

interface DeduplicationSummaryProps {
  stats: DeduplicationStats;
}

interface BreakdownBarProps {
  label: string;
  value: number;
  total: number;
  color: string;
  testId: string;
}

function BreakdownBar({ label, value, total, color, testId }: BreakdownBarProps) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div data-testid={testId}>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-[var(--cortex-text-secondary)]">{label}</span>
        <span className="font-medium text-[var(--cortex-text-primary)]">
          {value.toLocaleString()}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className={cn('h-full rounded-full transition-all', color)}
          style={{ width: `${percentage}%` }}
          data-testid={`${testId}-bar`}
        />
      </div>
    </div>
  );
}

export function DeduplicationSummary({ stats }: DeduplicationSummaryProps) {
  const uniqueAdded = stats.importedCount;
  const totalFound = stats.importedCount + stats.duplicateCount;

  return (
    <div
      className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
      data-testid="deduplication-summary"
    >
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle size={16} className="text-emerald-600" />
        </div>
        <h3 className="text-sm font-semibold text-[var(--cortex-text-primary)]">
          Import Complete
        </h3>
      </div>

      {/* Summary metrics */}
      <div className="mb-4 grid grid-cols-3 gap-4" data-testid="summary-metrics">
        <div className="text-center" data-testid="total-found">
          <div className="flex items-center justify-center gap-1">
            <FileText size={14} className="text-[var(--cortex-text-muted)]" />
          </div>
          <p className="text-2xl font-semibold text-[var(--cortex-text-primary)]">
            {totalFound.toLocaleString()}
          </p>
          <p className="text-sm text-[var(--cortex-text-muted)]">Total Found</p>
        </div>
        <div className="text-center" data-testid="duplicates-removed">
          <div className="flex items-center justify-center gap-1">
            <Copy size={14} className="text-[var(--cortex-text-muted)]" />
          </div>
          <p className="text-2xl font-semibold text-red-600">
            {stats.duplicateCount.toLocaleString()}
          </p>
          <p className="text-sm text-[var(--cortex-text-muted)]">Duplicates Removed</p>
        </div>
        <div className="text-center" data-testid="unique-added">
          <div className="flex items-center justify-center gap-1">
            <CheckCircle size={14} className="text-[var(--cortex-text-muted)]" />
          </div>
          <p className="text-2xl font-semibold text-emerald-600">
            {uniqueAdded.toLocaleString()}
          </p>
          <p className="text-sm text-[var(--cortex-text-muted)]">Unique Added</p>
        </div>
      </div>

      {/* Deduplication breakdown */}
      {stats.duplicateCount > 0 && (
        <div className="space-y-3 border-t border-gray-200 pt-4" data-testid="dedup-breakdown">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--cortex-text-muted)]">
            Duplicate Breakdown
          </p>
          <BreakdownBar
            label="By DOI"
            value={stats.stats.duplicatesByDoi}
            total={stats.duplicateCount}
            color="bg-blue-500"
            testId="dedup-by-doi"
          />
          <BreakdownBar
            label="By PMID"
            value={stats.stats.duplicatesByPmid}
            total={stats.duplicateCount}
            color="bg-purple-500"
            testId="dedup-by-pmid"
          />
          <BreakdownBar
            label="By Title Similarity"
            value={stats.stats.duplicatesByTitle}
            total={stats.duplicateCount}
            color="bg-teal-500"
            testId="dedup-by-title"
          />
        </div>
      )}

      {/* Pool totals */}
      <div className="mt-4 flex items-center justify-between rounded-md bg-gray-50 px-3 py-2 text-sm" data-testid="pool-totals">
        <span className="text-[var(--cortex-text-muted)]">Pool size:</span>
        <span className="font-medium text-[var(--cortex-text-primary)]">
          {stats.stats.totalBefore.toLocaleString()} &rarr; {stats.stats.totalAfter.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
