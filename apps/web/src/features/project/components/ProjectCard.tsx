import { Circle, Check, Lock } from 'lucide-react';

interface PipelineModule {
  id: string;
  label: string;
  status: string;
}

const defaultPipeline: PipelineModule[] = [
  { id: 'sls', label: 'SLS', status: 'NOT_STARTED' },
  { id: 'soa', label: 'SOA', status: 'BLOCKED' },
  { id: 'validation', label: 'Val', status: 'BLOCKED' },
  { id: 'cer', label: 'CER', status: 'BLOCKED' },
  { id: 'pms', label: 'PMS', status: 'BLOCKED' },
];

const statusColors: Record<string, string> = {
  NOT_STARTED: 'bg-gray-300',
  BLOCKED: 'bg-gray-200',
  ACTIVE: 'bg-blue-500',
  COMPLETED: 'bg-emerald-500',
  LOCKED: 'bg-emerald-700',
};

const contextBadge: Record<string, { label: string; className: string }> = {
  CE_MDR: { label: 'CE-MDR', className: 'bg-blue-100 text-blue-700' },
  FDA_510K: { label: 'FDA 510(k)', className: 'bg-purple-100 text-purple-700' },
  BOTH: { label: 'CE-MDR + FDA', className: 'bg-amber-100 text-amber-700' },
};

export interface ProjectCardProps {
  id: string;
  name: string;
  deviceName: string;
  deviceClass: string;
  regulatoryContext: string;
  createdAt: string;
  pipeline?: PipelineModule[];
  onClick?: (id: string) => void;
}

export function ProjectCard({
  id,
  name,
  deviceName,
  deviceClass,
  regulatoryContext,
  createdAt,
  pipeline = defaultPipeline,
  onClick,
}: ProjectCardProps) {
  const badge = contextBadge[regulatoryContext] ?? {
    label: regulatoryContext,
    className: 'bg-gray-100 text-gray-700',
  };

  return (
    <article
      role="article"
      className="cursor-pointer rounded-lg border border-[var(--cortex-border)] bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
      onClick={() => onClick?.(id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(id);
        }
      }}
      tabIndex={0}
      aria-label={`Project: ${name}`}
    >
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-[var(--cortex-text-primary)]">{name}</h3>
          <p className="text-sm text-[var(--cortex-text-secondary)]">{deviceName}</p>
        </div>
        <span className="text-xs text-[var(--cortex-text-muted)]">
          Class {deviceClass}
        </span>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}
        >
          {badge.label}
        </span>
        <span className="text-xs text-[var(--cortex-text-muted)]">
          {new Date(createdAt).toLocaleDateString()}
        </span>
      </div>

      {/* Mini pipeline dots */}
      <div className="flex items-center gap-1.5" aria-label="Pipeline status">
        {pipeline.map((mod) => (
          <div
            key={mod.id}
            className="flex flex-col items-center gap-0.5"
            title={`${mod.label}: ${mod.status.replace('_', ' ').toLowerCase()}`}
          >
            <div
              className={`h-2.5 w-2.5 rounded-full ${statusColors[mod.status] ?? 'bg-gray-300'}`}
              data-testid={`pipeline-dot-${mod.id}`}
            />
            <span className="text-[8px] text-[var(--cortex-text-muted)]">{mod.label}</span>
          </div>
        ))}
      </div>
    </article>
  );
}
