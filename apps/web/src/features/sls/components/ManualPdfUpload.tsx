import { useState, useCallback } from 'react';
import { Upload, FileText, AlertTriangle, CheckCircle } from 'lucide-react';

interface ManualPdfUploadProps {
  articleId: string;
  onUpload: (file: File) => Promise<{ pdfStatus: string; verification: { verified: boolean; mismatchReasons: string[] } }>;
}

export function ManualPdfUpload({ articleId, onUpload }: ManualPdfUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{
    pdfStatus: string;
    verification: { verified: boolean; mismatchReasons: string[] };
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (file.type !== 'application/pdf') {
        setError('Only PDF files are accepted');
        return;
      }

      setUploading(true);
      setError(null);
      setResult(null);

      try {
        const uploadResult = await onUpload(file);
        setResult(uploadResult);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setUploading(false);
      }
    },
    [onUpload],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  return (
    <div className="space-y-3" data-testid="manual-pdf-upload">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition ${
          dragOver
            ? 'border-blue-400 bg-blue-50'
            : 'border-[var(--cortex-border)] hover:border-blue-300'
        }`}
        data-testid="pdf-drop-zone"
      >
        {uploading ? (
          <div className="text-center">
            <FileText size={32} className="mx-auto mb-2 animate-pulse text-blue-500" />
            <p className="text-sm text-[var(--cortex-text-muted)]" data-testid="upload-progress">
              Uploading and verifying...
            </p>
          </div>
        ) : (
          <label className="cursor-pointer text-center">
            <Upload size={32} className="mx-auto mb-2 text-[var(--cortex-text-muted)]" />
            <p className="text-sm font-medium text-[var(--cortex-text-primary)]">
              Drop PDF here or click to browse
            </p>
            <p className="text-xs text-[var(--cortex-text-muted)]">PDF files only</p>
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleChange}
              className="hidden"
              data-testid="pdf-file-input"
            />
          </label>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700" data-testid="upload-error">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div
          className={`flex items-start gap-2 rounded border p-3 text-sm ${
            result.verification.verified
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-orange-200 bg-orange-50 text-orange-700'
          }`}
          data-testid="upload-result"
        >
          {result.verification.verified ? (
            <CheckCircle size={16} className="mt-0.5 shrink-0" />
          ) : (
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          )}
          <div>
            <p className="font-medium">
              {result.verification.verified ? 'PDF verified successfully' : 'PDF mismatch detected'}
            </p>
            {result.verification.mismatchReasons.map((reason, i) => (
              <p key={i} className="text-xs">{reason}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
