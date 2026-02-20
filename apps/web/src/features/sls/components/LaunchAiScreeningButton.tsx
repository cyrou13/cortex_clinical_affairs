import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Brain, Loader2 } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import { LAUNCH_AI_SCORING } from '../graphql/mutations';
import { GET_ACTIVE_SCORING_TASK } from '../graphql/queries';
import { AiScoringProgress } from './AiScoringProgress';

interface LaunchAiScoringData {
  launchAiScoring: {
    taskId: string;
  };
}

interface LaunchAiScoringVars {
  sessionId: string;
}

interface ActiveScoringTaskData {
  activeScoringTask: {
    taskId: string;
    status: string;
  } | null;
}

interface LaunchAiScreeningButtonProps {
  sessionId: string;
  pendingCount: number;
  isLocked: boolean;
}

function estimateTime(count: number): string {
  // Rough estimate: ~1 second per article
  const seconds = count;
  if (seconds < 60) return `~${seconds} seconds`;
  const minutes = Math.ceil(seconds / 60);
  return `~${minutes} minute${minutes !== 1 ? 's' : ''}`;
}

export function LaunchAiScreeningButton({
  sessionId,
  pendingCount,
  isLocked,
}: LaunchAiScreeningButtonProps) {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);

  // Check for an active scoring task on mount (survives page refresh)
  const { data: activeData } = useQuery<ActiveScoringTaskData>(GET_ACTIVE_SCORING_TASK, {
    variables: { sessionId },
    fetchPolicy: 'network-only',
  });

  useEffect(() => {
    const active = activeData?.activeScoringTask;
    if (active && !taskId) {
      setTaskId(active.taskId);
    }
  }, [activeData, taskId]);

  const [launchAiScoring, { loading }] = useMutation<LaunchAiScoringData, LaunchAiScoringVars>(
    LAUNCH_AI_SCORING,
  );

  const isDisabled = isLocked || pendingCount === 0 || loading;

  async function handleLaunch() {
    if (isDisabled) return;

    try {
      const result = await launchAiScoring({
        variables: { sessionId },
      });

      const id = result.data?.launchAiScoring?.taskId;
      if (id) {
        setTaskId(id);
        setShowConfirmation(false);
      }
    } catch {
      // Error handled by Apollo Client error link
    }
  }

  function handleComplete() {
    setTaskId(null);
  }

  function handleCancel() {
    setTaskId(null);
  }

  // Show progress if task is active
  if (taskId) {
    return (
      <AiScoringProgress taskId={taskId} onComplete={handleComplete} onCancel={handleCancel} />
    );
  }

  return (
    <div className="relative" data-testid="launch-ai-screening-container">
      <button
        type="button"
        data-testid="launch-ai-screening-button"
        className={cn(
          'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-colors',
          isDisabled
            ? 'cursor-not-allowed bg-gray-100 text-gray-400'
            : 'bg-[var(--cortex-blue-600)] text-white hover:bg-[var(--cortex-blue-700)]',
        )}
        disabled={isDisabled}
        onClick={() => setShowConfirmation(true)}
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
        ) : (
          <Brain size={16} aria-hidden="true" />
        )}
        {loading ? 'Launching...' : 'Launch AI Screening'}
      </button>

      {showConfirmation && !isDisabled && (
        <div
          className="absolute right-0 top-full z-10 mt-2 w-80 rounded-lg bg-white p-4 shadow-lg ring-1 ring-gray-200"
          data-testid="ai-screening-confirmation"
        >
          <h4 className="mb-2 text-sm font-semibold text-[var(--cortex-text-primary)]">
            Confirm AI Screening
          </h4>

          <div className="mb-4 space-y-2 text-sm text-[var(--cortex-text-secondary)]">
            <div
              className="flex items-center justify-between"
              data-testid="confirmation-article-count"
            >
              <span>Articles to score:</span>
              <span className="font-medium text-[var(--cortex-text-primary)]">
                {pendingCount.toLocaleString()}
              </span>
            </div>
            <div
              className="flex items-center justify-between"
              data-testid="confirmation-estimated-time"
            >
              <span>Estimated time:</span>
              <span className="font-medium text-[var(--cortex-text-primary)]">
                {estimateTime(pendingCount)}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              data-testid="confirm-launch-button"
              className="flex-1 rounded-lg bg-[var(--cortex-blue-600)] px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[var(--cortex-blue-700)]"
              onClick={handleLaunch}
              disabled={loading}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                  Launching...
                </span>
              ) : (
                'Confirm & Launch'
              )}
            </button>
            <button
              type="button"
              data-testid="cancel-launch-button"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-[var(--cortex-text-secondary)] transition-colors hover:bg-gray-50"
              onClick={() => setShowConfirmation(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
