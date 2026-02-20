import { useState } from 'react';
import { ArrowLeft, ClipboardList, Activity, FileBarChart, AlertTriangle } from 'lucide-react';
import { cn } from '../../../../../shared/utils/cn';
import { navigate } from '../../../../../router';

import { PmsPlanDetail } from '../../../../../features/pms/components/PmsPlanDetail';
import { CycleTimeline } from '../../../../../features/pms/components/CycleTimeline';
import { PmsCycleDetail } from '../../../../../features/pms/components/PmsCycleDetail';
import { ComplaintsDashboard } from '../../../../../features/pms/components/ComplaintsDashboard';
import { ActivityTracker } from '../../../../../features/pms/components/ActivityTracker';
import { TrendAnalysisPanel } from '../../../../../features/pms/components/TrendAnalysisPanel';
import { ReportGeneration } from '../../../../../features/pms/components/ReportGeneration';
import { CerUpdateDecisionPanel } from '../../../../../features/pms/components/CerUpdateDecisionPanel';
import { GapRegistry } from '../../../../../features/pms/components/GapRegistry';

type TabId = 'plan' | 'monitoring' | 'reports' | 'gaps';

const TABS: { id: TabId; label: string; icon: React.ReactNode; testId: string }[] = [
  { id: 'plan', label: 'Plan & Cycles', icon: <ClipboardList size={16} />, testId: 'tab-plan' },
  { id: 'monitoring', label: 'Monitoring', icon: <Activity size={16} />, testId: 'tab-monitoring' },
  { id: 'reports', label: 'Reports', icon: <FileBarChart size={16} />, testId: 'tab-reports' },
  { id: 'gaps', label: 'Gaps', icon: <AlertTriangle size={16} />, testId: 'tab-gaps' },
];

export default function PmsPlanDetailPage() {
  const [activeTab, setActiveTab] = useState<TabId>('plan');
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);

  // Extract IDs from URL
  const pathParts = window.location.pathname.split('/');
  const projectId = pathParts[pathParts.indexOf('projects') + 1] ?? '';
  const planId = pathParts[pathParts.indexOf('pms') + 1] ?? '';

  return (
    <div className="space-y-6" data-testid="pms-plan-detail-page">
      {/* Back navigation */}
      <button
        type="button"
        onClick={() => navigate(`/projects/${projectId}/pms`)}
        className="inline-flex items-center gap-1.5 text-sm text-[var(--cortex-text-secondary)] hover:text-[var(--cortex-text-primary)]"
        data-testid="back-btn"
      >
        <ArrowLeft size={16} />
        Back to PMS Plans
      </button>

      {/* Top-level tabs */}
      <div className="border-b border-[var(--cortex-border)]">
        <nav className="-mb-px flex gap-4" aria-label="PMS Plan tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 border-b-2 px-1 pb-3 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'border-[var(--cortex-blue-500)] text-[var(--cortex-blue-600)]'
                  : 'border-transparent text-[var(--cortex-text-muted)] hover:border-[var(--cortex-border)] hover:text-[var(--cortex-text-secondary)]',
              )}
              data-testid={tab.testId}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'plan' && (
        <PlanTab
          planId={planId}
          selectedCycleId={selectedCycleId}
          onSelectCycle={setSelectedCycleId}
        />
      )}

      {activeTab === 'monitoring' && <MonitoringTab selectedCycleId={selectedCycleId} />}

      {activeTab === 'reports' && <ReportsTab selectedCycleId={selectedCycleId} />}

      {activeTab === 'gaps' && <GapRegistry pmsPlanId={planId} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab: Plan & Cycles                                                 */
/* ------------------------------------------------------------------ */

function PlanTab({
  planId,
  selectedCycleId,
  onSelectCycle,
}: {
  planId: string;
  selectedCycleId: string | null;
  onSelectCycle: (id: string | null) => void;
}) {
  return (
    <div className="space-y-8">
      <PmsPlanDetail planId={planId} />

      <div className="border-t border-[var(--cortex-border)] pt-6">
        <CycleTimeline pmsPlanId={planId} />
      </div>

      {/* Cycle selection hint */}
      <div className="rounded-lg border border-[var(--cortex-border)] bg-[var(--cortex-bg-secondary)] p-4">
        <label
          htmlFor="cycle-select"
          className="mb-2 block text-sm font-medium text-[var(--cortex-text-secondary)]"
        >
          Select a cycle to view monitoring data and generate reports
        </label>
        <input
          id="cycle-select"
          type="text"
          value={selectedCycleId ?? ''}
          onChange={(e) => onSelectCycle(e.target.value || null)}
          placeholder="Paste or type a cycle ID..."
          className="w-full max-w-md rounded-md border border-[var(--cortex-border)] px-3 py-2 text-sm focus:border-[var(--cortex-primary)] focus:outline-none"
          data-testid="cycle-select-input"
        />
      </div>

      {/* Inline cycle detail when a cycle is selected */}
      {selectedCycleId && (
        <div className="border-t border-[var(--cortex-border)] pt-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[var(--cortex-text-primary)]">
              Cycle Detail
            </h3>
            <button
              type="button"
              onClick={() => onSelectCycle(null)}
              className="text-sm text-[var(--cortex-text-muted)] hover:text-[var(--cortex-text-secondary)]"
              data-testid="clear-cycle-btn"
            >
              Clear selection
            </button>
          </div>
          <PmsCycleDetail cycleId={selectedCycleId} />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab: Monitoring                                                     */
/* ------------------------------------------------------------------ */

function MonitoringTab({ selectedCycleId }: { selectedCycleId: string | null }) {
  if (!selectedCycleId) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--cortex-border)] p-12"
        data-testid="monitoring-no-cycle"
      >
        <Activity size={32} className="mb-2 text-[var(--cortex-text-muted)]" />
        <p className="text-sm font-medium text-[var(--cortex-text-secondary)]">No cycle selected</p>
        <p className="mt-1 text-xs text-[var(--cortex-text-muted)]">
          Select a cycle in the &quot;Plan &amp; Cycles&quot; tab to view monitoring data.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <ComplaintsDashboard cycleId={selectedCycleId} />
      <div className="border-t border-[var(--cortex-border)] pt-6">
        <ActivityTracker cycleId={selectedCycleId} />
      </div>
      <div className="border-t border-[var(--cortex-border)] pt-6">
        <TrendAnalysisPanel cycleId={selectedCycleId} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab: Reports                                                        */
/* ------------------------------------------------------------------ */

function ReportsTab({ selectedCycleId }: { selectedCycleId: string | null }) {
  if (!selectedCycleId) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--cortex-border)] p-12"
        data-testid="reports-no-cycle"
      >
        <FileBarChart size={32} className="mb-2 text-[var(--cortex-text-muted)]" />
        <p className="text-sm font-medium text-[var(--cortex-text-secondary)]">No cycle selected</p>
        <p className="mt-1 text-xs text-[var(--cortex-text-muted)]">
          Select a cycle in the &quot;Plan &amp; Cycles&quot; tab to generate reports.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <ReportGeneration cycleId={selectedCycleId} />
      <div className="border-t border-[var(--cortex-border)] pt-6">
        <CerUpdateDecisionPanel cycleId={selectedCycleId} />
      </div>
    </div>
  );
}
