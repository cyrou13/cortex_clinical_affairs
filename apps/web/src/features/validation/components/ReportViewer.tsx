import { FileText, Download, Eye, Calendar } from 'lucide-react';

interface Report {
  id: string;
  title: string;
  type: string;
  format: string;
  generatedAt: string;
  downloadUrl?: string;
  previewUrl?: string;
}

interface ReportViewerProps {
  report: Report;
  onDownload?: (reportId: string) => void;
}

export function ReportViewer({ report, onDownload }: ReportViewerProps) {
  const handleDownload = () => {
    if (report.downloadUrl) {
      window.open(report.downloadUrl, '_blank');
    }
    onDownload?.(report.id);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-4" data-testid="report-viewer">
      <div className="rounded-lg border border-[var(--cortex-border)] bg-white p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <FileText size={20} className="text-[var(--cortex-primary)]" />
              <h3
                className="text-lg font-semibold text-[var(--cortex-text-primary)]"
                data-testid="report-title"
              >
                {report.title}
              </h3>
            </div>

            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-[var(--cortex-text-muted)]">Type:</span>
                <span
                  className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700"
                  data-testid="report-type"
                >
                  {report.type.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <span className="text-[var(--cortex-text-muted)]">Format:</span>
                <span
                  className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700"
                  data-testid="report-format"
                >
                  {report.format.toUpperCase()}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Calendar size={14} className="text-[var(--cortex-text-muted)]" />
                <span className="text-[var(--cortex-text-muted)]">Generated:</span>
                <span className="text-[var(--cortex-text-primary)]" data-testid="report-date">
                  {formatDate(report.generatedAt)}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-2 rounded bg-[var(--cortex-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--cortex-primary-hover)]"
            data-testid="download-btn"
          >
            <Download size={16} />
            Download {report.format.toUpperCase()}
          </button>
        </div>
      </div>

      {report.previewUrl && (
        <div className="rounded-lg border border-[var(--cortex-border)] bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <Eye size={16} className="text-[var(--cortex-text-muted)]" />
            <h4 className="text-sm font-medium text-[var(--cortex-text-primary)]">Preview</h4>
          </div>
          <div
            className="rounded border border-[var(--cortex-border)] bg-gray-50 p-8 text-center"
            data-testid="preview-panel"
          >
            <FileText size={48} className="mx-auto text-gray-300" />
            <p className="mt-2 text-sm text-[var(--cortex-text-muted)]">
              Preview not available for this format.
              <br />
              Download the file to view the full report.
            </p>
          </div>
        </div>
      )}

      {!report.previewUrl && (
        <div className="rounded-lg border border-dashed border-[var(--cortex-border)] bg-gray-50 p-6 text-center">
          <FileText size={32} className="mx-auto text-gray-300" />
          <p className="mt-2 text-sm text-[var(--cortex-text-muted)]" data-testid="no-preview-msg">
            No preview available. Click "Download" to view the report.
          </p>
        </div>
      )}
    </div>
  );
}
