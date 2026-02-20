import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { FlaskConical, Plus, FileUp, Lock, Clock, CheckCircle, Edit3, Trash2 } from 'lucide-react';
import { navigate } from '../../../../../router';
import { GET_SOA_ANALYSES } from '../../../../../features/soa/graphql/queries';
import { CreateSoaDialog } from '../../../../../features/soa/components/CreateSoaDialog';
import { ImportSoaDialog } from '../../../../../features/soa/components/ImportSoaDialog';
import { DELETE_SOA_ANALYSIS } from '../../../../../features/soa/graphql/mutations';

interface SoaAnalysisSummary {
  id: string;
  name: string;
  type: string;
  status: string;
  description: string | null;
  createdAt: string;
  lockedAt: string | null;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    DRAFT: { bg: 'bg-gray-100', text: 'text-gray-700' },
    IN_PROGRESS: { bg: 'bg-blue-100', text: 'text-blue-700' },
    LOCKED: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
    FINALIZED: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  };
  const c = config[status] ?? { bg: 'bg-gray-100', text: 'text-gray-700' };
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${c.bg} ${c.text}`}
    >
      {status.replace('_', ' ')}
    </span>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'LOCKED':
      return <Lock size={16} className="text-emerald-500" />;
    case 'FINALIZED':
      return <CheckCircle size={16} className="text-emerald-500" />;
    case 'IN_PROGRESS':
      return <Edit3 size={16} className="text-blue-500" />;
    default:
      return <Clock size={16} className="text-gray-400" />;
  }
}

export default function SoaIndexPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const pathParts = window.location.pathname.split('/');
  const projectId = pathParts[pathParts.indexOf('projects') + 1] ?? '';

  const { data, loading, error } = useQuery<any>(GET_SOA_ANALYSES, {
    variables: { projectId },
    skip: !projectId,
  });

  const [deleteSoa] = useMutation(DELETE_SOA_ANALYSIS, {
    refetchQueries: [{ query: GET_SOA_ANALYSES, variables: { projectId } }],
  });

  const analyses: SoaAnalysisSummary[] = data?.soaAnalyses ?? [];

  const handleDelete = async (soaId: string) => {
    await deleteSoa({ variables: { soaAnalysisId: soaId } });
    setConfirmDeleteId(null);
  };

  function handleCreated(soaId: string) {
    setShowCreateDialog(false);
    navigate(`/projects/${projectId}/soa/${soaId}`);
  }

  return (
    <div className="space-y-6" data-testid="soa-index-page">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FlaskConical size={24} className="text-[var(--cortex-blue-500)]" />
          <h1 className="text-2xl font-semibold text-[var(--cortex-text-primary)]">
            State of the Art Analysis
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowImportDialog(true)}
            className="inline-flex items-center gap-2 rounded border border-[var(--cortex-border)] px-4 py-2 text-sm font-medium text-[var(--cortex-text-primary)] hover:bg-[var(--cortex-bg-secondary)]"
            data-testid="import-soa-trigger"
          >
            <FileUp size={16} />
            Importer un SOA
          </button>
          <button
            type="button"
            onClick={() => setShowCreateDialog(true)}
            className="inline-flex items-center gap-2 rounded bg-[var(--cortex-blue-500)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            data-testid="create-soa-trigger"
          >
            <Plus size={16} />
            New SOA Analysis
          </button>
        </div>
      </div>

      {loading && (
        <div
          className="py-12 text-center text-sm text-[var(--cortex-text-muted)]"
          data-testid="soa-list-loading"
        >
          Loading SOA analyses...
        </div>
      )}

      {error && (
        <div
          className="py-12 text-center text-sm text-[var(--cortex-error)]"
          data-testid="soa-list-error"
        >
          Failed to load SOA analyses.
        </div>
      )}

      {!loading && !error && analyses.length === 0 && (
        <div
          className="rounded-lg border-2 border-dashed border-[var(--cortex-border)] p-12 text-center"
          data-testid="soa-empty-state"
        >
          <FlaskConical size={48} className="mx-auto mb-4 text-[var(--cortex-text-muted)]" />
          <h2 className="mb-2 text-lg font-medium text-[var(--cortex-text-primary)]">
            No SOA analyses yet
          </h2>
          <p className="mb-4 text-sm text-[var(--cortex-text-secondary)]">
            Create your first State of the Art analysis to begin evaluating clinical literature.
          </p>
          <button
            type="button"
            onClick={() => setShowCreateDialog(true)}
            className="inline-flex items-center gap-2 rounded bg-[var(--cortex-blue-500)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            data-testid="empty-create-btn"
          >
            <Plus size={16} />
            Create SOA Analysis
          </button>
        </div>
      )}

      {!loading && !error && analyses.length > 0 && (
        <div className="space-y-2" data-testid="soa-list">
          {analyses.map((soa) => (
            <div
              key={soa.id}
              className="relative flex w-full items-center gap-4 rounded-lg border border-[var(--cortex-border)] bg-white p-4 text-left transition-colors hover:border-[var(--cortex-blue-500)] hover:bg-gray-50"
              data-testid={`soa-item-${soa.id}`}
            >
              <button
                type="button"
                onClick={() => navigate(`/projects/${projectId}/soa/${soa.id}`)}
                className="flex flex-1 items-center gap-4 text-left"
              >
                <StatusIcon status={soa.status} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[var(--cortex-text-primary)]">
                      {soa.name}
                    </span>
                    <StatusBadge status={soa.status} />
                  </div>
                  <div className="mt-1 text-xs text-[var(--cortex-text-muted)]">
                    {soa.type.replace(/_/g, ' ')}
                    {soa.createdAt && ` -- Created ${new Date(soa.createdAt).toLocaleDateString()}`}
                  </div>
                  {soa.description && (
                    <p className="mt-1 text-sm text-[var(--cortex-text-secondary)]">
                      {soa.description}
                    </p>
                  )}
                </div>
                {soa.lockedAt && (
                  <span title="Locked">
                    <Lock size={14} className="text-emerald-500" />
                  </span>
                )}
              </button>
              {soa.status === 'DRAFT' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDeleteId(soa.id);
                  }}
                  className="rounded p-1.5 text-[var(--cortex-text-muted)] hover:bg-red-50 hover:text-red-600"
                  data-testid={`delete-soa-${soa.id}`}
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              )}

              {confirmDeleteId === soa.id && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/95 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-[var(--cortex-text-primary)]">
                      Delete &quot;{soa.name}&quot;?
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(soa.id)}
                      className="rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                      data-testid={`confirm-delete-soa-${soa.id}`}
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="rounded border border-[var(--cortex-border)] px-3 py-1.5 text-xs text-[var(--cortex-text-secondary)]"
                      data-testid={`cancel-delete-soa-${soa.id}`}
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

      <CreateSoaDialog
        projectId={projectId}
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreated={handleCreated}
      />

      <ImportSoaDialog
        projectId={projectId}
        open={showImportDialog}
        onClose={() => setShowImportDialog(false)}
      />
    </div>
  );
}
