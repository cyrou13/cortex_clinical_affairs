import { useState } from 'react';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';

const AUDIT_LOGS_QUERY = gql`
  query AuditLogs(
    $userId: String
    $targetType: String
    $targetId: String
    $action: String
    $limit: Int
    $offset: Int
  ) {
    auditLogs(
      userId: $userId
      targetType: $targetType
      targetId: $targetId
      action: $action
      limit: $limit
      offset: $offset
    ) {
      id
      userId
      action
      targetType
      targetId
      before
      after
      metadata
      timestamp
    }
  }
`;

interface AuditEntry {
  id: string;
  userId: string;
  action: string;
  targetType: string;
  targetId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  timestamp: string;
}

interface AuditTrailViewerProps {
  targetType?: string;
  targetId?: string;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function summarizeChanges(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): string {
  if (!before && !after) return '';
  if (!before) return 'Created';
  if (!after) return 'Deleted';

  const changedKeys: string[] = [];
  for (const key of Object.keys(after)) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changedKeys.push(key);
    }
  }

  if (changedKeys.length === 0) return 'No visible changes';
  return `Changed: ${changedKeys.join(', ')}`;
}

export function AuditTrailViewer({ targetType, targetId }: AuditTrailViewerProps) {
  const [filterUser, setFilterUser] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const { data, loading, error } = useQuery<{ auditLogs: AuditEntry[] }>(AUDIT_LOGS_QUERY, {
    variables: {
      userId: filterUser || undefined,
      targetType: targetType || undefined,
      targetId: targetId || undefined,
      action: filterAction || undefined,
      limit: 100,
      offset: 0,
    },
    fetchPolicy: 'cache-and-network',
  });

  const entries = (data?.auditLogs ?? []).filter((entry) => {
    if (filterDateFrom) {
      const from = new Date(filterDateFrom);
      if (new Date(entry.timestamp) < from) return false;
    }
    if (filterDateTo) {
      const to = new Date(filterDateTo);
      to.setHours(23, 59, 59, 999);
      if (new Date(entry.timestamp) > to) return false;
    }
    return true;
  });

  return (
    <div style={{ fontFamily: 'var(--cortex-font-sans, sans-serif)' }}>
      {/* Filters */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '20px',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
        }}
      >
        <label style={{ display: 'flex', flexDirection: 'column', fontSize: '13px', color: 'var(--cortex-text-secondary, #6b7280)' }}>
          User ID
          <input
            type="text"
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            placeholder="Filter by user..."
            style={{
              marginTop: '4px',
              padding: '6px 10px',
              border: '1px solid var(--cortex-border, #e5e7eb)',
              borderRadius: '6px',
              fontSize: '13px',
              width: '180px',
            }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', fontSize: '13px', color: 'var(--cortex-text-secondary, #6b7280)' }}>
          Action
          <input
            type="text"
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            placeholder="Filter by action..."
            style={{
              marginTop: '4px',
              padding: '6px 10px',
              border: '1px solid var(--cortex-border, #e5e7eb)',
              borderRadius: '6px',
              fontSize: '13px',
              width: '180px',
            }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', fontSize: '13px', color: 'var(--cortex-text-secondary, #6b7280)' }}>
          From
          <input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            style={{
              marginTop: '4px',
              padding: '6px 10px',
              border: '1px solid var(--cortex-border, #e5e7eb)',
              borderRadius: '6px',
              fontSize: '13px',
            }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', fontSize: '13px', color: 'var(--cortex-text-secondary, #6b7280)' }}>
          To
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            style={{
              marginTop: '4px',
              padding: '6px 10px',
              border: '1px solid var(--cortex-border, #e5e7eb)',
              borderRadius: '6px',
              fontSize: '13px',
            }}
          />
        </label>
      </div>

      {/* Loading / Error states */}
      {loading && (
        <p style={{ color: 'var(--cortex-text-muted, #9ca3af)', fontSize: '14px' }}>
          Loading audit trail...
        </p>
      )}
      {error && (
        <p style={{ color: 'var(--cortex-danger, #ef4444)', fontSize: '14px' }}>
          Failed to load audit trail: {error.message}
        </p>
      )}

      {/* Empty state */}
      {!loading && !error && entries.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '48px 24px',
            color: 'var(--cortex-text-muted, #9ca3af)',
          }}
        >
          <p style={{ fontSize: '16px', fontWeight: 500 }}>No audit entries</p>
          <p style={{ fontSize: '13px', marginTop: '4px' }}>
            Audit log entries will appear here as actions are performed.
          </p>
        </div>
      )}

      {/* Timeline */}
      {entries.length > 0 && (
        <div style={{ position: 'relative', paddingLeft: '24px' }}>
          {/* Vertical timeline line */}
          <div
            style={{
              position: 'absolute',
              left: '7px',
              top: '8px',
              bottom: '8px',
              width: '2px',
              backgroundColor: 'var(--cortex-border, #e5e7eb)',
            }}
          />

          {entries.map((entry) => (
            <div
              key={entry.id}
              style={{
                position: 'relative',
                marginBottom: '16px',
                paddingBottom: '16px',
                borderBottom: '1px solid var(--cortex-border, #e5e7eb)',
              }}
            >
              {/* Timeline dot */}
              <div
                style={{
                  position: 'absolute',
                  left: '-21px',
                  top: '6px',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: entry.action.endsWith('.failed')
                    ? 'var(--cortex-danger, #ef4444)'
                    : 'var(--cortex-blue-500, #3b82f6)',
                  border: '2px solid white',
                }}
              />

              {/* Entry content */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: 'var(--cortex-text-primary, #111827)',
                    }}
                  >
                    {entry.action}
                  </span>
                  <span
                    style={{
                      marginLeft: '8px',
                      fontSize: '12px',
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      backgroundColor: 'var(--cortex-bg-secondary, #f9fafb)',
                      color: 'var(--cortex-text-secondary, #6b7280)',
                    }}
                  >
                    {entry.targetType}:{entry.targetId}
                  </span>
                </div>
                <time
                  style={{
                    fontSize: '12px',
                    color: 'var(--cortex-text-muted, #9ca3af)',
                    whiteSpace: 'nowrap',
                    marginLeft: '16px',
                  }}
                >
                  {formatTimestamp(entry.timestamp)}
                </time>
              </div>

              <p
                style={{
                  marginTop: '4px',
                  fontSize: '13px',
                  color: 'var(--cortex-text-secondary, #6b7280)',
                }}
              >
                User: {entry.userId}
              </p>

              {/* Before/After summary */}
              {(entry.before || entry.after) && (
                <p
                  style={{
                    marginTop: '4px',
                    fontSize: '12px',
                    color: 'var(--cortex-text-muted, #9ca3af)',
                    fontStyle: 'italic',
                  }}
                >
                  {summarizeChanges(entry.before, entry.after)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
