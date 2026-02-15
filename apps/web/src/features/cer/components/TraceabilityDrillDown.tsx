import { useState } from 'react';
import { Download, ChevronDown, ChevronRight } from 'lucide-react';

interface TraceabilityLevel {
  level: number;
  icon: string;
  title: string;
  content: string;
  moduleType: string;
  auditTrail: string[];
  navigateTo?: string;
}

interface TraceabilityDrillDownProps {
  claimText: string;
  levels: TraceabilityLevel[];
  onExportProof?: () => void;
  onNavigate?: (path: string) => void;
}

export function TraceabilityDrillDown({ claimText, levels, onExportProof, onNavigate }: TraceabilityDrillDownProps) {
  const [expandedAudit, setExpandedAudit] = useState<number | null>(null);

  return (
    <div className="w-[380px] space-y-4 border-l border-[var(--cortex-border)] p-4" data-testid="traceability-drilldown">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--cortex-text-primary)]">Traceability Chain</h3>
        <button
          type="button"
          onClick={onExportProof}
          className="inline-flex items-center gap-1 rounded bg-[var(--cortex-primary)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
          data-testid="export-proof-btn"
        >
          <Download size={12} /> Export Proof Package
        </button>
      </div>

      <p className="rounded border border-[var(--cortex-border)] bg-gray-50 p-2 text-sm italic text-[var(--cortex-text-primary)]">
        &ldquo;{claimText}&rdquo;
      </p>

      <div className="relative space-y-3 pl-4">
        {levels.map((level, idx) => (
          <div key={level.level} className="relative">
            {idx < levels.length - 1 && (
              <div className="absolute left-[-12px] top-8 h-full border-l-2 border-dotted border-gray-300" />
            )}
            <div
              className="cursor-pointer rounded-lg border border-[var(--cortex-border)] p-3 hover:bg-gray-50"
              data-testid={`level-${level.level}-card`}
              onClick={() => level.navigateTo && onNavigate?.(level.navigateTo)}
            >
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--cortex-primary)] text-xs text-white">
                  {level.icon}
                </span>
                <span className="text-xs font-medium text-[var(--cortex-text-primary)]">{level.title}</span>
                <span className="ml-auto rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">{level.moduleType}</span>
              </div>
              <p className="mt-1 text-xs text-[var(--cortex-text-muted)]">{level.content}</p>

              {level.auditTrail.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setExpandedAudit(expandedAudit === level.level ? null : level.level); }}
                  className="mt-2 flex items-center gap-1 text-xs text-[var(--cortex-primary)]"
                  data-testid="audit-trail"
                >
                  {expandedAudit === level.level ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                  Audit Trail ({level.auditTrail.length})
                </button>
              )}

              {expandedAudit === level.level && (
                <div className="mt-1 space-y-0.5 pl-4">
                  {level.auditTrail.map((entry, i) => (
                    <p key={i} className="text-xs text-[var(--cortex-text-muted)]">{entry}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
