import { useQuery, useMutation } from '@apollo/client/react';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import { GET_AI_SCORING_PROGRESS } from '../graphql/queries';
import { CANCEL_AI_SCORING } from '../graphql/mutations';
import { useEffect, useRef } from 'react';

interface AiScoringProgressData {
  aiScoringProgress: {
    taskId: string;
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
    scored: number;
    total: number;
    estimatedSecondsRemaining: number | null;
  };
}

interface AiScoringProgressProps {
  taskId: string;
  onComplete: () => void;
  onCancel: () => void;
}

function formatEta(seconds: number | null): string {
  if (seconds === null || seconds <= 0) return '';
  if (seconds < 60) return `${seconds} sec remaining`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} min remaining`;
}

export function AiScoringProgress({
  taskId,
  onComplete,
  onCancel,
}: AiScoringProgressProps) {
  const completedRef = useRef(false);

  const { data, loading } = useQuery<AiScoringProgressData>(
    GET_AI_SCORING_PROGRESS,
    {
      variables: { taskId },
      pollInterval: 2000,
    },
  );

  const [cancelAiScoring, { loading: cancelling }] =
    useMutation(CANCEL_AI_SCORING);

  const progress = data?.aiScoringProgress;
  const isActive =
    progress?.status === 'RUNNING' || progress?.status === 'PENDING';
  const isCompleted = progress?.status === 'COMPLETED';
  const isCancelled = progress?.status === 'CANCELLED';
  const isFailed = progress?.status === 'FAILED';
  const percentage =
    progress && progress.total > 0
      ? Math.round((progress.scored / progress.total) * 100)
      : 0;

  useEffect(() => {
    if (isCompleted && !completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  }, [isCompleted, onComplete]);

  async function handleCancel() {
    try {
      await cancelAiScoring({ variables: { taskId } });
      onCancel();
    } catch {
      // Error handled by Apollo Client error link
    }
  }

  // Loading state before first poll returns
  if (loading && !data) {
    return (
      <div
        className="rounded-lg bg-white p-4 shadow-sm"
        data-testid="ai-scoring-progress"
      >
        <div className="flex items-center gap-2 text-sm text-[var(--cortex-text-muted)]">
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          Initializing AI scoring...
        </div>
      </div>
    );
  }

  // Completed state
  if (isCompleted && progress) {
    return (
      <div
        className="rounded-lg bg-white p-4 shadow-sm"
        data-testid="ai-scoring-progress"
      >
        <div className="flex items-center gap-2" data-testid="scoring-complete">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2
              size={16}
              className="text-emerald-600"
              aria-hidden="true"
            />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--cortex-text-primary)]">
              AI Scoring Complete
            </p>
            <p
              className="text-xs text-[var(--cortex-text-muted)]"
              data-testid="scoring-summary"
            >
              {progress.scored.toLocaleString()} /{' '}
              {progress.total.toLocaleString()} articles scored
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Cancelled state
  if (isCancelled && progress) {
    return (
      <div
        className="rounded-lg bg-white p-4 shadow-sm"
        data-testid="ai-scoring-progress"
      >
        <div
          className="flex items-center gap-2"
          data-testid="scoring-cancelled"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
            <XCircle
              size={16}
              className="text-gray-500"
              aria-hidden="true"
            />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--cortex-text-primary)]">
              AI Scoring Cancelled
            </p>
            <p className="text-xs text-[var(--cortex-text-muted)]">
              {progress.scored.toLocaleString()} /{' '}
              {progress.total.toLocaleString()} articles scored before
              cancellation
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Failed state
  if (isFailed) {
    return (
      <div
        className="rounded-lg bg-white p-4 shadow-sm"
        data-testid="ai-scoring-progress"
      >
        <div className="flex items-center gap-2" data-testid="scoring-failed">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
            <XCircle
              size={16}
              className="text-red-600"
              aria-hidden="true"
            />
          </div>
          <p className="text-sm font-medium text-red-600">
            AI Scoring Failed
          </p>
        </div>
      </div>
    );
  }

  // Active / running state
  return (
    <div
      className="rounded-lg bg-white p-4 shadow-sm"
      data-testid="ai-scoring-progress"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-[var(--cortex-text-primary)]">
          AI Screening in Progress
        </h3>
        <button
          type="button"
          data-testid="cancel-scoring-button"
          className={cn(
            'inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50',
            cancelling && 'cursor-not-allowed opacity-50',
          )}
          disabled={cancelling}
          onClick={handleCancel}
        >
          <XCircle size={14} aria-hidden="true" />
          Cancel Scoring
        </button>
      </div>

      {/* Article count */}
      <p
        className="mb-2 text-sm text-[var(--cortex-text-secondary)]"
        data-testid="scoring-count"
      >
        {(progress?.scored ?? 0).toLocaleString()} /{' '}
        {(progress?.total ?? 0).toLocaleString()} articles scored
      </p>

      {/* Progress bar */}
      <div className="mb-2">
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className={cn(
              'h-full rounded-full bg-[var(--cortex-blue-500)] transition-all',
              isActive && 'animate-[progress-stripe_1s_linear_infinite] bg-[length:1rem_1rem] bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)]',
            )}
            style={{ width: `${percentage}%` }}
            data-testid="scoring-progress-bar"
          />
        </div>
        <div className="mt-1 flex items-center justify-between text-xs text-[var(--cortex-text-muted)]">
          <span data-testid="scoring-percentage">{percentage}%</span>
          {progress?.estimatedSecondsRemaining != null &&
            progress.estimatedSecondsRemaining > 0 && (
              <span data-testid="scoring-eta">
                Estimated: {formatEta(progress.estimatedSecondsRemaining)}
              </span>
            )}
        </div>
      </div>
    </div>
  );
}
