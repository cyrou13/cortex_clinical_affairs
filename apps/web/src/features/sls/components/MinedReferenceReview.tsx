import { useQuery, useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { Check, X, CheckCircle, AlertCircle, HelpCircle } from 'lucide-react';

export const GET_MINED_REFERENCES = gql`
  query GetMinedReferences($sessionId: String!, $filter: MinedReferenceFilter) {
    minedReferences(sessionId: $sessionId, filter: $filter) {
      id
      title
      authors
      year
      journal
      doi
      validationStatus
      validationSource
      isDuplicate
      duplicateOfArticleId
      approvalStatus
      rawCitation
    }
  }
`;

export const APPROVE_REFERENCE = gql`
  mutation ApproveMinedReference($referenceId: String!) {
    approveMinedReference(referenceId: $referenceId) {
      referenceId
      articleId
      status
    }
  }
`;

export const REJECT_REFERENCE = gql`
  mutation RejectMinedReference($referenceId: String!, $reason: String!) {
    rejectMinedReference(referenceId: $referenceId, reason: $reason) {
      referenceId
      status
    }
  }
`;

interface MinedReference {
  id: string;
  title: string;
  authors: Array<{ firstName: string; lastName: string }>;
  year: number | null;
  journal: string | null;
  doi: string | null;
  validationStatus: 'VALIDATED' | 'UNVALIDATED' | 'INVALID';
  validationSource: string | null;
  isDuplicate: boolean;
  duplicateOfArticleId: string | null;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  rawCitation: string | null;
}

interface MinedReferenceReviewProps {
  sessionId: string;
}

function ValidationBadge({ status }: { status: string }) {
  const config = {
    VALIDATED: { icon: CheckCircle, className: 'text-emerald-600', label: 'Validated' },
    UNVALIDATED: { icon: HelpCircle, className: 'text-orange-500', label: 'Unvalidated' },
    INVALID: { icon: AlertCircle, className: 'text-red-500', label: 'Invalid' },
  }[status] ?? { icon: HelpCircle, className: 'text-gray-400', label: status };

  const Icon = config.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs ${config.className}`}
      data-testid="validation-badge"
    >
      <Icon size={12} />
      {config.label}
    </span>
  );
}

export function MinedReferenceReview({ sessionId }: MinedReferenceReviewProps) {
  const { data, loading, error } = useQuery<any>(GET_MINED_REFERENCES, {
    variables: { sessionId },
  });

  const [approve, { loading: approving }] = useMutation(APPROVE_REFERENCE, {
    refetchQueries: ['GetMinedReferences'],
  });

  const [reject, { loading: rejecting }] = useMutation(REJECT_REFERENCE, {
    refetchQueries: ['GetMinedReferences'],
  });

  if (loading) {
    return (
      <div
        className="py-8 text-center text-sm text-[var(--cortex-text-muted)]"
        data-testid="references-loading"
      >
        Loading mined references...
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="py-8 text-center text-sm text-[var(--cortex-error)]"
        data-testid="references-error"
      >
        Failed to load references.
      </div>
    );
  }

  const references: MinedReference[] = data?.minedReferences ?? [];
  const pendingCount = references.filter((r) => r.approvalStatus === 'PENDING').length;

  if (references.length === 0) {
    return (
      <div
        className="py-8 text-center text-sm text-[var(--cortex-text-muted)]"
        data-testid="references-empty"
      >
        No mined references found.
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="mined-reference-review">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--cortex-text-primary)]">
          Mined References ({references.length})
        </h3>
        {pendingCount > 0 && (
          <span
            className="rounded bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700"
            data-testid="pending-count"
          >
            {pendingCount} pending
          </span>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--cortex-border)]">
        <table className="w-full text-sm" data-testid="references-table">
          <thead className="bg-[var(--cortex-bg-muted)]">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-[var(--cortex-text-muted)]">
                Title
              </th>
              <th className="px-3 py-2 text-left font-medium text-[var(--cortex-text-muted)]">
                Year
              </th>
              <th className="px-3 py-2 text-left font-medium text-[var(--cortex-text-muted)]">
                Status
              </th>
              <th className="px-3 py-2 text-left font-medium text-[var(--cortex-text-muted)]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--cortex-border)]">
            {references.map((ref) => (
              <tr key={ref.id} data-testid={`ref-row-${ref.id}`}>
                <td className="max-w-[300px] truncate px-3 py-2 text-[var(--cortex-text-primary)]">
                  <div>{ref.title}</div>
                  {ref.isDuplicate && (
                    <span className="text-xs text-orange-500" data-testid="duplicate-indicator">
                      Duplicate
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-[var(--cortex-text-muted)]">{ref.year ?? '—'}</td>
                <td className="px-3 py-2">
                  <ValidationBadge status={ref.validationStatus} />
                </td>
                <td className="px-3 py-2">
                  {ref.approvalStatus === 'PENDING' ? (
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => approve({ variables: { referenceId: ref.id } })}
                        disabled={approving}
                        className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                        data-testid="approve-ref-btn"
                      >
                        <Check size={10} /> Approve
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          reject({ variables: { referenceId: ref.id, reason: 'Not relevant' } })
                        }
                        disabled={rejecting}
                        className="inline-flex items-center gap-1 rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                        data-testid="reject-ref-btn"
                      >
                        <X size={10} /> Reject
                      </button>
                    </div>
                  ) : (
                    <span
                      className={`text-xs font-medium ${ref.approvalStatus === 'APPROVED' ? 'text-emerald-600' : 'text-red-600'}`}
                      data-testid="approval-status"
                    >
                      {ref.approvalStatus}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
