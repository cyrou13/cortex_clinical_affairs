import { CheckCircle, AlertTriangle, Edit3, Clock } from 'lucide-react';

type SectionStatus = 'DRAFT' | 'REVIEWED' | 'FINALIZED';

interface SectionInfo {
  sectionNumber: number;
  title: string;
  status: SectionStatus;
}

interface CompletionDashboardProps {
  sections: SectionInfo[];
  traceabilityPercentage: number;
  unresolvedClaimsCount: number;
}

const statusIcons: Record<SectionStatus, typeof CheckCircle> = {
  FINALIZED: CheckCircle,
  REVIEWED: Edit3,
  DRAFT: Clock,
};

const statusColors: Record<SectionStatus, string> = {
  FINALIZED: 'bg-emerald-100 text-emerald-700',
  REVIEWED: 'bg-orange-100 text-orange-700',
  DRAFT: 'bg-gray-100 text-gray-500',
};

export function CompletionDashboard({ sections, traceabilityPercentage, unresolvedClaimsCount }: CompletionDashboardProps) {
  const finalizedCount = sections.filter((s) => s.status === 'FINALIZED').length;
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (traceabilityPercentage / 100) * circumference;
  const ringColor = traceabilityPercentage >= 95 ? '#10b981' : traceabilityPercentage >= 80 ? '#f97316' : '#ef4444';

  return (
    <div className="space-y-6" data-testid="completion-dashboard">
      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-[var(--cortex-border)] p-4 text-center" data-testid="sections-finalized-metric">
          <div className="text-3xl font-bold text-[var(--cortex-text-primary)]">{finalizedCount}/{sections.length}</div>
          <div className="text-xs text-[var(--cortex-text-muted)]">Sections Finalized</div>
        </div>

        <div className="flex flex-col items-center rounded-lg border border-[var(--cortex-border)] p-4" data-testid="traceability-ring">
          <svg width="96" height="96" className="-rotate-90">
            <circle cx="48" cy="48" r="40" stroke="#e5e7eb" strokeWidth="8" fill="none" />
            <circle
              cx="48" cy="48" r="40"
              stroke={ringColor}
              strokeWidth="8"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          <span className="mt-1 text-lg font-bold text-[var(--cortex-text-primary)]">{traceabilityPercentage}%</span>
          <span className="text-xs text-[var(--cortex-text-muted)]">Traceability</span>
        </div>

        <div className="rounded-lg border border-[var(--cortex-border)] p-4 text-center" data-testid="unresolved-count">
          <div className={`text-3xl font-bold ${unresolvedClaimsCount > 0 ? 'text-orange-500' : 'text-emerald-500'}`}>
            {unresolvedClaimsCount}
          </div>
          <div className="text-xs text-[var(--cortex-text-muted)]">Unresolved Claims</div>
        </div>
      </div>

      {/* Section Status Grid */}
      <div className="rounded-lg border border-[var(--cortex-border)] p-4" data-testid="section-status-grid">
        <h3 className="mb-3 text-sm font-semibold text-[var(--cortex-text-primary)]">Section Status</h3>
        <div className="grid grid-cols-7 gap-2">
          {sections.map((section) => {
            const Icon = statusIcons[section.status];
            return (
              <div
                key={section.sectionNumber}
                className={`flex flex-col items-center rounded p-2 text-center ${statusColors[section.status]}`}
                title={`${section.sectionNumber}. ${section.title}`}
              >
                <Icon size={14} />
                <span className="mt-0.5 text-xs font-semibold">{section.sectionNumber}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
