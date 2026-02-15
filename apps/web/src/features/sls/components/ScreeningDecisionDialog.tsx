import { useState } from 'react';
import { X } from 'lucide-react';

interface ScreeningDecisionDialogProps {
  articleId: string;
  decision: 'INCLUDED' | 'EXCLUDED' | 'SKIPPED';
  onConfirm: (data: { reason: string; exclusionCodeId?: string }) => void;
  onCancel: () => void;
  exclusionCodes?: Array<{ id: string; code: string; label: string }>;
  aiReasoning?: string;
}

const titleMap: Record<string, string> = {
  INCLUDED: 'Include Article',
  EXCLUDED: 'Exclude Article',
  SKIPPED: 'Skip Article',
};

export function ScreeningDecisionDialog({
  decision,
  onConfirm,
  onCancel,
  exclusionCodes = [],
  aiReasoning,
}: ScreeningDecisionDialogProps) {
  const [reason, setReason] = useState(aiReasoning ?? '');
  const [exclusionCodeId, setExclusionCodeId] = useState('');

  const isConfirmDisabled =
    (decision !== 'SKIPPED' && reason.trim() === '') ||
    (decision === 'EXCLUDED' && !exclusionCodeId);

  const handleConfirm = () => {
    const data: { reason: string; exclusionCodeId?: string } = { reason: reason.trim() };
    if (decision === 'EXCLUDED' && exclusionCodeId) {
      data.exclusionCodeId = exclusionCodeId;
    }
    onConfirm(data);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      data-testid="screening-decision-dialog"
    >
      <div className="w-[420px] rounded-lg border border-[var(--cortex-border)] bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--cortex-border)] px-4 py-3">
          <h3
            className="text-sm font-semibold text-[var(--cortex-text-primary)]"
            data-testid="dialog-title"
          >
            {titleMap[decision]}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className="rounded p-1 text-[var(--cortex-text-muted)] hover:bg-[var(--cortex-bg-secondary)]"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-3 p-4">
          {/* Exclusion code selector (only for EXCLUDED) */}
          {decision === 'EXCLUDED' && exclusionCodes.length > 0 && (
            <div>
              <label
                htmlFor="exclusion-code"
                className="mb-1 block text-xs font-medium text-[var(--cortex-text-muted)]"
              >
                Exclusion Code
              </label>
              <select
                id="exclusion-code"
                value={exclusionCodeId}
                onChange={(e) => setExclusionCodeId(e.target.value)}
                className="w-full rounded border border-[var(--cortex-border)] px-3 py-2 text-sm"
                data-testid="exclusion-code-select"
              >
                <option value="">Select exclusion code...</option>
                {exclusionCodes.map((code) => (
                  <option key={code.id} value={code.id}>
                    {code.code} - {code.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Reason textarea */}
          <div>
            <label
              htmlFor="decision-reason"
              className="mb-1 block text-xs font-medium text-[var(--cortex-text-muted)]"
            >
              {decision === 'SKIPPED' ? 'Reason (optional)' : 'Reason'}
            </label>
            <textarea
              id="decision-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder={
                decision === 'INCLUDED'
                  ? 'Why is this article relevant?'
                  : decision === 'EXCLUDED'
                    ? 'Why is this article excluded?'
                    : 'Why are you skipping this article?'
              }
              className="w-full resize-none rounded border border-[var(--cortex-border)] px-3 py-2 text-sm"
              data-testid="decision-reason-input"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-[var(--cortex-border)] px-4 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded px-3 py-1.5 text-sm text-[var(--cortex-text-secondary)] hover:bg-[var(--cortex-bg-secondary)]"
            data-testid="cancel-decision-btn"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
            className="rounded bg-[var(--cortex-blue-600)] px-3 py-1.5 text-sm text-white hover:bg-[var(--cortex-blue-700)] disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="confirm-decision-btn"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
