import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { FlaskConical, Plus, Clock, Lock, ChevronRight, Trash2 } from 'lucide-react';
import { navigate } from '../../../../../router';
import { GET_VALIDATION_STUDIES } from '../../../../../features/validation/graphql/queries';
import { GET_SOA_ANALYSES } from '../../../../../features/soa/graphql/queries';
import {
  CREATE_VALIDATION_STUDY,
  DELETE_VALIDATION_STUDY,
} from '../../../../../features/validation/graphql/mutations';

interface ValidationStudy {
  id: string;
  name: string;
  type: string;
  status: string;
  description: string | null;
  createdAt: string;
  lockedAt: string | null;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: 'bg-blue-100', text: 'text-blue-700' },
  IN_PROGRESS: { bg: 'bg-blue-500', text: 'text-white' },
  LOCKED: { bg: 'bg-gray-200', text: 'text-gray-700' },
  COMPLETED: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
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

export default function ValidationIndexPage() {
  const pathParts = window.location.pathname.split('/');
  const projectId = pathParts[pathParts.indexOf('projects') + 1] ?? '';

  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('STANDALONE');
  const [formDescription, setFormDescription] = useState('');
  const [formSoaId, setFormSoaId] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  const { data, loading, error } = useQuery<any>(GET_VALIDATION_STUDIES, {
    variables: { projectId },
    skip: !projectId,
  });

  const { data: soaData } = useQuery<any>(GET_SOA_ANALYSES, {
    variables: { projectId },
    skip: !projectId,
  });

  const soaAnalyses: Array<{ id: string; name: string; type: string; status: string }> =
    soaData?.soaAnalyses ?? [];

  const [createStudy, { loading: creating }] = useMutation<any>(CREATE_VALIDATION_STUDY, {
    refetchQueries: [{ query: GET_VALIDATION_STUDIES, variables: { projectId } }],
    errorPolicy: 'none',
  });

  const [deleteStudy] = useMutation(DELETE_VALIDATION_STUDY, {
    refetchQueries: [{ query: GET_VALIDATION_STUDIES, variables: { projectId } }],
  });

  const studies: ValidationStudy[] = data?.validationStudies ?? [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    setCreateError(null);

    try {
      const result = await createStudy({
        variables: {
          projectId,
          name: formName.trim(),
          type: formType,
          description: formDescription || undefined,
          soaAnalysisId: formSoaId || undefined,
        },
      });

      const studyId = result.data?.createValidationStudy?.validationStudyId;
      if (studyId) {
        setShowForm(false);
        setFormName('');
        setFormType('STANDALONE');
        setFormDescription('');
        setFormSoaId('');
        navigate(`/projects/${projectId}/validation/${studyId}`);
      }
    } catch (err: any) {
      setCreateError(err.message ?? 'Failed to create study');
    }
  };

  const handleStudyClick = (studyId: string) => {
    navigate(`/projects/${projectId}/validation/${studyId}`);
  };

  const handleDeleteStudy = async (studyId: string) => {
    await deleteStudy({ variables: { validationStudyId: studyId } });
    setConfirmDeleteId(null);
  };

  return (
    <div className="space-y-6" data-testid="validation-index-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FlaskConical size={24} className="text-[var(--cortex-blue-500)]" />
          <h1 className="text-2xl font-semibold text-[var(--cortex-text-primary)]">
            Clinical Validation
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded bg-[var(--cortex-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          data-testid="new-study-btn"
        >
          <Plus size={16} />
          New Study
        </button>
      </div>

      {loading && (
        <div
          className="py-12 text-center text-sm text-[var(--cortex-text-muted)]"
          data-testid="validation-loading"
        >
          Loading validation studies...
        </div>
      )}

      {error && (
        <div
          className="py-12 text-center text-sm text-[var(--cortex-error)]"
          data-testid="validation-error"
        >
          Failed to load validation studies.
        </div>
      )}

      {/* Study list */}
      {!loading && !error && studies.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--cortex-border)] bg-[var(--cortex-bg-secondary)] p-12 text-center">
          <FlaskConical size={48} className="mx-auto mb-3 text-[var(--cortex-text-muted)]" />
          <h2 className="mb-2 text-lg font-medium text-[var(--cortex-text-primary)]">
            No validation studies yet
          </h2>
          <p className="mb-4 text-sm text-[var(--cortex-text-secondary)]">
            Create a validation study to begin configuring protocols and importing data.
          </p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded bg-[var(--cortex-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            <Plus size={16} />
            Create First Study
          </button>
        </div>
      ) : !loading && !error ? (
        <div className="space-y-3">
          {studies.map((study) => (
            <div
              key={study.id}
              className="relative flex w-full items-center justify-between rounded-lg border border-[var(--cortex-border)] bg-white p-4 text-left transition-colors hover:border-[var(--cortex-blue-500)] hover:bg-blue-50/30"
              data-testid={`study-card-${study.id}`}
            >
              <button
                type="button"
                onClick={() => handleStudyClick(study.id)}
                className="flex flex-1 items-center justify-between text-left"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-semibold text-[var(--cortex-text-primary)]">
                      {study.name}
                    </h3>
                    <StatusBadge status={study.status} />
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                      {study.type}
                    </span>
                  </div>
                  {study.description && (
                    <p className="mt-1 text-xs text-[var(--cortex-text-muted)] line-clamp-1">
                      {study.description}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-4 text-xs text-[var(--cortex-text-muted)]">
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {new Date(study.createdAt).toLocaleDateString()}
                    </span>
                    {study.lockedAt && (
                      <span className="flex items-center gap-1">
                        <Lock size={10} />
                        Locked {new Date(study.lockedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight size={16} className="text-[var(--cortex-text-muted)]" />
              </button>
              {study.status === 'DRAFT' && (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(study.id)}
                  className="ml-2 rounded p-1.5 text-[var(--cortex-text-muted)] hover:bg-red-50 hover:text-red-600"
                  data-testid={`delete-study-${study.id}`}
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              )}

              {confirmDeleteId === study.id && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/95 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-[var(--cortex-text-primary)]">
                      Delete &quot;{study.name}&quot;?
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteStudy(study.id)}
                      className="rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                      data-testid={`confirm-delete-study-${study.id}`}
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
      ) : null}

      {/* Create study modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          data-testid="create-study-modal"
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowForm(false)}
          />
          <div className="relative w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-[var(--cortex-text-primary)]">
              Create Validation Study
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label
                  htmlFor="create-study-name"
                  className="mb-1 block text-sm font-medium text-[var(--cortex-text-primary)]"
                >
                  Study Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="create-study-name"
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Performance Validation 2026"
                  className="w-full rounded border border-[var(--cortex-border)] px-3 py-2 text-sm focus:border-[var(--cortex-primary)] focus:outline-none"
                  data-testid="create-study-name-input"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="create-study-type"
                  className="mb-1 block text-sm font-medium text-[var(--cortex-text-primary)]"
                >
                  Study Type <span className="text-red-500">*</span>
                </label>
                <select
                  id="create-study-type"
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full rounded border border-[var(--cortex-border)] px-3 py-2 text-sm focus:border-[var(--cortex-primary)] focus:outline-none"
                  data-testid="create-study-type-select"
                >
                  <option value="STANDALONE">Standalone</option>
                  <option value="EQUIVALENCE">Equivalence</option>
                  <option value="MRMC">MRMC</option>
                  <option value="READER_AGREEMENT">Reader Agreement</option>
                  <option value="PIVOTAL">Pivotal</option>
                  <option value="FEASIBILITY">Feasibility</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="create-study-description"
                  className="mb-1 block text-sm font-medium text-[var(--cortex-text-primary)]"
                >
                  Description
                </label>
                <textarea
                  id="create-study-description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Brief description of the validation study"
                  rows={3}
                  className="w-full rounded border border-[var(--cortex-border)] px-3 py-2 text-sm focus:border-[var(--cortex-primary)] focus:outline-none"
                  data-testid="create-study-description-input"
                />
              </div>
              <div>
                <label
                  htmlFor="create-study-soa"
                  className="mb-1 block text-sm font-medium text-[var(--cortex-text-primary)]"
                >
                  SOA Analysis
                </label>
                <select
                  id="create-study-soa"
                  value={formSoaId}
                  onChange={(e) => setFormSoaId(e.target.value)}
                  className="w-full rounded border border-[var(--cortex-border)] px-3 py-2 text-sm focus:border-[var(--cortex-primary)] focus:outline-none"
                  data-testid="create-study-soa-input"
                >
                  <option value="">-- No linked SOA --</option>
                  {soaAnalyses.map((soa) => (
                    <option key={soa.id} value={soa.id} disabled={soa.status !== 'LOCKED'}>
                      {soa.name} ({soa.type.replace(/_/g, ' ')}) — {soa.status}
                      {soa.status !== 'LOCKED' ? ' (must be locked)' : ''}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-[var(--cortex-text-muted)]">
                  Optionally link to an SOA analysis for benchmark import.
                </p>
              </div>
              {createError && (
                <div
                  className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                  data-testid="create-error"
                >
                  {createError}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded border border-[var(--cortex-border)] px-4 py-2 text-sm text-[var(--cortex-text-secondary)] hover:bg-[var(--cortex-bg-hover)]"
                  data-testid="cancel-create-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!formName.trim() || creating}
                  className="inline-flex items-center gap-2 rounded bg-[var(--cortex-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  data-testid="submit-create-btn"
                >
                  <FlaskConical size={16} />
                  {creating ? 'Creating...' : 'Create Study'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
