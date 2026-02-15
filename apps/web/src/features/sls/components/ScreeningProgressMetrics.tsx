import { cn } from '../../../shared/utils/cn';

interface ScreeningProgressMetricsProps {
  total: number;
  reviewed: number;
  included: number;
  excluded: number;
  skipped: number;
  remaining: number;
}

export function ScreeningProgressMetrics({
  total,
  reviewed,
  included,
  excluded,
  skipped,
  remaining,
}: ScreeningProgressMetricsProps) {
  const percentage = total > 0 ? Math.round((reviewed / total) * 100) : 0;

  return (
    <div className="rounded-lg border border-[var(--cortex-border)] p-4" data-testid="screening-progress">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-[var(--cortex-text-primary)]">
          Screening Progress
        </h4>
        <span className="text-sm text-[var(--cortex-text-muted)]" data-testid="progress-summary">
          {reviewed.toLocaleString()} / {total.toLocaleString()} articles reviewed
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-3 h-2 overflow-hidden rounded-full bg-gray-100" data-testid="progress-bar">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            percentage === 100 ? 'bg-emerald-500' : 'bg-[var(--cortex-blue-500)]',
          )}
          style={{ width: `${percentage}%` }}
          data-testid="progress-fill"
        />
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-4 gap-3 text-center" data-testid="progress-breakdown">
        <div>
          <div className="text-lg font-semibold text-emerald-600" data-testid="count-included">
            {included.toLocaleString()}
          </div>
          <div className="text-xs text-[var(--cortex-text-muted)]">Included</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-red-600" data-testid="count-excluded">
            {excluded.toLocaleString()}
          </div>
          <div className="text-xs text-[var(--cortex-text-muted)]">Excluded</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-yellow-600" data-testid="count-skipped">
            {skipped.toLocaleString()}
          </div>
          <div className="text-xs text-[var(--cortex-text-muted)]">Skipped</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-gray-500" data-testid="count-remaining">
            {remaining.toLocaleString()}
          </div>
          <div className="text-xs text-[var(--cortex-text-muted)]">Remaining</div>
        </div>
      </div>
    </div>
  );
}
