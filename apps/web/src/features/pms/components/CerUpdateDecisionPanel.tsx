import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { Scale } from 'lucide-react';
import { GET_CER_UPDATE_DECISION } from '../graphql/queries';
import { CREATE_CER_UPDATE_DECISION, FINALIZE_CER_UPDATE_DECISION } from '../graphql/mutations';
import { PmsStatusBadge } from './StatusBadge';

type ConclusionType = 'CER_UPDATE_REQUIRED' | 'CER_UPDATE_NOT_REQUIRED' | 'CER_PATCH_REQUIRED';

interface CerUpdateDecision {
  id: string;
  pmsCycleId: string;
  benefitRiskReAssessment: string;
  conclusion: ConclusionType;
  justification: string;
  materialChangesIdentified: boolean;
  materialChangesDescription: string | null;
  status: string;
  decidedBy: string | null;
  decidedAt: string | null;
  createdAt: string;
}

interface CerUpdateDecisionPanelProps {
  cycleId: string;
}

const CONCLUSION_BADGES: Record<ConclusionType, { bg: string; text: string }> = {
  CER_UPDATE_REQUIRED: { bg: 'bg-red-100', text: 'text-red-700' },
  CER_UPDATE_NOT_REQUIRED: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  CER_PATCH_REQUIRED: { bg: 'bg-amber-100', text: 'text-amber-700' },
};

function ConclusionBadge({ conclusion }: { conclusion: ConclusionType }) {
  const style = CONCLUSION_BADGES[conclusion] ?? { bg: 'bg-gray-100', text: 'text-gray-700' };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}>
      {conclusion.replace(/_/g, ' ')}
    </span>
  );
}

export function CerUpdateDecisionPanel({ cycleId }: CerUpdateDecisionPanelProps) {
  const { data, loading, error } = useQuery<{ cerUpdateDecision: CerUpdateDecision | null }>(
    GET_CER_UPDATE_DECISION,
    { variables: { cycleId } },
  );

  const [form, setForm] = useState({
    benefitRiskReAssessment: '',
    conclusion: 'CER_UPDATE_NOT_REQUIRED' as ConclusionType,
    justification: '',
    materialChangesIdentified: false,
    materialChangesDescription: '',
  });

  const [createDecision, { loading: creating }] = useMutation(CREATE_CER_UPDATE_DECISION, {
    refetchQueries: [{ query: GET_CER_UPDATE_DECISION, variables: { cycleId } }],
  });

  const [finalizeDecision, { loading: finalizing }] = useMutation(FINALIZE_CER_UPDATE_DECISION, {
    refetchQueries: [{ query: GET_CER_UPDATE_DECISION, variables: { cycleId } }],
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12" data-testid="decision-loading">
        <p className="text-[var(--cortex-text-muted)]">Loading decision...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-[var(--cortex-error)]">Failed to load decision: {error.message}</p>
      </div>
    );
  }

  const decision = data?.cerUpdateDecision ?? null;

  function handleCreate() {
    createDecision({
      variables: {
        pmsCycleId: cycleId,
        benefitRiskReAssessment: form.benefitRiskReAssessment,
        conclusion: form.conclusion,
        justification: form.justification,
        materialChangesIdentified: form.materialChangesIdentified,
        materialChangesDescription: form.materialChangesIdentified ? form.materialChangesDescription : undefined,
      },
    });
  }

  // Creation form
  if (!decision) {
    return (
      <div className="space-y-4" data-testid="cer-decision-panel">
        <div className="flex items-center gap-2">
          <Scale size={18} className="text-[var(--cortex-text-secondary)]" />
          <h2 className="text-lg font-semibold text-[var(--cortex-text-primary)]">CER Update Decision</h2>
        </div>

        <div className="space-y-4 rounded-lg border border-[var(--cortex-border)] bg-white p-4" data-testid="decision-form">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--cortex-text-primary)]">Benefit-Risk Re-Assessment</label>
            <textarea value={form.benefitRiskReAssessment} onChange={(e) => setForm((f) => ({ ...f, benefitRiskReAssessment: e.target.value }))} rows={3} className="w-full rounded-md border border-[var(--cortex-border)] px-3 py-2 text-sm outline-none focus:border-[var(--cortex-blue-500)] focus:ring-1 focus:ring-[var(--cortex-blue-500)]" data-testid="benefit-risk-input" />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--cortex-text-primary)]">Conclusion</label>
            <select value={form.conclusion} onChange={(e) => setForm((f) => ({ ...f, conclusion: e.target.value as ConclusionType }))} className="w-full rounded-md border border-[var(--cortex-border)] px-3 py-2 text-sm outline-none focus:border-[var(--cortex-blue-500)] focus:ring-1 focus:ring-[var(--cortex-blue-500)]" data-testid="conclusion-select">
              <option value="CER_UPDATE_NOT_REQUIRED">CER Update Not Required</option>
              <option value="CER_UPDATE_REQUIRED">CER Update Required</option>
              <option value="CER_PATCH_REQUIRED">CER Patch Required</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--cortex-text-primary)]">Justification</label>
            <textarea value={form.justification} onChange={(e) => setForm((f) => ({ ...f, justification: e.target.value }))} rows={3} className="w-full rounded-md border border-[var(--cortex-border)] px-3 py-2 text-sm outline-none focus:border-[var(--cortex-blue-500)] focus:ring-1 focus:ring-[var(--cortex-blue-500)]" data-testid="justification-input" />
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="materialChanges" checked={form.materialChangesIdentified} onChange={(e) => setForm((f) => ({ ...f, materialChangesIdentified: e.target.checked }))} className="h-4 w-4 rounded border-gray-300" data-testid="material-changes-checkbox" />
            <label htmlFor="materialChanges" className="text-sm text-[var(--cortex-text-primary)]">Material changes identified</label>
          </div>

          {form.materialChangesIdentified && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--cortex-text-primary)]">Material Changes Description</label>
              <textarea value={form.materialChangesDescription} onChange={(e) => setForm((f) => ({ ...f, materialChangesDescription: e.target.value }))} rows={2} className="w-full rounded-md border border-[var(--cortex-border)] px-3 py-2 text-sm outline-none focus:border-[var(--cortex-blue-500)] focus:ring-1 focus:ring-[var(--cortex-blue-500)]" data-testid="material-changes-description" />
            </div>
          )}

          <button type="button" onClick={handleCreate} disabled={creating || !form.benefitRiskReAssessment.trim() || !form.justification.trim()} className="rounded-md bg-[var(--cortex-blue-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--cortex-blue-600)] disabled:opacity-50" data-testid="create-decision-btn">
            {creating ? 'Creating...' : 'Create Decision'}
          </button>
        </div>
      </div>
    );
  }

  // Decision detail (DRAFT or FINALIZED)
  return (
    <div className="space-y-4" data-testid="cer-decision-panel">
      <div className="flex items-center gap-2">
        <Scale size={18} className="text-[var(--cortex-text-secondary)]" />
        <h2 className="text-lg font-semibold text-[var(--cortex-text-primary)]">CER Update Decision</h2>
      </div>

      <div className="space-y-4 rounded-lg border border-[var(--cortex-border)] bg-white p-4" data-testid="decision-detail">
        <div className="flex items-center justify-between">
          <ConclusionBadge conclusion={decision.conclusion} />
          <PmsStatusBadge status={decision.status} data-testid="decision-status" />
        </div>

        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-[var(--cortex-text-muted)]">Benefit-Risk Re-Assessment</dt>
            <dd className="mt-0.5 text-[var(--cortex-text-primary)]">{decision.benefitRiskReAssessment}</dd>
          </div>
          <div>
            <dt className="text-[var(--cortex-text-muted)]">Justification</dt>
            <dd className="mt-0.5 text-[var(--cortex-text-primary)]">{decision.justification}</dd>
          </div>
          {decision.materialChangesIdentified && decision.materialChangesDescription && (
            <div>
              <dt className="text-[var(--cortex-text-muted)]">Material Changes</dt>
              <dd className="mt-0.5 text-[var(--cortex-text-primary)]">{decision.materialChangesDescription}</dd>
            </div>
          )}
          {decision.decidedAt && (
            <div>
              <dt className="text-[var(--cortex-text-muted)]">Decided At</dt>
              <dd className="mt-0.5 text-[var(--cortex-text-primary)]">{new Date(decision.decidedAt).toLocaleString()}</dd>
            </div>
          )}
        </dl>

        {decision.status === 'DRAFT' && (
          <button type="button" onClick={() => finalizeDecision({ variables: { decisionId: decision.id } })} disabled={finalizing} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50" data-testid="finalize-decision-btn">
            {finalizing ? 'Finalizing...' : 'Finalize Decision'}
          </button>
        )}
      </div>
    </div>
  );
}
