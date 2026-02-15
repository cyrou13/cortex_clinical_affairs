import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { Upload, Plus, Trash2, Loader2 } from 'lucide-react';

export const ADD_MANUAL_ARTICLE = gql`
  mutation AddManualArticle($sessionId: String!, $metadata: ManualArticleInput!) {
    addManualArticle(sessionId: $sessionId, metadata: $metadata) {
      articleId
      title
      status
    }
  }
`;

interface Author {
  firstName: string;
  lastName: string;
}

interface ManualArticleAddFormProps {
  sessionId: string;
  onAdded?: (articleId: string) => void;
}

export function ManualArticleAddForm({ sessionId, onAdded }: ManualArticleAddFormProps) {
  const [step, setStep] = useState<'upload' | 'edit' | 'done'>('upload');
  const [extracting, setExtracting] = useState(false);
  const [metadata, setMetadata] = useState({
    title: '',
    authors: [{ firstName: '', lastName: '' }] as Author[],
    year: '' as string | number,
    journal: '',
    doi: '',
    pmid: '',
  });

  const [addArticle, { loading: adding }] = useMutation<any>(ADD_MANUAL_ARTICLE);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') return;

    setExtracting(true);
    // Simulate LLM extraction — in real app this calls the backend
    setTimeout(() => {
      setMetadata({
        title: 'Extracted title from PDF',
        authors: [{ firstName: 'John', lastName: 'Smith' }],
        year: 2024,
        journal: 'Journal of Medical Research',
        doi: '',
        pmid: '',
      });
      setExtracting(false);
      setStep('edit');
    }, 1000);
  };

  const addAuthor = () => {
    setMetadata((prev) => ({
      ...prev,
      authors: [...prev.authors, { firstName: '', lastName: '' }],
    }));
  };

  const removeAuthor = (index: number) => {
    setMetadata((prev) => ({
      ...prev,
      authors: prev.authors.filter((_, i) => i !== index),
    }));
  };

  const updateAuthor = (index: number, field: keyof Author, value: string) => {
    setMetadata((prev) => ({
      ...prev,
      authors: prev.authors.map((a, i) => (i === index ? { ...a, [field]: value } : a)),
    }));
  };

  const handleConfirm = async () => {
    const result = await addArticle({
      variables: {
        sessionId,
        metadata: {
          ...metadata,
          year: Number(metadata.year) || null,
        },
      },
    });
    if (result.data?.addManualArticle) {
      setStep('done');
      onAdded?.(result.data.addManualArticle.articleId);
    }
  };

  if (step === 'done') {
    return (
      <div
        className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-center"
        data-testid="manual-add-done"
      >
        <p className="text-sm font-medium text-emerald-700">Article added successfully!</p>
        <button
          type="button"
          onClick={() => {
            setStep('upload');
            setMetadata({
              title: '',
              authors: [{ firstName: '', lastName: '' }],
              year: '',
              journal: '',
              doi: '',
              pmid: '',
            });
          }}
          className="mt-3 text-sm text-emerald-600 underline"
          data-testid="add-another-btn"
        >
          Add another article
        </button>
      </div>
    );
  }

  if (step === 'upload') {
    return (
      <div className="space-y-4" data-testid="manual-article-form">
        <h3 className="text-lg font-semibold text-[var(--cortex-text-primary)]">
          Add Manual Article
        </h3>
        <div
          className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-[var(--cortex-border)] p-8"
          data-testid="manual-upload-zone"
        >
          {extracting ? (
            <div className="text-center">
              <Loader2 size={32} className="mx-auto mb-2 animate-spin text-blue-500" />
              <p className="text-sm text-[var(--cortex-text-muted)]" data-testid="extracting-label">
                Extracting metadata from PDF...
              </p>
            </div>
          ) : (
            <label className="cursor-pointer text-center">
              <Upload size={32} className="mx-auto mb-2 text-[var(--cortex-text-muted)]" />
              <p className="text-sm font-medium text-[var(--cortex-text-primary)]">
                Upload PDF to extract metadata
              </p>
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileUpload}
                className="hidden"
                data-testid="manual-file-input"
              />
            </label>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="manual-article-form">
      <h3 className="text-lg font-semibold text-[var(--cortex-text-primary)]">
        Edit Extracted Metadata
      </h3>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--cortex-text-muted)]">
            Title
          </label>
          <input
            type="text"
            value={metadata.title}
            onChange={(e) => setMetadata((prev) => ({ ...prev, title: e.target.value }))}
            className="w-full rounded border border-[var(--cortex-border)] px-3 py-2 text-sm"
            data-testid="metadata-title"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--cortex-text-muted)]">
            Authors
          </label>
          {metadata.authors.map((author, i) => (
            <div key={i} className="mb-2 flex gap-2" data-testid={`author-row-${i}`}>
              <input
                type="text"
                placeholder="First name"
                value={author.firstName}
                onChange={(e) => updateAuthor(i, 'firstName', e.target.value)}
                className="flex-1 rounded border border-[var(--cortex-border)] px-3 py-1.5 text-sm"
              />
              <input
                type="text"
                placeholder="Last name"
                value={author.lastName}
                onChange={(e) => updateAuthor(i, 'lastName', e.target.value)}
                className="flex-1 rounded border border-[var(--cortex-border)] px-3 py-1.5 text-sm"
              />
              {metadata.authors.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeAuthor(i)}
                  className="text-red-500"
                  data-testid={`remove-author-${i}`}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addAuthor}
            className="inline-flex items-center gap-1 text-xs text-blue-600"
            data-testid="add-author-btn"
          >
            <Plus size={12} /> Add author
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cortex-text-muted)]">
              Year
            </label>
            <input
              type="text"
              value={metadata.year}
              onChange={(e) => setMetadata((prev) => ({ ...prev, year: e.target.value }))}
              className="w-full rounded border border-[var(--cortex-border)] px-3 py-2 text-sm"
              data-testid="metadata-year"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cortex-text-muted)]">
              Journal
            </label>
            <input
              type="text"
              value={metadata.journal}
              onChange={(e) => setMetadata((prev) => ({ ...prev, journal: e.target.value }))}
              className="w-full rounded border border-[var(--cortex-border)] px-3 py-2 text-sm"
              data-testid="metadata-journal"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cortex-text-muted)]">
              DOI
            </label>
            <input
              type="text"
              value={metadata.doi}
              onChange={(e) => setMetadata((prev) => ({ ...prev, doi: e.target.value }))}
              className="w-full rounded border border-[var(--cortex-border)] px-3 py-2 text-sm"
              data-testid="metadata-doi"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cortex-text-muted)]">
              PMID
            </label>
            <input
              type="text"
              value={metadata.pmid}
              onChange={(e) => setMetadata((prev) => ({ ...prev, pmid: e.target.value }))}
              className="w-full rounded border border-[var(--cortex-border)] px-3 py-2 text-sm"
              data-testid="metadata-pmid"
            />
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleConfirm}
        disabled={adding || !metadata.title.trim()}
        className="inline-flex items-center gap-2 rounded bg-[var(--cortex-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        data-testid="confirm-article-btn"
      >
        {adding ? 'Adding...' : 'Confirm & Add Article'}
      </button>
    </div>
  );
}
