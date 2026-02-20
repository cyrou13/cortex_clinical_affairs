import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { Lock, AlertTriangle } from 'lucide-react';
import { GET_SOA_PROGRESS } from '../graphql/queries';
import { LOCK_SOA_ANALYSIS } from '../graphql/mutations';

interface LockSoaButtonProps {
  soaAnalysisId: string;
  soaStatus?: string;
  onLocked?: () => void;
}

export function LockSoaButton({ soaAnalysisId, soaStatus, onLocked }: LockSoaButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const { data } = useQuery<any>(GET_SOA_PROGRESS, {
    variables: { soaAnalysisId },
  });

  const [lockSoa, { loading: locking }] = useMutation<any>(LOCK_SOA_ANALYSIS);

  const progress = data?.soaProgress;
  const isLocked = soaStatus === 'LOCKED';
  const allSectionsFinalized =
    progress?.finalizedCount === progress?.totalSections && (progress?.totalSections ?? 0) > 0;
  const canLock = allSectionsFinalized && !isLocked;

  const disabledReason = isLocked
    ? 'SOA is already locked'
    : !allSectionsFinalized
      ? `${(progress?.totalSections ?? 0) - (progress?.finalizedCount ?? 0)} sections not finalized`
      : undefined;

  const handleConfirm = async () => {
    const result = await lockSoa({ variables: { soaAnalysisId } });
    setDialogOpen(false);
    setConfirmed(false);
    if (result.data?.lockSoaAnalysis) {
      onLocked?.();
    }
  };

  if (isLocked) {
    return (
      <div
        className="inline-flex items-center gap-2 rounded bg-gray-100 px-4 py-2 text-sm font-medium text-gray-500"
        data-testid="locked-badge"
      >
        <Lock size={16} />
        SOA Locked
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        disabled={!canLock || locking}
        title={disabledReason}
        className="inline-flex items-center gap-2 rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        data-testid="lock-soa-btn"
      >
        <Lock size={16} />
        {locking ? 'Locking...' : 'Lock SOA'}
      </button>

      {dialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          data-testid="lock-confirmation-dialog"
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setDialogOpen(false);
              setConfirmed(false);
            }}
            data-testid="lock-dialog-backdrop"
          />

          <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#07233C]">
                <Lock size={20} className="text-white" />
              </div>
              <h2 className="text-lg font-semibold text-[var(--cortex-text-primary)]">
                Lock SOA Analysis
              </h2>
            </div>

            <div className="mb-4 flex items-start gap-2 rounded border border-orange-200 bg-orange-50 p-3">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-orange-500" />
              <p className="text-sm text-orange-700">
                This action is irreversible. The SOA analysis cannot be modified after locking.
              </p>
            </div>

            <div
              className="mb-4 space-y-1 rounded border border-[var(--cortex-border)] p-3"
              data-testid="lock-recap"
            >
              <div className="flex justify-between text-sm">
                <span className="text-[var(--cortex-text-muted)]">Total sections</span>
                <span className="font-medium" data-testid="recap-total-sections">
                  {progress?.totalSections ?? 0}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--cortex-text-muted)]">Finalized sections</span>
                <span
                  className="font-medium text-emerald-600"
                  data-testid="recap-finalized-sections"
                >
                  {progress?.finalizedCount ?? 0}
                </span>
              </div>
            </div>

            <label className="mb-4 flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5"
                data-testid="lock-checkbox"
              />
              <span className="text-[var(--cortex-text-secondary)]">
                I understand this action is irreversible and the SOA analysis cannot be modified
                after locking
              </span>
            </label>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setDialogOpen(false);
                  setConfirmed(false);
                }}
                className="rounded border border-[var(--cortex-border)] px-4 py-2 text-sm text-[var(--cortex-text-secondary)] hover:bg-gray-50"
                data-testid="lock-cancel-btn"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!confirmed || locking}
                className="inline-flex items-center gap-2 rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                data-testid="confirm-lock-btn"
              >
                <Lock size={14} />
                {locking ? 'Locking...' : 'Lock SOA'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
