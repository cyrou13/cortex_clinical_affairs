import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { Calendar, Plus, Clock } from 'lucide-react';
import { PmsStatusBadge } from './StatusBadge';

export const GET_PMS_CYCLES = gql`
  query GetPmsCycles($planId: String!) {
    pmsCycles(planId: $planId) {
      id
      name
      startDate
      endDate
      status
      completedAt
    }
  }
`;

export const CREATE_PMS_CYCLE = gql`
  mutation CreatePmsCycle($input: CreatePmsCycleInput!) {
    createPmsCycle(input: $input) {
      id
      name
      status
    }
  }
`;

interface Cycle {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  completedAt?: string;
}

interface CycleManagerProps {
  planId: string;
}

function CycleTimeline({ cycles }: { cycles: Cycle[] }) {
  return (
    <div className="space-y-3" data-testid="cycle-timeline">
      {cycles.map((cycle, index) => (
        <div
          key={cycle.id}
          className="flex items-start gap-4"
          data-testid={`cycle-item-${cycle.id}`}
        >
          <div className="flex flex-col items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full ${
                cycle.status === 'COMPLETED'
                  ? 'bg-emerald-500'
                  : cycle.status === 'ACTIVE'
                    ? 'bg-amber-500'
                    : 'bg-blue-500'
              }`}
            >
              <Calendar size={14} className="text-white" />
            </div>
            {index < cycles.length - 1 && (
              <div className="h-full w-0.5 flex-1 bg-[var(--cortex-border)]" />
            )}
          </div>

          <div className="flex-1 rounded-lg border border-[var(--cortex-border)] p-4">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-[var(--cortex-text-primary)]">{cycle.name}</h4>
                <div className="mt-1 flex items-center gap-2 text-xs text-[var(--cortex-text-muted)]">
                  <Clock size={12} />
                  <span>
                    {new Date(cycle.startDate).toLocaleDateString()} -{' '}
                    {new Date(cycle.endDate).toLocaleDateString()}
                  </span>
                </div>
                {cycle.completedAt && (
                  <div className="mt-1 text-xs text-[var(--cortex-text-muted)]">
                    Completed: {new Date(cycle.completedAt).toLocaleDateString()}
                  </div>
                )}
              </div>
              <PmsStatusBadge status={cycle.status} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CycleManager({ planId }: CycleManagerProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newCycleName, setNewCycleName] = useState('');
  const [newCycleStartDate, setNewCycleStartDate] = useState('');
  const [newCycleEndDate, setNewCycleEndDate] = useState('');

  const { data, loading, error, refetch } = useQuery<any>(GET_PMS_CYCLES, {
    variables: { planId },
  });

  const [createCycle, { loading: creating }] = useMutation<any>(CREATE_PMS_CYCLE);

  const handleCreate = async () => {
    await createCycle({
      variables: {
        input: {
          planId,
          name: newCycleName,
          startDate: newCycleStartDate,
          endDate: newCycleEndDate,
        },
      },
    });
    setShowCreateDialog(false);
    setNewCycleName('');
    setNewCycleStartDate('');
    setNewCycleEndDate('');
    refetch();
  };

  if (loading) {
    return (
      <div
        className="py-8 text-center text-sm text-[var(--cortex-text-muted)]"
        data-testid="cycle-loading"
      >
        Loading PMS cycles...
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="py-8 text-center text-sm text-[var(--cortex-error)]"
        data-testid="cycle-error"
      >
        Failed to load PMS cycles.
      </div>
    );
  }

  const cycles: Cycle[] = data?.pmsCycles ?? [];

  return (
    <div className="space-y-4" data-testid="cycle-manager">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--cortex-text-primary)]">PMS Cycles</h3>
        <button
          type="button"
          onClick={() => setShowCreateDialog(true)}
          className="inline-flex items-center gap-2 rounded bg-[var(--cortex-primary)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--cortex-primary-hover)]"
          data-testid="create-cycle-btn"
        >
          <Plus size={16} />
          New Cycle
        </button>
      </div>

      {cycles.length === 0 ? (
        <div
          className="rounded-lg border border-dashed border-[var(--cortex-border)] p-8 text-center text-sm text-[var(--cortex-text-muted)]"
          data-testid="empty-cycles"
        >
          No PMS cycles yet. Click "New Cycle" to create the first cycle.
        </div>
      ) : (
        <CycleTimeline cycles={cycles} />
      )}

      {showCreateDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          data-testid="create-cycle-dialog"
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowCreateDialog(false)}
            data-testid="dialog-backdrop"
          />
          <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-[var(--cortex-text-primary)]">
              Create New Cycle
            </h3>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="cycle-name"
                  className="mb-1 block text-sm font-medium text-[var(--cortex-text-primary)]"
                >
                  Cycle Name
                </label>
                <input
                  id="cycle-name"
                  type="text"
                  value={newCycleName}
                  onChange={(e) => setNewCycleName(e.target.value)}
                  placeholder="e.g., Q1 2026"
                  className="w-full rounded border border-[var(--cortex-border)] px-3 py-2 text-sm focus:border-[var(--cortex-primary)] focus:outline-none"
                  data-testid="cycle-name-input"
                />
              </div>

              <div>
                <label
                  htmlFor="cycle-start"
                  className="mb-1 block text-sm font-medium text-[var(--cortex-text-primary)]"
                >
                  Start Date
                </label>
                <input
                  id="cycle-start"
                  type="date"
                  value={newCycleStartDate}
                  onChange={(e) => setNewCycleStartDate(e.target.value)}
                  className="w-full rounded border border-[var(--cortex-border)] px-3 py-2 text-sm focus:border-[var(--cortex-primary)] focus:outline-none"
                  data-testid="cycle-start-input"
                />
              </div>

              <div>
                <label
                  htmlFor="cycle-end"
                  className="mb-1 block text-sm font-medium text-[var(--cortex-text-primary)]"
                >
                  End Date
                </label>
                <input
                  id="cycle-end"
                  type="date"
                  value={newCycleEndDate}
                  onChange={(e) => setNewCycleEndDate(e.target.value)}
                  className="w-full rounded border border-[var(--cortex-border)] px-3 py-2 text-sm focus:border-[var(--cortex-primary)] focus:outline-none"
                  data-testid="cycle-end-input"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCreateDialog(false)}
                className="rounded border border-[var(--cortex-border)] px-4 py-2 text-sm text-[var(--cortex-text-secondary)] hover:bg-[var(--cortex-bg-hover)]"
                data-testid="cancel-create-btn"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={!newCycleName || !newCycleStartDate || !newCycleEndDate || creating}
                className="inline-flex items-center gap-2 rounded bg-[var(--cortex-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--cortex-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                data-testid="confirm-create-btn"
              >
                {creating ? 'Creating...' : 'Create Cycle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
