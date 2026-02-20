import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { Search, Plus, Clock, Lock, ChevronRight, Trash2 } from 'lucide-react';
import { navigate } from '../../../../../router';
import { GET_SLS_SESSIONS } from '../../../../../features/sls/graphql/queries';
import { DELETE_SLS_SESSION } from '../../../../../features/sls/graphql/mutations';
import { SessionCreateForm } from '../../../../../features/sls/components/SessionCreateForm';

interface SlsSessionSummary {
  id: string;
  name: string;
  type: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  SOA_CLINICAL: 'SOA Clinical',
  SOA_DEVICE: 'SOA Device',
  SIMILAR_DEVICE: 'Similar Device',
  PMS_UPDATE: 'PMS Update',
  AD_HOC: 'Ad Hoc',
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: 'bg-gray-100', text: 'text-gray-700' },
  SCREENING: { bg: 'bg-blue-100', text: 'text-blue-700' },
  COMPLETED: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  LOCKED: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
};

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] ?? { bg: 'bg-gray-100', text: 'text-gray-700' };
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${c.bg} ${c.text}`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export default function SlsSessionsPage() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const pathParts = window.location.pathname.split('/');
  const projectId = pathParts[pathParts.indexOf('projects') + 1] ?? '';

  const { data, loading, error } = useQuery<{ slsSessions: SlsSessionSummary[] }>(
    GET_SLS_SESSIONS,
    { variables: { projectId }, skip: !projectId },
  );

  const [deleteSession] = useMutation(DELETE_SLS_SESSION, {
    refetchQueries: [{ query: GET_SLS_SESSIONS, variables: { projectId } }],
  });

  const sessions = data?.slsSessions ?? [];

  function handleSessionCreated(sessionId: string) {
    setShowCreateForm(false);
    navigate(`/projects/${projectId}/sls-sessions/${sessionId}`);
  }

  const handleDelete = async (sessionId: string) => {
    await deleteSession({ variables: { sessionId } });
    setConfirmDeleteId(null);
  };

  return (
    <div className="space-y-6" data-testid="sls-sessions-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Search size={24} className="text-[var(--cortex-blue-500)]" />
          <h1 className="text-2xl font-semibold text-[var(--cortex-text-primary)]">
            Systematic Literature Search
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center gap-2 rounded bg-[var(--cortex-blue-500)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          data-testid="new-session-button"
        >
          <Plus size={16} />
          New Session
        </button>
      </div>

      {loading && (
        <div
          className="py-12 text-center text-sm text-[var(--cortex-text-muted)]"
          data-testid="sls-list-loading"
        >
          Loading SLS sessions...
        </div>
      )}

      {error && (
        <div
          className="py-12 text-center text-sm text-[var(--cortex-error)]"
          data-testid="sls-list-error"
        >
          Failed to load SLS sessions.
        </div>
      )}

      {!loading && !error && sessions.length === 0 && (
        <div
          className="rounded-lg border-2 border-dashed border-[var(--cortex-border)] p-12 text-center"
          data-testid="empty-state"
        >
          <Search size={48} className="mx-auto mb-4 text-[var(--cortex-text-muted)]" />
          <h2 className="mb-2 text-lg font-medium text-[var(--cortex-text-primary)]">
            No SLS sessions yet
          </h2>
          <p className="mb-4 text-sm text-[var(--cortex-text-secondary)]">
            Create your first literature search session to begin querying databases.
          </p>
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center gap-2 rounded bg-[var(--cortex-blue-500)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            <Plus size={16} />
            Create Session
          </button>
        </div>
      )}

      {!loading && !error && sessions.length > 0 && (
        <div className="space-y-2" data-testid="sls-list">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="relative flex w-full items-center gap-4 rounded-lg border border-[var(--cortex-border)] bg-white p-4 text-left transition-colors hover:border-[var(--cortex-blue-500)] hover:bg-gray-50"
              data-testid={`session-item-${session.id}`}
            >
              <button
                type="button"
                onClick={() => navigate(`/projects/${projectId}/sls-sessions/${session.id}`)}
                className="flex flex-1 items-center gap-4 text-left"
              >
                <Search size={16} className="text-[var(--cortex-blue-500)]" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[var(--cortex-text-primary)]">
                      {session.name}
                    </span>
                    <StatusBadge status={session.status} />
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                      {TYPE_LABELS[session.type] ?? session.type}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-4 text-xs text-[var(--cortex-text-muted)]">
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      Created {new Date(session.createdAt).toLocaleDateString()}
                    </span>
                    {session.status === 'LOCKED' && (
                      <span className="flex items-center gap-1">
                        <Lock size={10} />
                        Locked
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight size={16} className="text-[var(--cortex-text-muted)]" />
              </button>

              {session.status === 'DRAFT' && (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(session.id)}
                  className="rounded p-1.5 text-[var(--cortex-text-muted)] hover:bg-red-50 hover:text-red-600"
                  data-testid={`delete-session-${session.id}`}
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              )}

              {confirmDeleteId === session.id && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/95 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-[var(--cortex-text-primary)]">
                      Delete &quot;{session.name}&quot;?
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(session.id)}
                      className="rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                      data-testid={`confirm-delete-session-${session.id}`}
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="rounded border border-[var(--cortex-border)] px-3 py-1.5 text-xs text-[var(--cortex-text-secondary)]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create form modal */}
      {showCreateForm && (
        <SessionCreateForm
          projectId={projectId}
          onCreated={handleSessionCreated}
          onCancel={() => setShowCreateForm(false)}
        />
      )}
    </div>
  );
}
