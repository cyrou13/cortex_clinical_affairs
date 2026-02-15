import { AlertTriangle } from 'lucide-react';

interface VersionMismatchAlertProps {
  documentName: string;
  oldVersion: string;
  newVersion: string;
  impactedSectionsCount: number;
  onReviewImpacted?: () => void;
}

export function VersionMismatchAlert({
  documentName,
  oldVersion,
  newVersion,
  impactedSectionsCount,
  onReviewImpacted,
}: VersionMismatchAlertProps) {
  return (
    <div
      className="flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50 px-4 py-3"
      data-testid="version-mismatch-alert"
    >
      <div className="flex items-center gap-3">
        <AlertTriangle size={20} className="shrink-0 text-orange-500" />
        <div>
          <p className="text-sm font-medium text-orange-800" data-testid="mismatch-doc-name">
            {documentName}
          </p>
          <p className="text-xs text-orange-600">
            Version mismatch: v{oldVersion} &rarr; v{newVersion}
          </p>
          <p className="text-xs text-orange-600" data-testid="impacted-count">
            {impactedSectionsCount} section{impactedSectionsCount !== 1 ? 's' : ''} impacted
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onReviewImpacted}
        className="rounded bg-orange-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-600"
        data-testid="review-btn"
      >
        Review impacted sections
      </button>
    </div>
  );
}
