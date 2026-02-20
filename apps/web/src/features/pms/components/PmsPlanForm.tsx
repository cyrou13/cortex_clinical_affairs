import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { FileText } from 'lucide-react';

const GET_CER_VERSIONS_FOR_PMS = gql`
  query GetCerVersionsForPms($projectId: String!) {
    cerVersions(projectId: $projectId) {
      id
      versionNumber
      regulatoryContext
      status
      lockedAt
    }
  }
`;

export const CREATE_PMS_PLAN = gql`
  mutation CreatePmsPlan(
    $projectId: String!
    $cerVersionId: String!
    $updateFrequency: String!
    $dataCollectionMethods: [String!]!
  ) {
    createPmsPlan(
      projectId: $projectId
      cerVersionId: $cerVersionId
      updateFrequency: $updateFrequency
      dataCollectionMethods: $dataCollectionMethods
    ) {
      pmsPlanId
      projectId
      cerVersionId
      status
    }
  }
`;

const FREQUENCY_OPTIONS = [
  { value: 'ANNUAL', label: 'Annual' },
  { value: 'SEMI_ANNUAL', label: 'Semi-Annual' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'MONTHLY', label: 'Monthly' },
];

const DATA_COLLECTION_METHODS = [
  { value: 'VIGILANCE_DATABASE', label: 'Vigilance Database Monitoring' },
  { value: 'LITERATURE_REVIEW', label: 'Literature Review' },
  { value: 'COMPLAINT_ANALYSIS', label: 'Complaint Analysis' },
  { value: 'CLINICAL_FOLLOW_UP', label: 'Clinical Follow-Up (PMCF)' },
  { value: 'REGISTRY_DATA', label: 'Registry Data' },
  { value: 'TREND_ANALYSIS', label: 'Trend Analysis' },
];

interface PmsPlanFormProps {
  projectId: string;
  onSuccess?: (planId: string) => void;
  onCancel?: () => void;
}

export function PmsPlanForm({ projectId, onSuccess, onCancel }: PmsPlanFormProps) {
  const [cerVersionId, setCerVersionId] = useState('');
  const [frequency, setFrequency] = useState('ANNUAL');
  const [selectedMethods, setSelectedMethods] = useState<string[]>([
    'VIGILANCE_DATABASE',
    'LITERATURE_REVIEW',
  ]);
  const [createError, setCreateError] = useState<string | null>(null);

  const { data: cerData } = useQuery<any>(GET_CER_VERSIONS_FOR_PMS, {
    variables: { projectId },
    skip: !projectId,
  });

  const cerVersions: Array<{
    id: string;
    versionNumber: number;
    regulatoryContext: string;
    status: string;
  }> = cerData?.cerVersions ?? [];

  const [createPlan, { loading }] = useMutation<any>(CREATE_PMS_PLAN, {
    errorPolicy: 'none',
  });

  const toggleMethod = (method: string) => {
    setSelectedMethods((prev) =>
      prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    try {
      const result = await createPlan({
        variables: {
          projectId,
          cerVersionId,
          updateFrequency: frequency,
          dataCollectionMethods: selectedMethods,
        },
      });

      if (result.data?.createPmsPlan) {
        onSuccess?.(result.data.createPmsPlan.pmsPlanId);
      }
    } catch (err: any) {
      setCreateError(err.message ?? 'Failed to create PMS plan');
    }
  };

  const isValid = cerVersionId && frequency && selectedMethods.length > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-5" data-testid="pms-plan-form">
      <div>
        <label
          htmlFor="cer-version"
          className="mb-1 block text-sm font-medium text-[var(--cortex-text-primary)]"
        >
          CER Version <span className="text-red-500">*</span>
        </label>
        <select
          id="cer-version"
          value={cerVersionId}
          onChange={(e) => setCerVersionId(e.target.value)}
          className="w-full rounded border border-[var(--cortex-border)] px-3 py-2 text-sm focus:border-[var(--cortex-primary)] focus:outline-none"
          data-testid="cer-version-select"
          required
        >
          <option value="">-- Select a CER version --</option>
          {cerVersions.map((cer) => (
            <option key={cer.id} value={cer.id} disabled={cer.status !== 'LOCKED'}>
              CER v{cer.versionNumber} ({cer.regulatoryContext.replace('_', ' ')}) — {cer.status}
              {cer.status !== 'LOCKED' ? ' (must be locked)' : ''}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-[var(--cortex-text-muted)]">
          Only locked CER versions can be used for PMS planning.
        </p>
      </div>

      <div>
        <label
          htmlFor="frequency"
          className="mb-1 block text-sm font-medium text-[var(--cortex-text-primary)]"
        >
          Update Frequency <span className="text-red-500">*</span>
        </label>
        <select
          id="frequency"
          value={frequency}
          onChange={(e) => setFrequency(e.target.value)}
          className="w-full rounded border border-[var(--cortex-border)] px-3 py-2 text-sm focus:border-[var(--cortex-primary)] focus:outline-none"
          data-testid="frequency-select"
          required
        >
          {FREQUENCY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-[var(--cortex-text-primary)]">
          Data Collection Methods <span className="text-red-500">*</span>
        </label>
        <div className="space-y-1">
          {DATA_COLLECTION_METHODS.map((method) => (
            <label
              key={method.value}
              className="flex items-center gap-2 rounded border border-[var(--cortex-border)] p-2 text-sm"
            >
              <input
                type="checkbox"
                checked={selectedMethods.includes(method.value)}
                onChange={() => toggleMethod(method.value)}
                data-testid={`method-${method.value}`}
              />
              <span className="text-[var(--cortex-text-primary)]">{method.label}</span>
            </label>
          ))}
        </div>
      </div>

      {createError && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {createError}
        </div>
      )}

      <div className="flex justify-end gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-[var(--cortex-border)] px-4 py-2 text-sm text-[var(--cortex-text-secondary)] hover:bg-[var(--cortex-bg-hover)]"
            data-testid="cancel-btn"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={!isValid || loading}
          className="inline-flex items-center gap-2 rounded bg-[var(--cortex-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="submit-btn"
        >
          <FileText size={16} />
          {loading ? 'Creating...' : 'Create PMS Plan'}
        </button>
      </div>
    </form>
  );
}
