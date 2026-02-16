import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { BookOpen, Search, ClipboardList, Users, Microscope, FileBarChart } from 'lucide-react';
import { PmsStatusBadge } from './StatusBadge';
import { GET_PMCF_ACTIVITIES } from '../graphql/queries';
import { START_PMCF_ACTIVITY, COMPLETE_PMCF_ACTIVITY } from '../graphql/mutations';

interface PmcfActivity {
  id: string;
  pmsCycleId: string;
  activityType: string;
  assigneeId: string;
  title: string;
  description: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  findingsSummary: string | null;
  dataCollected: unknown;
  conclusions: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ActivityTrackerProps {
  cycleId: string;
}

const ACTIVITY_TYPE_CONFIG: Record<string, { label: string; icon: typeof BookOpen }> = {
  LITERATURE_UPDATE: { label: 'Literature Update', icon: BookOpen },
  NAMED_DEVICE_SEARCH: { label: 'Named Device Search', icon: Search },
  USER_SURVEYS: { label: 'User Surveys', icon: Users },
  CLINICAL_INVESTIGATION: { label: 'Clinical Investigation', icon: Microscope },
  COMPLAINT_REVIEW: { label: 'Complaint Review', icon: ClipboardList },
  TREND_ANALYSIS: { label: 'Trend Analysis', icon: FileBarChart },
};

const STATUS_OPTIONS = ['ALL', 'PLANNED', 'IN_PROGRESS', 'COMPLETED'];

export function ActivityTracker({ cycleId }: ActivityTrackerProps) {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [completionForm, setCompletionForm] = useState({ findingsSummary: '', conclusions: '' });

  const queryVars = statusFilter === 'ALL' ? { cycleId } : { cycleId, status: statusFilter };

  const { data, loading, error } = useQuery<{ pmcfActivities: PmcfActivity[] }>(
    GET_PMCF_ACTIVITIES,
    {
      variables: queryVars,
    },
  );

  const [startActivity] = useMutation(START_PMCF_ACTIVITY, {
    refetchQueries: [{ query: GET_PMCF_ACTIVITIES, variables: queryVars }],
  });

  const [completeActivity, { loading: completing }] = useMutation(COMPLETE_PMCF_ACTIVITY, {
    refetchQueries: [{ query: GET_PMCF_ACTIVITIES, variables: queryVars }],
  });

  const handleComplete = async (activityId: string) => {
    await completeActivity({
      variables: { activityId, ...completionForm },
    });
    setCompletingId(null);
    setCompletionForm({ findingsSummary: '', conclusions: '' });
  };

  if (loading) {
    return (
      <div data-testid="activity-loading" className="flex items-center justify-center p-12">
        <p className="text-[var(--cortex-text-muted)]">Loading activities...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-[var(--cortex-error)]">Failed to load activities.</p>
      </div>
    );
  }

  const activities = data?.pmcfActivities ?? [];

  const grouped = activities.reduce<Record<string, PmcfActivity[]>>((acc, activity) => {
    const type = activity.activityType;
    if (!acc[type]) acc[type] = [];
    acc[type].push(activity);
    return acc;
  }, {});

  return (
    <div data-testid="activity-tracker" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--cortex-text-primary)]">PMCF Activities</h2>
        <select
          data-testid="filter-status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-[var(--cortex-text-primary)]"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === 'ALL' ? 'All statuses' : s.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      {activities.length === 0 ? (
        <div data-testid="activity-empty" className="rounded-lg bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-[var(--cortex-text-muted)]">No activities found.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([type, items]) => {
            const config = ACTIVITY_TYPE_CONFIG[type];
            const Icon = config?.icon ?? ClipboardList;
            const label = config?.label ?? type.replace(/_/g, ' ');

            return (
              <div key={type}>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--cortex-text-secondary)]">
                  <Icon size={16} />
                  {label}
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((activity) => (
                    <div
                      key={activity.id}
                      data-testid={`activity-card-${activity.id}`}
                      className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between">
                        <h4 className="text-sm font-medium text-[var(--cortex-text-primary)]">
                          {activity.title}
                        </h4>
                        <PmsStatusBadge status={activity.status} />
                      </div>
                      <p className="mt-1 text-xs text-[var(--cortex-text-muted)]">
                        Assignee: {activity.assigneeId.slice(0, 8)}...
                      </p>

                      <div className="mt-3 flex gap-2">
                        {activity.status === 'PLANNED' && (
                          <button
                            data-testid={`start-activity-${activity.id}`}
                            onClick={() =>
                              startActivity({ variables: { activityId: activity.id } })
                            }
                            className="rounded-md bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100"
                          >
                            Start
                          </button>
                        )}
                        {activity.status === 'IN_PROGRESS' && (
                          <button
                            data-testid={`complete-activity-${activity.id}`}
                            onClick={() => setCompletingId(activity.id)}
                            className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                          >
                            Complete
                          </button>
                        )}
                      </div>

                      {completingId === activity.id && (
                        <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                          <textarea
                            data-testid="findings-input"
                            placeholder="Findings summary"
                            value={completionForm.findingsSummary}
                            onChange={(e) =>
                              setCompletionForm({
                                ...completionForm,
                                findingsSummary: e.target.value,
                              })
                            }
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                            rows={2}
                          />
                          <textarea
                            data-testid="conclusions-input"
                            placeholder="Conclusions"
                            value={completionForm.conclusions}
                            onChange={(e) =>
                              setCompletionForm({ ...completionForm, conclusions: e.target.value })
                            }
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                            rows={2}
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setCompletingId(null)}
                              className="rounded-md px-2.5 py-1 text-xs text-[var(--cortex-text-secondary)] hover:bg-gray-100"
                            >
                              Cancel
                            </button>
                            <button
                              data-testid="submit-completion-btn"
                              onClick={() => handleComplete(activity.id)}
                              disabled={
                                completing ||
                                !completionForm.findingsSummary ||
                                !completionForm.conclusions
                              }
                              className="rounded-md bg-emerald-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
                            >
                              {completing ? 'Saving...' : 'Submit'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
