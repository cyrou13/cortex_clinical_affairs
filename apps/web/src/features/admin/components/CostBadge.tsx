import { cn } from '../../../shared/utils/cn';

interface CostBadgeProps {
  cost: number;
}

export function CostBadge({ cost }: CostBadgeProps) {
  const formattedCost = cost < 0.001 ? '<$0.001' : `$${cost.toFixed(3)}`;

  const colorClass =
    cost < 0.01
      ? 'bg-green-50 text-green-700'
      : cost < 0.1
        ? 'bg-yellow-50 text-yellow-700'
        : 'bg-red-50 text-red-700';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        colorClass,
      )}
      data-testid="cost-badge"
    >
      {formattedCost}
    </span>
  );
}
