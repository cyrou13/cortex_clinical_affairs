import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { FileText, ChevronLeft, ChevronRight, Plus } from 'lucide-react';

export const CREATE_CER = gql`
  mutation CreateCer($input: CreateCerInput!) {
    createCer(input: $input) {
      cerId
      version
      status
    }
  }
`;

type RegulatoryContext = 'CE_MDR' | 'FDA' | 'DUAL';

interface UpstreamModule {
  id: string;
  name: string;
  type: string;
  lockedAt: string | null;
}

interface ExternalDoc {
  id: string;
  title: string;
  type: string;
  version: string;
}

interface CerCreationFormProps {
  projectId: string;
  upstreamModules?: UpstreamModule[];
  externalDocs?: ExternalDoc[];
  onCreated?: (cerId: string) => void;
}

export function CerCreationForm({
  projectId,
  upstreamModules = [],
  externalDocs = [],
  onCreated,
}: CerCreationFormProps) {
  const [step, setStep] = useState(0);
  const [regulatoryContext, setRegulatoryContext] = useState<RegulatoryContext>('CE_MDR');
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);

  const [createCer, { loading: creating }] = useMutation<any>(CREATE_CER);

  const steps = ['Regulatory Context', 'Upstream Modules', 'External Documents'];

  const toggleModule = (id: string) => {
    setSelectedModules((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  };

  const toggleDoc = (id: string) => {
    setSelectedDocs((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]));
  };

  const handleCreate = async () => {
    const result = await createCer({
      variables: {
        input: {
          projectId,
          regulatoryContext,
          upstreamModuleIds: selectedModules,
          externalDocumentIds: selectedDocs,
        },
      },
    });
    if (result.data?.createCer) {
      onCreated?.(result.data.createCer.cerId);
    }
  };

  return (
    <div
      className="space-y-6 rounded-lg border border-[var(--cortex-border)] p-6"
      data-testid="cer-creation-form"
    >
      <div className="flex items-center gap-2">
        <FileText size={20} className="text-[var(--cortex-primary)]" />
        <h2 className="text-lg font-semibold text-[var(--cortex-text-primary)]">Create CER</h2>
      </div>

      {/* Horizontal Stepper */}
      <div className="flex items-center gap-2" data-testid="step-indicator">
        {steps.map((label, idx) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                idx === step
                  ? 'bg-[var(--cortex-primary)] text-white'
                  : idx < step
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-200 text-gray-500'
              }`}
            >
              {idx + 1}
            </div>
            <span
              className={`text-sm ${idx === step ? 'font-medium text-[var(--cortex-text-primary)]' : 'text-[var(--cortex-text-muted)]'}`}
            >
              {label}
            </span>
            {idx < steps.length - 1 && <div className="mx-2 h-px w-8 bg-gray-300" />}
          </div>
        ))}
      </div>

      {/* Step 1: Regulatory Context */}
      {step === 0 && (
        <div className="space-y-3" data-testid="regulatory-context-selector">
          <label className="mb-1 block text-xs font-medium text-[var(--cortex-text-muted)]">
            Regulatory Framework
          </label>
          {(['CE_MDR', 'FDA', 'DUAL'] as RegulatoryContext[]).map((ctx) => (
            <label
              key={ctx}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm ${
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
                data-testid={`context-${ctx}`}
              />
              <div>
                <div className="font-medium">{ctx.replace('_', ' ')}</div>
              </div>
            </label>
          ))}
        </div>
      )}

      {/* Step 2: Upstream Modules */}
      {step === 1 && (
        <div className="space-y-3" data-testid="upstream-step">
          <label className="mb-1 block text-xs font-medium text-[var(--cortex-text-muted)]">
            Link Upstream Modules
          </label>
          {upstreamModules.length === 0 ? (
            <p className="text-sm text-[var(--cortex-text-muted)]" data-testid="no-modules-msg">
              No upstream modules available.
            </p>
          ) : (
            upstreamModules.map((mod) => (
              <label
                key={mod.id}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm ${
                  selectedModules.includes(mod.id)
                    ? 'border-[var(--cortex-primary)] bg-blue-50'
                    : 'border-[var(--cortex-border)]'
                } ${!mod.lockedAt ? 'opacity-50' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={selectedModules.includes(mod.id)}
                  onChange={() => toggleModule(mod.id)}
                  disabled={!mod.lockedAt}
                  data-testid={`module-check-${mod.id}`}
                />
                <div>
                  <div className="font-medium">{mod.name}</div>
                  <div className="text-xs text-[var(--cortex-text-muted)]">{mod.type}</div>
                </div>
              </label>
            ))
          )}
        </div>
      )}

      {/* Step 3: External Documents */}
      {step === 2 && (
        <div className="space-y-3" data-testid="external-docs-step">
          <label className="mb-1 block text-xs font-medium text-[var(--cortex-text-muted)]">
            External Documents
          </label>
          {externalDocs.length === 0 ? (
            <p className="text-sm text-[var(--cortex-text-muted)]" data-testid="no-docs-msg">
              No external documents available.
            </p>
          ) : (
            externalDocs.map((doc) => (
              <label
                key={doc.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-[var(--cortex-border)] p-3 text-sm"
              >
                <input
                  type="checkbox"
                  checked={selectedDocs.includes(doc.id)}
                  onChange={() => toggleDoc(doc.id)}
                  data-testid={`doc-check-${doc.id}`}
                />
                <div>
                  <div className="font-medium">{doc.title}</div>
                  <div className="text-xs text-[var(--cortex-text-muted)]">
                    {doc.type} &middot; v{doc.version}
                  </div>
                </div>
              </label>
            ))
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0}
          className="inline-flex items-center gap-1 rounded border border-[var(--cortex-border)] px-4 py-2 text-sm text-[var(--cortex-text-secondary)] hover:bg-[var(--cortex-bg-hover)] disabled:opacity-50"
          data-testid="prev-btn"
        >
          <ChevronLeft size={14} /> Previous
        </button>

        {step < steps.length - 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            className="inline-flex items-center gap-1 rounded bg-[var(--cortex-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            data-testid="next-btn"
          >
            Next <ChevronRight size={14} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            className="inline-flex items-center gap-1 rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            data-testid="create-cer-btn"
          >
            <Plus size={14} /> {creating ? 'Creating...' : 'Create CER'}
          </button>
        )}
      </div>
    </div>
  );
}
