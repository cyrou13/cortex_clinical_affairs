import { useQuery } from '@apollo/client/react';
import { X, ExternalLink, Calendar, BookOpen, Database, Users, Brain } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import { GET_ARTICLE } from '../graphql/queries';

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

interface ArticleDetailPanelProps {
  articleId: string | null;
  onClose: () => void;
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

const scoreBadgeStyles = (score: number): string => {
  if (score >= 75) return 'bg-emerald-100 text-emerald-700';
  if (score >= 40) return 'bg-orange-100 text-orange-700';
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

export function ArticleDetailPanel({ articleId, onClose }: ArticleDetailPanelProps) {
  const { data, loading, error } = useQuery<ArticleResponse>(GET_ARTICLE, {
    variables: { id: articleId },
    skip: !articleId,
  });

  if (!articleId) {
    return null;
  }

  const article = data?.article;

  return (
    <div
      className="fixed inset-y-0 right-0 z-40 w-[380px] border-l border-[var(--cortex-border)] bg-white shadow-lg"
      data-testid="article-detail-panel"
      role="dialog"
      aria-label="Article Details"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--cortex-border)] px-4 py-3">
        <h3 className="text-sm font-semibold text-[var(--cortex-text-primary)]">Article Details</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-[var(--cortex-text-muted)] hover:bg-[var(--cortex-bg-secondary)]"
          aria-label="Close article details"
          data-testid="close-article-detail"
        >
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="h-full overflow-y-auto p-4 pb-20">
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
          <div className="space-y-5" data-testid="article-content">
            {/* Status badge */}
            <div className="flex items-center gap-2">
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
                  Score: {Math.round(article.relevanceScore)}
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
            </div>

            {/* Title */}
            <div>
              <h4
                className="text-base font-semibold leading-snug text-[var(--cortex-text-primary)]"
                data-testid="article-title"
              >
                {article.title}
              </h4>
            </div>

            {/* Authors */}
            <div>
              <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-[var(--cortex-text-muted)]">
                <Users size={14} aria-hidden="true" />
                Authors
              </div>
              <p
                className="text-sm text-[var(--cortex-text-secondary)]"
                data-testid="article-authors"
              >
                {article.authors.length > 0 ? article.authors.join(', ') : 'No authors listed'}
              </p>
            </div>

            {/* AI Reasoning */}
            {article.aiReasoning && (
              <div data-testid="ai-reasoning-section">
                <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-[var(--cortex-text-muted)]">
                  <Brain size={14} aria-hidden="true" />
                  AI Reasoning
                </div>
                <div
                  className="rounded border-l-[3px] border-blue-400 bg-blue-50 p-4 text-sm leading-relaxed text-[var(--cortex-text-primary)]"
                  data-testid="ai-reasoning-box"
                >
                  {article.aiReasoning}
                </div>
                {article.aiExclusionCode && (
                  <div
                    className="mt-2 text-xs text-[var(--cortex-text-muted)]"
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
            {article.abstract && (
              <div>
                <div className="mb-1 text-xs font-medium text-[var(--cortex-text-muted)]">
                  Abstract
                </div>
                <div
                  className="max-h-60 overflow-y-auto rounded border border-[var(--cortex-border)] p-3 text-sm leading-relaxed text-[var(--cortex-text-primary)]"
                  data-testid="article-abstract"
                >
                  {article.abstract}
                </div>
              </div>
            )}

            {/* Identifiers */}
            <div className="space-y-3">
              {article.doi && (
                <div>
                  <div className="mb-0.5 text-xs font-medium text-[var(--cortex-text-muted)]">
                    DOI
                  </div>
                  <a
                    href={`https://doi.org/${article.doi}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-[var(--cortex-blue-600)] hover:underline"
                    data-testid="doi-link"
                  >
                    {article.doi}
                    <ExternalLink size={12} aria-hidden="true" />
                  </a>
                </div>
              )}

              {article.pmid && (
                <div>
                  <div className="mb-0.5 text-xs font-medium text-[var(--cortex-text-muted)]">
                    PMID
                  </div>
                  <a
                    href={`https://pubmed.ncbi.nlm.nih.gov/${article.pmid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-[var(--cortex-blue-600)] hover:underline"
                    data-testid="pmid-link"
                  >
                    {article.pmid}
                    <ExternalLink size={12} aria-hidden="true" />
                  </a>
                </div>
              )}
            </div>

            {/* Metadata */}
            <div className="space-y-3 border-t border-[var(--cortex-border)] pt-4">
              {article.publicationDate && (
                <div className="flex items-center gap-2">
                  <Calendar
                    size={14}
                    className="text-[var(--cortex-text-muted)]"
                    aria-hidden="true"
                  />
                  <div>
                    <div className="text-xs text-[var(--cortex-text-muted)]">Publication Date</div>
                    <div
                      className="text-sm text-[var(--cortex-text-primary)]"
                      data-testid="publication-date"
                    >
                      {formatDate(article.publicationDate)}
                    </div>
                  </div>
                </div>
              )}

              {article.journal && (
                <div className="flex items-center gap-2">
                  <BookOpen
                    size={14}
                    className="text-[var(--cortex-text-muted)]"
                    aria-hidden="true"
                  />
                  <div>
                    <div className="text-xs text-[var(--cortex-text-muted)]">Journal</div>
                    <div
                      className="text-sm text-[var(--cortex-text-primary)]"
                      data-testid="article-journal"
                    >
                      {article.journal}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Database
                  size={14}
                  className="text-[var(--cortex-text-muted)]"
                  aria-hidden="true"
                />
                <div>
                  <div className="text-xs text-[var(--cortex-text-muted)]">Source Database</div>
                  <div
                    className="text-sm text-[var(--cortex-text-primary)]"
                    data-testid="article-source"
                  >
                    {databaseLabels[article.sourceDatabase] ?? article.sourceDatabase}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Calendar
                  size={14}
                  className="text-[var(--cortex-text-muted)]"
                  aria-hidden="true"
                />
                <div>
                  <div className="text-xs text-[var(--cortex-text-muted)]">Added to Pool</div>
                  <div
                    className="text-sm text-[var(--cortex-text-primary)]"
                    data-testid="article-created-at"
                  >
                    {formatDate(article.createdAt)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
