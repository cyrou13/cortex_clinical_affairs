import { Circle, Lock, Check, type LucideIcon } from 'lucide-react';
import { cn } from '../utils/cn';

export type PipelineNodeStatus = 'not_started' | 'blocked' | 'active' | 'completed' | 'locked';

interface PipelineNode {
  id: string;
  label: string;
  status: PipelineNodeStatus;
}

const defaultNodes: PipelineNode[] = [
  { id: 'sls', label: 'SLS', status: 'not_started' },
  { id: 'soa', label: 'SOA', status: 'not_started' },
  { id: 'validation', label: 'Validation', status: 'not_started' },
  { id: 'cer', label: 'CER', status: 'not_started' },
  { id: 'pms', label: 'PMS', status: 'not_started' },
];

const statusConfig: Record<
  PipelineNodeStatus,
  { icon: LucideIcon; nodeClass: string; lineClass: string }
> = {
  not_started: {
    icon: Circle,
    nodeClass: 'border-gray-300 bg-gray-100 text-gray-400',
    lineClass: 'border-dashed border-gray-300',
  },
  blocked: {
    icon: Lock,
    nodeClass: 'border-gray-300 bg-gray-100 text-gray-400',
    lineClass: 'border-dashed border-gray-300',
  },
  active: {
    icon: Circle,
    nodeClass:
      'border-[var(--cortex-blue-500)] bg-[var(--cortex-blue-50)] text-[var(--cortex-blue-500)] animate-pulse',
    lineClass: 'border-dashed border-[var(--cortex-blue-300)]',
  },
  completed: {
    icon: Check,
    nodeClass: 'border-[var(--cortex-success)] bg-emerald-50 text-[var(--cortex-success)]',
    lineClass: 'border-solid border-[var(--cortex-success)]',
  },
  locked: {
    icon: Lock,
    nodeClass: 'border-[var(--cortex-success)] bg-emerald-50 text-[var(--cortex-success)]',
    lineClass: 'border-solid border-[var(--cortex-success)]',
  },
};

interface PipelineProgressBarProps {
  nodes?: PipelineNode[];
  onNodeClick?: (nodeId: string) => void;
}

export function PipelineProgressBar({
  nodes = defaultNodes,
  onNodeClick,
}: PipelineProgressBarProps) {
  return (
    <nav
      role="navigation"
      aria-label="Pipeline progression"
      className="flex items-center gap-0"
    >
      {nodes.map((node, index) => {
        const config = statusConfig[node.status];
        const Icon = config.icon;
        const isActive = node.status === 'active';

        return (
          <div key={node.id} className="flex items-center">
            {index > 0 && (
              <div
                className={cn('h-0 w-8 border-t-2', statusConfig[nodes[index - 1]!.status].lineClass)}
                aria-hidden="true"
              />
            )}
            <button
              type="button"
              onClick={() => onNodeClick?.(node.id)}
              disabled={node.status === 'blocked'}
              aria-current={isActive ? 'step' : undefined}
              aria-label={`${node.label}: ${node.status.replace('_', ' ')}`}
              className={cn(
                'flex flex-col items-center gap-1 rounded-lg p-1.5 transition-colors',
                'focus-visible:outline-2 focus-visible:outline-[var(--cortex-blue-200)]',
                node.status === 'blocked' ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
              )}
              title={
                node.status === 'blocked'
                  ? `Requires ${nodes[index - 1]?.label ?? 'previous step'} to be locked`
                  : undefined
              }
            >
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border-2',
                  config.nodeClass,
                )}
                data-testid={`pipeline-node-${node.id}`}
              >
                <Icon size={14} />
              </div>
              <span className="text-[10px] font-medium text-[var(--cortex-text-secondary)]">
                {node.label}
              </span>
            </button>
          </div>
        );
      })}
    </nav>
  );
}
