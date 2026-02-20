import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { Plus, Cpu } from 'lucide-react';
import { GET_SIMILAR_DEVICES } from '../graphql/queries';
import { ADD_SIMILAR_DEVICE } from '../graphql/mutations';

interface Device {
  id: string;
  deviceName: string;
  manufacturer: string;
  indication: string;
  regulatoryStatus: string;
  metadata: unknown;
  createdAt: string;
}

interface SimilarDeviceRegistryProps {
  soaAnalysisId: string;
}

export function SimilarDeviceRegistry({ soaAnalysisId }: SimilarDeviceRegistryProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [indication, setIndication] = useState('');
  const [regulatoryStatus, setRegulatoryStatus] = useState('');

  const { data, loading, error, refetch } = useQuery<any>(GET_SIMILAR_DEVICES, {
    variables: { soaAnalysisId },
  });

  const [addDevice, { loading: adding }] = useMutation<any>(ADD_SIMILAR_DEVICE);

  const handleAddDevice = async () => {
    if (
      !deviceName.trim() ||
      !manufacturer.trim() ||
      !indication.trim() ||
      !regulatoryStatus.trim()
    )
      return;
    await addDevice({
      variables: {
        soaAnalysisId,
        deviceName: deviceName.trim(),
        manufacturer: manufacturer.trim(),
        indication: indication.trim(),
        regulatoryStatus: regulatoryStatus.trim(),
      },
    });
    setDeviceName('');
    setManufacturer('');
    setIndication('');
    setRegulatoryStatus('');
    setShowAddDialog(false);
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
        <h3 className="flex items-center gap-2 text-lg font-semibold text-[var(--cortex-text-primary)]">
          <Cpu size={18} /> Similar Devices Registry
        </h3>
        <button
          type="button"
          onClick={() => setShowAddDialog(true)}
          className="inline-flex items-center gap-2 rounded bg-[var(--cortex-blue-500)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--cortex-blue-600)]"
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
              className="rounded-lg border border-[var(--cortex-border)] p-4 hover:border-[var(--cortex-blue-500)]"
              data-testid={`device-item-${device.id}`}
            >
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-[var(--cortex-text-primary)]">
                  {device.deviceName}
                </h4>
                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                  {device.regulatoryStatus}
                </span>
              </div>
              <div className="mt-1 text-sm text-[var(--cortex-text-muted)]">
                {device.manufacturer}
              </div>
              <div className="mt-1 text-xs text-[var(--cortex-text-muted)]">
                Indication: {device.indication}
              </div>
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
            <div className="mt-4 space-y-3">
              <input
                type="text"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="Device name"
                className="w-full rounded border border-[var(--cortex-border)] px-3 py-2 text-sm"
                data-testid="device-name-input"
              />
              <input
                type="text"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="Manufacturer"
                className="w-full rounded border border-[var(--cortex-border)] px-3 py-2 text-sm"
                data-testid="device-manufacturer-input"
              />
              <input
                type="text"
                value={indication}
                onChange={(e) => setIndication(e.target.value)}
                placeholder="Indication"
                className="w-full rounded border border-[var(--cortex-border)] px-3 py-2 text-sm"
                data-testid="device-indication-input"
              />
              <input
                type="text"
                value={regulatoryStatus}
                onChange={(e) => setRegulatoryStatus(e.target.value)}
                placeholder="Regulatory status (e.g. CE Marked)"
                className="w-full rounded border border-[var(--cortex-border)] px-3 py-2 text-sm"
                data-testid="device-regulatory-input"
              />
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddDialog(false)}
                className="rounded border border-[var(--cortex-border)] px-4 py-2 text-sm text-[var(--cortex-text-secondary)] hover:bg-gray-50"
                data-testid="cancel-add-btn"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddDevice}
                disabled={
                  adding ||
                  !deviceName.trim() ||
                  !manufacturer.trim() ||
                  !indication.trim() ||
                  !regulatoryStatus.trim()
                }
                className="rounded bg-[var(--cortex-blue-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--cortex-blue-600)] disabled:cursor-not-allowed disabled:opacity-50"
                data-testid="confirm-add-btn"
              >
                {adding ? 'Adding...' : 'Add Device'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
