import { AlertTriangle, Check, RefreshCw } from 'lucide-react';

interface ImpactedSection {
  id: string;
  sectionNumber: number;
  title: string;
  referencedDoc: string;
  mismatchDetails: string;
  acknowledged: boolean;
}

interface ImpactedSectionsListProps {
  sections: ImpactedSection[];
  onAcknowledge?: (sectionId: string) => void;
  onUpdateReference?: (sectionId: string) => void;
}

export function ImpactedSectionsList({ sections, onAcknowledge, onUpdateReference }: ImpactedSectionsListProps) {
  return (
    <div className="space-y-3" data-testid="impacted-sections-list">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--cortex-text-primary)]">
        <AlertTriangle size={14} className="text-orange-500" /> Impacted Sections ({sections.length})
      </h3>

      {sections.length === 0 ? (
        <p className="py-4 text-center text-sm text-[var(--cortex-text-muted)]" data-testid="no-impacted">No impacted sections.</p>
      ) : (
        <div className="space-y-2">
          {sections.map((section) => (
            <div
              key={section.id}
              className={`rounded-lg border p-3 ${
                section.acknowledged ? 'border-gray-200 bg-gray-50' : 'border-orange-200 bg-orange-50'
              }`}
              data-testid="section-item"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-gray-200 px-1.5 py-0.5 text-xs font-mono font-medium">{section.sectionNumber}</span>
                    <span className="text-sm font-medium text-[var(--cortex-text-primary)]">{section.title}</span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--cortex-text-muted)]">
                    Referenced: {section.referencedDoc}
                  </p>
                  <p className="mt-0.5 text-xs text-orange-600">{section.mismatchDetails}</p>
                </div>
                <div className="flex items-center gap-1">
                  {!section.acknowledged && (
                    <button
                      type="button"
                      onClick={() => onAcknowledge?.(section.id)}
                      className="inline-flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-xs text-[var(--cortex-text-secondary)] hover:bg-gray-100"
                      data-testid="acknowledge-btn"
                    >
                      <Check size={10} /> Acknowledge
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onUpdateReference?.(section.id)}
                    className="inline-flex items-center gap-1 rounded bg-[var(--cortex-primary)] px-2 py-1 text-xs text-white hover:opacity-90"
                    data-testid="update-ref-btn"
                  >
                    <RefreshCw size={10} /> Update Reference
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
