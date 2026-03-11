import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { Cpu, Search, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { GET_SIMILAR_DEVICES, GET_DEVICE_BENCHMARKS } from '../graphql/queries';
import { DISCOVER_SIMILAR_DEVICES, UPDATE_DEVICE_STATUS } from '../graphql/mutations';

interface Device {
  id: string;
  deviceName: string;
  manufacturer: string;
  indication: string;
  regulatoryStatus: string;
  status: string;
  articleCount: number;
  createdAt: string;
}

interface BenchmarkData {
  id: string;
  metricName: string;
  metricValue: string;
  unit: string;
  sourceArticleId: string | null;
}

interface DeviceRegistryPanelProps {
  soaAnalysisId: string;
  gridId: string | null;
  locked?: boolean;
  onDeviceAdded?: () => void;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    DISCOVERED: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Discovered' },
    APPROVED: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Approved' },
    REJECTED: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' },
  };
  const c = config[status] ?? { bg: 'bg-gray-100', text: 'text-gray-600', label: status };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.bg} ${c.text}`}
    >
      {c.label}
    </span>
  );
}

function DeviceBenchmarks({ deviceId }: { deviceId: string }) {
  const { data, loading } = useQuery<any>(GET_DEVICE_BENCHMARKS, {
    variables: { similarDeviceId: deviceId },
  });

  const benchmarks: BenchmarkData[] = data?.deviceBenchmarks ?? [];

  if (loading) {
    return (
      <div className="px-4 py-2 text-xs text-[var(--cortex-text-muted)]">Loading benchmarks...</div>
    );
  }

  if (benchmarks.length === 0) {
    return (
      <div className="px-4 py-2 text-xs text-[var(--cortex-text-muted)]">
        No performance data found.
      </div>
    );
  }

  return (
    <div className="border-t border-[var(--cortex-border)] bg-gray-50 px-4 py-3">
      <h5 className="mb-2 text-xs font-semibold uppercase text-[var(--cortex-text-muted)]">
        Performance Data ({benchmarks.length})
      </h5>
      <div className="space-y-1.5">
        {benchmarks.map((bm) => (
          <div
            key={bm.id}
            className="flex items-start gap-3 rounded border border-[var(--cortex-border)] bg-white px-3 py-2"
          >
            <div className="flex-1">
              <span className="text-xs font-medium text-[var(--cortex-text-primary)]">
                {bm.metricName}
              </span>
            </div>
            <div className="text-xs text-[var(--cortex-text-secondary)]">{bm.metricValue}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DeviceRegistryPanel({
  soaAnalysisId,
  gridId,
  locked = false,
}: DeviceRegistryPanelProps) {
  const [expandedDevice, setExpandedDevice] = useState<string | null>(null);

  const { data, loading, refetch } = useQuery<any>(GET_SIMILAR_DEVICES, {
    variables: { soaAnalysisId },
  });

  const [discoverDevices, { loading: discovering }] = useMutation(DISCOVER_SIMILAR_DEVICES, {
    variables: { soaAnalysisId, gridId },
  });

  const [updateStatus] = useMutation(UPDATE_DEVICE_STATUS);

  const devices: Device[] = data?.similarDevices ?? [];
  const approvedCount = devices.filter((d) => d.status === 'APPROVED').length;
  const discoveredCount = devices.filter((d) => d.status === 'DISCOVERED').length;

  const handleDiscover = async () => {
    await discoverDevices();
    refetch();
  };

  const handleStatusChange = async (deviceId: string, status: string) => {
    await updateStatus({ variables: { deviceId, status } });
    refetch();
  };

  if (loading) {
    return (
      <div className="py-8 text-center text-sm text-[var(--cortex-text-muted)]">
        Loading device registry...
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="device-registry">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu size={16} className="text-[var(--cortex-blue-500)]" />
          <h3 className="text-lg font-semibold text-[var(--cortex-text-primary)]">
            Similar Devices
          </h3>
          <span className="text-xs text-[var(--cortex-text-muted)]">
            {approvedCount} approved, {discoveredCount} pending
          </span>
        </div>
        {gridId && !locked && (
          <button
            type="button"
            onClick={handleDiscover}
            disabled={discovering}
            className="inline-flex items-center gap-1.5 rounded border border-purple-300 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50"
            data-testid="discover-devices-btn"
          >
            <Search size={14} className={discovering ? 'animate-spin' : ''} />
            {discovering ? 'Discovering...' : 'Discover from Grid'}
          </button>
        )}
      </div>

      {/* Summary cards */}
      {devices.length > 0 && (
        <div className="flex gap-3" data-testid="device-summary">
          <div className="flex-1 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-center">
            <div className="text-2xl font-bold text-blue-700">{devices.length}</div>
            <div className="text-xs font-medium text-blue-600">Total Devices</div>
          </div>
          <div className="flex-1 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-center">
            <div className="text-2xl font-bold text-emerald-700">{approvedCount}</div>
            <div className="text-xs font-medium text-emerald-600">Approved</div>
          </div>
          <div className="flex-1 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-center">
            <div className="text-2xl font-bold text-amber-700">{discoveredCount}</div>
            <div className="text-xs font-medium text-amber-600">Pending Review</div>
          </div>
          <div className="flex-1 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-center">
            <div className="text-2xl font-bold text-red-700">
              {devices.filter((d) => d.status === 'REJECTED').length}
            </div>
            <div className="text-xs font-medium text-red-600">Rejected</div>
          </div>
        </div>
      )}

      {/* Device table */}
      {devices.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-[var(--cortex-border)] p-12 text-center">
          <Cpu size={32} className="mx-auto mb-3 text-[var(--cortex-text-muted)]" />
          <p className="text-sm text-[var(--cortex-text-muted)]">
            No similar devices found yet. Click &quot;Discover from Grid&quot; to extract devices
            from the extraction grid data.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[var(--cortex-border)]">
          <table className="w-full text-sm" data-testid="device-table">
            <thead>
              <tr className="bg-blue-800 text-white">
                <th className="px-3 py-2 text-left text-xs font-medium">Device</th>
                <th className="px-3 py-2 text-left text-xs font-medium">Manufacturer</th>
                <th className="w-20 px-3 py-2 text-center text-xs font-medium">Articles</th>
                <th className="w-28 px-3 py-2 text-center text-xs font-medium">Status</th>
                {!locked && (
                  <th className="w-28 px-3 py-2 text-center text-xs font-medium">Actions</th>
                )}
                <th className="w-8 px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {devices.map((device, idx) => {
                const isExpanded = expandedDevice === device.id;
                return (
                  <tr key={device.id} data-testid={`device-row-${device.id}`}>
                    <td colSpan={locked ? 5 : 6} className="p-0">
                      <div
                        className={`flex cursor-pointer items-center ${idx % 2 === 0 ? 'bg-white' : 'bg-[#F8F9FA]'} ${isExpanded ? 'border-b border-[var(--cortex-border)]' : ''}`}
                        onClick={() => setExpandedDevice(isExpanded ? null : device.id)}
                      >
                        <div className="flex-1 px-3 py-2">
                          <span className="font-medium text-[var(--cortex-text-primary)]">
                            {device.deviceName}
                          </span>
                        </div>
                        <div className="w-40 px-3 py-2 text-xs text-[var(--cortex-text-secondary)]">
                          {device.manufacturer}
                        </div>
                        <div className="w-20 px-3 py-2 text-center text-xs text-[var(--cortex-text-muted)]">
                          {device.articleCount}
                        </div>
                        <div className="w-28 px-3 py-2 text-center">
                          <StatusBadge status={device.status} />
                        </div>
                        {!locked && (
                          <div
                            className="w-28 px-3 py-2 text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {device.status === 'DISCOVERED' && (
                              <div className="flex justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(device.id, 'APPROVED')}
                                  className="rounded bg-emerald-100 p-1.5 text-emerald-700 hover:bg-emerald-200"
                                  title="Approve"
                                  data-testid={`approve-${device.id}`}
                                >
                                  <Check size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(device.id, 'REJECTED')}
                                  className="rounded bg-red-100 p-1.5 text-red-700 hover:bg-red-200"
                                  title="Reject"
                                  data-testid={`reject-${device.id}`}
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            )}
                            {device.status === 'APPROVED' && (
                              <button
                                type="button"
                                onClick={() => handleStatusChange(device.id, 'REJECTED')}
                                className="text-xs text-red-500 hover:underline"
                              >
                                Reject
                              </button>
                            )}
                            {device.status === 'REJECTED' && (
                              <button
                                type="button"
                                onClick={() => handleStatusChange(device.id, 'APPROVED')}
                                className="text-xs text-emerald-500 hover:underline"
                              >
                                Approve
                              </button>
                            )}
                          </div>
                        )}
                        <div className="w-8 px-2 py-2 text-center">
                          {isExpanded ? (
                            <ChevronUp size={14} className="text-gray-400" />
                          ) : (
                            <ChevronDown size={14} className="text-gray-400" />
                          )}
                        </div>
                      </div>
                      {isExpanded && <DeviceBenchmarks deviceId={device.id} />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
