import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { Download, Filter } from 'lucide-react';

export const GET_SCREENING_AUDIT_LOG = gql`
  query GetScreeningAuditLog($sessionId: String!, $filter: ScreeningAuditFilter) {
    screeningAuditLog(sessionId: $sessionId, filter: $filter) {
      entries {
        id
        timestamp
        userId
        userName
        articleId
        articleTitle
        decision
        exclusionCode
        reason
        isSpotCheck
        isAiOverride
      }
      hasMore
      cursor
    }
  }
`;

interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  articleId: string;
  articleTitle: string;
  decision: string;
  exclusionCode: string | null;
  reason: string;
  isSpotCheck: boolean;
  isAiOverride: boolean;
}

interface ScreeningAuditPanelProps {
  sessionId: string;
}

type DecisionFilter = 'ALL' | 'INCLUDED' | 'EXCLUDED' | 'SKIPPED';

function DecisionBadge({ decision }: { decision: string }) {
  const colors: Record<string, string> = {
    INCLUDED: 'bg-emerald-100 text-emerald-700',
    EXCLUDED: 'bg-red-100 text-red-700',
    SKIPPED: 'bg-gray-100 text-gray-600',
  };

  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${colors[decision] ?? 'bg-gray-100 text-gray-600'}`}
      data-testid="decision-badge"
    >
      {decision}
    </span>
  );
}

export function ScreeningAuditPanel({ sessionId }: ScreeningAuditPanelProps) {
  const [decisionFilter, setDecisionFilter] = useState<DecisionFilter>('ALL');

  const filter = decisionFilter !== 'ALL' ? { decision: decisionFilter } : undefined;

  const { data, loading, error } = useQuery(GET_SCREENING_AUDIT_LOG, {
    variables: { sessionId, filter },
  });

  if (loading) {
    return (
      <div className="py-8 text-center text-sm text-[var(--cortex-text-muted)]" data-testid="audit-loading">
        Loading audit log...
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center text-sm text-[var(--cortex-error)]" data-testid="audit-error">
        Failed to load audit log.
      </div>
    );
  }

  const entries: AuditEntry[] = data?.screeningAuditLog?.entries ?? [];

  const handleExport = () => {
    const headers = ['Timestamp', 'User', 'Article', 'Decision', 'Exclusion Code', 'Reason', 'Spot-Check', 'AI Override'];
    const rows = entries.map((e) => [
      e.timestamp,
      e.userName,
      e.articleTitle,
      e.decision,
      e.exclusionCode ?? '',
      e.reason,
      e.isSpotCheck ? 'Yes' : 'No',
      e.isAiOverride ? 'Yes' : 'No',
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${sessionId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4" data-testid="screening-audit-panel">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--cortex-text-primary)]">
          Screening Audit Log
        </h3>
        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center gap-2 rounded border border-[var(--cortex-border)] px-3 py-1.5 text-sm text-[var(--cortex-text-secondary)] hover:bg-[var(--cortex-bg-hover)]"
          data-testid="audit-export-btn"
        >
          <Download size={14} />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2" data-testid="audit-filters">
        <Filter size={14} className="text-[var(--cortex-text-muted)]" />
        {(['ALL', 'INCLUDED', 'EXCLUDED', 'SKIPPED'] as const).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDecisionFilter(d)}
            className={`rounded px-3 py-1 text-xs font-medium ${
              decisionFilter === d
                ? 'bg-[var(--cortex-primary)] text-white'
                : 'bg-[var(--cortex-bg-muted)] text-[var(--cortex-text-secondary)]'
            }`}
            data-testid={`audit-filter-${d.toLowerCase()}`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Table */}
      {entries.length === 0 ? (
        <div
          className="py-8 text-center text-sm text-[var(--cortex-text-muted)]"
          data-testid="audit-empty"
        >
          No audit entries found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--cortex-border)]">
          <table className="w-full text-sm" data-testid="audit-table">
            <thead className="bg-[var(--cortex-bg-muted)]">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-[var(--cortex-text-muted)]">Timestamp</th>
                <th className="px-3 py-2 text-left font-medium text-[var(--cortex-text-muted)]">User</th>
                <th className="px-3 py-2 text-left font-medium text-[var(--cortex-text-muted)]">Article</th>
                <th className="px-3 py-2 text-left font-medium text-[var(--cortex-text-muted)]">Decision</th>
                <th className="px-3 py-2 text-left font-medium text-[var(--cortex-text-muted)]">Reason</th>
                <th className="px-3 py-2 text-left font-medium text-[var(--cortex-text-muted)]">Indicators</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--cortex-border)]">
              {entries.map((entry) => (
                <tr key={entry.id} data-testid={`audit-row-${entry.id}`}>
                  <td className="px-3 py-2 text-[var(--cortex-text-muted)]">
                    {new Date(entry.timestamp).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-[var(--cortex-text-primary)]">{entry.userName}</td>
                  <td className="max-w-[200px] truncate px-3 py-2 text-[var(--cortex-text-primary)]">
                    {entry.articleTitle}
                  </td>
                  <td className="px-3 py-2">
                    <DecisionBadge decision={entry.decision} />
                  </td>
                  <td className="max-w-[200px] truncate px-3 py-2 text-[var(--cortex-text-secondary)]">
                    {entry.reason}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      {entry.isSpotCheck && (
                        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700" data-testid="indicator-spot-check">
                          Spot-check
                        </span>
                      )}
                      {entry.isAiOverride && (
                        <span className="rounded bg-orange-100 px-1.5 py-0.5 text-xs text-orange-700" data-testid="indicator-ai-override">
                          AI Override
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
