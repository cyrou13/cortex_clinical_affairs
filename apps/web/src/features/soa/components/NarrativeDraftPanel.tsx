import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { Sparkles, Check, Edit3, RefreshCw } from 'lucide-react';

export const GENERATE_NARRATIVE_DRAFT = gql`
  mutation GenerateNarrativeDraft($sectionId: String!) {
    generateNarrativeDraft(sectionId: $sectionId) {
      draftId
      content
      status
    }
  }
`;

export const ACCEPT_NARRATIVE_DRAFT = gql`
  mutation AcceptNarrativeDraft($draftId: String!) {
    acceptNarrativeDraft(draftId: $draftId) {
      sectionId
      status
    }
  }
`;

interface NarrativeDraftPanelProps {
  sectionId: string;
  locked?: boolean;
  onDraftAccepted?: (content: string) => void;
  onDraftEdited?: (content: string) => void;
}

export function NarrativeDraftPanel({
  sectionId,
  locked = false,
  onDraftAccepted,
  onDraftEdited,
}: NarrativeDraftPanelProps) {
  const [draftContent, setDraftContent] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);

  const [generateDraft, { loading: generating }] = useMutation(GENERATE_NARRATIVE_DRAFT);
  const [acceptDraft, { loading: accepting }] = useMutation(ACCEPT_NARRATIVE_DRAFT);

  const handleGenerate = async () => {
    const result = await generateDraft({ variables: { sectionId } });
    if (result.data?.generateNarrativeDraft) {
      setDraftContent(result.data.generateNarrativeDraft.content);
      setDraftId(result.data.generateNarrativeDraft.draftId);
    }
  };

  const handleAccept = async () => {
    if (!draftId || !draftContent) return;
    await acceptDraft({ variables: { draftId } });
    onDraftAccepted?.(draftContent);
    setDraftContent(null);
    setDraftId(null);
  };

  const handleEdit = () => {
    if (draftContent) {
      onDraftEdited?.(draftContent);
      setDraftContent(null);
      setDraftId(null);
    }
  };

  const handleRegenerate = () => {
    setDraftContent(null);
    setDraftId(null);
    handleGenerate();
  };

  return (
    <div className="space-y-4 rounded-lg border border-[var(--cortex-border)] p-4" data-testid="narrative-draft-panel">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--cortex-text-primary)]">
          <Sparkles size={14} className="text-purple-500" /> AI Narrative Draft
        </h3>
      </div>

      {!draftContent && !generating && (
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
          <span className="text-sm text-[var(--cortex-text-muted)]">Generating narrative draft...</span>
        </div>
      )}

      {draftContent && !generating && (
        <>
          <div
            className="rounded-lg border border-purple-200 bg-purple-50 p-4 text-sm leading-relaxed text-[var(--cortex-text-primary)]"
            data-testid="draft-preview"
          >
            {draftContent}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAccept}
              disabled={accepting}
              className="inline-flex items-center gap-1 rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
              data-testid="accept-draft-btn"
            >
              <Check size={12} /> Accept
            </button>
            <button
              type="button"
              onClick={handleEdit}
              className="inline-flex items-center gap-1 rounded border border-[var(--cortex-border)] px-3 py-1.5 text-xs font-medium text-[var(--cortex-text-secondary)] hover:bg-gray-50"
              data-testid="edit-draft-btn"
            >
              <Edit3 size={12} /> Edit
            </button>
            <button
              type="button"
              onClick={handleRegenerate}
              className="inline-flex items-center gap-1 rounded border border-[var(--cortex-border)] px-3 py-1.5 text-xs font-medium text-[var(--cortex-text-secondary)] hover:bg-gray-50"
              data-testid="regenerate-draft-btn"
            >
              <RefreshCw size={12} /> Regenerate
            </button>
          </div>
        </>
      )}
    </div>
  );
}
