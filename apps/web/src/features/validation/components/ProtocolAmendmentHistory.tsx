import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { History, ChevronDown, ChevronUp } from 'lucide-react';

export const GET_AMENDMENT_HISTORY = gql`
  query GetAmendmentHistory($studyId: String!) {
    protocolAmendments(studyId: $studyId) {
      id
      version
      date
      author
      reason
      changes {
        field
        oldValue
        newValue
      }
    }
  }
`;

interface Change {
  field: string;
  oldValue: string;
  newValue: string;
}

interface Amendment {
  id: string;
  version: number;
  date: string;
  author: string;
  reason: string;
  changes: Change[];
}

interface ProtocolAmendmentHistoryProps {
  studyId: string;
}

export function ProtocolAmendmentHistory({ studyId }: ProtocolAmendmentHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, loading } = useQuery<any>(GET_AMENDMENT_HISTORY, {
    variables: { studyId },
  });

  if (loading) {
    return (
      <div
        className="py-6 text-center text-sm text-[var(--cortex-text-muted)]"
        data-testid="amendment-loading"
      >
        Loading amendment history...
      </div>
    );
  }

  const amendments: Amendment[] = data?.protocolAmendments ?? [];

  return (
    <div className="space-y-4" data-testid="amendment-history">
      <div className="flex items-center gap-2">
        <History size={16} className="text-[var(--cortex-primary)]" />
        <h3 className="text-sm font-semibold text-[var(--cortex-text-primary)]">
          Amendment History
        </h3>
      </div>

      {amendments.length === 0 ? (
        <p
          className="py-4 text-center text-sm text-[var(--cortex-text-muted)]"
          data-testid="no-amendments"
        >
          No amendments recorded.
        </p>
      ) : (
        <div className="space-y-3">
          {amendments.map((amendment) => {
            const isExpanded = expandedId === amendment.id;
            return (
              <div
                key={amendment.id}
                className="rounded-lg border border-[var(--cortex-border)]"
                data-testid={`amendment-entry-${amendment.id}`}
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : amendment.id)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                  data-testid={`amendment-toggle-${amendment.id}`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="inline-flex items-center rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700"
                      data-testid="amendment-version"
                    >
                      v{amendment.version}
                    </span>
                    <span className="text-sm text-[var(--cortex-text-primary)]">
                      {amendment.date}
                    </span>
                    <span className="text-xs text-[var(--cortex-text-muted)]">
                      by {amendment.author}
                    </span>
                  </div>
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                <div className="border-t border-[var(--cortex-border)] px-4 py-3">
                  <div
                    className="mb-2 text-sm text-[var(--cortex-text-primary)]"
                    data-testid="amendment-reason"
                  >
                    <span className="font-medium">Reason:</span> {amendment.reason}
                  </div>

                  {isExpanded && amendment.changes.length > 0 && (
                    <div className="space-y-2" data-testid="amendment-changes">
                      {amendment.changes.map((change, idx) => (
                        <div key={idx} className="rounded bg-[#F8F9FA] p-2 text-xs">
                          <div className="font-medium text-[var(--cortex-text-primary)]">
                            {change.field}
                          </div>
                          <div className="mt-1 text-red-600 line-through">{change.oldValue}</div>
                          <div className="text-emerald-600">{change.newValue}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
