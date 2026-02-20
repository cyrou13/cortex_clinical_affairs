import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { X } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import { CREATE_SLS_SESSION } from '../graphql/mutations';
import { GET_SLS_SESSIONS } from '../graphql/queries';
import type { SlsSessionType } from './SlsSidebar';

interface ScopeFieldConfig {
  key: string;
  label: string;
  type: 'text' | 'textarea';
  placeholder: string;
}

const sessionTypes: { value: SlsSessionType; label: string; description: string }[] = [
  {
    value: 'SOA_CLINICAL',
    label: 'SOA Clinical',
    description: 'State-of-the-art clinical literature review',
  },
  {
    value: 'SOA_DEVICE',
    label: 'SOA Device',
    description: 'Device-specific state-of-the-art search',
  },
  {
    value: 'SIMILAR_DEVICE',
    label: 'Similar Device',
    description: 'Equivalence and similar device search',
  },
  {
    value: 'PMS_UPDATE',
    label: 'PMS Update',
    description: 'Post-market surveillance update search',
  },
  {
    value: 'AD_HOC',
    label: 'Ad Hoc',
    description: 'Custom literature search',
  },
];

const scopeFieldsByType: Record<SlsSessionType, ScopeFieldConfig[]> = {
  SOA_CLINICAL: [
    {
      key: 'indication',
      label: 'Indication',
      type: 'text',
      placeholder: 'e.g. Cervical spine degeneration',
    },
    {
      key: 'population',
      label: 'Population',
      type: 'text',
      placeholder: 'e.g. Adults with chronic neck pain',
    },
    {
      key: 'intervention',
      label: 'Intervention',
      type: 'text',
      placeholder: 'e.g. Anterior cervical discectomy',
    },
    {
      key: 'comparator',
      label: 'Comparator',
      type: 'text',
      placeholder: 'e.g. Conservative treatment',
    },
    {
      key: 'outcomes',
      label: 'Outcomes',
      type: 'textarea',
      placeholder: 'e.g. Pain reduction, functional improvement',
    },
  ],
  SOA_DEVICE: [
    {
      key: 'deviceName',
      label: 'Device Name',
      type: 'text',
      placeholder: 'e.g. CINA CSpine System',
    },
    { key: 'deviceClass', label: 'Device Class', type: 'text', placeholder: 'e.g. IIa, III' },
    {
      key: 'intendedPurpose',
      label: 'Intended Purpose',
      type: 'textarea',
      placeholder: 'Describe the intended purpose of the device',
    },
    {
      key: 'keyPerformanceEndpoints',
      label: 'Key Performance Endpoints',
      type: 'textarea',
      placeholder: 'e.g. Safety endpoints, efficacy endpoints',
    },
  ],
  SIMILAR_DEVICE: [
    {
      key: 'deviceCategory',
      label: 'Device Category',
      type: 'text',
      placeholder: 'e.g. Spinal implants',
    },
    {
      key: 'equivalenceCriteria',
      label: 'Equivalence Criteria',
      type: 'textarea',
      placeholder: 'Describe technical, biological, and clinical equivalence criteria',
    },
    {
      key: 'searchDatabases',
      label: 'Search Databases',
      type: 'text',
      placeholder: 'e.g. PubMed, Embase, Cochrane',
    },
  ],
  PMS_UPDATE: [
    { key: 'dateRange', label: 'Date Range', type: 'text', placeholder: 'e.g. 2024-01 to 2026-01' },
    {
      key: 'updateScope',
      label: 'Update Scope',
      type: 'textarea',
      placeholder: 'Describe the scope of this PMS update',
    },
    {
      key: 'previousSlsReference',
      label: 'Previous SLS Reference',
      type: 'text',
      placeholder: 'Reference to previous SLS session or report',
    },
  ],
  AD_HOC: [
    {
      key: 'description',
      label: 'Description',
      type: 'textarea',
      placeholder: 'Describe the purpose of this search',
    },
    {
      key: 'searchObjective',
      label: 'Search Objective',
      type: 'textarea',
      placeholder: 'What do you hope to find?',
    },
  ],
};

interface SessionCreateFormProps {
  projectId: string;
  onCreated: (sessionId: string) => void;
  onCancel: () => void;
}

interface ValidationErrors {
  name?: string;
  type?: string;
}

export function SessionCreateForm({ projectId, onCreated, onCancel }: SessionCreateFormProps) {
  const [name, setName] = useState('');
  const [selectedType, setSelectedType] = useState<SlsSessionType | null>(null);
  const [scopeFields, setScopeFields] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<ValidationErrors>({});

  const [createSession, { loading: submitting }] = useMutation<{
    createSlsSession: { id: string; name: string; type: string; status: string };
  }>(CREATE_SLS_SESSION, {
    refetchQueries: [{ query: GET_SLS_SESSIONS, variables: { projectId } }],
  });

  const currentScopeFields = selectedType ? scopeFieldsByType[selectedType] : [];

  function handleTypeChange(type: SlsSessionType) {
    setSelectedType(type);
    setScopeFields({});
    setErrors((prev) => ({ ...prev, type: undefined }));
  }

  function handleScopeFieldChange(key: string, value: string) {
    setScopeFields((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): boolean {
    const newErrors: ValidationErrors = {};

    if (!name.trim() || name.trim().length < 3) {
      newErrors.name = 'Session name must be at least 3 characters';
    }

    if (!selectedType) {
      newErrors.type = 'Please select a session type';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validate()) return;

    const { data } = await createSession({
      variables: {
        projectId,
        name: name.trim(),
        type: selectedType,
        scopeFields: Object.keys(scopeFields).length > 0 ? scopeFields : undefined,
      },
    });

    const sessionId = data?.createSlsSession?.id;
    if (sessionId) {
      onCreated(sessionId);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      data-testid="session-create-overlay"
    >
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--cortex-border)] px-6 py-4">
          <h2 className="text-lg font-semibold text-[var(--cortex-text-primary)]">
            Create SLS Session
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="rounded p-1 text-[var(--cortex-text-muted)] hover:bg-[var(--cortex-bg-secondary)]"
            aria-label="Close"
            data-testid="close-button"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Session Name */}
          <div>
            <label
              htmlFor="session-name"
              className="mb-1.5 block text-sm font-medium text-[var(--cortex-text-primary)]"
            >
              Session Name
            </label>
            <input
              id="session-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
              }}
              placeholder="e.g. CSpine SOA Clinical Review 2026"
              className={cn(
                'w-full rounded-md border px-3 py-2 text-sm outline-none transition-colors',
                'focus:border-[var(--cortex-blue-500)] focus:ring-1 focus:ring-[var(--cortex-blue-500)]',
                errors.name ? 'border-[var(--cortex-error)]' : 'border-[var(--cortex-border)]',
              )}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-[var(--cortex-error)]" role="alert">
                {errors.name}
              </p>
            )}
          </div>

          {/* Session Type */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--cortex-text-primary)]">
              Session Type
            </label>
            {errors.type && (
              <p className="mb-2 text-xs text-[var(--cortex-error)]" role="alert">
                {errors.type}
              </p>
            )}
            <div className="grid grid-cols-1 gap-2" data-testid="type-selector">
              {sessionTypes.map((type) => (
                <label
                  key={type.value}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-md border px-4 py-3 transition-colors',
                    selectedType === type.value
                      ? 'border-[var(--cortex-blue-500)] bg-[var(--cortex-blue-50)]'
                      : 'border-[var(--cortex-border)] hover:bg-[var(--cortex-bg-secondary)]',
                  )}
                >
                  <input
                    type="radio"
                    name="session-type"
                    value={type.value}
                    checked={selectedType === type.value}
                    onChange={() => handleTypeChange(type.value)}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="text-sm font-medium text-[var(--cortex-text-primary)]">
                      {type.label}
                    </span>
                    <p className="text-xs text-[var(--cortex-text-muted)]">{type.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Dynamic Scope Fields */}
          {selectedType && currentScopeFields.length > 0 && (
            <div data-testid="scope-fields">
              <h3 className="mb-3 text-sm font-medium text-[var(--cortex-text-primary)]">
                Scope Configuration
              </h3>
              <div className="space-y-4">
                {currentScopeFields.map((field) => (
                  <div key={field.key}>
                    <label
                      htmlFor={`scope-${field.key}`}
                      className="mb-1.5 block text-sm font-medium text-[var(--cortex-text-secondary)]"
                    >
                      {field.label}
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea
                        id={`scope-${field.key}`}
                        value={scopeFields[field.key] ?? ''}
                        onChange={(e) => handleScopeFieldChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        rows={3}
                        className="w-full rounded-md border border-[var(--cortex-border)] px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--cortex-blue-500)] focus:ring-1 focus:ring-[var(--cortex-blue-500)]"
                      />
                    ) : (
                      <input
                        id={`scope-${field.key}`}
                        type="text"
                        value={scopeFields[field.key] ?? ''}
                        onChange={(e) => handleScopeFieldChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full rounded-md border border-[var(--cortex-border)] px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--cortex-blue-500)] focus:ring-1 focus:ring-[var(--cortex-blue-500)]"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-[var(--cortex-border)] pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border border-[var(--cortex-border)] px-4 py-2 text-sm font-medium text-[var(--cortex-text-secondary)] hover:bg-[var(--cortex-bg-secondary)]"
              data-testid="cancel-button"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-[var(--cortex-blue-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--cortex-blue-600)] disabled:opacity-50"
              data-testid="create-button"
            >
              {submitting ? 'Creating...' : 'Create Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
