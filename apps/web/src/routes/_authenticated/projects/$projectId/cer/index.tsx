import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { FileText, Plus, ArrowRight, Trash2 } from 'lucide-react';
import { navigate } from '../../../../../router';
import { GET_CER_VERSIONS } from '../../../../../features/cer/graphql/queries';
import { CREATE_CER, DELETE_CER_VERSION } from '../../../../../features/cer/graphql/mutations';

type CerVersion = {
  id: string;
  projectId: string;
  regulatoryContext: string;
  versionType: string;
  versionNumber: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  lockedAt: string | null;
};

const statusConfig: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: 'bg-blue-100', text: 'text-blue-700' },
  IN_PROGRESS: { bg: 'bg-orange-100', text: 'text-orange-700' },
  REVIEW: { bg: 'bg-purple-100', text: 'text-purple-700' },
  FINALIZED: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  LOCKED: { bg: 'bg-gray-800', text: 'text-white' },
};

export default function CerIndexPage() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [regulatoryContext, setRegulatoryContext] = useState('CE_MDR');
  const [versionType, setVersionType] = useState('INITIAL');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  // Extract projectId from URL
  const pathParts = window.location.pathname.split('/');
  const projectId = pathParts[pathParts.indexOf('projects') + 1] ?? '';

  const { data, loading, error, refetch } = useQuery<{
    cerVersions: CerVersion[];
  }>(GET_CER_VERSIONS, {
    variables: { projectId },
    skip: !projectId,
  });

  const [createCer, { loading: creating }] = useMutation<any>(CREATE_CER, {
    errorPolicy: 'none',
  });

  const [deleteCer] = useMutation(DELETE_CER_VERSION, {
    refetchQueries: [{ query: GET_CER_VERSIONS, variables: { projectId } }],
  });

  const cerVersions = data?.cerVersions ?? [];

  const handleCreate = async () => {
    setCreateError(null);
    try {
      const result = await createCer({
        variables: {
          projectId,
          regulatoryContext,
          versionType,
        },
      });

      const cerId = result.data?.createCer?.cerVersionId;
      if (cerId) {
        setShowCreateForm(false);
        navigate(`/projects/${projectId}/cer/${cerId}`);
      }
      refetch();
    } catch (err: any) {
      setCreateError(err.message ?? 'Failed to create CER');
    }
  };

  const handleOpenCer = (cerId: string) => {
    navigate(`/projects/${projectId}/cer/${cerId}`);
  };

  const handleDeleteCer = async (cerId: string) => {
    await deleteCer({ variables: { cerVersionId: cerId } });
    setConfirmDeleteId(null);
  };

  return (
    <div className="space-y-6" data-testid="cer-index-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText size={24} className="text-[var(--cortex-blue-500)]" />
          <h1 className="text-2xl font-semibold text-[var(--cortex-text-primary)]">
            Clinical Evaluation Reports
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center gap-2 rounded-md bg-[var(--cortex-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          data-testid="create-cer-btn"
        >
          <Plus size={16} /> New CER
        </button>
      </div>

      {loading && (
        <div
          className="py-12 text-center text-sm text-[var(--cortex-text-muted)]"
          data-testid="cer-loading"
        >
          Loading CER versions...
        </div>
      )}

      {error && (
        <div
          className="py-12 text-center text-sm text-[var(--cortex-error)]"
          data-testid="cer-error"
        >
          Failed to load CER versions.
        </div>
      )}

      {/* CER List */}
      {!loading && !error && cerVersions.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-[var(--cortex-border)] p-12 text-center">
          <FileText size={48} className="mx-auto mb-4 text-[var(--cortex-text-muted)]" />
          <h2 className="mb-2 text-lg font-medium text-[var(--cortex-text-primary)]">
            No CER versions yet
          </h2>
          <p className="mb-4 text-sm text-[var(--cortex-text-secondary)]">
            Create your first Clinical Evaluation Report to get started.
          </p>
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center gap-2 rounded-md bg-[var(--cortex-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            <Plus size={16} /> Create CER
          </button>
        </div>
      ) : !loading && !error ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cerVersions.map((cer) => {
            const sc = statusConfig[cer.status] ?? { bg: 'bg-gray-100', text: 'text-gray-700' };
            return (
              <div
                key={cer.id}
                className="relative cursor-pointer rounded-lg border border-[var(--cortex-border)] p-4 transition-shadow hover:shadow-md"
                onClick={() => handleOpenCer(cer.id)}
                data-testid={`cer-card-${cer.id}`}
              >
                {cer.status === 'DRAFT' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDeleteId(cer.id);
                    }}
                    className="absolute right-2 top-2 rounded p-1 text-[var(--cortex-text-muted)] hover:bg-red-50 hover:text-red-600"
                    data-testid={`delete-cer-${cer.id}`}
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                )}

                {confirmDeleteId === cer.id && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/95 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-sm text-[var(--cortex-text-primary)]">
                        Delete CER v{cer.versionNumber}?
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCer(cer.id);
                          }}
                          className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
                          data-testid={`confirm-delete-cer-${cer.id}`}
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(null);
                          }}
                          className="rounded border border-[var(--cortex-border)] px-3 py-1 text-xs text-[var(--cortex-text-secondary)]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-[var(--cortex-primary)]" />
                    <span className="font-semibold text-[var(--cortex-text-primary)]">
                      CER v{cer.versionNumber}
                    </span>
                  </div>
                  <span
                    className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${sc.bg} ${sc.text}`}
                  >
                    {cer.status}
                  </span>
                </div>
                <div className="mt-2 space-y-1 text-xs text-[var(--cortex-text-muted)]">
                  <div>Context: {cer.regulatoryContext?.replace('_', ' ')}</div>
                  <div>Type: {cer.versionType}</div>
                  <div>Updated: {new Date(cer.updatedAt).toLocaleDateString()}</div>
                  {cer.lockedAt && (
                    <div className="font-medium text-emerald-600">
                      Locked: {new Date(cer.lockedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <div className="mt-3 flex justify-end">
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--cortex-primary)]">
                    Open <ArrowRight size={12} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Create CER Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowCreateForm(false)}
          />
          <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-[var(--cortex-text-primary)]">
              Create New CER
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--cortex-text-muted)]">
                  Regulatory Framework
                </label>
                {(['CE_MDR', 'FDA_510K', 'DUAL'] as const).map((ctx) => (
                  <label
                    key={ctx}
                    className={`mt-1 flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm ${
                      regulatoryContext === ctx
                        ? 'border-[var(--cortex-primary)] bg-blue-50'
                        : 'border-[var(--cortex-border)]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="regulatoryContext"
                      value={ctx}
                      checked={regulatoryContext === ctx}
                      onChange={() => setRegulatoryContext(ctx)}
                      className="accent-[var(--cortex-primary)]"
                    />
                    <span className="font-medium">{ctx.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--cortex-text-muted)]">
                  Version Type
                </label>
                <select
                  value={versionType}
                  onChange={(e) => setVersionType(e.target.value)}
                  className="w-full rounded border border-[var(--cortex-border)] px-3 py-2 text-sm"
                  data-testid="version-type-select"
                >
                  <option value="INITIAL">Initial</option>
                  <option value="ANNUAL_UPDATE">Annual Update</option>
                  <option value="PATCH_UPDATE">Patch Update</option>
                </select>
              </div>
            </div>

            {createError && (
              <div className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {createError}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="rounded border border-[var(--cortex-border)] px-4 py-2 text-sm text-[var(--cortex-text-secondary)] hover:bg-[var(--cortex-bg-hover)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating}
                className="inline-flex items-center gap-2 rounded bg-[var(--cortex-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                data-testid="submit-create-cer"
              >
                <Plus size={14} /> {creating ? 'Creating...' : 'Create CER'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
