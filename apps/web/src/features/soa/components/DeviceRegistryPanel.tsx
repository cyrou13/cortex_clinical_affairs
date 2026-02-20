import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { Cpu, Plus } from 'lucide-react';
import { GET_SIMILAR_DEVICES } from '../graphql/queries';
import { ADD_SIMILAR_DEVICE, ADD_BENCHMARK } from '../graphql/mutations';

interface Device {
  id: string;
  deviceName: string;
  manufacturer: string;
  indication: string;
  regulatoryStatus: string;
  createdAt: string;
}

interface DeviceRegistryPanelProps {
  soaAnalysisId: string;
  locked?: boolean;
  onDeviceAdded?: () => void;
}

export function DeviceRegistryPanel({
  soaAnalysisId,
  locked = false,
  onDeviceAdded,
}: DeviceRegistryPanelProps) {
  const [showDeviceForm, setShowDeviceForm] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [indication, setIndication] = useState('');
  const [regulatoryStatus, setRegulatoryStatus] = useState('');
  const [showBenchmarkForm, setShowBenchmarkForm] = useState<string | null>(null);
  const [benchmarkParam, setBenchmarkParam] = useState('');
  const [benchmarkValue, setBenchmarkValue] = useState('');
  const [benchmarkUnit, setBenchmarkUnit] = useState('');

  const { data, loading, refetch } = useQuery<any>(GET_SIMILAR_DEVICES, {
    variables: { soaAnalysisId },
  });

  const [addDevice] = useMutation(ADD_SIMILAR_DEVICE);
  const [addBenchmark] = useMutation(ADD_BENCHMARK);

  const devices: Device[] = data?.similarDevices ?? [];

  const handleAddDevice = async () => {
    if (!deviceName.trim() || !manufacturer.trim()) return;
    await addDevice({
      variables: {
        soaAnalysisId,
        deviceName: deviceName.trim(),
        manufacturer: manufacturer.trim(),
        indication: indication.trim() || 'N/A',
        regulatoryStatus: regulatoryStatus || 'Unknown',
      },
    });
    setDeviceName('');
    setManufacturer('');
    setIndication('');
    setRegulatoryStatus('');
    setShowDeviceForm(false);
    onDeviceAdded?.();
    refetch();
  };

  const handleAddBenchmark = async (deviceId: string) => {
    if (!benchmarkParam.trim() || !benchmarkValue.trim()) return;
    await addBenchmark({
      variables: {
        soaAnalysisId,
        similarDeviceId: deviceId,
        metricName: benchmarkParam.trim(),
        metricValue: benchmarkValue.trim(),
        unit: benchmarkUnit.trim() || 'N/A',
      },
    });
    setBenchmarkParam('');
    setBenchmarkValue('');
    setBenchmarkUnit('');
    setShowBenchmarkForm(null);
  };

  if (loading) {
    return (
      <div
        className="py-6 text-center text-sm text-[var(--cortex-text-muted)]"
        data-testid="device-registry-loading"
      >
        Loading device registry...
      </div>
    );
  }

  return (
    <div
      className="space-y-4 rounded-lg border border-[var(--cortex-border)] p-4"
      data-testid="device-registry"
    >
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--cortex-text-primary)]">
          <Cpu size={14} /> Similar Devices Registry
        </h3>
        {!locked && (
          <button
            type="button"
            onClick={() => setShowDeviceForm(true)}
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
            data-testid="add-device-btn"
          >
            <Plus size={12} /> Add Device
          </button>
        )}
      </div>

      {showDeviceForm && (
        <div
          className="space-y-2 rounded border border-blue-200 bg-blue-50 p-3"
          data-testid="device-form"
        >
          <input
            type="text"
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            placeholder="Device name"
            className="w-full rounded border px-2 py-1.5 text-sm"
            data-testid="device-name-input"
          />
          <input
            type="text"
            value={manufacturer}
            onChange={(e) => setManufacturer(e.target.value)}
            placeholder="Manufacturer"
            className="w-full rounded border px-2 py-1.5 text-sm"
            data-testid="device-manufacturer-input"
          />
          <input
            type="text"
            value={indication}
            onChange={(e) => setIndication(e.target.value)}
            placeholder="Indication"
            className="w-full rounded border px-2 py-1.5 text-sm"
            data-testid="device-indication-input"
          />
          <input
            type="text"
            value={regulatoryStatus}
            onChange={(e) => setRegulatoryStatus(e.target.value)}
            placeholder="Regulatory status (e.g. CE Marked)"
            className="w-full rounded border px-2 py-1.5 text-sm"
            data-testid="device-regulatory-input"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAddDevice}
              className="rounded bg-blue-600 px-3 py-1 text-xs text-white"
              data-testid="confirm-add-device"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setShowDeviceForm(false)}
              className="rounded border px-3 py-1 text-xs"
              data-testid="cancel-add-device"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Device table */}
      {devices.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-[var(--cortex-border)]">
          <table className="w-full text-sm" data-testid="device-table">
            <thead>
              <tr className="bg-blue-800 text-white">
                <th className="px-3 py-2 text-left text-xs font-medium">Device</th>
                <th className="px-3 py-2 text-left text-xs font-medium">Manufacturer</th>
                <th className="px-3 py-2 text-left text-xs font-medium">Indication</th>
                <th className="px-3 py-2 text-left text-xs font-medium">Status</th>
                {!locked && <th className="px-3 py-2 text-left text-xs font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {devices.map((device, idx) => (
                <tr
                  key={device.id}
                  className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F8F9FA]'}
                  data-testid={`device-row-${device.id}`}
                >
                  <td className="px-3 py-2 font-medium">{device.deviceName}</td>
                  <td className="px-3 py-2">{device.manufacturer}</td>
                  <td className="px-3 py-2 text-xs">{device.indication}</td>
                  <td className="px-3 py-2">
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">
                      {device.regulatoryStatus}
                    </span>
                  </td>
                  {!locked && (
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => setShowBenchmarkForm(device.id)}
                        className="text-[10px] text-blue-600 hover:underline"
                        data-testid={`add-benchmark-${device.id}`}
                      >
                        + Add Benchmark
                      </button>
                      {showBenchmarkForm === device.id && (
                        <div
                          className="mt-2 space-y-1 rounded border bg-gray-50 p-2"
                          data-testid="benchmark-form"
                        >
                          <input
                            type="text"
                            value={benchmarkParam}
                            onChange={(e) => setBenchmarkParam(e.target.value)}
                            placeholder="Metric name"
                            className="w-full rounded border px-1.5 py-1 text-xs"
                            data-testid="benchmark-param-input"
                          />
                          <div className="flex gap-1">
                            <input
                              type="text"
                              value={benchmarkValue}
                              onChange={(e) => setBenchmarkValue(e.target.value)}
                              placeholder="Value"
                              className="flex-1 rounded border px-1.5 py-1 text-xs"
                              data-testid="benchmark-value-input"
                            />
                            <input
                              type="text"
                              value={benchmarkUnit}
                              onChange={(e) => setBenchmarkUnit(e.target.value)}
                              placeholder="Unit"
                              className="w-16 rounded border px-1.5 py-1 text-xs"
                              data-testid="benchmark-unit-input"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddBenchmark(device.id)}
                            className="rounded bg-blue-600 px-2 py-0.5 text-[10px] text-white"
                            data-testid="confirm-add-benchmark"
                          >
                            Add
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          className="py-4 text-center text-sm text-[var(--cortex-text-muted)]"
          data-testid="no-devices"
        >
          No similar devices registered yet.
        </div>
      )}
    </div>
  );
}
