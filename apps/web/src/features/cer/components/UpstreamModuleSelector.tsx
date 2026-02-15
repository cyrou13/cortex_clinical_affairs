import { useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { Lock, CheckCircle } from 'lucide-react';

export const GET_UPSTREAM_MODULES = gql`
  query GetUpstreamModules($projectId: String!) {
    upstreamModules(projectId: $projectId) {
      id
      name
      type
      lockedAt
      status
    }
  }
`;

interface UpstreamModule {
  id: string;
  name: string;
  type: 'SLS' | 'SOA' | 'VALIDATION';
  lockedAt: string | null;
  status: string;
}

interface UpstreamModuleSelectorProps {
  projectId: string;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export function UpstreamModuleSelector({ projectId, selectedIds, onSelectionChange }: UpstreamModuleSelectorProps) {
  const { data, loading } = useQuery(GET_UPSTREAM_MODULES, { variables: { projectId } });

  const modules: UpstreamModule[] = data?.upstreamModules ?? [];

  const toggleModule = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((sid) => sid !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  if (loading) {
    return <div className="py-4 text-center text-sm text-[var(--cortex-text-muted)]">Loading modules...</div>;
  }

  return (
    <div className="space-y-3" data-testid="upstream-selector">
      {modules.map((mod) => {
        const isLocked = !!mod.lockedAt;
        return (
          <div
            key={mod.id}
            className={`flex items-center gap-3 rounded-lg border p-3 ${
              isLocked ? 'border-[var(--cortex-border)]' : 'border-gray-200 opacity-50'
            }`}
            data-testid="module-item"
          >
            <input
              type="checkbox"
              checked={selectedIds.includes(mod.id)}
              onChange={() => toggleModule(mod.id)}
              disabled={!isLocked}
              className="accent-[var(--cortex-primary)]"
              data-testid="link-checkbox"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[var(--cortex-text-primary)]">{mod.name}</span>
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">{mod.type}</span>
              </div>
              {isLocked && (
                <div className="mt-1 flex items-center gap-1 text-xs text-emerald-600" data-testid="lock-date">
                  <Lock size={10} /> Locked {mod.lockedAt}
                </div>
              )}
            </div>
            {isLocked ? (
              <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700" data-testid="locked-badge">
                <CheckCircle size={10} /> Locked
              </span>
            ) : (
              <span className="text-xs text-[var(--cortex-text-muted)]" title="Module must be locked before linking">
                Not locked
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
