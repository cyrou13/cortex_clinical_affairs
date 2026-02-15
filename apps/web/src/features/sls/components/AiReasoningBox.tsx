import { cn } from '../../../shared/utils/cn';

interface AiReasoningBoxProps {
  score: number | null;
  reasoning: string | null;
  exclusionCode: string | null;
  category: string | null;
}

function getScoreBadgeStyles(score: number): string {
  if (score >= 75) return 'bg-emerald-100 text-emerald-700';
  if (score >= 40) return 'bg-orange-100 text-orange-700';
  return 'bg-red-100 text-red-700';
}

function getScoreLabel(score: number): string {
  if (score >= 75) return 'Likely Relevant';
  if (score >= 40) return 'Uncertain';
  return 'Likely Irrelevant';
}

export function AiReasoningBox({
  score,
  reasoning,
  exclusionCode,
  category,
}: AiReasoningBoxProps) {
  if (score === null && reasoning === null) {
    return (
      <div
        className="rounded-lg border border-gray-200 bg-gray-50 p-4"
        data-testid="ai-reasoning-box"
      >
        <p
          className="text-sm text-[var(--cortex-text-muted)]"
          data-testid="ai-no-score"
        >
          No AI scoring data available
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border border-gray-200 bg-white p-4"
      data-testid="ai-reasoning-box"
    >
      {/* Score badge and category */}
      <div className="mb-3 flex items-center gap-2">
        {score !== null && (
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
              getScoreBadgeStyles(score),
            )}
            data-testid="ai-score-badge"
          >
            AI Score: {score}
          </span>
        )}
        {score !== null && (
          <span
            className="text-xs text-[var(--cortex-text-muted)]"
            data-testid="ai-score-label"
          >
            {getScoreLabel(score)}
          </span>
        )}
      </div>

      {/* Category label */}
      {category && (
        <div className="mb-3">
          <span
            className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-[var(--cortex-text-secondary)]"
            data-testid="ai-category"
          >
            {category}
          </span>
        </div>
      )}

      {/* Reasoning box */}
      {reasoning && (
        <div
          className="mb-3 rounded border-l-[3px] border-l-blue-400 bg-blue-50 p-4"
          data-testid="ai-reasoning-text"
        >
          <p className="text-xs font-medium text-blue-700 mb-1">AI Reasoning</p>
          <p className="text-sm leading-relaxed text-[var(--cortex-text-primary)]">
            {reasoning}
          </p>
        </div>
      )}

      {/* Suggested exclusion code */}
      {exclusionCode && (
        <div className="flex items-center gap-2" data-testid="ai-exclusion-code">
          <span className="text-xs text-[var(--cortex-text-muted)]">
            Suggested exclusion:
          </span>
          <span className="inline-flex items-center rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
            {exclusionCode}
          </span>
        </div>
      )}
    </div>
  );
}
