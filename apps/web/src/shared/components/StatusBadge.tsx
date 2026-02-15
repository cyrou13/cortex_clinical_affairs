import {
  Circle,
  Search,
  HelpCircle,
  Check,
  X,
  Lock,
  CheckCheck,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../utils/cn';

export type StatusVariant =
  | 'draft'
  | 'screening'
  | 'uncertain'
  | 'include'
  | 'exclude'
  | 'locked'
  | 'completed';

const variantConfig: Record<
  StatusVariant,
  { icon: LucideIcon; label: string; className: string }
> = {
  draft: {
    icon: Circle,
    label: 'Draft',
    className: 'bg-[var(--cortex-blue-100)] text-[var(--cortex-blue-700)]',
  },
  screening: {
    icon: Search,
    label: 'Screening',
    className: 'bg-blue-100 text-blue-700',
  },
  uncertain: {
    icon: HelpCircle,
    label: 'Uncertain',
    className: 'bg-amber-100 text-amber-700',
  },
  include: {
    icon: Check,
    label: 'Include',
    className: 'bg-emerald-100 text-emerald-700',
  },
  exclude: {
    icon: X,
    label: 'Exclude',
    className: 'bg-red-100 text-red-700',
  },
  locked: {
    icon: Lock,
    label: 'Locked',
    className: 'bg-[var(--cortex-blue-800)] text-white',
  },
  completed: {
    icon: CheckCheck,
    label: 'Completed',
    className: 'bg-emerald-100 text-emerald-700',
  },
};

interface StatusBadgeProps {
  variant: StatusVariant;
  label?: string;
  className?: string;
}

export function StatusBadge({ variant, label, className }: StatusBadgeProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;
  const displayLabel = label ?? config.label;

  return (
    <span
      role="status"
      data-variant={variant}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        config.className,
        className,
      )}
    >
      <Icon size={12} aria-hidden="true" />
      {displayLabel}
    </span>
  );
}
