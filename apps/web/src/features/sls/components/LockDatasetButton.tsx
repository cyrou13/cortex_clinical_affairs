import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { Lock } from 'lucide-react';
import { LockConfirmationDialog } from './LockConfirmationDialog';

export const LOCK_PREFLIGHT = gql`
  query LockPreflightCheck($sessionId: String!) {
    lockPreflightCheck(sessionId: $sessionId) {
      pendingCount
      totalArticles
      includedCount
      excludedCount
      allGatesMet
      sessionStatus
    }
  }
`;

export const LOCK_DATASET = gql`
  mutation LockSlsDataset($sessionId: String!) {
    lockSlsDataset(sessionId: $sessionId) {
      sessionId
      lockedAt
      includedCount
      excludedCount
      totalArticles
    }
  }
`;

interface LockDatasetButtonProps {
  sessionId: string;
  onLocked?: (result: { includedCount: number; excludedCount: number }) => void;
}

export function LockDatasetButton({ sessionId, onLocked }: LockDatasetButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data } = useQuery(LOCK_PREFLIGHT, {
    variables: { sessionId },
  });

  const [lockDataset, { loading: locking }] = useMutation(LOCK_DATASET);

  const preflight = data?.lockPreflightCheck;
  const isLocked = preflight?.sessionStatus === 'LOCKED';
  const canLock = preflight?.pendingCount === 0 && preflight?.allGatesMet && !isLocked;

  const disabledReason = isLocked
    ? 'Dataset is already locked'
    : preflight?.pendingCount > 0
      ? `${preflight.pendingCount} articles still pending`
      : !preflight?.allGatesMet
        ? 'Review gates not met'
        : undefined;

  const handleConfirm = async () => {
    const result = await lockDataset({ variables: { sessionId } });
    setDialogOpen(false);
    if (onLocked && result.data?.lockSlsDataset) {
      onLocked({
        includedCount: result.data.lockSlsDataset.includedCount,
        excludedCount: result.data.lockSlsDataset.excludedCount,
      });
    }
  };

  if (isLocked) {
    return (
      <div
        className="inline-flex items-center gap-2 rounded bg-gray-100 px-4 py-2 text-sm font-medium text-gray-500"
        data-testid="lock-status-locked"
      >
        <Lock size={16} />
        Dataset Locked
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
        data-testid="lock-dataset-btn"
      >
        <Lock size={16} />
        {locking ? 'Locking...' : 'Lock Dataset'}
      </button>

      {dialogOpen && (
        <LockConfirmationDialog
          includedCount={preflight?.includedCount ?? 0}
          excludedCount={preflight?.excludedCount ?? 0}
          pendingCount={preflight?.pendingCount ?? 0}
          onConfirm={handleConfirm}
          onCancel={() => setDialogOpen(false)}
          loading={locking}
        />
      )}
    </>
  );
}
