import { useState } from 'react';
import { ExternalLink } from 'lucide-react';

interface VigilanceFinding {
  id: string;
  sourceDatabase: string;
  reportNumber: string;
  eventDate: string;
  deviceName: string;
  eventType: string;
  description: string;
  outcome: string;
  reportUrl: string;
  linkedSection: string | null;
}

interface CerSection {
  sectionNumber: number;
  title: string;
}

interface VigilanceFindingDetailProps {
  finding: VigilanceFinding;
  sections: CerSection[];
  onLinkToSection?: (findingId: string, sectionNumber: number) => void;
  onViewReport?: (url: string) => void;
}

const dbColors: Record<string, { bg: string; text: string }> = {
  MAUDE: { bg: 'bg-blue-100', text: 'text-blue-700' },
  ANSM: { bg: 'bg-purple-100', text: 'text-purple-700' },
  BfArM: { bg: 'bg-green-100', text: 'text-green-700' },
  AFMPS: { bg: 'bg-orange-100', text: 'text-orange-700' },
};

export function VigilanceFindingDetail({ finding, sections, onLinkToSection, onViewReport }: VigilanceFindingDetailProps) {
  const [selectedSection, setSelectedSection] = useState<number | null>(null);
  const colors = dbColors[finding.sourceDatabase] ?? { bg: 'bg-gray-100', text: 'text-gray-700' };

  const handleLink = () => {
    if (selectedSection !== null) {
      onLinkToSection?.(finding.id, selectedSection);
    }
  };

  return (
    <div className="w-[380px] space-y-4 border-l border-[var(--cortex-border)] p-4" data-testid="finding-detail">
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`} data-testid="source-db-badge">
          {finding.sourceDatabase}
        </span>
        <span className="text-xs text-[var(--cortex-text-muted)]">{finding.reportNumber}</span>
      </div>

      <div className="space-y-2">
        <div>
          <label className="text-xs font-medium text-[var(--cortex-text-muted)]">Device Name</label>
          <p className="text-sm text-[var(--cortex-text-primary)]">{finding.deviceName}</p>
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--cortex-text-muted)]">Event Date</label>
          <p className="text-sm text-[var(--cortex-text-primary)]">{finding.eventDate}</p>
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--cortex-text-muted)]">Event Type</label>
          <p className="text-sm text-[var(--cortex-text-primary)]">{finding.eventType}</p>
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--cortex-text-muted)]">Description</label>
          <p className="text-sm text-[var(--cortex-text-primary)]">{finding.description}</p>
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--cortex-text-muted)]">Outcome</label>
          <p className="text-sm text-[var(--cortex-text-primary)]">{finding.outcome}</p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-[var(--cortex-text-muted)]">Link to Section</label>
        <select
          value={selectedSection ?? ''}
          onChange={(e) => setSelectedSection(e.target.value ? Number(e.target.value) : null)}
          className="w-full rounded border border-[var(--cortex-border)] px-3 py-2 text-sm"
          data-testid="link-to-section-dropdown"
        >
          <option value="">Select a section...</option>
          {sections.map((s) => (
            <option key={s.sectionNumber} value={s.sectionNumber}>
              {s.sectionNumber}. {s.title}
            </option>
          ))}
        </select>
        {selectedSection !== null && (
          <button
            type="button"
            onClick={handleLink}
            className="w-full rounded bg-[var(--cortex-primary)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
          >
            Link Finding
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => onViewReport?.(finding.reportUrl)}
        className="inline-flex w-full items-center justify-center gap-1 rounded border border-[var(--cortex-border)] px-3 py-2 text-sm text-[var(--cortex-text-secondary)] hover:bg-gray-50"
        data-testid="view-report-btn"
      >
        <ExternalLink size={14} /> View Source Report
      </button>
    </div>
  );
}
