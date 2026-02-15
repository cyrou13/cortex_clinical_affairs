import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { Plus } from 'lucide-react';
import { PmsStatusBadge } from './StatusBadge';
import { GET_PMS_CYCLES } from '../graphql/queries';
import { CREATE_PMS_CYCLE, ACTIVATE_PMS_CYCLE, COMPLETE_PMS_CYCLE } from '../graphql/mutations';

interface PmsCycle {
  id: string;
  pmsPlanId: string;
  cerVersionId: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  completedAt: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

interface CycleTimelineProps {
  pmsPlanId: string;
}

const BORDER_COLOR: Record<string, string> = {
  PLANNED: 'border-l-blue-500',
  ACTIVE: 'border-l-amber-500',
  COMPLETED: 'border-l-emerald-500',
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function CycleTimeline({ pmsPlanId }: CycleTimelineProps) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', startDate: '', endDate: '', cerVersionId: '' });

  const { data, loading, error } = useQuery<{ pmsCycles: PmsCycle[] }>(GET_PMS_CYCLES, {
    variables: { pmsPlanId },
  });

  const [createCycle, { loading: creating }] = useMutation(CREATE_PMS_CYCLE, {
    refetchQueries: [{ query: GET_PMS_CYCLES, variables: { pmsPlanId } }],
  });

  const [activateCycle] = useMutation(ACTIVATE_PMS_CYCLE, {
    refetchQueries: [{ query: GET_PMS_CYCLES, variables: { pmsPlanId } }],
  });

  const [completeCycle] = useMutation(COMPLETE_PMS_CYCLE, {
    refetchQueries: [{ query: GET_PMS_CYCLES, variables: { pmsPlanId } }],
  });

  const handleCreate = async () => {
    await createCycle({
      variables: { pmsPlanId, ...formData },
    });
    setFormData({ name: '', startDate: '', endDate: '', cerVersionId: '' });
    setShowForm(false);
  };

  if (loading) {
    return (
      <div data-testid="cycle-loading" className="flex items-center justify-center p-12">
        <p className="text-[var(--cortex-text-muted)]">Loading cycles...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-[var(--cortex-error)]">Failed to load cycles.</p>
      </div>
    );
  }

  const cycles = data?.pmsCycles ?? [];

  return (
    <div data-testid="cycle-timeline" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--cortex-text-primary)]">PMS Cycles</h2>
        <button
          data-testid="create-cycle-btn"
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1.5 rounded-md bg-[var(--cortex-blue-500)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--cortex-blue-600)]"
        >
          <Plus size={16} />
          New Cycle
        </button>
      </div>

      {showForm && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-2 gap-3">
            <input
              data-testid="cycle-name-input"
              placeholder="Cycle name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              data-testid="cycle-cer-input"
              placeholder="CER Version ID"
              value={formData.cerVersionId}
              onChange={(e) => setFormData({ ...formData, cerVersionId: e.target.value })}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              data-testid="cycle-start-input"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              data-testid="cycle-end-input"
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="rounded-md px-3 py-1.5 text-sm text-[var(--cortex-text-secondary)] hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              data-testid="submit-cycle-btn"
              onClick={handleCreate}
              disabled={creating || !formData.name || !formData.startDate || !formData.endDate || !formData.cerVersionId}
              className="rounded-md bg-[var(--cortex-blue-500)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--cortex-blue-600)] disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {cycles.length === 0 ? (
        <div data-testid="cycle-empty" className="rounded-lg bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-[var(--cortex-text-muted)]">No cycles created yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cycles.map((cycle) => (
            <div
              key={cycle.id}
              data-testid={`cycle-card-${cycle.id}`}
              className={`rounded-lg border-l-4 bg-white p-4 shadow-sm ${BORDER_COLOR[cycle.status] ?? 'border-l-gray-300'}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-[var(--cortex-text-primary)]">{cycle.name}</h3>
                  <p className="mt-0.5 text-xs text-[var(--cortex-text-muted)]">
                    {formatDate(cycle.startDate)} — {formatDate(cycle.endDate)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <PmsStatusBadge status={cycle.status} />
                  {cycle.status === 'PLANNED' && (
                    <button
                      data-testid={`activate-cycle-${cycle.id}`}
                      onClick={() => activateCycle({ variables: { cycleId: cycle.id } })}
                      className="rounded-md bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100"
                    >
                      Activate
                    </button>
                  )}
                  {cycle.status === 'ACTIVE' && (
                    <button
                      data-testid={`complete-cycle-${cycle.id}`}
                      onClick={() => completeCycle({ variables: { cycleId: cycle.id } })}
                      className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                    >
                      Complete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
