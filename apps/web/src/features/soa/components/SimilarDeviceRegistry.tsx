import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { Plus, X, Award } from 'lucide-react';

export const GET_SIMILAR_DEVICES = gql`
  query GetSimilarDevices($soaAnalysisId: String!) {
    similarDevices(soaAnalysisId: $soaAnalysisId) {
      id
      name
      manufacturer
      modelNumber
      regulatoryClass
      performanceBenchmark {
        score
        category
      }
    }
  }
`;

export const ADD_SIMILAR_DEVICE = gql`
  mutation AddSimilarDevice($soaAnalysisId: String!, $deviceId: String!) {
    addSimilarDevice(soaAnalysisId: $soaAnalysisId, deviceId: $deviceId) {
      id
      name
    }
  }
`;

export const REMOVE_SIMILAR_DEVICE = gql`
  mutation RemoveSimilarDevice($soaAnalysisId: String!, $deviceId: String!) {
    removeSimilarDevice(soaAnalysisId: $soaAnalysisId, deviceId: $deviceId) {
      success
    }
  }
`;

interface Device {
  id: string;
  name: string;
  manufacturer: string;
  modelNumber?: string;
  regulatoryClass?: string;
  performanceBenchmark?: {
    score: number;
    category: string;
  };
}

interface SimilarDeviceRegistryProps {
  soaAnalysisId: string;
}

function PerformanceBadge({ score, category }: { score: number; category: string }) {
  const colorClass =
    score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-amber-600' : 'text-red-600';
  const bgClass = score >= 80 ? 'bg-emerald-50' : score >= 60 ? 'bg-amber-50' : 'bg-red-50';

  return (
    <div
      className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium ${bgClass} ${colorClass}`}
      data-testid="performance-badge"
    >
      <Award size={12} />
      {category} ({score})
    </div>
  );
}

export function SimilarDeviceRegistry({ soaAnalysisId }: SimilarDeviceRegistryProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);

  const { data, loading, error, refetch } = useQuery<any>(GET_SIMILAR_DEVICES, {
    variables: { soaAnalysisId },
  });

  const [removeDevice, { loading: removing }] = useMutation<any>(REMOVE_SIMILAR_DEVICE);

  const handleRemove = async (deviceId: string) => {
    await removeDevice({
      variables: { soaAnalysisId, deviceId },
    });
    refetch();
  };

  if (loading) {
    return (
      <div
        className="py-8 text-center text-sm text-[var(--cortex-text-muted)]"
        data-testid="registry-loading"
      >
        Loading similar devices...
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="py-8 text-center text-sm text-[var(--cortex-error)]"
        data-testid="registry-error"
      >
        Failed to load similar devices.
      </div>
    );
  }

  const devices: Device[] = data?.similarDevices ?? [];

  return (
    <div className="space-y-4" data-testid="similar-device-registry">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--cortex-text-primary)]">
          Similar Devices Registry
        </h3>
        <button
          type="button"
          onClick={() => setShowAddDialog(true)}
          className="inline-flex items-center gap-2 rounded bg-[var(--cortex-primary)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--cortex-primary-hover)]"
          data-testid="add-device-btn"
        >
          <Plus size={16} />
          Add Device
        </button>
      </div>

      {devices.length === 0 ? (
        <div
          className="rounded-lg border border-dashed border-[var(--cortex-border)] p-8 text-center text-sm text-[var(--cortex-text-muted)]"
          data-testid="empty-registry"
        >
          No similar devices added yet. Click "Add Device" to get started.
        </div>
      ) : (
        <div className="space-y-2" data-testid="device-list">
          {devices.map((device) => (
            <div
              key={device.id}
              className="flex items-center justify-between rounded-lg border border-[var(--cortex-border)] p-4 hover:border-[var(--cortex-primary)]"
              data-testid={`device-item-${device.id}`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-[var(--cortex-text-primary)]">{device.name}</h4>
                  {device.regulatoryClass && (
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                      Class {device.regulatoryClass}
                    </span>
                  )}
                </div>
                <div className="mt-1 text-sm text-[var(--cortex-text-muted)]">
                  {device.manufacturer}
                  {device.modelNumber && ` • Model ${device.modelNumber}`}
                </div>
                {device.performanceBenchmark && (
                  <div className="mt-2">
                    <PerformanceBadge
                      score={device.performanceBenchmark.score}
                      category={device.performanceBenchmark.category}
                    />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleRemove(device.id)}
                disabled={removing}
                className="ml-4 rounded p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                data-testid={`remove-device-btn-${device.id}`}
                aria-label={`Remove ${device.name}`}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showAddDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          data-testid="add-device-dialog"
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowAddDialog(false)}
            data-testid="dialog-backdrop"
          />
          <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-[var(--cortex-text-primary)]">
              Add Similar Device
            </h3>
            <p className="mt-2 text-sm text-[var(--cortex-text-muted)]">
              Search for and select a device from the database to add to the registry.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddDialog(false)}
                className="rounded border border-[var(--cortex-border)] px-4 py-2 text-sm text-[var(--cortex-text-secondary)] hover:bg-[var(--cortex-bg-hover)]"
                data-testid="cancel-add-btn"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
