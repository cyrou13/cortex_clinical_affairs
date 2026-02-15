import { cn } from '../../../shared/utils/cn';

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: 'bg-blue-100', text: 'text-blue-700' },
  APPROVED: { bg: 'bg-amber-100', text: 'text-amber-700' },
  ACTIVE: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  PLANNED: { bg: 'bg-blue-100', text: 'text-blue-700' },
  IN_PROGRESS: { bg: 'bg-amber-100', text: 'text-amber-700' },
  COMPLETED: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  OPEN: { bg: 'bg-red-100', text: 'text-red-700' },
  INVESTIGATING: { bg: 'bg-amber-100', text: 'text-amber-700' },
  RESOLVED: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  CLOSED: { bg: 'bg-gray-100', text: 'text-gray-700' },
  FINALIZED: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  LOW: { bg: 'bg-blue-100', text: 'text-blue-700' },
  MEDIUM: { bg: 'bg-amber-100', text: 'text-amber-700' },
  HIGH: { bg: 'bg-orange-100', text: 'text-orange-700' },
  CRITICAL: { bg: 'bg-red-100', text: 'text-red-700' },
};

const DEFAULT_STYLE = { bg: 'bg-gray-100', text: 'text-gray-700' };

interface PmsStatusBadgeProps {
  status: string;
  className?: string;
}

export function PmsStatusBadge({ status, className }: PmsStatusBadgeProps) {
  const style = STATUS_STYLES[status] ?? DEFAULT_STYLE;

  return (
    <span
      data-testid="status-badge"
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        style.bg,
        style.text,
        className,
      )}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}
