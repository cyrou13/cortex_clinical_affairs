import { useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { GitCompare, Plus, Minus, RefreshCw } from 'lucide-react';

export const GET_IMPORT_DIFF = gql`
  query GetImportDiff($studyId: String!, $versionA: String!, $versionB: String!) {
    importVersionDiff(studyId: $studyId, versionA: $versionA, versionB: $versionB) {
      summary {
        added
        removed
        modified
      }
      rows {
        id
        type
        field
        oldValue
        newValue
      }
    }
  }
`;

interface DiffRow {
  id: string;
  type: 'ADDED' | 'REMOVED' | 'MODIFIED';
  field: string;
  oldValue: string | null;
  newValue: string | null;
}

interface ImportVersionDiffProps {
  studyId: string;
  versionA: string;
  versionB: string;
}

export function ImportVersionDiff({ studyId, versionA, versionB }: ImportVersionDiffProps) {
  const { data, loading } = useQuery(GET_IMPORT_DIFF, {
    variables: { studyId, versionA, versionB },
  });

  if (loading) {
    return (
      <div className="py-6 text-center text-sm text-[var(--cortex-text-muted)]" data-testid="diff-loading">
        Computing diff...
      </div>
    );
  }

  const diff = data?.importVersionDiff;
  const summary = diff?.summary ?? { added: 0, removed: 0, modified: 0 };
  const rows: DiffRow[] = diff?.rows ?? [];

  const getRowColor = (type: string) => {
    switch (type) {
      case 'ADDED':
        return 'bg-emerald-50';
      case 'REMOVED':
        return 'bg-red-50';
      case 'MODIFIED':
        return 'bg-orange-50';
      default:
        return 'bg-white';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ADDED':
        return <Plus size={12} className="text-emerald-600" />;
      case 'REMOVED':
        return <Minus size={12} className="text-red-600" />;
      case 'MODIFIED':
        return <RefreshCw size={12} className="text-orange-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4" data-testid="import-diff">
      <div className="flex items-center gap-2">
        <GitCompare size={16} className="text-[var(--cortex-primary)]" />
        <h3 className="text-sm font-semibold text-[var(--cortex-text-primary)]">
          Version Diff
        </h3>
      </div>

      <div className="flex gap-4 rounded-lg border border-[var(--cortex-border)] p-3" data-testid="diff-summary">
        <div className="flex items-center gap-2">
          <Plus size={14} className="text-emerald-600" />
          <span className="text-sm text-emerald-700" data-testid="added-count">{summary.added} added</span>
        </div>
        <div className="flex items-center gap-2">
          <Minus size={14} className="text-red-600" />
          <span className="text-sm text-red-700" data-testid="removed-count">{summary.removed} removed</span>
        </div>
        <div className="flex items-center gap-2">
          <RefreshCw size={14} className="text-orange-600" />
          <span className="text-sm text-orange-700" data-testid="modified-count">{summary.modified} modified</span>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="py-4 text-center text-sm text-[var(--cortex-text-muted)]" data-testid="no-diff">
          No differences found.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--cortex-border)]">
          <table className="w-full text-sm" data-testid="diff-table">
            <thead>
              <tr className="bg-blue-800 text-white">
                <th className="px-3 py-2 text-left text-xs font-medium">Type</th>
                <th className="px-3 py-2 text-left text-xs font-medium">Field</th>
                <th className="px-3 py-2 text-left text-xs font-medium">Old Value</th>
                <th className="px-3 py-2 text-left text-xs font-medium">New Value</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className={getRowColor(row.type)} data-testid={`diff-row-${row.id}`}>
                  <td className="border-r border-[#ECF0F1] px-3 py-1.5">
                    <div className="flex items-center gap-1">
                      {getTypeIcon(row.type)}
                      <span className="text-xs font-medium">{row.type}</span>
                    </div>
                  </td>
                  <td className="border-r border-[#ECF0F1] px-3 py-1.5 text-[var(--cortex-text-primary)]">
                    {row.field}
                  </td>
                  <td className="border-r border-[#ECF0F1] px-3 py-1.5 text-red-600">
                    {row.oldValue ?? '—'}
                  </td>
                  <td className="px-3 py-1.5 text-emerald-600">
                    {row.newValue ?? '—'}
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
