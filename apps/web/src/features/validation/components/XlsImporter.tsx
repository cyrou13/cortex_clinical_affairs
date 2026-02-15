import { useState, useCallback } from 'react';
import { useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

export const UPLOAD_XLS = gql`
  mutation UploadXls($input: UploadXlsInput!) {
    uploadXls(input: $input) {
      importId
      version
      rowCount
      validation {
        valid
        errors
        warnings
      }
    }
  }
`;

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface XlsImporterProps {
  studyId: string;
  onUploaded?: (importId: string) => void;
}

export function XlsImporter({ studyId, onUploaded }: XlsImporterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  const [uploadXls, { loading: uploading }] = useMutation<any>(UPLOAD_XLS);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setValidation(null);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setValidation(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    const result = await uploadXls({
      variables: {
        input: {
          studyId,
          fileName: file.name,
          fileSize: file.size,
        },
      },
    });
    if (result.data?.uploadXls) {
      const v = result.data.uploadXls.validation;
      setValidation(v);
      if (v.valid) {
        onUploaded?.(result.data.uploadXls.importId);
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div
      className="space-y-4 rounded-lg border border-[var(--cortex-border)] p-6"
      data-testid="xls-importer"
    >
      <div className="flex items-center gap-2">
        <FileSpreadsheet size={20} className="text-[var(--cortex-primary)]" />
        <h3 className="text-lg font-semibold text-[var(--cortex-text-primary)]">Data Import</h3>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
          dragOver
            ? 'border-[var(--cortex-primary)] bg-blue-50'
            : 'border-[var(--cortex-border)] bg-[#F8F9FA]'
        }`}
        data-testid="drop-zone"
      >
        <Upload size={32} className="mb-2 text-[var(--cortex-text-muted)]" />
        <p className="text-sm text-[var(--cortex-text-primary)]">
          Drag and drop your XLS/XLSX file here
        </p>
        <p className="mb-3 text-xs text-[var(--cortex-text-muted)]">or click to browse</p>
        <input
          type="file"
          accept=".xls,.xlsx,.csv"
          onChange={handleFileSelect}
          className="hidden"
          id="xls-file-input"
          data-testid="file-input"
        />
        <label
          htmlFor="xls-file-input"
          className="cursor-pointer rounded border border-[var(--cortex-border)] px-4 py-2 text-sm text-[var(--cortex-text-primary)] hover:bg-white"
        >
          Browse Files
        </label>
      </div>

      {file && (
        <div
          className="flex items-center justify-between rounded border border-[var(--cortex-border)] p-3"
          data-testid="file-info"
        >
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={16} className="text-emerald-500" />
            <div>
              <div className="text-sm font-medium text-[var(--cortex-text-primary)]">
                {file.name}
              </div>
              <div className="text-xs text-[var(--cortex-text-muted)]">
                {formatFileSize(file.size)} - {file.type || 'application/vnd.ms-excel'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading}
            className="rounded bg-[var(--cortex-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="upload-btn"
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      )}

      {validation && validation.valid && (
        <div
          className="flex items-start gap-2 rounded border border-emerald-200 bg-emerald-50 p-3"
          data-testid="validation-success"
        >
          <CheckCircle size={16} className="mt-0.5 text-emerald-500" />
          <p className="text-sm text-emerald-700">Schema validation passed successfully.</p>
        </div>
      )}

      {validation && validation.errors.length > 0 && (
        <div
          className="space-y-1 rounded border border-red-200 bg-red-50 p-3"
          data-testid="validation-errors"
        >
          <div className="flex items-center gap-2">
            <XCircle size={16} className="text-red-500" />
            <span className="text-sm font-medium text-red-700">Validation Errors</span>
          </div>
          {validation.errors.map((err, idx) => (
            <p key={idx} className="ml-6 text-xs text-red-600">
              {err}
            </p>
          ))}
        </div>
      )}

      {validation && validation.warnings.length > 0 && (
        <div
          className="space-y-1 rounded border border-orange-200 bg-orange-50 p-3"
          data-testid="validation-warnings"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-orange-500" />
            <span className="text-sm font-medium text-orange-700">Warnings</span>
          </div>
          {validation.warnings.map((warn, idx) => (
            <p key={idx} className="ml-6 text-xs text-orange-600">
              {warn}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
