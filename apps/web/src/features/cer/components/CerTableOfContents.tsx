import { FileText, CheckCircle, Edit3, Clock, Link2 } from 'lucide-react';

type SectionStatus = 'DRAFT' | 'REVIEWED' | 'FINALIZED';

interface CerSection {
  sectionNumber: number;
  title: string;
  status: SectionStatus;
  wordCount: number;
  hasTraceability: boolean;
}

interface CerTableOfContentsProps {
  sections: CerSection[];
  onSectionClick?: (sectionNumber: number) => void;
}

const statusConfig: Record<SectionStatus, { bg: string; text: string; icon: typeof CheckCircle }> = {
  DRAFT: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Clock },
  REVIEWED: { bg: 'bg-orange-100', text: 'text-orange-700', icon: Edit3 },
  FINALIZED: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle },
};

export function CerTableOfContents({ sections, onSectionClick }: CerTableOfContentsProps) {
  const finalizedCount = sections.filter((s) => s.status === 'FINALIZED').length;
  const progress = sections.length > 0 ? (finalizedCount / sections.length) * 100 : 0;

  return (
    <div className="space-y-4" data-testid="cer-toc">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--cortex-text-primary)]">
          <FileText size={14} /> Table of Contents
        </h3>
        <span className="text-xs text-[var(--cortex-text-muted)]">{finalizedCount}/{sections.length} finalized</span>
      </div>

      {/* Completion Progress Bar */}
      <div data-testid="completion-bar">
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="space-y-1">
        {sections.map((section) => {
          const config = statusConfig[section.status];
          const Icon = config.icon;
          return (
            <div
              key={section.sectionNumber}
              className="flex cursor-pointer items-center justify-between rounded-lg border border-[var(--cortex-border)] p-3 hover:bg-gray-50"
              onClick={() => onSectionClick?.(section.sectionNumber)}
              data-testid="toc-section-item"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-[var(--cortex-text-primary)]">
                  {section.sectionNumber}
                </span>
                <div>
                  <div className="text-sm font-medium text-[var(--cortex-text-primary)]">{section.title}</div>
                  <div className="text-xs text-[var(--cortex-text-muted)]">{section.wordCount.toLocaleString()} words</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {section.hasTraceability && (
                  <Link2 size={12} className="text-emerald-500" data-testid="traceability-indicator" />
                )}
                <span
                  className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}
                  data-testid="section-status-badge"
                >
                  <Icon size={10} /> {section.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
