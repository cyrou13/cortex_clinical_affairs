import { useState } from 'react';
import { Lock, AlertTriangle } from 'lucide-react';

interface LockConfirmationDialogProps {
  includedCount: number;
  excludedCount: number;
  pendingCount: number;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function LockConfirmationDialog({
  includedCount,
  excludedCount,
  pendingCount,
  onConfirm,
  onCancel,
  loading = false,
}: LockConfirmationDialogProps) {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" data-testid="lock-confirmation-dialog">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
        data-testid="lock-dialog-backdrop"
      />

      {/* Dialog */}
      <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl" data-testid="lock-dialog-content">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#07233C]">
            <Lock size={20} className="text-white" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--cortex-text-primary)]">
            Lock SLS Dataset
          </h2>
        </div>

        {/* Warning */}
        <div className="mb-4 flex items-start gap-2 rounded border border-orange-200 bg-orange-50 p-3">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-orange-500" />
          <p className="text-sm text-orange-700">
            This action is irreversible. The dataset cannot be modified after locking.
          </p>
        </div>

        {/* Recap */}
        <div className="mb-4 space-y-1 rounded border border-[var(--cortex-border)] p-3" data-testid="lock-recap">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--cortex-text-muted)]">Articles included</span>
            <span className="font-medium text-emerald-600" data-testid="recap-included">{includedCount}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--cortex-text-muted)]">Articles excluded</span>
            <span className="font-medium text-red-600" data-testid="recap-excluded">{excludedCount}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--cortex-text-muted)]">Articles pending</span>
            <span className="font-medium" data-testid="recap-pending">{pendingCount}</span>
          </div>
        </div>

        {/* Checkbox */}
        <label className="mb-4 flex items-start gap-2 text-sm" data-testid="lock-checkbox-label">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5"
            data-testid="lock-checkbox"
          />
          <span className="text-[var(--cortex-text-secondary)]">
            I understand this action is irreversible and the dataset cannot be modified after locking
          </span>
        </label>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-[var(--cortex-border)] px-4 py-2 text-sm text-[var(--cortex-text-secondary)] hover:bg-[var(--cortex-bg-hover)]"
            data-testid="lock-cancel-btn"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!confirmed || loading}
            className="inline-flex items-center gap-2 rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="lock-confirm-btn"
          >
            <Lock size={14} />
            {loading ? 'Locking...' : 'Lock Dataset'}
          </button>
        </div>
      </div>
    </div>
  );
}
