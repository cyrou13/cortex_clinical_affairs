import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { FileText, AlertTriangle, Plus, Trash2 } from 'lucide-react';

export const GET_PROTOCOL = gql`
  query GetProtocol($studyId: String!) {
    validationProtocol(studyId: $studyId) {
      id
      version
      status
      summary
      endpoints {
        id
        name
        type
        target
        unit
      }
      sampleSize
      statisticalStrategy
    }
  }
`;

export const SAVE_PROTOCOL = gql`
  mutation SaveProtocol($input: SaveProtocolInput!) {
    saveProtocol(input: $input) {
      protocolId
      version
      status
    }
  }
`;

export const APPROVE_PROTOCOL = gql`
  mutation ApproveProtocol($studyId: String!) {
    approveProtocol(studyId: $studyId) {
      protocolId
      version
      status
    }
  }
`;

interface Endpoint {
  id: string;
  name: string;
  type: string;
  target: string;
  unit: string;
}

interface ProtocolEditorProps {
  studyId: string;
  onApproved?: () => void;
}

const STEPS = ['Summary', 'Endpoints', 'Sample Size', 'Statistical Strategy'];

export function ProtocolEditor({ studyId, onApproved }: ProtocolEditorProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [summary, setSummary] = useState('');
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [sampleSize, setSampleSize] = useState('');
  const [statisticalStrategy, setStatisticalStrategy] = useState('');
  const [initialized, setInitialized] = useState(false);

  const { data, loading } = useQuery<any>(GET_PROTOCOL, {
    variables: { studyId },
  });

  const [saveProtocol, { loading: saving }] = useMutation<any>(SAVE_PROTOCOL);
  const [approveProtocol, { loading: approving }] = useMutation<any>(APPROVE_PROTOCOL);

  const protocol = data?.validationProtocol;

  useEffect(() => {
    if (!initialized && data?.validationProtocol) {
      const p = data.validationProtocol;
      setSummary(p.summary ?? '');
      setEndpoints(p.endpoints ?? []);
      setSampleSize(p.sampleSize ?? '');
      setStatisticalStrategy(p.statisticalStrategy ?? '');
      setInitialized(true);
    }
  }, [data, initialized]);
  const isApproved = protocol?.status === 'APPROVED';

  const handleAddEndpoint = () => {
    setEndpoints((prev) => [
      ...prev,
      { id: `new-${Date.now()}`, name: '', type: 'PRIMARY', target: '', unit: '' },
    ]);
  };

  const handleRemoveEndpoint = (id: string) => {
    setEndpoints((prev) => prev.filter((ep) => ep.id !== id));
  };

  const handleEndpointChange = (id: string, field: keyof Endpoint, value: string) => {
    setEndpoints((prev) => prev.map((ep) => (ep.id === id ? { ...ep, [field]: value } : ep)));
  };

  const handleSave = async () => {
    await saveProtocol({
      variables: {
        input: {
          studyId,
          summary,
          endpoints: endpoints.map((ep) => ({
            name: ep.name,
            type: ep.type,
            target: ep.target,
            unit: ep.unit,
          })),
          sampleSize,
          statisticalStrategy,
        },
      },
    });
  };

  const handleApprove = async () => {
    await handleSave();
    const result = await approveProtocol({
      variables: { studyId },
    });
    if (result.data?.approveProtocol) {
      onApproved?.();
    }
  };

  if (loading) {
    return (
      <div
        className="py-8 text-center text-sm text-[var(--cortex-text-muted)]"
        data-testid="protocol-loading"
      >
        Loading protocol...
      </div>
    );
  }

  return (
    <div
      className="space-y-6 rounded-lg border border-[var(--cortex-border)] p-6"
      data-testid="protocol-editor"
    >
      <div className="flex items-center gap-2">
        <FileText size={20} className="text-[var(--cortex-primary)]" />
        <h2 className="text-lg font-semibold text-[var(--cortex-text-primary)]">Protocol Editor</h2>
        {protocol?.version && (
          <span className="text-xs text-[var(--cortex-text-muted)]">v{protocol.version}</span>
        )}
      </div>

      {isApproved && (
        <div
          className="flex items-start gap-2 rounded border border-orange-200 bg-orange-50 p-3"
          data-testid="amendment-warning"
        >
          <AlertTriangle size={16} className="mt-0.5 text-orange-500" />
          <p className="text-sm text-orange-700">
            This protocol is approved. Editing will create a new amendment version.
          </p>
        </div>
      )}

      <div className="flex gap-2" data-testid="step-indicator">
        {STEPS.map((step, idx) => (
          <button
            key={step}
            type="button"
            onClick={() => setCurrentStep(idx)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              currentStep === idx
                ? 'bg-[var(--cortex-primary)] text-white'
                : 'bg-gray-100 text-[var(--cortex-text-muted)]'
            }`}
            data-testid={`step-btn-${idx}`}
          >
            {idx + 1}. {step}
          </button>
        ))}
      </div>

      <div className="min-h-[200px]">
        {currentStep === 0 && (
          <div data-testid="step-1-content">
            <label className="mb-1 block text-xs font-medium text-[var(--cortex-text-muted)]">
              Summary
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Protocol summary describing the validation objectives..."
              rows={6}
              className="w-full rounded border border-[var(--cortex-border)] px-3 py-2 text-sm"
              data-testid="summary-textarea"
            />
          </div>
        )}

        {currentStep === 1 && (
          <div data-testid="step-2-content">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-medium text-[var(--cortex-text-muted)]">
                Endpoints
              </label>
              <button
                type="button"
                onClick={handleAddEndpoint}
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                data-testid="add-endpoint-btn"
              >
                <Plus size={12} /> Add Endpoint
              </button>
            </div>
            <div className="space-y-3" data-testid="endpoint-list">
              {endpoints.map((ep) => (
                <div
                  key={ep.id}
                  className="flex gap-2 rounded border border-[var(--cortex-border)] p-3"
                  data-testid={`endpoint-${ep.id}`}
                >
                  <input
                    type="text"
                    value={ep.name}
                    onChange={(e) => handleEndpointChange(ep.id, 'name', e.target.value)}
                    placeholder="Endpoint name"
                    className="flex-1 rounded border border-[var(--cortex-border)] px-2 py-1 text-sm"
                    data-testid={`endpoint-name-${ep.id}`}
                  />
                  <select
                    value={ep.type}
                    onChange={(e) => handleEndpointChange(ep.id, 'type', e.target.value)}
                    className="rounded border border-[var(--cortex-border)] px-2 py-1 text-sm"
                    data-testid={`endpoint-type-${ep.id}`}
                  >
                    <option value="PRIMARY">Primary</option>
                    <option value="SECONDARY">Secondary</option>
                    <option value="EXPLORATORY">Exploratory</option>
                  </select>
                  <input
                    type="text"
                    value={ep.target}
                    onChange={(e) => handleEndpointChange(ep.id, 'target', e.target.value)}
                    placeholder="Target"
                    className="w-24 rounded border border-[var(--cortex-border)] px-2 py-1 text-sm"
                    data-testid={`endpoint-target-${ep.id}`}
                  />
                  <input
                    type="text"
                    value={ep.unit}
                    onChange={(e) => handleEndpointChange(ep.id, 'unit', e.target.value)}
                    placeholder="Unit"
                    className="w-20 rounded border border-[var(--cortex-border)] px-2 py-1 text-sm"
                    data-testid={`endpoint-unit-${ep.id}`}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveEndpoint(ep.id)}
                    className="text-red-400 hover:text-red-600"
                    data-testid={`remove-endpoint-${ep.id}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {endpoints.length === 0 && (
                <p
                  className="py-4 text-center text-xs text-[var(--cortex-text-muted)]"
                  data-testid="no-endpoints"
                >
                  No endpoints defined. Click "Add Endpoint" to begin.
                </p>
              )}
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div data-testid="step-3-content">
            <label className="mb-1 block text-xs font-medium text-[var(--cortex-text-muted)]">
              Sample Size Justification
            </label>
            <textarea
              value={sampleSize}
              onChange={(e) => setSampleSize(e.target.value)}
              placeholder="Describe the sample size calculation and justification..."
              rows={6}
              className="w-full rounded border border-[var(--cortex-border)] px-3 py-2 text-sm"
              data-testid="sample-size-textarea"
            />
          </div>
        )}

        {currentStep === 3 && (
          <div data-testid="step-4-content">
            <label className="mb-1 block text-xs font-medium text-[var(--cortex-text-muted)]">
              Statistical Strategy
            </label>
            <textarea
              value={statisticalStrategy}
              onChange={(e) => setStatisticalStrategy(e.target.value)}
              placeholder="Describe the statistical methods and analysis plan..."
              rows={6}
              className="w-full rounded border border-[var(--cortex-border)] px-3 py-2 text-sm"
              data-testid="statistical-strategy-textarea"
            />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-[var(--cortex-border)] pt-4">
        <button
          type="button"
          onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
          disabled={currentStep === 0}
          className="rounded border border-[var(--cortex-border)] px-4 py-2 text-sm text-[var(--cortex-text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="prev-btn"
        >
          Previous
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleApprove}
            disabled={approving || saving}
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="approve-btn"
          >
            {approving ? 'Approving...' : 'Approve Protocol'}
          </button>
          <button
            type="button"
            onClick={() => setCurrentStep((s) => Math.min(STEPS.length - 1, s + 1))}
            disabled={currentStep === STEPS.length - 1}
            className="rounded bg-[var(--cortex-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="next-btn"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
