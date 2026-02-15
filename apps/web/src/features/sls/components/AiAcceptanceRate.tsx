import { cn } from '../../../shared/utils/cn';

interface AiScoringStats {
  totalScored: number;
  likelyRelevantCount: number;
  uncertainCount: number;
  likelyIrrelevantCount: number;
  acceptanceRate: number;
}

interface AiAcceptanceRateProps {
  stats: AiScoringStats;
}

function getRateColor(rate: number): string {
  if (rate >= 70) return 'text-emerald-600';
  if (rate >= 40) return 'text-orange-600';
  return 'text-red-600';
}

function getRateBgColor(rate: number): string {
  if (rate >= 70) return 'bg-emerald-100';
  if (rate >= 40) return 'bg-orange-100';
  return 'bg-red-100';
}

export function AiAcceptanceRate({ stats }: AiAcceptanceRateProps) {
  const { totalScored, likelyRelevantCount, uncertainCount, likelyIrrelevantCount, acceptanceRate } = stats;

  if (totalScored === 0) {
    return (
      <div
        className="rounded-lg border border-gray-200 bg-white p-4"
        data-testid="ai-acceptance-rate"
      >
        <p
          className="text-sm text-[var(--cortex-text-muted)]"
          data-testid="no-scoring-data"
        >
          No articles have been scored yet
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border border-gray-200 bg-white p-4"
      data-testid="ai-acceptance-rate"
    >
      {/* Acceptance rate header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--cortex-text-primary)]">
          AI Scoring Overview
        </h3>
        <span
          className={cn(
            'inline-flex items-center rounded-full px-3 py-1 text-sm font-bold',
            getRateBgColor(acceptanceRate),
            getRateColor(acceptanceRate),
          )}
          data-testid="acceptance-rate-badge"
        >
          {Math.round(acceptanceRate)}%
        </span>
      </div>

      {/* Total scored */}
      <p
        className="mb-3 text-xs text-[var(--cortex-text-muted)]"
        data-testid="total-scored"
      >
        {totalScored.toLocaleString()} articles scored
      </p>

      {/* Category breakdown */}
      <div className="space-y-3" data-testid="category-breakdown">
        {/* Likely Relevant */}
        <div data-testid="likely-relevant-row">
          <div className="mb-1 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="text-[var(--cortex-text-secondary)]">
                Likely Relevant
              </span>
            </div>
            <span className="font-medium text-[var(--cortex-text-primary)]">
              {likelyRelevantCount.toLocaleString()}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{
                width: `${totalScored > 0 ? Math.round((likelyRelevantCount / totalScored) * 100) : 0}%`,
              }}
              data-testid="likely-relevant-bar"
            />
          </div>
        </div>

        {/* Uncertain */}
        <div data-testid="uncertain-row">
          <div className="mb-1 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-orange-500" />
              <span className="text-[var(--cortex-text-secondary)]">
                Uncertain
              </span>
            </div>
            <span className="font-medium text-[var(--cortex-text-primary)]">
              {uncertainCount.toLocaleString()}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-orange-500 transition-all"
              style={{
                width: `${totalScored > 0 ? Math.round((uncertainCount / totalScored) * 100) : 0}%`,
              }}
              data-testid="uncertain-bar"
            />
          </div>
        </div>

        {/* Likely Irrelevant */}
        <div data-testid="likely-irrelevant-row">
          <div className="mb-1 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
              <span className="text-[var(--cortex-text-secondary)]">
                Likely Irrelevant
              </span>
            </div>
            <span className="font-medium text-[var(--cortex-text-primary)]">
              {likelyIrrelevantCount.toLocaleString()}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-red-500 transition-all"
              style={{
                width: `${totalScored > 0 ? Math.round((likelyIrrelevantCount / totalScored) * 100) : 0}%`,
              }}
              data-testid="likely-irrelevant-bar"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
