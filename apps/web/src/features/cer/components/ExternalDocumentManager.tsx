import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { FileText, Upload, Clock, GitCompare } from 'lucide-react';

export const GET_EXTERNAL_DOCUMENT = gql`
  query GetExternalDocument($docId: String!) {
    externalDocument(id: $docId) {
      id
      title
      type
      currentVersion
      versions {
        version
        date
        summary
        updatedBy
      }
    }
  }
`;

export const UPDATE_DOCUMENT_VERSION = gql`
  mutation UpdateDocumentVersion($input: UpdateDocumentVersionInput!) {
    updateDocumentVersion(input: $input) {
      documentId
      version
    }
  }
`;

interface DocVersion {
  version: string;
  date: string;
  summary: string;
  updatedBy: string;
}

interface ExternalDocumentManagerProps {
  docId: string;
  onVersionUpdated?: () => void;
}

export function ExternalDocumentManager({ docId, onVersionUpdated }: ExternalDocumentManagerProps) {
  const [compareVersions, setCompareVersions] = useState<[string, string] | null>(null);
  const { data, loading, error } = useQuery<any>(GET_EXTERNAL_DOCUMENT, { variables: { docId } });
  const [updateVersion, { loading: updating }] = useMutation(UPDATE_DOCUMENT_VERSION);

  if (loading) {
    return (
      <div
        className="py-4 text-center text-sm text-[var(--cortex-text-muted)]"
        data-testid="doc-loading"
      >
        Loading document...
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-4 text-center text-sm text-[var(--cortex-error)]" data-testid="doc-error">
        Failed to load document.
      </div>
    );
  }

  const doc = data?.externalDocument;
  if (!doc) return null;

  const versions: DocVersion[] = doc.versions ?? [];

  const handleUpdateVersion = async () => {
    await updateVersion({ variables: { input: { documentId: docId } } });
    onVersionUpdated?.();
  };

  const handleCompare = (v1: string, v2: string) => {
    setCompareVersions([v1, v2]);
  };

  return (
    <div className="space-y-4" data-testid="external-doc-manager">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--cortex-text-primary)]">
            <FileText size={14} /> {doc.title}
          </h3>
          <span className="text-xs text-[var(--cortex-text-muted)]">
            Current: v{doc.currentVersion}
          </span>
        </div>
        <button
          type="button"
          onClick={handleUpdateVersion}
          disabled={updating}
          className="inline-flex items-center gap-1 rounded bg-[var(--cortex-primary)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
          data-testid="update-version-btn"
        >
          <Upload size={12} /> {updating ? 'Updating...' : 'Update Version'}
        </button>
      </div>

      {/* Version History Timeline */}
      <div className="space-y-3" data-testid="version-history">
        {versions.map((v, idx) => (
          <div key={v.version} className="relative flex gap-3 pl-6">
            <div className="absolute left-2 top-1 h-3 w-3 rounded-full bg-[var(--cortex-primary)]" />
            {idx < versions.length - 1 && (
              <div className="absolute left-[11px] top-4 h-full w-px bg-gray-300" />
            )}
            <div className="flex-1 rounded border border-[var(--cortex-border)] p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--cortex-text-primary)]">
                  v{v.version}
                </span>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-xs text-[var(--cortex-text-muted)]">
                    <Clock size={10} /> {v.date}
                  </span>
                  {idx < versions.length - 1 && (
                    <button
                      type="button"
                      onClick={() => handleCompare(v.version, versions[idx + 1]!.version)}
                      className="inline-flex items-center gap-1 text-xs text-[var(--cortex-primary)] hover:underline"
                      data-testid="version-compare"
                    >
                      <GitCompare size={10} /> Compare
                    </button>
                  )}
                </div>
              </div>
              <p className="mt-1 text-xs text-[var(--cortex-text-muted)]">{v.summary}</p>
              <p className="mt-1 text-xs text-[var(--cortex-text-muted)]">by {v.updatedBy}</p>
            </div>
          </div>
        ))}
      </div>

      {compareVersions && (
        <div
          className="rounded border border-blue-200 bg-blue-50 p-3 text-sm"
          data-testid="comparison-panel"
        >
          Comparing v{compareVersions[0]} with v{compareVersions[1]}
        </div>
      )}
    </div>
  );
}
