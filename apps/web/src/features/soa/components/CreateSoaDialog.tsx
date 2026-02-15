import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { FlaskConical, AlertTriangle, X } from 'lucide-react';

export const GET_LOCKED_SESSIONS = gql`
  query GetLockedSessions($projectId: String!) {
    lockedSlsSessions(projectId: $projectId) {
      id
      name
      lockedAt
    }
  }
`;

export const CHECK_DEPENDENCY = gql`
  query CheckDeviceSoaDependency($projectId: String!, $soaType: String!) {
    checkDeviceSoaDependency(projectId: $projectId, soaType: $soaType) {
      canProceed
      warnings
    }
  }
`;

export const CREATE_SOA = gql`
  mutation CreateSoaAnalysis($input: CreateSoaInput!) {
    createSoaAnalysis(input: $input) {
      soaAnalysisId
      name
      type
      sectionCount
    }
  }
`;

const SOA_TYPES = [
  {
    value: 'CLINICAL',
    label: 'Clinical SOA',
    description: 'Clinical evaluation per MDR Annex XIV',
  },
  {
    value: 'SIMILAR_DEVICE',
    label: 'Similar Device SOA',
    description: 'Equivalence assessment for similar devices',
  },
  { value: 'ALTERNATIVE', label: 'Alternative SOA', description: 'Alternative therapies analysis' },
] as const;

interface CreateSoaDialogProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
  onCreated?: (soaId: string) => void;
}

export function CreateSoaDialog({ projectId, open, onClose, onCreated }: CreateSoaDialogProps) {
  const [name, setName] = useState('');
  const [soaType, setSoaType] = useState('CLINICAL');
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);

  const { data: sessionsData } = useQuery<any>(GET_LOCKED_SESSIONS, {
    variables: { projectId },
    skip: !open,
  });

  const { data: depData } = useQuery<any>(CHECK_DEPENDENCY, {
    variables: { projectId, soaType },
    skip: !open || soaType !== 'SIMILAR_DEVICE',
  });

  const [createSoa, { loading: creating }] = useMutation<any>(CREATE_SOA);

  useEffect(() => {
    if (!open) {
      setName('');
      setSoaType('CLINICAL');
      setSelectedSessions([]);
    }
  }, [open]);

  const sessions = sessionsData?.lockedSlsSessions ?? [];
  const warnings = depData?.checkDeviceSoaDependency?.warnings ?? [];
  const canSubmit = name.trim() && selectedSessions.length > 0 && !creating;

  const handleSessionToggle = (sessionId: string) => {
    setSelectedSessions((prev) =>
      prev.includes(sessionId) ? prev.filter((id) => id !== sessionId) : [...prev, sessionId],
    );
  };

  const handleSubmit = async () => {
    const result = await createSoa({
      variables: {
        input: {
          projectId,
          name: name.trim(),
          type: soaType,
          slsSessionIds: selectedSessions,
        },
      },
    });
    if (result.data?.createSoaAnalysis) {
      onCreated?.(result.data.createSoaAnalysis.soaAnalysisId);
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      data-testid="create-soa-dialog"
    >
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical size={20} className="text-[var(--cortex-primary)]" />
            <h2 className="text-lg font-semibold text-[var(--cortex-text-primary)]">
              Create SOA Analysis
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--cortex-text-muted)] hover:text-[var(--cortex-text-primary)]"
            data-testid="close-dialog-btn"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cortex-text-muted)]">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Clinical Evaluation 2024"
              className="w-full rounded border border-[var(--cortex-border)] px-3 py-2 text-sm"
              data-testid="soa-name-input"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cortex-text-muted)]">
              SOA Type
            </label>
            <div className="space-y-2" data-testid="soa-type-selector">
              {SOA_TYPES.map((t) => (
                <label
                  key={t.value}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm ${
                    soaType === t.value
                      ? 'border-[var(--cortex-primary)] bg-blue-50'
                      : 'border-[var(--cortex-border)]'
                  }`}
                >
                  <input
                    type="radio"
                    name="soaType"
                    value={t.value}
                    checked={soaType === t.value}
                    onChange={() => setSoaType(t.value)}
                    className="accent-[var(--cortex-primary)]"
                    data-testid={`soa-type-${t.value}`}
                  />
                  <div>
                    <div className="font-medium">{t.label}</div>
                    <div className="text-xs text-[var(--cortex-text-muted)]">{t.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {warnings.length > 0 && (
            <div
              className="rounded-lg border border-orange-200 bg-orange-50 p-3"
              data-testid="dependency-warning"
            >
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="mt-0.5 text-orange-500" />
                <div className="text-xs text-orange-700">
                  {warnings.map((w: string, i: number) => (
                    <p key={i}>{w}</p>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cortex-text-muted)]">
              Linked SLS Sessions (locked only)
            </label>
            {sessions.length === 0 ? (
              <p className="text-xs text-[var(--cortex-text-muted)]" data-testid="no-sessions-msg">
                No locked SLS sessions available.
              </p>
            ) : (
              <div className="space-y-1" data-testid="session-picker">
                {sessions.map((s: { id: string; name: string }) => (
                  <label
                    key={s.id}
                    className="flex items-center gap-2 rounded border border-[var(--cortex-border)] p-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSessions.includes(s.id)}
                      onChange={() => handleSessionToggle(s.id)}
                      data-testid={`session-check-${s.id}`}
                    />
                    {s.name}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-[var(--cortex-border)] px-4 py-2 text-sm text-[var(--cortex-text-primary)]"
            data-testid="cancel-btn"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="rounded bg-[var(--cortex-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="create-soa-btn"
          >
            {creating ? 'Creating...' : 'Create Analysis'}
          </button>
        </div>
      </div>
    </div>
  );
}
