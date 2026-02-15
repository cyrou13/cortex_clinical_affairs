import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { Database, CheckCircle, Clock, RotateCcw } from 'lucide-react';

export const GET_IMPORT_VERSIONS = gql`
  query GetImportVersions($studyId: String!) {
    importVersions(studyId: $studyId) {
      id
      version
      date
      status
      rowCount
      isActive
    }
  }
`;

export const SET_ACTIVE_VERSION = gql`
  mutation SetActiveVersion($studyId: String!, $versionId: String!) {
    setActiveImportVersion(studyId: $studyId, versionId: $versionId) {
      versionId
      isActive
    }
  }
`;

export const ROLLBACK_VERSION = gql`
  mutation RollbackVersion($studyId: String!, $versionId: String!) {
    rollbackImportVersion(studyId: $studyId, versionId: $versionId) {
      versionId
      status
    }
  }
`;

interface ImportVersion {
  id: string;
  version: number;
  date: string;
  status: 'VALID' | 'INVALID' | 'PROCESSING';
  rowCount: number;
  isActive: boolean;
}

interface ImportVersionListProps {
  studyId: string;
  onCompare?: (versionA: string, versionB: string) => void;
}

function VersionStatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    VALID: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: <CheckCircle size={10} /> },
    INVALID: { bg: 'bg-red-100', text: 'text-red-700', icon: null },
    PROCESSING: { bg: 'bg-blue-100', text: 'text-blue-700', icon: <Clock size={10} /> },
  };
  const c = config[status] ?? { bg: 'bg-gray-100', text: 'text-gray-700', icon: null };
  return (
    <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${c.bg} ${c.text}`} data-testid="version-status">
      {c.icon}
      {status}
    </span>
  );
}

export function ImportVersionList({ studyId, onCompare }: ImportVersionListProps) {
  const [compareFrom, setCompareFrom] = useState<string | null>(null);

  const { data, loading } = useQuery(GET_IMPORT_VERSIONS, {
    variables: { studyId },
  });

  const [setActive, { loading: settingActive }] = useMutation(SET_ACTIVE_VERSION);
  const [rollback, { loading: rollingBack }] = useMutation(ROLLBACK_VERSION);

  if (loading) {
    return (
      <div className="py-6 text-center text-sm text-[var(--cortex-text-muted)]" data-testid="versions-loading">
        Loading import versions...
      </div>
    );
  }

  const versions: ImportVersion[] = data?.importVersions ?? [];

  const handleSetActive = async (versionId: string) => {
    await setActive({ variables: { studyId, versionId } });
  };

  const handleRollback = async (versionId: string) => {
    await rollback({ variables: { studyId, versionId } });
  };

  const handleCompare = (versionId: string) => {
    if (!compareFrom) {
      setCompareFrom(versionId);
    } else {
      onCompare?.(compareFrom, versionId);
      setCompareFrom(null);
    }
  };

  return (
    <div className="space-y-4" data-testid="import-version-list">
      <div className="flex items-center gap-2">
        <Database size={16} className="text-[var(--cortex-primary)]" />
        <h3 className="text-sm font-semibold text-[var(--cortex-text-primary)]">
          Import Versions
        </h3>
      </div>

      {versions.length === 0 ? (
        <p className="py-4 text-center text-sm text-[var(--cortex-text-muted)]" data-testid="no-versions">
          No import versions yet.
        </p>
      ) : (
        <div className="space-y-3">
          {versions.map((version) => (
            <div
              key={version.id}
              className={`rounded-lg border p-4 ${
                version.isActive
                  ? 'border-[var(--cortex-primary)] bg-blue-50'
                  : 'border-[var(--cortex-border)]'
              }`}
              data-testid={`version-card-${version.id}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-[var(--cortex-text-primary)]">
                    Version {version.version}
                  </span>
                  <VersionStatusBadge status={version.status} />
                  {version.isActive && (
                    <span className="rounded bg-[var(--cortex-primary)] px-2 py-0.5 text-xs font-medium text-white">
                      Active
                    </span>
                  )}
                </div>
                <span className="text-xs text-[var(--cortex-text-muted)]">{version.date}</span>
              </div>

              <div className="mt-2 text-xs text-[var(--cortex-text-muted)]">
                {version.rowCount} rows imported
              </div>

              <div className="mt-3 flex gap-2">
                {!version.isActive && version.status === 'VALID' && (
                  <button
                    type="button"
                    onClick={() => handleSetActive(version.id)}
                    disabled={settingActive}
                    className="rounded border border-[var(--cortex-primary)] px-3 py-1 text-xs font-medium text-[var(--cortex-primary)] hover:bg-blue-50"
                    data-testid="set-active-btn"
                  >
                    Set Active
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleCompare(version.id)}
                  className={`rounded border px-3 py-1 text-xs font-medium ${
                    compareFrom === version.id
                      ? 'border-orange-400 bg-orange-50 text-orange-600'
                      : 'border-[var(--cortex-border)] text-[var(--cortex-text-muted)]'
                  }`}
                  data-testid="compare-btn"
                >
                  {compareFrom === version.id ? 'Select target...' : 'Compare'}
                </button>
                <button
                  type="button"
                  onClick={() => handleRollback(version.id)}
                  disabled={rollingBack || version.isActive}
                  className="inline-flex items-center gap-1 rounded border border-[var(--cortex-border)] px-3 py-1 text-xs text-[var(--cortex-text-muted)] hover:text-red-500 disabled:opacity-50"
                  data-testid="rollback-btn"
                >
                  <RotateCcw size={10} /> Rollback
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
