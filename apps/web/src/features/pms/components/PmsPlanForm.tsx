import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { Calendar, FileText, Settings } from 'lucide-react';

export const CREATE_PMS_PLAN = gql`
  mutation CreatePmsPlan($input: CreatePmsPlanInput!) {
    createPmsPlan(input: $input) {
      id
      name
      frequency
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

interface PmsPlanFormProps {
  deviceId?: string;
  onSuccess?: (planId: string) => void;
  onCancel?: () => void;
}

export function PmsPlanForm({ deviceId, onSuccess, onCancel }: PmsPlanFormProps) {
  const [name, setName] = useState('');
  const [selectedDeviceId, setSelectedDeviceId] = useState(deviceId ?? '');
  const [frequency, setFrequency] = useState('ANNUAL');
  const [startDate, setStartDate] = useState('');
  const [enableGapRegistry, setEnableGapRegistry] = useState(true);
  const [gapThreshold, setGapThreshold] = useState('10');

  const [createPlan, { loading }] = useMutation<any>(CREATE_PMS_PLAN);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = await createPlan({
      variables: {
        input: {
          name,
          deviceId: selectedDeviceId,
          frequency,
          startDate,
          gapRegistryConfig: enableGapRegistry
            ? {
                enabled: true,
                threshold: parseInt(gapThreshold, 10),
              }
            : undefined,
        },
      },
    });

    if (result.data?.createPmsPlan) {
      onSuccess?.(result.data.createPmsPlan.id);
    }
  };

  const isValid = name.trim() && selectedDeviceId && frequency && startDate;

  return (
    <form onSubmit={handleSubmit} className="space-y-6" data-testid="pms-plan-form">
      <div>
        <label
          htmlFor="plan-name"
          className="mb-1 block text-sm font-medium text-[var(--cortex-text-primary)]"
        >
          Plan Name <span className="text-red-500">*</span>
        </label>
        <input
          id="plan-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter PMS plan name"
          className="w-full rounded border border-[var(--cortex-border)] px-3 py-2 text-sm focus:border-[var(--cortex-primary)] focus:outline-none"
          data-testid="plan-name-input"
          required
        />
      </div>

      <div>
        <label
          htmlFor="device-id"
          className="mb-1 block text-sm font-medium text-[var(--cortex-text-primary)]"
        >
          Device <span className="text-red-500">*</span>
        </label>
        <input
          id="device-id"
          type="text"
          value={selectedDeviceId}
          onChange={(e) => setSelectedDeviceId(e.target.value)}
          placeholder="Enter device ID"
          className="w-full rounded border border-[var(--cortex-border)] px-3 py-2 text-sm focus:border-[var(--cortex-primary)] focus:outline-none"
          data-testid="device-id-input"
          required
        />
      </div>

      <div>
        <label
          htmlFor="frequency"
          className="mb-1 block text-sm font-medium text-[var(--cortex-text-primary)]"
        >
          Review Frequency <span className="text-red-500">*</span>
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
        <label
          htmlFor="start-date"
          className="mb-1 flex items-center gap-2 text-sm font-medium text-[var(--cortex-text-primary)]"
        >
          <Calendar size={14} />
          Start Date <span className="text-red-500">*</span>
        </label>
        <input
          id="start-date"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-full rounded border border-[var(--cortex-border)] px-3 py-2 text-sm focus:border-[var(--cortex-primary)] focus:outline-none"
          data-testid="start-date-input"
          required
        />
      </div>

      <div className="rounded-lg border border-[var(--cortex-border)] p-4">
        <div className="mb-3 flex items-center gap-2">
          <Settings size={16} className="text-[var(--cortex-text-muted)]" />
          <h4 className="text-sm font-semibold text-[var(--cortex-text-primary)]">
            Gap Registry Configuration
          </h4>
        </div>

        <label className="mb-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={enableGapRegistry}
            onChange={(e) => setEnableGapRegistry(e.target.checked)}
            data-testid="gap-registry-checkbox"
          />
          <span className="text-[var(--cortex-text-primary)]">Enable Gap Registry</span>
        </label>

        {enableGapRegistry && (
          <div>
            <label
              htmlFor="gap-threshold"
              className="mb-1 block text-sm text-[var(--cortex-text-muted)]"
            >
              Detection Threshold
            </label>
            <div className="flex items-center gap-2">
              <input
                id="gap-threshold"
                type="number"
                min="1"
                max="100"
                value={gapThreshold}
                onChange={(e) => setGapThreshold(e.target.value)}
                className="w-24 rounded border border-[var(--cortex-border)] px-3 py-2 text-sm focus:border-[var(--cortex-primary)] focus:outline-none"
                data-testid="gap-threshold-input"
              />
              <span className="text-sm text-[var(--cortex-text-muted)]">incidents per cycle</span>
            </div>
          </div>
        )}
      </div>

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
          className="inline-flex items-center gap-2 rounded bg-[var(--cortex-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--cortex-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="submit-btn"
        >
          <FileText size={16} />
          {loading ? 'Creating...' : 'Create Plan'}
        </button>
      </div>
    </form>
  );
}
