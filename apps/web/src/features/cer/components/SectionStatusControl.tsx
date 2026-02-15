import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { AlertTriangle } from 'lucide-react';

export const UPDATE_SECTION_STATUS = gql`
  mutation UpdateSectionStatus($input: UpdateSectionStatusInput!) {
    updateSectionStatus(input: $input) {
      sectionId
      status
    }
  }
`;

type SectionStatus = 'DRAFT' | 'REVIEWED' | 'FINALIZED';

interface SectionStatusControlProps {
  sectionId: string;
  currentStatus: SectionStatus;
  hasUnresolvedClaims: boolean;
  onStatusChanged?: (newStatus: SectionStatus) => void;
}

const statusOptions: SectionStatus[] = ['DRAFT', 'REVIEWED', 'FINALIZED'];

export function SectionStatusControl({
  sectionId,
  currentStatus,
  hasUnresolvedClaims,
  onStatusChanged,
}: SectionStatusControlProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<SectionStatus | null>(null);

  const [updateStatus, { loading }] = useMutation<any>(UPDATE_SECTION_STATUS);

  const handleChange = (newStatus: SectionStatus) => {
    if (newStatus === 'FINALIZED') {
      setPendingStatus(newStatus);
      setShowConfirm(true);
    } else {
      performUpdate(newStatus);
    }
  };

  const performUpdate = async (status: SectionStatus) => {
    const result = await updateStatus({
      variables: { input: { sectionId, status } },
    });
    if (result.data?.updateSectionStatus) {
      onStatusChanged?.(status);
    }
    setShowConfirm(false);
    setPendingStatus(null);
  };

  const isFinalizeDisabled = hasUnresolvedClaims;

  return (
    <div className="space-y-2" data-testid="section-status-control">
      <label className="text-xs font-medium text-[var(--cortex-text-muted)]">Section Status</label>
      <select
        value={currentStatus}
        onChange={(e) => handleChange(e.target.value as SectionStatus)}
        disabled={loading}
        className="w-full rounded border border-[var(--cortex-border)] px-3 py-2 text-sm"
        data-testid="status-dropdown"
      >
        {statusOptions.map((opt) => (
          <option
            key={opt}
            value={opt}
            disabled={opt === 'FINALIZED' && isFinalizeDisabled}
            data-testid="status-option"
          >
            {opt}
          </option>
        ))}
      </select>

      {isFinalizeDisabled && (
        <p className="flex items-center gap-1 text-xs text-orange-600">
          <AlertTriangle size={10} /> Resolve all claims before finalizing
        </p>
      )}

      {showConfirm && (
        <div
          className="rounded border border-orange-200 bg-orange-50 p-3"
          data-testid="confirm-dialog"
        >
          <p className="mb-2 text-sm text-orange-800">
            Are you sure you want to finalize this section? This action marks the section as
            complete.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setShowConfirm(false);
                setPendingStatus(null);
              }}
              className="rounded border border-gray-300 px-3 py-1 text-xs text-[var(--cortex-text-secondary)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => pendingStatus && performUpdate(pendingStatus)}
              className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white"
            >
              Confirm Finalize
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
