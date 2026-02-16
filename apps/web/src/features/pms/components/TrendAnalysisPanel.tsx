import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { Trash2, TrendingUp, Database } from 'lucide-react';
import { GET_TREND_ANALYSES, GET_INSTALLED_BASE_ENTRIES } from '../graphql/queries';
import {
  COMPUTE_TREND_ANALYSIS,
  FINALIZE_TREND_ANALYSIS,
  CREATE_INSTALLED_BASE_ENTRY,
  DELETE_INSTALLED_BASE_ENTRY,
} from '../graphql/mutations';
import { PmsStatusBadge } from './StatusBadge';

interface InstalledBaseEntry {
  id: string;
  pmsCycleId: string;
  periodStart: string;
  periodEnd: string;
  totalUnitsShipped: number;
  activeDevices: number;
  regionBreakdown: Record<string, number> | null;
}

interface TrendAnalysis {
  id: string;
  pmsCycleId: string;
  analysisDate: string;
  complaintTrends: Record<string, unknown> | null;
  severityDistribution: Record<string, number> | null;
  classificationDistribution: Record<string, number> | null;
  significantChanges: string[] | null;
  conclusions: string | null;
  status: string;
}

interface TrendAnalysisPanelProps {
  cycleId: string;
}

export function TrendAnalysisPanel({ cycleId }: TrendAnalysisPanelProps) {
  const [showBaseForm, setShowBaseForm] = useState(false);
  const [baseForm, setBaseForm] = useState({
    periodStart: '',
    periodEnd: '',
    totalUnitsShipped: 0,
    activeDevices: 0,
  });
  const [conclusions, setConclusions] = useState('');

  const { data: baseData, loading: baseLoading } = useQuery<{
    installedBaseEntries: InstalledBaseEntry[];
  }>(GET_INSTALLED_BASE_ENTRIES, { variables: { cycleId } });
  const { data: trendData, loading: trendLoading } = useQuery<{ trendAnalyses: TrendAnalysis[] }>(
    GET_TREND_ANALYSES,
    { variables: { cycleId } },
  );

  const [createEntry] = useMutation(CREATE_INSTALLED_BASE_ENTRY, {
    refetchQueries: [{ query: GET_INSTALLED_BASE_ENTRIES, variables: { cycleId } }],
  });
  const [deleteEntry] = useMutation(DELETE_INSTALLED_BASE_ENTRY, {
    refetchQueries: [{ query: GET_INSTALLED_BASE_ENTRIES, variables: { cycleId } }],
  });
  const [computeTrend, { loading: computing }] = useMutation(COMPUTE_TREND_ANALYSIS, {
    refetchQueries: [{ query: GET_TREND_ANALYSES, variables: { cycleId } }],
  });
  const [finalizeTrend] = useMutation(FINALIZE_TREND_ANALYSIS, {
    refetchQueries: [{ query: GET_TREND_ANALYSES, variables: { cycleId } }],
  });

  if (baseLoading || trendLoading) {
    return (
      <div className="flex items-center justify-center p-12" data-testid="trend-loading">
        <p className="text-[var(--cortex-text-muted)]">Loading trend data...</p>
      </div>
    );
  }

  const entries = baseData?.installedBaseEntries ?? [];
  const analyses = trendData?.trendAnalyses ?? [];

  function handleAddEntry() {
    createEntry({
      variables: {
        pmsCycleId: cycleId,
        periodStart: baseForm.periodStart,
        periodEnd: baseForm.periodEnd,
        totalUnitsShipped: baseForm.totalUnitsShipped,
        activeDevices: baseForm.activeDevices,
      },
    });
    setShowBaseForm(false);
    setBaseForm({ periodStart: '', periodEnd: '', totalUnitsShipped: 0, activeDevices: 0 });
  }

  function handleFinalize(analysisId: string) {
    if (!conclusions.trim()) return;
    finalizeTrend({ variables: { trendAnalysisId: analysisId, conclusions: conclusions.trim() } });
  }

  return (
    <div className="space-y-6" data-testid="trend-panel">
      {/* Installed Base Section */}
      <section data-testid="installed-base-section">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--cortex-text-primary)]">
            <Database size={18} /> Installed Base
          </h2>
          <button
            type="button"
            onClick={() => setShowBaseForm(true)}
            className="rounded-md bg-[var(--cortex-blue-500)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--cortex-blue-600)]"
            data-testid="add-base-btn"
          >
            Add Entry
          </button>
        </div>

        {showBaseForm && (
          <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg border border-[var(--cortex-border)] bg-white p-4">
            <input
              type="date"
              value={baseForm.periodStart}
              onChange={(e) => setBaseForm((f) => ({ ...f, periodStart: e.target.value }))}
              className="rounded-md border border-[var(--cortex-border)] px-3 py-2 text-sm"
              placeholder="Period Start"
              data-testid="base-period-start"
            />
            <input
              type="date"
              value={baseForm.periodEnd}
              onChange={(e) => setBaseForm((f) => ({ ...f, periodEnd: e.target.value }))}
              className="rounded-md border border-[var(--cortex-border)] px-3 py-2 text-sm"
              placeholder="Period End"
              data-testid="base-period-end"
            />
            <input
              type="number"
              value={baseForm.totalUnitsShipped}
              onChange={(e) =>
                setBaseForm((f) => ({ ...f, totalUnitsShipped: parseInt(e.target.value) || 0 }))
              }
              className="rounded-md border border-[var(--cortex-border)] px-3 py-2 text-sm"
              placeholder="Units Shipped"
              data-testid="base-units-shipped"
            />
            <input
              type="number"
              value={baseForm.activeDevices}
              onChange={(e) =>
                setBaseForm((f) => ({ ...f, activeDevices: parseInt(e.target.value) || 0 }))
              }
              className="rounded-md border border-[var(--cortex-border)] px-3 py-2 text-sm"
              placeholder="Active Devices"
              data-testid="base-active-devices"
            />
            <div className="col-span-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBaseForm(false)}
                className="rounded-md border border-[var(--cortex-border)] px-3 py-1.5 text-sm text-[var(--cortex-text-secondary)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddEntry}
                className="rounded-md bg-[var(--cortex-blue-500)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--cortex-blue-600)]"
                data-testid="save-base-btn"
              >
                Save
              </button>
            </div>
          </div>
        )}

        {entries.length === 0 ? (
          <p className="text-sm text-[var(--cortex-text-muted)]">No installed base entries yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[var(--cortex-border)]">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-[var(--cortex-text-muted)]">
                <tr>
                  <th className="px-4 py-2">Period Start</th>
                  <th className="px-4 py-2">Period End</th>
                  <th className="px-4 py-2">Units Shipped</th>
                  <th className="px-4 py-2">Active Devices</th>
                  <th className="px-4 py-2">Regions</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-t border-[var(--cortex-border)]"
                    data-testid={`base-entry-${entry.id}`}
                  >
                    <td className="px-4 py-2 text-[var(--cortex-text-primary)]">
                      {entry.periodStart}
                    </td>
                    <td className="px-4 py-2 text-[var(--cortex-text-primary)]">
                      {entry.periodEnd}
                    </td>
                    <td className="px-4 py-2 text-[var(--cortex-text-primary)]">
                      {entry.totalUnitsShipped.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-[var(--cortex-text-primary)]">
                      {entry.activeDevices.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-[var(--cortex-text-secondary)]">
                      {entry.regionBreakdown ? Object.keys(entry.regionBreakdown).join(', ') : '-'}
                    </td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => deleteEntry({ variables: { entryId: entry.id } })}
                        className="text-red-500 hover:text-red-700"
                        data-testid={`delete-base-${entry.id}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Trend Analysis Section */}
      <section data-testid="trend-section">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--cortex-text-primary)]">
            <TrendingUp size={18} /> Trend Analysis
          </h2>
          <button
            type="button"
            onClick={() => computeTrend({ variables: { pmsCycleId: cycleId } })}
            disabled={computing}
            className="rounded-md bg-[var(--cortex-blue-500)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--cortex-blue-600)] disabled:opacity-50"
            data-testid="compute-btn"
          >
            {computing ? 'Computing...' : 'Compute Trends'}
          </button>
        </div>

        {analyses.length === 0 ? (
          <p className="text-sm text-[var(--cortex-text-muted)]">No trend analyses computed yet.</p>
        ) : (
          analyses.map((analysis) => (
            <div
              key={analysis.id}
              className="space-y-4 rounded-lg border border-[var(--cortex-border)] bg-white p-4"
              data-testid={`trend-analysis-${analysis.id}`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-[var(--cortex-text-secondary)]">
                  Analysis: {new Date(analysis.analysisDate).toLocaleDateString()}
                </p>
                <PmsStatusBadge status={analysis.status} />
              </div>

              {/* Severity Distribution */}
              {analysis.severityDistribution && (
                <div>
                  <h3 className="mb-2 text-sm font-medium text-[var(--cortex-text-secondary)]">
                    Severity Distribution
                  </h3>
                  <div className="flex gap-2">
                    {Object.entries(analysis.severityDistribution).map(([key, val]) => (
                      <div key={key} className="flex-1 rounded-md bg-gray-50 p-2 text-center">
                        <p className="text-lg font-semibold text-[var(--cortex-text-primary)]">
                          {val}
                        </p>
                        <p className="text-xs text-[var(--cortex-text-muted)]">{key}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Classification Distribution */}
              {analysis.classificationDistribution && (
                <div>
                  <h3 className="mb-2 text-sm font-medium text-[var(--cortex-text-secondary)]">
                    Classification Distribution
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(analysis.classificationDistribution).map(([key, val]) => (
                      <span
                        key={key}
                        className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-xs text-blue-700"
                      >
                        {key}: {val}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Significant Changes */}
              {analysis.significantChanges && analysis.significantChanges.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-medium text-[var(--cortex-text-secondary)]">
                    Significant Changes
                  </h3>
                  <ul className="list-inside list-disc space-y-1 text-sm text-[var(--cortex-text-primary)]">
                    {analysis.significantChanges.map((change, i) => (
                      <li key={i}>{change}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Conclusions / Finalize */}
              {analysis.status === 'DRAFT' && (
                <div className="space-y-2 border-t border-[var(--cortex-border)] pt-4">
                  <textarea
                    value={conclusions}
                    onChange={(e) => setConclusions(e.target.value)}
                    placeholder="Enter conclusions to finalize..."
                    rows={3}
                    className="w-full rounded-md border border-[var(--cortex-border)] px-3 py-2 text-sm outline-none focus:border-[var(--cortex-blue-500)] focus:ring-1 focus:ring-[var(--cortex-blue-500)]"
                    data-testid="conclusions-input"
                  />
                  <button
                    type="button"
                    onClick={() => handleFinalize(analysis.id)}
                    disabled={!conclusions.trim()}
                    className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                    data-testid="finalize-btn"
                  >
                    Finalize
                  </button>
                </div>
              )}

              {analysis.status === 'FINALIZED' && analysis.conclusions && (
                <div className="border-t border-[var(--cortex-border)] pt-4">
                  <h3 className="mb-1 text-sm font-medium text-[var(--cortex-text-secondary)]">
                    Conclusions
                  </h3>
                  <p className="text-sm text-[var(--cortex-text-primary)]">
                    {analysis.conclusions}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </section>
    </div>
  );
}
