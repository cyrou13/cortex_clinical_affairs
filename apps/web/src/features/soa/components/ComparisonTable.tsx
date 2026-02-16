import { useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export const GET_DEVICE_COMPARISON = gql`
  query GetDeviceComparison($soaAnalysisId: String!) {
    deviceComparison(soaAnalysisId: $soaAnalysisId) {
      targetDevice {
        id
        name
        manufacturer
      }
      similarDevices {
        id
        name
        manufacturer
      }
      metrics {
        name
        category
        values {
          deviceId
          value
          unit
        }
      }
    }
  }
`;

interface Device {
  id: string;
  name: string;
  manufacturer: string;
}

interface MetricValue {
  deviceId: string;
  value: string;
  unit?: string;
}

interface Metric {
  name: string;
  category: string;
  values: MetricValue[];
}

interface ComparisonTableProps {
  soaAnalysisId: string;
}

function ComparisonCell({
  value,
  unit,
  isTarget,
  variance,
}: {
  value: string;
  unit?: string;
  isTarget: boolean;
  variance?: 'higher' | 'lower' | 'same';
}) {
  const VarianceIcon =
    variance === 'higher' ? TrendingUp : variance === 'lower' ? TrendingDown : Minus;
  const varianceColor =
    variance === 'higher'
      ? 'text-emerald-500'
      : variance === 'lower'
        ? 'text-red-500'
        : 'text-gray-400';

  return (
    <div className={`px-3 py-2 text-sm ${isTarget ? 'bg-blue-50 font-medium' : ''}`}>
      <div className="flex items-center gap-1">
        <span data-testid="cell-value">{value}</span>
        {unit && <span className="text-xs text-[var(--cortex-text-muted)]">{unit}</span>}
        {variance && !isTarget && (
          <VarianceIcon size={12} className={varianceColor} data-testid="variance-icon" />
        )}
      </div>
    </div>
  );
}

export function ComparisonTable({ soaAnalysisId }: ComparisonTableProps) {
  const { data, loading, error } = useQuery<any>(GET_DEVICE_COMPARISON, {
    variables: { soaAnalysisId },
  });

  if (loading) {
    return (
      <div
        className="py-8 text-center text-sm text-[var(--cortex-text-muted)]"
        data-testid="comparison-loading"
      >
        Loading device comparison...
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="py-8 text-center text-sm text-[var(--cortex-error)]"
        data-testid="comparison-error"
      >
        Failed to load device comparison.
      </div>
    );
  }

  const comparison = data?.deviceComparison;
  if (!comparison) {
    return (
      <div
        className="py-8 text-center text-sm text-[var(--cortex-text-muted)]"
        data-testid="comparison-empty"
      >
        No comparison data available.
      </div>
    );
  }

  const targetDevice: Device = comparison.targetDevice;
  const similarDevices: Device[] = comparison.similarDevices ?? [];
  const metrics: Metric[] = comparison.metrics ?? [];
  const allDevices = [targetDevice, ...similarDevices];

  return (
    <div className="overflow-x-auto" data-testid="comparison-table">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-[var(--cortex-border)]">
            <th className="px-3 py-3 text-left text-xs font-semibold text-[var(--cortex-text-muted)] uppercase">
              Metric
            </th>
            {allDevices.map((device, idx) => (
              <th
                key={device.id}
                className={`px-3 py-3 text-left text-sm font-medium ${idx === 0 ? 'bg-blue-50 text-[var(--cortex-primary)]' : 'text-[var(--cortex-text-primary)]'}`}
                data-testid={idx === 0 ? 'target-device-header' : `similar-device-header-${idx}`}
              >
                <div>
                  <div className="font-semibold">{device.name}</div>
                  <div className="text-xs font-normal text-[var(--cortex-text-muted)]">
                    {device.manufacturer}
                  </div>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {metrics.map((metric, metricIdx) => {
            const targetValue = metric.values.find((v) => v.deviceId === targetDevice.id);

            return (
              <tr
                key={`${metric.category}-${metric.name}`}
                className="border-b border-[var(--cortex-border)] hover:bg-[var(--cortex-bg-hover)]"
                data-testid={`metric-row-${metricIdx}`}
              >
                <td className="px-3 py-2 text-sm text-[var(--cortex-text-primary)]">
                  <div>
                    <div className="font-medium">{metric.name}</div>
                    <div className="text-xs text-[var(--cortex-text-muted)]">{metric.category}</div>
                  </div>
                </td>
                {allDevices.map((device, deviceIdx) => {
                  const value = metric.values.find((v) => v.deviceId === device.id);
                  const isTarget = deviceIdx === 0;

                  let variance: 'higher' | 'lower' | 'same' | undefined;
                  if (!isTarget && value && targetValue) {
                    const numValue = parseFloat(value.value);
                    const numTarget = parseFloat(targetValue.value);
                    if (!isNaN(numValue) && !isNaN(numTarget)) {
                      const diff = Math.abs(numValue - numTarget) / numTarget;
                      if (diff > 0.1) {
                        variance = numValue > numTarget ? 'higher' : 'lower';
                      } else {
                        variance = 'same';
                      }
                    }
                  }

                  return (
                    <td key={device.id} className="border-l border-[var(--cortex-border)]">
                      <ComparisonCell
                        value={value?.value ?? 'N/A'}
                        unit={value?.unit}
                        isTarget={isTarget}
                        variance={variance}
                      />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
