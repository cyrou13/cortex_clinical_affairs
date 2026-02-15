import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Calendar } from 'lucide-react';
import { GET_PMS_CYCLE } from '../graphql/queries';
import { PmsStatusBadge } from './StatusBadge';
import { TrendAnalysisPanel } from './TrendAnalysisPanel';
import { ReportGeneration } from './ReportGeneration';
import { CerUpdateDecisionPanel } from './CerUpdateDecisionPanel';

interface PmsCycle {
  id: string;
  pmsPlanId: string;
  cerVersionId: string | null;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  completedAt: string | null;
  createdById: string;
  createdAt: string;
}

interface PmsCycleDetailProps {
  cycleId: string;
}

type TabKey = 'activities' | 'complaints' | 'trends' | 'reports' | 'decision';

const TABS: { key: TabKey; label: string; testId: string }[] = [
  { key: 'activities', label: 'Activities', testId: 'tab-activities' },
  { key: 'complaints', label: 'Complaints', testId: 'tab-complaints' },
  { key: 'trends', label: 'Trends', testId: 'tab-trends' },
  { key: 'reports', label: 'Reports', testId: 'tab-reports' },
  { key: 'decision', label: 'CER Decision', testId: 'tab-decision' },
];

export function PmsCycleDetail({ cycleId }: PmsCycleDetailProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('activities');

  const { data, loading, error } = useQuery<{ pmsCycle: PmsCycle }>(
    GET_PMS_CYCLE,
    { variables: { id: cycleId } },
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12" data-testid="cycle-detail-loading">
        <p className="text-[var(--cortex-text-muted)]">Loading cycle...</p>
      </div>
    );
  }

  if (error || !data?.pmsCycle) {
    return (
      <div className="flex items-center justify-center p-12" data-testid="cycle-detail-not-found">
        <p className="text-[var(--cortex-error)]">
          {error ? `Failed to load cycle: ${error.message}` : 'Cycle not found.'}
        </p>
      </div>
    );
  }

  const cycle = data.pmsCycle;

  return (
    <div className="space-y-6" data-testid="cycle-detail">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-[var(--cortex-text-primary)]">{cycle.name}</h1>
          <PmsStatusBadge status={cycle.status} />
        </div>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-[var(--cortex-text-secondary)]">
          <Calendar size={14} />
          {new Date(cycle.startDate).toLocaleDateString()} - {new Date(cycle.endDate).toLocaleDateString()}
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--cortex-border)]">
        <nav className="-mb-px flex gap-6">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-[var(--cortex-blue-500)] text-[var(--cortex-blue-500)]'
                  : 'border-transparent text-[var(--cortex-text-muted)] hover:border-gray-300 hover:text-[var(--cortex-text-secondary)]'
              }`}
              data-testid={tab.testId}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'activities' && (
          <p className="text-sm text-[var(--cortex-text-muted)]" data-testid="activities-placeholder">
            Activity tracker will be displayed here.
          </p>
        )}
        {activeTab === 'complaints' && (
          <p className="text-sm text-[var(--cortex-text-muted)]" data-testid="complaints-placeholder">
            Complaints dashboard will be displayed here.
          </p>
        )}
        {activeTab === 'trends' && <TrendAnalysisPanel cycleId={cycleId} />}
        {activeTab === 'reports' && <ReportGeneration cycleId={cycleId} />}
        {activeTab === 'decision' && <CerUpdateDecisionPanel cycleId={cycleId} />}
      </div>
    </div>
  );
}
