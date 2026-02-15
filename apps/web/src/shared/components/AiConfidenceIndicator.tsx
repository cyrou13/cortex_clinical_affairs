import { Check, Edit3, Flag } from 'lucide-react';

interface AiConfidenceIndicatorProps {
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNSCORED';
  confidenceScore?: number;
  validationStatus?: 'PENDING' | 'VALIDATED' | 'CORRECTED' | 'FLAGGED';
}

const LEVEL_CONFIG = {
  HIGH: { color: 'bg-emerald-500', textColor: 'text-white', label: 'H' },
  MEDIUM: { color: 'bg-orange-500', textColor: 'text-white', label: 'M' },
  LOW: { color: 'bg-red-500', textColor: 'text-white', label: 'L' },
  UNSCORED: { color: 'bg-gray-300', textColor: 'text-gray-600', label: '?' },
} as const;

const OVERLAY_ICONS = {
  VALIDATED: { icon: Check, className: 'text-emerald-500' },
  CORRECTED: { icon: Edit3, className: 'text-blue-500' },
  FLAGGED: { icon: Flag, className: 'text-red-500' },
} as const;

export function AiConfidenceIndicator({
  confidenceLevel,
  confidenceScore,
  validationStatus,
}: AiConfidenceIndicatorProps) {
  const config = LEVEL_CONFIG[confidenceLevel];
  const overlay = validationStatus ? OVERLAY_ICONS[validationStatus as keyof typeof OVERLAY_ICONS] : null;
  const OverlayIcon = overlay?.icon;

  return (
    <span
      className="relative inline-flex items-center gap-0.5"
      aria-label={`AI confidence: ${confidenceLevel}${confidenceScore ? ` (${confidenceScore}%)` : ''}`}
      data-testid="ai-confidence-indicator"
    >
      <span
        className={`inline-flex h-4 w-4 items-center justify-center rounded text-[9px] font-bold leading-none ${config.color} ${config.textColor}`}
        data-testid="confidence-level-badge"
      >
        {config.label}
      </span>
      {OverlayIcon && (
        <OverlayIcon size={10} className={overlay.className} data-testid="validation-overlay" />
      )}
    </span>
  );
}
