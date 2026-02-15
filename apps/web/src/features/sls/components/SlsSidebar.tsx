import { useQuery } from '@apollo/client/react';
import { Plus, Search, FileText } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import { StatusBadge, type StatusVariant } from '../../../shared/components/StatusBadge';
import { GET_SLS_SESSIONS } from '../graphql/queries';

export type SlsSessionType =
  | 'SOA_CLINICAL'
  | 'SOA_DEVICE'
  | 'SIMILAR_DEVICE'
  | 'PMS_UPDATE'
  | 'AD_HOC';

export interface SlsSessionSummary {
  id: string;
  name: string;
  type: SlsSessionType;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const typeLabels: Record<SlsSessionType, string> = {
  SOA_CLINICAL: 'SOA Clinical',
  SOA_DEVICE: 'SOA Device',
  SIMILAR_DEVICE: 'Similar Device',
  PMS_UPDATE: 'PMS Update',
  AD_HOC: 'Ad Hoc',
};

function mapStatusToVariant(status: string): StatusVariant {
  const map: Record<string, StatusVariant> = {
    DRAFT: 'draft',
    SCREENING: 'screening',
    COMPLETED: 'completed',
    LOCKED: 'locked',
  };
  return map[status] ?? 'draft';
}

interface SlsSidebarProps {
  projectId: string;
  activeSessionId?: string;
  onNewSession: () => void;
  onSelectSession: (sessionId: string) => void;
}

export function SlsSidebar({
  projectId,
  activeSessionId,
  onNewSession,
  onSelectSession,
}: SlsSidebarProps) {
  const { data, loading } = useQuery<{ slsSessions: SlsSessionSummary[] }>(
    GET_SLS_SESSIONS,
    { variables: { projectId } },
  );

  const sessions = data?.slsSessions ?? [];

  return (
    <aside
      data-testid="sls-sidebar"
      className="flex h-full w-[240px] min-w-[240px] flex-col bg-[#0A3153] text-white"
      aria-label="SLS sessions"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <Search size={16} className="text-white/80" />
          <span className="text-sm font-semibold">SLS Sessions</span>
          {sessions.length > 0 && (
            <span
              data-testid="session-count"
              className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white/20 px-1.5 text-xs font-medium"
            >
              {sessions.length}
            </span>
          )}
        </div>
      </div>

      {/* New Session button */}
      <div className="px-3 py-2">
        <button
          type="button"
          onClick={onNewSession}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-white/90 hover:bg-white/10"
          data-testid="new-session-button"
        >
          <Plus size={16} />
          New Session
        </button>
      </div>

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto px-2 py-1">
        {loading && (
          <p className="px-3 py-4 text-xs text-white/50">Loading sessions...</p>
        )}

        {!loading && sessions.length === 0 && (
          <div className="px-3 py-6 text-center" data-testid="empty-state">
            <FileText size={24} className="mx-auto mb-2 text-white/30" />
            <p className="text-xs text-white/50">
              No SLS sessions yet. Create one to start your literature search.
            </p>
          </div>
        )}

        {sessions.map((session) => {
          const isActive = session.id === activeSessionId;
          return (
            <button
              key={session.id}
              type="button"
              onClick={() => onSelectSession(session.id)}
              data-testid={`session-item-${session.id}`}
              className={cn(
                'mb-0.5 flex w-full flex-col items-start rounded-md px-3 py-2 text-left transition-colors',
                isActive
                  ? 'bg-[var(--cortex-blue-100)] text-[var(--cortex-blue-900)]'
                  : 'text-white/80 hover:bg-white/10 hover:text-white',
              )}
              aria-current={isActive ? 'true' : undefined}
            >
              <span className="text-sm font-medium leading-tight">
                {session.name}
              </span>
              <div className="mt-1 flex items-center gap-2">
                <span
                  className={cn(
                    'text-xs',
                    isActive ? 'text-[var(--cortex-blue-700)]' : 'text-white/50',
                  )}
                >
                  {typeLabels[session.type] ?? session.type}
                </span>
                <StatusBadge
                  variant={mapStatusToVariant(session.status)}
                  className="text-[10px] px-1.5 py-0"
                />
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
