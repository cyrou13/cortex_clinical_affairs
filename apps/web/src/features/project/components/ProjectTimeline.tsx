import { Check, Circle, Clock } from 'lucide-react';

interface Milestone {
  id: string;
  name: string;
  module: string;
  status: 'pending' | 'active' | 'completed';
  targetDate: string | null;
  completedDate: string | null;
  order: number;
}

interface ProjectTimelineProps {
  milestones: Milestone[];
}

const statusConfig: Record<
  Milestone['status'],
  { icon: typeof Check; colorClass: string; bgClass: string; label: string }
> = {
  completed: {
    icon: Check,
    colorClass: 'text-emerald-600',
    bgClass: 'bg-emerald-100',
    label: 'Completed',
  },
  active: {
    icon: Circle,
    colorClass: 'text-blue-600',
    bgClass: 'bg-blue-100',
    label: 'Active',
  },
  pending: {
    icon: Clock,
    colorClass: 'text-gray-400',
    bgClass: 'bg-gray-100',
    label: 'Pending',
  },
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function ProjectTimeline({ milestones }: ProjectTimelineProps) {
  const sorted = [...milestones].sort((a, b) => a.order - b.order);

  if (sorted.length === 0) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-[var(--cortex-text-primary)]">
          Timeline
        </h3>
        <p className="text-sm text-[var(--cortex-text-muted)]">
          No milestones defined yet.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-[var(--cortex-text-primary)]">
        Timeline
      </h3>
      <div className="relative">
        {sorted.map((milestone, index) => {
          const config = statusConfig[milestone.status];
          const Icon = config.icon;
          const isLast = index === sorted.length - 1;
          const displayDate = milestone.completedDate ?? milestone.targetDate;

          return (
            <div key={milestone.id} className="relative flex gap-3 pb-6 last:pb-0">
              {/* Vertical connector line */}
              {!isLast && (
                <div
                  className={`absolute left-[13px] top-7 h-[calc(100%-12px)] w-px ${
                    milestone.status === 'completed'
                      ? 'bg-emerald-400'
                      : 'border-l border-dashed border-gray-300'
                  }`}
                  style={
                    milestone.status !== 'completed'
                      ? { background: 'none' }
                      : undefined
                  }
                />
              )}

              {/* Status icon */}
              <div
                className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${config.bgClass}`}
                aria-label={config.label}
              >
                <Icon
                  size={14}
                  className={`${config.colorClass} ${
                    milestone.status === 'active' ? 'animate-pulse' : ''
                  }`}
                />
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[var(--cortex-text-primary)]">
                  {milestone.name}
                </p>
                <p className="text-xs text-[var(--cortex-text-muted)]">
                  {milestone.module}
                </p>
                {displayDate && (
                  <p className="mt-0.5 text-xs text-[var(--cortex-text-muted)]">
                    {milestone.completedDate
                      ? `Completed ${formatDate(milestone.completedDate)}`
                      : `Target: ${formatDate(milestone.targetDate!)}`}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
