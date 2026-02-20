import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { DRAFT_NARRATIVE } from '../graphql/mutations';

interface NarrativeDraftPanelProps {
  sectionId: string;
  soaAnalysisId: string;
  locked?: boolean;
  onDraftAccepted?: (content: string) => void;
  onDraftEdited?: (content: string) => void;
}

export function NarrativeDraftPanel({
  sectionId,
  soaAnalysisId,
  locked = false,
}: NarrativeDraftPanelProps) {
  const [taskId, setTaskId] = useState<string | null>(null);

  const [generateDraft, { loading: generating }] = useMutation<any>(DRAFT_NARRATIVE);

  const handleGenerate = async () => {
    const result = await generateDraft({ variables: { sectionId, soaAnalysisId } });
    if (result.data?.draftNarrative?.taskId) {
      setTaskId(result.data.draftNarrative.taskId);
    }
  };

  return (
    <div
      className="space-y-4 rounded-lg border border-[var(--cortex-border)] p-4"
      data-testid="narrative-draft-panel"
    >
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--cortex-text-primary)]">
          <Sparkles size={14} className="text-purple-500" /> AI Narrative Draft
        </h3>
      </div>

      {!taskId && !generating && (
        <button
          type="button"
          onClick={handleGenerate}
          disabled={locked}
          className="inline-flex w-full items-center justify-center gap-2 rounded border-2 border-dashed border-purple-200 px-4 py-3 text-sm font-medium text-purple-600 hover:border-purple-300 hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="generate-draft-btn"
        >
          <Sparkles size={16} />
          Generate AI Draft
        </button>
      )}

      {generating && (
        <div className="flex flex-col items-center gap-2 py-6" data-testid="draft-loading">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
          <span className="text-sm text-[var(--cortex-text-muted)]">
            Submitting narrative draft task...
          </span>
        </div>
      )}

      {taskId && !generating && (
        <div className="space-y-3">
          <div
            className="rounded-lg border border-purple-200 bg-purple-50 p-4 text-sm text-[var(--cortex-text-primary)]"
            data-testid="draft-submitted"
          >
            <p className="font-medium text-purple-700">Draft generation started</p>
            <p className="mt-1 text-xs text-purple-600">
              The AI narrative draft is being generated in the background. The content will appear
              in the section editor once complete.
            </p>
            <p className="mt-2 text-xs text-[var(--cortex-text-muted)]">Task ID: {taskId}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setTaskId(null);
              handleGenerate();
            }}
            disabled={generating}
            className="inline-flex items-center gap-1 rounded border border-[var(--cortex-border)] px-3 py-1.5 text-xs font-medium text-[var(--cortex-text-secondary)] hover:bg-gray-50"
            data-testid="regenerate-draft-btn"
          >
            <RefreshCw size={12} /> Regenerate
          </button>
        </div>
      )}
    </div>
  );
}
