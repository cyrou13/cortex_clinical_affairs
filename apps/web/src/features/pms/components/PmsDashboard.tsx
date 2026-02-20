import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { ClipboardList, Trash2 } from 'lucide-react';
import { GET_PMS_PLANS } from '../graphql/queries';
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

interface PmsDashboardProps {
  projectId: string;
  onDeletePlan?: (planId: string) => void;
}

export function PmsDashboard({ projectId, onDeletePlan }: PmsDashboardProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const { data, loading, error } = useQuery<{ pmsPlans: PmsPlan[] }>(GET_PMS_PLANS, {
    variables: { projectId },
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12" data-testid="pms-loading">
        <p className="text-[var(--cortex-text-muted)]">Loading PMS plans...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-12" data-testid="pms-error">
        <p className="text-[var(--cortex-error)]">Failed to load PMS plans: {error.message}</p>
      </div>
    );
  }

  const plans = data?.pmsPlans ?? [];

  return (
    <div className="space-y-6" data-testid="pms-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--cortex-blue-50)] text-[var(--cortex-blue-500)]">
            <ClipboardList size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-[var(--cortex-text-primary)]">PMS Plans</h1>
            <p className="text-sm text-[var(--cortex-text-secondary)]">
              Post-Market Surveillance plans for this project
            </p>
          </div>
        </div>
      </div>

      {/* Plans list */}
      {plans.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--cortex-border)] p-12"
          data-testid="pms-empty"
        >
          <ClipboardList size={40} className="mb-3 text-[var(--cortex-text-muted)]" />
          <p className="text-sm font-medium text-[var(--cortex-text-secondary)]">
            No PMS plans yet
          </p>
          <p className="mt-1 text-xs text-[var(--cortex-text-muted)]">
            Create a PMS plan to begin post-market surveillance.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.id}
              className="relative cursor-pointer rounded-lg border border-[var(--cortex-border)] bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              data-testid={`plan-card-${plan.id}`}
            >
              <div className="mb-3 flex items-start justify-between">
                <h3 className="text-sm font-semibold text-[var(--cortex-text-primary)]">
                  PMS Plan
                </h3>
                <div className="flex items-center gap-2">
                  <PmsStatusBadge status={plan.status} />
                  {onDeletePlan && plan.status === 'DRAFT' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteId(plan.id);
                      }}
                      className="rounded p-1 text-[var(--cortex-text-muted)] hover:bg-red-50 hover:text-red-600"
                      data-testid={`delete-plan-${plan.id}`}
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-[var(--cortex-text-muted)]">Update Frequency</dt>
                  <dd className="mt-0.5 text-[var(--cortex-text-primary)]">
                    {plan.updateFrequency}
                  </dd>
                </div>

                <div>
                  <dt className="text-[var(--cortex-text-muted)]">Data Collection Methods</dt>
                  <dd className="mt-0.5 flex flex-wrap gap-1">
                    {plan.dataCollectionMethods.map((method) => (
                      <span
                        key={method}
                        className="inline-flex rounded bg-gray-100 px-1.5 py-0.5 text-xs text-[var(--cortex-text-secondary)]"
                      >
                        {method}
                      </span>
                    ))}
                  </dd>
                </div>

                <div>
                  <dt className="text-[var(--cortex-text-muted)]">Created</dt>
                  <dd className="mt-0.5 text-[var(--cortex-text-primary)]">
                    {new Date(plan.createdAt).toLocaleDateString()}
                  </dd>
                </div>
              </dl>

              {confirmDeleteId === plan.id && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/95 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-3">
                    <span className="text-sm text-[var(--cortex-text-primary)]">
                      Delete this plan?
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeletePlan(plan.id);
                          setConfirmDeleteId(null);
                        }}
                        className="rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                        data-testid={`confirm-delete-plan-${plan.id}`}
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(null);
                        }}
                        className="rounded border border-[var(--cortex-border)] px-3 py-1.5 text-xs text-[var(--cortex-text-secondary)]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
