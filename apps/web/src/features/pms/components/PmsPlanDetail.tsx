import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { Settings, Database, Users } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import {
  GET_PMS_PLAN,
  GET_VIGILANCE_DATABASES,
  GET_PMS_RESPONSIBILITIES,
} from '../graphql/queries';
import { APPROVE_PMS_PLAN, ACTIVATE_PMS_PLAN } from '../graphql/mutations';
import { PmsStatusBadge } from './StatusBadge';

interface PmsPlan {
  id: string;
  projectId: string;
  cerVersionId: string | null;
  updateFrequency: string;
  dataCollectionMethods: string[];
  status: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
  approvedById: string | null;
  activatedAt: string | null;
}

interface VigilanceDatabase {
  id: string;
  pmsPlanId: string;
  databaseName: string;
  enabled: boolean;
  searchKeywords: string[];
}

interface PmsResponsibility {
  id: string;
  pmsPlanId: string;
  activityType: string;
  userId: string;
  role: string;
  description: string | null;
}

type TabId = 'config' | 'vigilance' | 'responsibilities';

const TABS: { id: TabId; label: string; icon: React.ReactNode; testId: string }[] = [
  { id: 'config', label: 'Configuration', icon: <Settings size={16} />, testId: 'tab-config' },
  {
    id: 'vigilance',
    label: 'Vigilance DBs',
    icon: <Database size={16} />,
    testId: 'tab-vigilance',
  },
  {
    id: 'responsibilities',
    label: 'Responsibilities',
    icon: <Users size={16} />,
    testId: 'tab-responsibilities',
  },
];

interface PmsPlanDetailProps {
  planId: string;
}

export function PmsPlanDetail({ planId }: PmsPlanDetailProps) {
  const [activeTab, setActiveTab] = useState<TabId>('config');

  const {
    data: planData,
    loading: planLoading,
    error: planError,
  } = useQuery<{ pmsPlan: PmsPlan | null }>(GET_PMS_PLAN, {
    variables: { id: planId },
  });

  const { data: vigilanceData } = useQuery<{
    vigilanceDatabases: VigilanceDatabase[];
  }>(GET_VIGILANCE_DATABASES, {
    variables: { pmsPlanId: planId },
    skip: activeTab !== 'vigilance',
  });

  const { data: responsibilitiesData } = useQuery<{
    pmsResponsibilities: PmsResponsibility[];
  }>(GET_PMS_RESPONSIBILITIES, {
    variables: { pmsPlanId: planId },
    skip: activeTab !== 'responsibilities',
  });

  const [approvePlan, { loading: approving }] = useMutation(APPROVE_PMS_PLAN, {
    variables: { pmsPlanId: planId },
    refetchQueries: [{ query: GET_PMS_PLAN, variables: { id: planId } }],
  });

  const [activatePlan, { loading: activating }] = useMutation(ACTIVATE_PMS_PLAN, {
    variables: { pmsPlanId: planId },
    refetchQueries: [{ query: GET_PMS_PLAN, variables: { id: planId } }],
  });

  // Loading state
  if (planLoading) {
    return (
      <div className="flex items-center justify-center p-12" data-testid="plan-loading">
        <p className="text-[var(--cortex-text-muted)]">Loading plan...</p>
      </div>
    );
  }

  // Error state
  if (planError) {
    return (
      <div className="flex items-center justify-center p-12" data-testid="plan-error">
        <p className="text-[var(--cortex-error)]">Failed to load plan: {planError.message}</p>
      </div>
    );
  }

  // Not found state
  if (!planData?.pmsPlan) {
    return (
      <div className="flex items-center justify-center p-12" data-testid="plan-not-found">
        <p className="text-[var(--cortex-text-secondary)]">Plan not found.</p>
      </div>
    );
  }

  const plan = planData.pmsPlan;
  const vigilanceDbs = vigilanceData?.vigilanceDatabases ?? [];
  const responsibilities = responsibilitiesData?.pmsResponsibilities ?? [];

  return (
    <div className="space-y-6" data-testid="plan-detail">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-[var(--cortex-text-primary)]">PMS Plan</h1>
            <PmsStatusBadge status={plan.status} />
          </div>
          <p className="mt-1 text-sm text-[var(--cortex-text-secondary)]">
            Created {new Date(plan.createdAt).toLocaleDateString()}
            {plan.approvedAt && ` — Approved ${new Date(plan.approvedAt).toLocaleDateString()}`}
            {plan.activatedAt && ` — Activated ${new Date(plan.activatedAt).toLocaleDateString()}`}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {plan.status === 'DRAFT' && (
            <button
              type="button"
              onClick={() => approvePlan()}
              disabled={approving}
              className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
              data-testid="approve-btn"
            >
              {approving ? 'Approving...' : 'Approve'}
            </button>
          )}
          {plan.status === 'APPROVED' && (
            <button
              type="button"
              onClick={() => activatePlan()}
              disabled={activating}
              className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
              data-testid="activate-btn"
            >
              {activating ? 'Activating...' : 'Activate'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--cortex-border)]">
        <nav className="-mb-px flex gap-4" aria-label="Plan tabs">
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
      {activeTab === 'config' && <ConfigurationTab plan={plan} />}

      {activeTab === 'vigilance' && <VigilanceTab databases={vigilanceDbs} />}

      {activeTab === 'responsibilities' && (
        <ResponsibilitiesTab responsibilities={responsibilities} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab: Configuration                                                 */
/* ------------------------------------------------------------------ */

function ConfigurationTab({ plan }: { plan: PmsPlan }) {
  return (
    <div className="rounded-lg bg-white p-6 shadow-sm" data-testid="config-panel">
      <h2 className="mb-4 text-sm font-medium text-[var(--cortex-text-secondary)]">
        Plan Configuration
      </h2>
      <dl className="space-y-4 text-sm">
        <div>
          <dt className="text-[var(--cortex-text-muted)]">Update Frequency</dt>
          <dd className="mt-0.5 text-[var(--cortex-text-primary)]">{plan.updateFrequency}</dd>
        </div>

        <div>
          <dt className="text-[var(--cortex-text-muted)]">Data Collection Methods</dt>
          <dd className="mt-1 flex flex-wrap gap-1.5">
            {plan.dataCollectionMethods.map((method) => (
              <span
                key={method}
                className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-[var(--cortex-text-secondary)]"
              >
                {method}
              </span>
            ))}
          </dd>
        </div>

        <div>
          <dt className="text-[var(--cortex-text-muted)]">Status</dt>
          <dd className="mt-0.5">
            <PmsStatusBadge status={plan.status} />
          </dd>
        </div>

        {plan.cerVersionId && (
          <div>
            <dt className="text-[var(--cortex-text-muted)]">CER Version</dt>
            <dd className="mt-0.5 text-[var(--cortex-text-primary)]">{plan.cerVersionId}</dd>
          </div>
        )}

        <div>
          <dt className="text-[var(--cortex-text-muted)]">Last Updated</dt>
          <dd className="mt-0.5 text-[var(--cortex-text-primary)]">
            {new Date(plan.updatedAt).toLocaleDateString()}
          </dd>
        </div>
      </dl>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab: Vigilance Databases                                           */
/* ------------------------------------------------------------------ */

function VigilanceTab({ databases }: { databases: VigilanceDatabase[] }) {
  if (databases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--cortex-border)] p-12">
        <Database size={32} className="mb-2 text-[var(--cortex-text-muted)]" />
        <p className="text-sm text-[var(--cortex-text-secondary)]">
          No vigilance databases configured.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="vigilance-panel">
      {databases.map((db) => (
        <div
          key={db.id}
          className="rounded-lg border border-[var(--cortex-border)] bg-white p-4 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-[var(--cortex-text-primary)]">
              {db.databaseName}
            </h3>
            <span
              className={cn(
                'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                db.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500',
              )}
            >
              {db.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          {db.searchKeywords.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {db.searchKeywords.map((kw) => (
                <span
                  key={kw}
                  className="inline-flex rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-600"
                >
                  {kw}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab: Responsibilities                                              */
/* ------------------------------------------------------------------ */

function ResponsibilitiesTab({ responsibilities }: { responsibilities: PmsResponsibility[] }) {
  if (responsibilities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--cortex-border)] p-12">
        <Users size={32} className="mb-2 text-[var(--cortex-text-muted)]" />
        <p className="text-sm text-[var(--cortex-text-secondary)]">
          No responsibilities assigned yet.
        </p>
      </div>
    );
  }

  return (
    <div
      className="overflow-hidden rounded-lg border border-[var(--cortex-border)] bg-white shadow-sm"
      data-testid="responsibilities-panel"
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--cortex-border)] bg-gray-50">
            <th className="px-4 py-3 text-left font-medium text-[var(--cortex-text-muted)]">
              Activity
            </th>
            <th className="px-4 py-3 text-left font-medium text-[var(--cortex-text-muted)]">
              Role
            </th>
            <th className="px-4 py-3 text-left font-medium text-[var(--cortex-text-muted)]">
              User
            </th>
            <th className="px-4 py-3 text-left font-medium text-[var(--cortex-text-muted)]">
              Description
            </th>
          </tr>
        </thead>
        <tbody>
          {responsibilities.map((resp) => (
            <tr key={resp.id} className="border-b border-[var(--cortex-border)] last:border-b-0">
              <td className="px-4 py-3 text-[var(--cortex-text-primary)]">{resp.activityType}</td>
              <td className="px-4 py-3 text-[var(--cortex-text-secondary)]">{resp.role}</td>
              <td className="px-4 py-3 font-mono text-xs text-[var(--cortex-text-muted)]">
                {resp.userId}
              </td>
              <td className="px-4 py-3 text-[var(--cortex-text-secondary)]">
                {resp.description ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
