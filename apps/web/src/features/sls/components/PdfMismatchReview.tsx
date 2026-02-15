import { useQuery, useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { AlertTriangle, Check, X, Upload } from 'lucide-react';

export const GET_PDF_MISMATCHES = gql`
  query GetPdfMismatches($sessionId: String!) {
    pdfMismatches(sessionId: $sessionId) {
      id
      title
      pdfStatus
      pdfVerificationResult
    }
  }
`;

export const RESOLVE_MISMATCH = gql`
  mutation ResolvePdfMismatch($articleId: String!, $resolution: String!) {
    resolvePdfMismatch(articleId: $articleId, resolution: $resolution) {
      articleId
      newStatus
    }
  }
`;

interface MismatchArticle {
  id: string;
  title: string;
  pdfVerificationResult: {
    extractedTitle: string;
    extractedAuthors: string[];
    mismatchReasons: string[];
    confidence: number;
  };
}

interface PdfMismatchReviewProps {
  sessionId: string;
}

export function PdfMismatchReview({ sessionId }: PdfMismatchReviewProps) {
  const { data, loading, error } = useQuery<any>(GET_PDF_MISMATCHES, {
    variables: { sessionId },
  });

  const [resolve, { loading: resolving }] = useMutation(RESOLVE_MISMATCH, {
    refetchQueries: ['GetPdfMismatches'],
  });

  if (loading) {
    return (
      <div
        className="py-8 text-center text-sm text-[var(--cortex-text-muted)]"
        data-testid="mismatch-loading"
      >
        Loading mismatches...
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="py-8 text-center text-sm text-[var(--cortex-error)]"
        data-testid="mismatch-error"
      >
        Failed to load mismatches.
      </div>
    );
  }

  const articles: MismatchArticle[] = data?.pdfMismatches ?? [];

  if (articles.length === 0) {
    return (
      <div
        className="py-8 text-center text-sm text-[var(--cortex-text-muted)]"
        data-testid="mismatch-empty"
      >
        No mismatches to review.
      </div>
    );
  }

  const handleResolve = (articleId: string, resolution: string) => {
    void resolve({ variables: { articleId, resolution } });
  };

  return (
    <div className="space-y-4" data-testid="pdf-mismatch-review">
      <h3 className="text-lg font-semibold text-[var(--cortex-text-primary)]">
        PDF Mismatches ({articles.length})
      </h3>

      <div className="space-y-3">
        {articles.map((article) => (
          <div
            key={article.id}
            className="rounded-lg border border-orange-200 bg-orange-50 p-4"
            data-testid={`mismatch-${article.id}`}
          >
            <div className="mb-2 flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-orange-500" />
              <div className="flex-1">
                <p
                  className="text-sm font-medium text-[var(--cortex-text-primary)]"
                  data-testid="mismatch-title"
                >
                  {article.title}
                </p>
                <div className="mt-1 space-y-1">
                  {article.pdfVerificationResult.mismatchReasons.map((reason, i) => (
                    <p key={i} className="text-xs text-orange-700" data-testid="mismatch-reason">
                      {reason}
                    </p>
                  ))}
                </div>
                <p className="mt-1 text-xs text-[var(--cortex-text-muted)]">
                  Confidence: {article.pdfVerificationResult.confidence}%
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleResolve(article.id, 'ACCEPT_MISMATCH')}
                disabled={resolving}
                className="inline-flex items-center gap-1 rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                data-testid="mismatch-accept-btn"
              >
                <Check size={12} />
                Accept
              </button>
              <button
                type="button"
                onClick={() => handleResolve(article.id, 'REJECT_PDF')}
                disabled={resolving}
                className="inline-flex items-center gap-1 rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                data-testid="mismatch-reject-btn"
              >
                <X size={12} />
                Reject
              </button>
              <button
                type="button"
                onClick={() => handleResolve(article.id, 'UPLOAD_CORRECT_PDF')}
                disabled={resolving}
                className="inline-flex items-center gap-1 rounded border border-[var(--cortex-border)] px-3 py-1.5 text-xs font-medium text-[var(--cortex-text-secondary)] hover:bg-[var(--cortex-bg-hover)] disabled:opacity-50"
                data-testid="mismatch-reupload-btn"
              >
                <Upload size={12} />
                Re-upload
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
