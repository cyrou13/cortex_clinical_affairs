import { RefreshCw, X, CheckCircle, Loader2, Clock, AlertTriangle } from 'lucide-react';

type SectionStatus = 'pending' | 'generating' | 'done' | 'failed';

interface SectionProgress {
  sectionNumber: number;
  title: string;
  status: SectionStatus;
}

interface AssemblyProgressOverlayProps {
  sections: SectionProgress[];
  onRetry?: (sectionNumber: number) => void;
  onCancel?: () => void;
}

function StatusIcon({ status }: { status: SectionStatus }) {
  switch (status) {
    case 'done':
      return <CheckCircle size={14} className="text-emerald-500" />;
    case 'generating':
      return <Loader2 size={14} className="animate-spin text-blue-500" />;
    case 'failed':
      return <AlertTriangle size={14} className="text-red-500" />;
    default:
      return <Clock size={14} className="text-gray-400" />;
  }
}

export function AssemblyProgressOverlay({ sections, onRetry, onCancel }: AssemblyProgressOverlayProps) {
  const doneCount = sections.filter((s) => s.status === 'done').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" data-testid="assembly-progress">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--cortex-text-primary)]">CER Assembly in Progress</h2>
          <button
            type="button"
            onClick={onCancel}
            className="rounded p-1 text-[var(--cortex-text-muted)] hover:bg-gray-100"
            data-testid="cancel-assembly-btn"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mb-4 text-center text-sm font-medium text-[var(--cortex-text-primary)]" data-testid="section-counter">
          Sections generated: {doneCount}/{sections.length}
        </div>

        <div className="max-h-80 space-y-2 overflow-y-auto">
          {sections.map((section) => (
            <div
              key={section.sectionNumber}
              className={`flex items-center justify-between rounded border p-2 ${
                section.status === 'failed' ? 'border-red-200 bg-red-50' : 'border-[var(--cortex-border)]'
              }`}
              data-testid="section-progress-row"
            >
              <div className="flex items-center gap-2">
                <StatusIcon status={section.status} />
                <span className="text-xs font-medium text-[var(--cortex-text-muted)]">{section.sectionNumber}.</span>
                <span className="text-sm text-[var(--cortex-text-primary)]">{section.title}</span>
              </div>
              {section.status === 'failed' && (
                <button
                  type="button"
                  onClick={() => onRetry?.(section.sectionNumber)}
                  className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--cortex-primary)] hover:bg-blue-50"
                  data-testid="retry-btn"
                >
                  <RefreshCw size={10} /> Retry
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${sections.length > 0 ? (doneCount / sections.length) * 100 : 0}%` }}
          />
        </div>
      </div>
    </div>
  );
}
