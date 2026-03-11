import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import {
  X,
  ExternalLink,
  Calendar,
  BookOpen,
  Database,
  Users,
  Brain,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  SkipForward,
  FileText,
  Download,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import { GET_ARTICLE, GET_ARTICLES } from '../graphql/queries';
import { SCREEN_ARTICLE, ENRICH_ARTICLE_ABSTRACT } from '../graphql/mutations';

type ArticleStatus = 'PENDING' | 'SCORED' | 'INCLUDED' | 'EXCLUDED' | 'FULL_TEXT_REVIEW';

interface ArticleDetail {
  id: string;
  title: string;
  abstract: string | null;
  authors: string[];
  doi: string | null;
  pmid: string | null;
  publicationDate: string | null;
  journal: string | null;
  sourceDatabase: string;
  pdfStatus: string | null;
  status: ArticleStatus;
  relevanceScore: number | null;
  aiReasoning: string | null;
  aiCategory: string | null;
  aiExclusionCode: string | null;
  scoredAt: string | null;
  createdAt: string;
}

interface ArticleResponse {
  article: ArticleDetail;
}

export interface ArticleDetailPanelProps {
  articleId: string | null;
  onClose: () => void;
  articleIds?: string[];
  onNavigate?: (articleId: string) => void;
  sessionId?: string;
}

const statusBadgeStyles: Record<ArticleStatus, string> = {
  INCLUDED: 'bg-emerald-100 text-emerald-700',
  EXCLUDED: 'bg-red-100 text-red-700',
  SCORED: 'bg-orange-100 text-orange-700',
  PENDING: 'bg-gray-100 text-gray-600',
  FULL_TEXT_REVIEW: 'bg-blue-100 text-blue-700',
};

const statusLabels: Record<ArticleStatus, string> = {
  INCLUDED: 'Included',
  EXCLUDED: 'Excluded',
  SCORED: 'Scored',
  PENDING: 'Pending',
  FULL_TEXT_REVIEW: 'Full Text Review',
};

const databaseLabels: Record<string, string> = {
  PUBMED: 'PubMed',
  PMC: 'PubMed Central',
  GOOGLE_SCHOLAR: 'Google Scholar',
  CLINICAL_TRIALS: 'ClinicalTrials.gov',
};

const toPercent = (score: number): number =>
  score <= 1 ? Math.round(score * 100) : Math.round(score);

const scoreBadgeStyles = (score: number): string => {
  const pct = toPercent(score);
  if (pct >= 75) return 'bg-emerald-100 text-emerald-700';
  if (pct >= 40) return 'bg-orange-100 text-orange-700';
  return 'bg-red-100 text-red-700';
};

const categoryLabels: Record<string, string> = {
  likely_relevant: 'Likely Relevant',
  uncertain: 'Uncertain',
  likely_irrelevant: 'Likely Irrelevant',
};

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function ArticleDetailPanel({
  articleId,
  onClose,
  articleIds = [],
  onNavigate,
  sessionId,
}: ArticleDetailPanelProps) {
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const { data, loading, error } = useQuery<ArticleResponse>(GET_ARTICLE, {
    variables: { id: articleId },
    skip: !articleId,
  });

  const [loadingPdf] = useState(false);
  const handleViewPdf = (artId: string) => {
    setPdfUrl(`/api/articles/${artId}/pdf`);
    setShowPdfViewer(true);
  };

  const [screenArticle, { loading: screening }] = useMutation(SCREEN_ARTICLE);
  const [enrichAbstract, { loading: enriching }] = useMutation(ENRICH_ARTICLE_ABSTRACT);

  const currentIndex = articleId ? articleIds.indexOf(articleId) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < articleIds.length - 1;

  const goPrev = useCallback(() => {
    if (hasPrev && onNavigate) onNavigate(articleIds[currentIndex - 1]);
  }, [hasPrev, onNavigate, articleIds, currentIndex]);

  const goNext = useCallback(() => {
    if (hasNext && onNavigate) onNavigate(articleIds[currentIndex + 1]);
  }, [hasNext, onNavigate, articleIds, currentIndex]);

  // Reset PDF viewer when article changes
  useEffect(() => {
    setShowPdfViewer(false);
    setPdfUrl(null);
  }, [articleId]);

  // Keyboard navigation
  useEffect(() => {
    if (!articleId) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [articleId, onClose, goPrev, goNext]);

  if (!articleId) return null;

  const article = data?.article;

  const refetchQueries = sessionId
    ? [{ query: GET_ARTICLES, variables: { sessionId, filter: {}, offset: 0, limit: 100 } }]
    : [];

  const handleDecision = (decision: string) => {
    if (!articleId || screening) return;
    void screenArticle({
      variables: {
        articleId,
        decision,
        reason:
          decision === 'INCLUDED' ? 'Relevant' : decision === 'EXCLUDED' ? 'Excluded' : 'Skipped',
      },
      refetchQueries,
    }).then(() => {
      if (hasNext && onNavigate) {
        onNavigate(articleIds[currentIndex + 1]);
      }
    });
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/40"
        onClick={onClose}
        data-testid="article-modal-overlay"
      />

      {/* Modal */}
      <div
        className="fixed inset-4 z-50 mx-auto my-auto flex max-h-[90vh] max-w-3xl flex-col overflow-hidden rounded-xl border border-[var(--cortex-border)] bg-white shadow-2xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:-translate-x-1/2 sm:-translate-y-1/2"
        data-testid="article-detail-panel"
        role="dialog"
        aria-label="Article Details"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--cortex-border)] px-5 py-3">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-[var(--cortex-text-primary)]">
              Article Details
            </h3>
            {articleIds.length > 1 && currentIndex >= 0 && (
              <span className="text-xs text-[var(--cortex-text-muted)]">
                {currentIndex + 1} / {articleIds.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {articleIds.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  disabled={!hasPrev}
                  className="rounded p-1.5 text-[var(--cortex-text-muted)] hover:bg-[var(--cortex-bg-secondary)] disabled:opacity-30 disabled:hover:bg-transparent"
                  aria-label="Previous article"
                  data-testid="nav-prev"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  disabled={!hasNext}
                  className="rounded p-1.5 text-[var(--cortex-text-muted)] hover:bg-[var(--cortex-bg-secondary)] disabled:opacity-30 disabled:hover:bg-transparent"
                  aria-label="Next article"
                  data-testid="nav-next"
                >
                  <ChevronRight size={18} />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1.5 text-[var(--cortex-text-muted)] hover:bg-[var(--cortex-bg-secondary)]"
              aria-label="Close article details"
              data-testid="close-article-detail"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && (
            <p
              className="py-4 text-center text-sm text-[var(--cortex-text-muted)]"
              data-testid="article-loading"
            >
              Loading article details...
            </p>
          )}

          {error && !loading && (
            <p
              className="py-4 text-center text-sm text-[var(--cortex-error)]"
              data-testid="article-error"
            >
              Failed to load article details.
            </p>
          )}

          {!loading && !error && !article && (
            <p
              className="py-4 text-center text-sm text-[var(--cortex-text-muted)]"
              data-testid="article-not-found"
            >
              Article not found.
            </p>
          )}

          {article && (
            <div className="space-y-4" data-testid="article-content">
              {/* Title */}
              <h4
                className="text-lg font-semibold leading-snug text-[var(--cortex-text-primary)]"
                data-testid="article-title"
              >
                {article.title}
              </h4>

              {/* Authors + meta row */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--cortex-text-secondary)]">
                <span className="flex items-center gap-1" data-testid="article-authors">
                  <Users size={14} className="text-[var(--cortex-text-muted)]" aria-hidden="true" />
                  {article.authors.length > 0 ? article.authors.join(', ') : 'No authors listed'}
                </span>
                {article.journal && (
                  <span className="flex items-center gap-1" data-testid="article-journal">
                    <BookOpen
                      size={14}
                      className="text-[var(--cortex-text-muted)]"
                      aria-hidden="true"
                    />
                    {article.journal}
                  </span>
                )}
                {article.publicationDate && (
                  <span className="flex items-center gap-1" data-testid="publication-date">
                    <Calendar
                      size={14}
                      className="text-[var(--cortex-text-muted)]"
                      aria-hidden="true"
                    />
                    {formatDate(article.publicationDate)}
                  </span>
                )}
                <span className="flex items-center gap-1" data-testid="article-source">
                  <Database
                    size={14}
                    className="text-[var(--cortex-text-muted)]"
                    aria-hidden="true"
                  />
                  {databaseLabels[article.sourceDatabase] ?? article.sourceDatabase}
                </span>
              </div>

              {/* Links + Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                    statusBadgeStyles[article.status] ?? 'bg-gray-100 text-gray-600',
                  )}
                  data-testid="article-status-badge"
                >
                  {statusLabels[article.status] ?? article.status}
                </span>
                {article.relevanceScore !== null && (
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                      scoreBadgeStyles(article.relevanceScore),
                    )}
                    data-testid="relevance-score"
                  >
                    Score: {toPercent(article.relevanceScore)}%
                  </span>
                )}
                {article.aiCategory && (
                  <span
                    className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700"
                    data-testid="ai-category-badge"
                  >
                    {categoryLabels[article.aiCategory] ?? article.aiCategory}
                  </span>
                )}
                {article.doi && (
                  <a
                    href={`https://doi.org/${article.doi}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-[var(--cortex-blue-600)] hover:underline"
                    data-testid="doi-link"
                  >
                    DOI <ExternalLink size={10} aria-hidden="true" />
                  </a>
                )}
                {article.pmid && (
                  <a
                    href={`https://pubmed.ncbi.nlm.nih.gov/${article.pmid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-[var(--cortex-blue-600)] hover:underline"
                    data-testid="pmid-link"
                  >
                    PubMed <ExternalLink size={10} aria-hidden="true" />
                  </a>
                )}
                {article.pdfStatus === 'FOUND' || article.pdfStatus === 'VERIFIED' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleViewPdf(article.id)}
                      disabled={loadingPdf}
                      className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 hover:bg-emerald-200"
                      data-testid="view-pdf-btn"
                    >
                      <Eye size={10} /> {loadingPdf ? 'Loading...' : 'View PDF'}
                    </button>
                    <a
                      href={`/api/articles/${article.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 hover:bg-blue-200"
                      data-testid="download-pdf-btn"
                    >
                      <Download size={10} /> Download
                    </a>
                  </>
                ) : article.pdfStatus === 'NOT_FOUND' ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                    <FileText size={10} /> No PDF
                  </span>
                ) : null}
              </div>

              {/* AI Reasoning */}
              {article.aiReasoning && (
                <div data-testid="ai-reasoning-section">
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-[var(--cortex-text-muted)]">
                    <Brain size={14} aria-hidden="true" />
                    AI Reasoning
                  </div>
                  <div
                    className="rounded border-l-[3px] border-blue-400 bg-blue-50 p-3 text-sm leading-relaxed text-[var(--cortex-text-primary)]"
                    data-testid="ai-reasoning-box"
                  >
                    {article.aiReasoning}
                  </div>
                  {article.aiExclusionCode && (
                    <div
                      className="mt-1.5 text-xs text-[var(--cortex-text-muted)]"
                      data-testid="ai-exclusion-code"
                    >
                      Suggested exclusion:{' '}
                      <span className="font-medium text-[var(--cortex-text-primary)]">
                        {article.aiExclusionCode}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Abstract */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--cortex-text-muted)]">
                    Abstract
                  </span>
                  {(!article.abstract || article.abstract.length < 300) && (
                    <button
                      type="button"
                      onClick={() => {
                        void enrichAbstract({
                          variables: { articleId: article.id },
                          refetchQueries: [{ query: GET_ARTICLE, variables: { id: article.id } }],
                        });
                      }}
                      disabled={enriching}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50"
                      data-testid="enrich-abstract-btn"
                    >
                      <RefreshCw size={12} className={enriching ? 'animate-spin' : ''} />
                      {enriching ? 'Searching...' : 'Fetch full abstract'}
                    </button>
                  )}
                </div>
                {article.abstract ? (
                  <div
                    className="min-h-[200px] max-h-[50vh] overflow-y-auto rounded border border-[var(--cortex-border)] p-4 text-sm leading-relaxed text-[var(--cortex-text-primary)]"
                    data-testid="article-abstract"
                  >
                    {article.abstract}
                    {article.abstract.length < 300 && (
                      <div className="mt-2 text-xs italic text-orange-500">
                        Abstract appears truncated ({article.abstract.length} chars)
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className="flex min-h-[100px] items-center justify-center rounded border border-dashed border-[var(--cortex-border)] p-4 text-sm text-[var(--cortex-text-muted)]"
                    data-testid="article-abstract"
                  >
                    No abstract available
                  </div>
                )}
              </div>

              {/* PDF Viewer */}
              {showPdfViewer && pdfUrl && (
                <div data-testid="pdf-viewer-section">
                  <div className="mb-1 flex items-center justify-between">
                    <div className="text-xs font-medium text-[var(--cortex-text-muted)]">
                      PDF Preview
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPdfViewer(false)}
                      className="text-xs text-[var(--cortex-text-muted)] hover:text-[var(--cortex-text-primary)]"
                    >
                      Hide
                    </button>
                  </div>
                  <iframe
                    src={pdfUrl}
                    className="h-[60vh] w-full rounded border border-[var(--cortex-border)]"
                    title="PDF Preview"
                    data-testid="pdf-viewer-iframe"
                  />
                </div>
              )}

              {/* Added to pool date */}
              <div
                className="text-xs text-[var(--cortex-text-muted)]"
                data-testid="article-created-at"
              >
                Added to pool: {formatDate(article.createdAt)}
              </div>
            </div>
          )}
        </div>

        {/* Footer — action buttons */}
        {article && (
          <div className="flex items-center justify-between border-t border-[var(--cortex-border)] px-5 py-3">
            <div className="flex items-center gap-2">
              {articleIds.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={goPrev}
                    disabled={!hasPrev}
                    className="inline-flex items-center gap-1 rounded-md border border-[var(--cortex-border)] px-3 py-1.5 text-sm font-medium text-[var(--cortex-text-secondary)] hover:bg-[var(--cortex-bg-secondary)] disabled:opacity-30"
                    data-testid="nav-prev-btn"
                  >
                    <ChevronLeft size={14} /> Previous
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    disabled={!hasNext}
                    className="inline-flex items-center gap-1 rounded-md border border-[var(--cortex-border)] px-3 py-1.5 text-sm font-medium text-[var(--cortex-text-secondary)] hover:bg-[var(--cortex-bg-secondary)] disabled:opacity-30"
                    data-testid="nav-next-btn"
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleDecision('SKIPPED')}
                disabled={screening}
                className="inline-flex items-center gap-1.5 rounded-md border border-[var(--cortex-border)] px-4 py-1.5 text-sm font-medium text-[var(--cortex-text-secondary)] hover:bg-gray-50 disabled:opacity-50"
                data-testid="btn-skip"
              >
                <SkipForward size={14} /> Skip
              </button>
              <button
                type="button"
                onClick={() => handleDecision('EXCLUDED')}
                disabled={screening}
                className="inline-flex items-center gap-1.5 rounded-md bg-red-50 px-4 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                data-testid="btn-exclude"
              >
                <XCircle size={14} /> Exclude
              </button>
              <button
                type="button"
                onClick={() => handleDecision('INCLUDED')}
                disabled={screening}
                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                data-testid="btn-include"
              >
                <CheckCircle size={14} /> Include
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
