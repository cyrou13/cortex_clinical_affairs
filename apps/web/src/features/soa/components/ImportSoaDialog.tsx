import { useState, useCallback } from 'react';
import { useMutation } from '@apollo/client/react';
import { Upload, FileUp, X, Loader2 } from 'lucide-react';
import { IMPORT_SOA_DOCUMENT } from '../graphql/mutations';
import { navigate } from '../../../router';

interface ImportSoaDialogProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
}

export function ImportSoaDialog({ projectId, open, onClose }: ImportSoaDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [importDocument, { loading }] = useMutation(IMPORT_SOA_DOCUMENT, {
    onCompleted: (data) => {
      const importId = data.importSoaDocument.importId;
      onClose();
      navigate(`/projects/${projectId}/soa/import/${importId}`);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleFileSelect = useCallback((selectedFile: File) => {
    setError(null);
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    if (!ext || !['pdf', 'docx'].includes(ext)) {
      setError('Format non supporté. Utilisez un fichier PDF ou DOCX.');
      return;
    }
    if (selectedFile.size > 50 * 1024 * 1024) {
      setError('Fichier trop volumineux (max 50 Mo).');
      return;
    }
    setFile(selectedFile);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFileSelect(droppedFile);
    },
    [handleFileSelect],
  );

  const handleSubmit = useCallback(async () => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const ext = file.name.split('.').pop()?.toUpperCase() as 'PDF' | 'DOCX';

      await importDocument({
        variables: {
          projectId,
          fileName: file.name,
          fileContent: base64,
          fileFormat: ext,
        },
      });
    };
    reader.readAsDataURL(file);
  }, [file, importDocument, projectId]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      data-testid="import-soa-dialog"
    >
      <div className="w-full max-w-lg rounded-xl bg-[var(--cortex-bg-primary)] p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--cortex-text-primary)]">
            Importer un SOA existant
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 hover:bg-[var(--cortex-bg-tertiary)]"
            data-testid="close-dialog"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mb-4 text-sm text-[var(--cortex-text-secondary)]">
          Importez un document SOA existant (PDF ou DOCX). L&apos;IA extraira automatiquement les
          articles, sections, grille de données, claims et devices.
        </p>

        <div
          className={`mb-4 flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
            dragOver
              ? 'border-[var(--cortex-blue-500)] bg-[var(--cortex-blue-50)]'
              : 'border-[var(--cortex-border)] bg-[var(--cortex-bg-secondary)]'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          data-testid="drop-zone"
        >
          {file ? (
            <div className="flex items-center gap-3">
              <FileUp size={24} className="text-[var(--cortex-blue-500)]" />
              <div>
                <p className="text-sm font-medium text-[var(--cortex-text-primary)]">{file.name}</p>
                <p className="text-xs text-[var(--cortex-text-secondary)]">
                  {(file.size / 1024 / 1024).toFixed(1)} Mo
                </p>
              </div>
              <button
                onClick={() => setFile(null)}
                className="ml-2 rounded p-1 hover:bg-[var(--cortex-bg-tertiary)]"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <>
              <Upload size={32} className="mb-2 text-[var(--cortex-text-tertiary)]" />
              <p className="text-sm text-[var(--cortex-text-secondary)]">
                Glissez un fichier ici ou{' '}
                <label className="cursor-pointer text-[var(--cortex-blue-500)] hover:underline">
                  parcourir
                  <input
                    type="file"
                    accept=".pdf,.docx"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileSelect(f);
                    }}
                    data-testid="file-input"
                  />
                </label>
              </p>
              <p className="mt-1 text-xs text-[var(--cortex-text-tertiary)]">
                PDF ou DOCX, max 50 Mo
              </p>
            </>
          )}
        </div>

        {error && (
          <p className="mb-4 text-sm text-red-500" data-testid="error-message">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm text-[var(--cortex-text-secondary)] hover:bg-[var(--cortex-bg-tertiary)]"
            disabled={loading}
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={!file || loading}
            className="flex items-center gap-2 rounded-md bg-[var(--cortex-blue-500)] px-4 py-2 text-sm text-white hover:bg-[var(--cortex-blue-600)] disabled:opacity-50"
            data-testid="submit-import"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />}
            Lancer l&apos;import
          </button>
        </div>
      </div>
    </div>
  );
}
