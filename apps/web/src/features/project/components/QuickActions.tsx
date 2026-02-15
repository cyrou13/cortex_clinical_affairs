import { Search, BarChart3, FileText, ArrowRight } from 'lucide-react';

interface QuickActionsProps {
  pipelineStatus: {
    sls: string;
    soa: string;
    validation: string;
    cer: string;
    pms: string;
  };
  projectId: string;
}

interface ActionConfig {
  label: string;
  href: string;
  icon: typeof Search;
  description: string;
}

function resolveAction(
  pipelineStatus: QuickActionsProps['pipelineStatus'],
  projectId: string,
): ActionConfig {
  if (pipelineStatus.sls === 'NOT_STARTED') {
    return {
      label: 'Start Literature Search',
      href: `/projects/${projectId}/sls`,
      icon: Search,
      description: 'Begin the systematic literature search for this project.',
    };
  }

  if (pipelineStatus.sls === 'LOCKED' && pipelineStatus.soa === 'BLOCKED') {
    return {
      label: 'Begin State of the Art',
      href: `/projects/${projectId}/soa`,
      icon: BarChart3,
      description: 'Literature search is complete. Start the State of the Art analysis.',
    };
  }

  const allLocked = Object.values(pipelineStatus).every(
    (status) => status === 'LOCKED',
  );
  if (allLocked) {
    return {
      label: 'Export CER',
      href: `/projects/${projectId}/cer/export`,
      icon: FileText,
      description: 'All pipeline stages are complete. Export the Clinical Evaluation Report.',
    };
  }

  return {
    label: 'View Pipeline',
    href: `/projects/${projectId}/pipeline`,
    icon: ArrowRight,
    description: 'View the current pipeline status and progress.',
  };
}

export function QuickActions({ pipelineStatus, projectId }: QuickActionsProps) {
  const action = resolveAction(pipelineStatus, projectId);
  const Icon = action.icon;

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-[var(--cortex-text-primary)]">
        Quick Actions
      </h3>
      <p className="mb-4 text-sm text-[var(--cortex-text-muted)]">
        {action.description}
      </p>
      <a
        href={action.href}
        className="inline-flex items-center gap-2 rounded-md bg-[var(--cortex-blue-600)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--cortex-blue-700)]"
      >
        <Icon size={16} />
        {action.label}
      </a>
    </div>
  );
}
