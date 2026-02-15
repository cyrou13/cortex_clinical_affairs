import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { Lock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export const VALIDATION_LOCK_PREFLIGHT = gql`
  query ValidationLockPreflight($studyId: String!) {
    validationLockPreflight(studyId: $studyId) {
      studyStatus
      protocolApproved
      dataImported
      resultsComputed
      allEndpointsMet
      reportsGenerated
      canLock
    }
  }
`;

export const LOCK_VALIDATION = gql`
  mutation LockValidation($studyId: String!) {
    lockValidationStudy(studyId: $studyId) {
      studyId
      lockedAt
      status
    }
  }
`;

interface PreflightCheck {
  label: string;
  met: boolean;
}

interface ValidationLockSectionProps {
  studyId: string;
  onLocked?: () => void;
}

export function ValidationLockSection({ studyId, onLocked }: ValidationLockSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const { data } = useQuery<any>(VALIDATION_LOCK_PREFLIGHT, {
    variables: { studyId },
  });

  const [lockValidation, { loading: locking }] = useMutation<any>(LOCK_VALIDATION);

  const preflight = data?.validationLockPreflight;
  const isLocked = preflight?.studyStatus === 'LOCKED';
  const canLock = preflight?.canLock && !isLocked;

  const checks: PreflightCheck[] = preflight
    ? [
        { label: 'Protocol approved', met: preflight.protocolApproved },
        { label: 'Data imported', met: preflight.dataImported },
        { label: 'Results computed', met: preflight.resultsComputed },
        { label: 'All endpoints met', met: preflight.allEndpointsMet },
        { label: 'Reports generated', met: preflight.reportsGenerated },
      ]
    : [];

  const handleConfirm = async () => {
    const result = await lockValidation({ variables: { studyId } });
    setDialogOpen(false);
    setConfirmed(false);
    if (result.data?.lockValidationStudy) {
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
        Validation Locked
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {checks.length > 0 && (
          <div className="space-y-1" data-testid="lock-summary">
            {checks.map((check) => (
              <div key={check.label} className="flex items-center gap-2 text-sm">
                {check.met ? (
                  <CheckCircle size={14} className="text-emerald-500" />
                ) : (
                  <XCircle size={14} className="text-red-400" />
                )}
                <span
                  className={
                    check.met
                      ? 'text-[var(--cortex-text-primary)]'
                      : 'text-[var(--cortex-text-muted)]'
                  }
                >
                  {check.label}
                </span>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          disabled={!canLock || locking}
          className="inline-flex items-center gap-2 rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="lock-validation-btn"
        >
          <Lock size={16} />
          {locking ? 'Locking...' : 'Lock Validation'}
        </button>
      </div>

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
          />

          <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#07233C]">
                <Lock size={20} className="text-white" />
              </div>
              <h2 className="text-lg font-semibold text-[var(--cortex-text-primary)]">
                Lock Validation Study
              </h2>
            </div>

            <div className="mb-4 flex items-start gap-2 rounded border border-orange-200 bg-orange-50 p-3">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-orange-500" />
              <p className="text-sm text-orange-700">
                This action is irreversible. The validation study cannot be modified after locking.
              </p>
            </div>

            <div
              className="mb-4 space-y-1 rounded border border-[var(--cortex-border)] p-3"
              data-testid="lock-summary-dialog"
            >
              {checks.map((check) => (
                <div key={check.label} className="flex items-center justify-between text-sm">
                  <span className="text-[var(--cortex-text-muted)]">{check.label}</span>
                  <span
                    className={
                      check.met ? 'font-medium text-emerald-600' : 'font-medium text-red-500'
                    }
                  >
                    {check.met ? 'Yes' : 'No'}
                  </span>
                </div>
              ))}
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
                I understand this action is irreversible and the validation study cannot be modified
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
                className="rounded border border-[var(--cortex-border)] px-4 py-2 text-sm text-[var(--cortex-text-secondary)] hover:bg-[var(--cortex-bg-hover)]"
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
                {locking ? 'Locking...' : 'Lock Validation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
