import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { cn } from '../../../shared/utils/cn';
import { SCREEN_ARTICLE, BULK_SCREEN_ARTICLES } from '../graphql/mutations';
import { ScreeningFilterTabs } from './ScreeningFilterTabs';
import { BulkActionsToolbar } from './BulkActionsToolbar';
import { ArticleDetailPanel } from './ArticleDetailPanel';
import { useScreeningKeyboard } from '../hooks/use-screening-keyboard';

export const GET_SCREENING_ARTICLES = gql`
  query GetScreeningArticles($sessionId: String!, $filter: String) {
    screeningArticles(sessionId: $sessionId, filter: $filter) {
      id
      title
      abstract
      status
      relevanceScore
      aiCategory
      aiExclusionCode
      aiReasoning
    }
  }
`;

interface Article {
  id: string;
  title: string;
  abstract: string | null;
  status: string;
  relevanceScore: number | null;
  aiCategory: string | null;
  aiExclusionCode: string | null;
  aiReasoning: string | null;
}

interface ScreeningPanelProps {
  sessionId: string;
}

const statusBorderColors: Record<string, string> = {
  INCLUDED: 'border-l-emerald-500',
  EXCLUDED: 'border-l-red-500',
  SCORED: 'border-l-orange-400',
  PENDING: 'border-l-gray-300',
  SKIPPED: 'border-l-yellow-400',
};

const toPercent = (score: number): number =>
  score <= 1 ? Math.round(score * 100) : Math.round(score);

const scoreBadgeColors = (score: number | null): string => {
  if (score === null) return 'bg-gray-100 text-gray-600';
  const pct = toPercent(score);
  if (pct >= 75) return 'bg-emerald-100 text-emerald-700';
  if (pct >= 40) return 'bg-orange-100 text-orange-700';
  return 'bg-red-100 text-red-700';
};

const statusLabels: Record<string, string> = {
  PENDING: 'Pending',
  SCORED: 'Scored',
  INCLUDED: 'Included',
  EXCLUDED: 'Excluded',
  SKIPPED: 'Skipped',
  FULL_TEXT_REVIEW: 'Full Text',
};

function truncate(text: string | null, maxLen: number): string {
  if (!text) return '';
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text;
}

export function ScreeningPanel({ sessionId }: ScreeningPanelProps) {
  const [activeTab, setActiveTab] = useState('all');
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [detailArticleId, setDetailArticleId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data, loading, error } = useQuery<any>(GET_SCREENING_ARTICLES, {
    variables: { sessionId, filter: activeTab },
  });

  const [screenArticle] = useMutation(SCREEN_ARTICLE);
  const [bulkScreenArticles] = useMutation(BULK_SCREEN_ARTICLES);

  const articles: Article[] = data?.screeningArticles ?? [];

  const counts = useMemo(() => {
    const all = articles.length;
    const likelyRelevant = articles.filter((a) => a.aiCategory === 'likely_relevant').length;
    const uncertain = articles.filter((a) => a.aiCategory === 'uncertain').length;
    const likelyIrrelevant = articles.filter((a) => a.aiCategory === 'likely_irrelevant').length;
    return { all, likelyRelevant, uncertain, likelyIrrelevant };
  }, [articles]);

  const handleInclude = (articleId: string) => {
    void screenArticle({
      variables: { articleId, decision: 'INCLUDED', reason: 'Relevant' },
      refetchQueries: [
        { query: GET_SCREENING_ARTICLES, variables: { sessionId, filter: activeTab } },
      ],
    });
  };

  const handleExclude = (articleId: string) => {
    void screenArticle({
      variables: { articleId, decision: 'EXCLUDED', reason: 'Excluded' },
      refetchQueries: [
        { query: GET_SCREENING_ARTICLES, variables: { sessionId, filter: activeTab } },
      ],
    });
  };

  const handleToggleDetail = (articleId: string) => {
    setDetailArticleId(articleId || null);
  };

  const handleSkip = (articleId: string) => {
    void screenArticle({
      variables: { articleId, decision: 'SKIPPED', reason: 'Skipped' },
      refetchQueries: [
        { query: GET_SCREENING_ARTICLES, variables: { sessionId, filter: activeTab } },
      ],
    });
  };

  const handleBulkInclude = () => {
    if (selectedIds.size === 0) return;
    void bulkScreenArticles({
      variables: {
        sessionId,
        articleIds: Array.from(selectedIds),
        decision: 'INCLUDED',
        reason: 'Bulk include — likely relevant',
      },
      refetchQueries: [
        { query: GET_SCREENING_ARTICLES, variables: { sessionId, filter: activeTab } },
      ],
    }).then(() => setSelectedIds(new Set()));
  };

  const handleBulkExclude = () => {
    if (selectedIds.size === 0) return;
    void bulkScreenArticles({
      variables: {
        sessionId,
        articleIds: Array.from(selectedIds),
        decision: 'EXCLUDED',
        reason: 'Bulk exclude — likely irrelevant',
      },
      refetchQueries: [
        { query: GET_SCREENING_ARTICLES, variables: { sessionId, filter: activeTab } },
      ],
    }).then(() => setSelectedIds(new Set()));
  };

  useScreeningKeyboard(
    handleInclude,
    handleExclude,
    handleToggleDetail,
    handleSkip,
    selectedArticleId,
    true,
  );

  const handleRowClick = (articleId: string) => {
    setSelectedArticleId(articleId);
    setDetailArticleId(articleId);
  };

  const toggleSelection = (articleId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(articleId)) {
        next.delete(articleId);
      } else {
        next.add(articleId);
      }
      return next;
    });
  };

  return (
    <div className="flex h-full" data-testid="screening-panel">
      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Filter tabs */}
        <ScreeningFilterTabs activeTab={activeTab} onTabChange={setActiveTab} counts={counts} />

        {/* Bulk actions */}
        <BulkActionsToolbar
          selectedCount={selectedIds.size}
          onIncludeAll={handleBulkInclude}
          onExcludeAll={handleBulkExclude}
          onDeselectAll={() => setSelectedIds(new Set())}
        />

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div
              className="py-8 text-center text-sm text-[var(--cortex-text-muted)]"
              data-testid="screening-loading"
            >
              Loading articles...
            </div>
          )}

          {error && !loading && (
            <div
              className="py-8 text-center text-sm text-[var(--cortex-error)]"
              data-testid="screening-error"
            >
              Failed to load articles.
            </div>
          )}

          {!loading && !error && articles.length === 0 && (
            <div
              className="py-8 text-center text-sm text-[var(--cortex-text-muted)]"
              data-testid="screening-empty"
            >
              No articles to screen.
            </div>
          )}

          {!loading && !error && articles.length > 0 && (
            <table className="w-full" data-testid="screening-table">
              <thead>
                <tr className="border-b border-[var(--cortex-border)] text-left text-xs font-medium text-[var(--cortex-text-muted)]">
                  <th className="w-8 px-2 py-2">
                    <input
                      type="checkbox"
                      aria-label="Select all"
                      checked={articles.length > 0 && selectedIds.size === articles.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(new Set(articles.map((a) => a.id)));
                        } else {
                          setSelectedIds(new Set());
                        }
                      }}
                    />
                  </th>
                  <th className="px-3 py-2">Title</th>
                  <th className="w-24 px-3 py-2">Status</th>
                  <th className="px-3 py-2">Abstract</th>
                  <th className="w-20 px-3 py-2">Score</th>
                  <th className="w-24 px-3 py-2">Category</th>
                  <th className="w-44 px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((article) => (
                  <tr
                    key={article.id}
                    className={cn(
                      'cursor-pointer border-b border-[var(--cortex-border)] border-l-[3px] text-sm transition-colors',
                      statusBorderColors[article.status] ?? 'border-l-gray-200',
                      selectedArticleId === article.id
                        ? 'bg-[var(--cortex-blue-50)]'
                        : 'hover:bg-[var(--cortex-bg-secondary)]',
                    )}
                    onClick={() => handleRowClick(article.id)}
                    data-testid={`screening-row-${article.id}`}
                  >
                    <td className="px-2 py-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(article.id)}
                        onChange={() => toggleSelection(article.id)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Select ${article.title}`}
                      />
                    </td>
                    <td className="px-3 py-2 font-medium text-[var(--cortex-text-primary)]">
                      {truncate(article.title, 80)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className="text-xs text-[var(--cortex-text-muted)]"
                        data-testid={`status-label-${article.id}`}
                      >
                        {statusLabels[article.status] ?? article.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[var(--cortex-text-secondary)]">
                      {truncate(article.abstract, 50)}
                    </td>
                    <td className="px-3 py-2">
                      {article.relevanceScore !== null && (
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                            scoreBadgeColors(article.relevanceScore),
                          )}
                          data-testid={`score-badge-${article.id}`}
                        >
                          {toPercent(article.relevanceScore)}%
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                          article.aiCategory === 'likely_relevant'
                            ? 'bg-emerald-100 text-emerald-700'
                            : article.aiCategory === 'uncertain'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-red-100 text-red-700',
                        )}
                        data-testid={`category-badge-${article.id}`}
                      >
                        {article.aiCategory === 'likely_relevant'
                          ? 'Relevant'
                          : article.aiCategory === 'uncertain'
                            ? 'Uncertain'
                            : 'Irrelevant'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className="rounded bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInclude(article.id);
                          }}
                          data-testid={`include-btn-${article.id}`}
                        >
                          Include
                        </button>
                        <button
                          type="button"
                          className="rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExclude(article.id);
                          }}
                          data-testid={`exclude-btn-${article.id}`}
                        >
                          Exclude
                        </button>
                        <button
                          type="button"
                          className="rounded bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSkip(article.id);
                          }}
                          data-testid={`skip-btn-${article.id}`}
                        >
                          Skip
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Keyboard hints */}
        <div
          className="border-t border-[var(--cortex-border)] bg-[var(--cortex-bg-secondary)] px-4 py-1.5 text-xs text-[var(--cortex-text-muted)]"
          data-testid="keyboard-hints"
        >
          I = Include | E = Exclude | S = Skip | Space = Detail | ↑↓ = Navigate
        </div>
      </div>

      {/* Detail panel */}
      {detailArticleId && (
        <ArticleDetailPanel
          articleId={detailArticleId}
          onClose={() => setDetailArticleId(null)}
          articleIds={articles.map((a) => a.id)}
          onNavigate={(id) => {
            setDetailArticleId(id);
            setSelectedArticleId(id);
          }}
          sessionId={sessionId}
        />
      )}
    </div>
  );
}
