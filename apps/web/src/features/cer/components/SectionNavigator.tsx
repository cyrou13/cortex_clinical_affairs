import { CheckCircle, Edit3, Clock, AlertTriangle } from 'lucide-react';

type SectionStatus = 'DRAFT' | 'REVIEWED' | 'FINALIZED';

interface NavSection {
  sectionNumber: number;
  title: string;
  status: SectionStatus;
  hasMismatch: boolean;
}

interface SectionNavigatorProps {
  sections: NavSection[];
  activeSection: number | null;
  onNavigate?: (sectionNumber: number) => void;
}

function StatusIcon({ status }: { status: SectionStatus }) {
  switch (status) {
    case 'FINALIZED':
      return <CheckCircle size={12} className="text-emerald-500" data-testid="status-icon" />;
    case 'REVIEWED':
      return <Edit3 size={12} className="text-orange-500" data-testid="status-icon" />;
    default:
      return <Clock size={12} className="text-gray-400" data-testid="status-icon" />;
  }
}

export function SectionNavigator({ sections, activeSection, onNavigate }: SectionNavigatorProps) {
  return (
    <nav className="w-64 space-y-0.5" data-testid="section-navigator">
      {sections.map((section) => {
        const isActive = section.sectionNumber === activeSection;
        return (
          <button
            key={section.sectionNumber}
            type="button"
            onClick={() => onNavigate?.(section.sectionNumber)}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
              isActive
                ? 'bg-[var(--cortex-primary)] text-white'
                : 'text-[var(--cortex-text-primary)] hover:bg-gray-100'
            }`}
            data-testid="nav-section-item"
            {...(isActive ? { 'data-active': 'true' } : {})}
          >
            <StatusIcon status={section.status} />
            <span className="flex-1 truncate" data-testid={isActive ? 'active-section' : undefined}>
              {section.sectionNumber}. {section.title}
            </span>
            {section.hasMismatch && (
              <AlertTriangle size={12} className={isActive ? 'text-orange-200' : 'text-orange-500'} data-testid="warning-indicator" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
