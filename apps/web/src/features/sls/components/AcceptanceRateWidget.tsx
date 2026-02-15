import { cn } from '../../../shared/utils/cn';

interface AcceptanceRateWidgetProps {
  overallRate: number;
  likelyRelevantAccuracy: number | null;
  likelyIrrelevantAccuracy: number | null;
  overrideCount: number;
  spotCheckCount: number;
  agreementCount: number;
}

function rateColor(rate: number): string {
  if (rate >= 85) return 'text-emerald-600';
  if (rate >= 70) return 'text-orange-500';
  return 'text-red-600';
}

export function AcceptanceRateWidget({
  overallRate,
  likelyRelevantAccuracy,
  likelyIrrelevantAccuracy,
  overrideCount,
  spotCheckCount,
  agreementCount,
}: AcceptanceRateWidgetProps) {
  return (
    <div
      className="rounded-lg border border-[var(--cortex-border)] p-4"
      data-testid="acceptance-rate-widget"
    >
      <h4 className="mb-3 text-sm font-semibold text-[var(--cortex-text-primary)]">
        AI Acceptance Rate
      </h4>

      <div className={cn('mb-3 text-2xl font-bold', rateColor(overallRate))} data-testid="overall-rate">
        {overallRate}%
      </div>

      <div className="space-y-2 text-sm">
        {likelyRelevantAccuracy !== null && (
          <div className="flex justify-between" data-testid="likely-relevant-accuracy">
            <span className="text-[var(--cortex-text-muted)]">Likely Relevant</span>
            <span className="font-medium">{likelyRelevantAccuracy}%</span>
          </div>
        )}
        {likelyIrrelevantAccuracy !== null && (
          <div className="flex justify-between" data-testid="likely-irrelevant-accuracy">
            <span className="text-[var(--cortex-text-muted)]">Likely Irrelevant</span>
            <span className="font-medium">{likelyIrrelevantAccuracy}%</span>
          </div>
        )}
        <div className="border-t border-[var(--cortex-border)] pt-2">
          <div className="flex justify-between" data-testid="override-count">
            <span className="text-[var(--cortex-text-muted)]">Overrides</span>
            <span className="font-medium">{overrideCount}</span>
          </div>
          <div className="flex justify-between" data-testid="spot-check-stats">
            <span className="text-[var(--cortex-text-muted)]">Spot-checks</span>
            <span className="font-medium">{agreementCount} / {spotCheckCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
