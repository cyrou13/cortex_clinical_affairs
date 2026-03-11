import { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery } from '@apollo/client/react';
import {
  ChevronUp,
  ChevronDown,
  Search,
  Filter,
  FileText,
  FileX,
  FileQuestion,
  Loader2,
} from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import { GET_ARTICLES } from '../graphql/queries';

type ArticleStatus = 'PENDING' | 'SCORED' | 'INCLUDED' | 'EXCLUDED' | 'FULL_TEXT_REVIEW';

type PdfStatus = 'FOUND' | 'NOT_FOUND' | 'RETRIEVING' | 'MISMATCH' | 'NONE' | null;

interface Article {
  id: string;
  title: string;
  authors: string[];
  doi: string | null;
  pmid: string | null;
  publicationDate: string | null;
  journal: string | null;
  sourceDatabase: string;
  status: ArticleStatus;
  pdfStatus: PdfStatus;
  relevanceScore: number | null;
  aiCategory: string | null;
  aiExclusionCode: string | null;
  customFilterScore: number | null;
}

interface ArticlesResponse {
  articles: {
    items: Article[];
    total: number;
    offset: number;
    limit: number;
  };
}

export interface ArticleFilter {
  search?: string;
  status?: string;
  pdfStatus?: string;
  customFilterPassed?: boolean;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

interface ArticleTableProps {
  sessionId: string;
  onArticleSelect: (articleId: string) => void;
  filter: ArticleFilter;
  onFilterChange: (filter: ArticleFilter) => void;
}

const PAGE_SIZE = 100;

const statusAccentColors: Record<ArticleStatus, string> = {
  INCLUDED: 'bg-emerald-500',
  EXCLUDED: 'bg-red-500',
  SCORED: 'bg-orange-500',
  PENDING: 'bg-gray-400',
  FULL_TEXT_REVIEW: 'bg-blue-500',
};

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

const databaseBadgeStyles: Record<string, string> = {
  PUBMED: 'bg-blue-100 text-blue-700',
  PMC: 'bg-indigo-100 text-indigo-700',
  GOOGLE_SCHOLAR: 'bg-amber-100 text-amber-700',
  CLINICAL_TRIALS: 'bg-teal-100 text-teal-700',
};

const databaseLabels: Record<string, string> = {
  PUBMED: 'PubMed',
  PMC: 'PubMed Central',
  GOOGLE_SCHOLAR: 'Google Scholar',
  CLINICAL_TRIALS: 'ClinicalTrials.gov',
};

/** Convert relevanceScore (0.0–1.0 from LLM) to display percentage */
const toPercent = (score: number): number =>
  score <= 1 ? Math.round(score * 100) : Math.round(score);

const scoreBadgeStyles = (score: number | null): string => {
  if (score === null) return '';
  const pct = toPercent(score);
  if (pct >= 75) return 'bg-emerald-100 text-emerald-700';
  if (pct >= 40) return 'bg-orange-100 text-orange-700';
  return 'bg-red-100 text-red-700';
};

const filterScoreBadge = (score: number | null): { label: string; style: string } => {
  if (score === null) return { label: '—', style: '' };
  if (score >= 50) return { label: 'Pass', style: 'bg-emerald-100 text-emerald-700' };
  return { label: 'Fail', style: 'bg-red-100 text-red-700' };
};

const categoryLabels: Record<string, string> = {
  likely_relevant: 'Likely Relevant',
  uncertain: 'Uncertain',
  likely_irrelevant: 'Likely Irrelevant',
};

const categoryBadgeStyles: Record<string, string> = {
  likely_relevant: 'bg-emerald-100 text-emerald-700',
  uncertain: 'bg-orange-100 text-orange-700',
  likely_irrelevant: 'bg-red-100 text-red-700',
};

const pdfStatusConfig: Record<string, { icon: typeof FileText; className: string; label: string }> =
  {
    FOUND: { icon: FileText, className: 'text-emerald-600', label: 'PDF' },
    NOT_FOUND: { icon: FileX, className: 'text-red-500', label: 'Missing' },
    RETRIEVING: { icon: Loader2, className: 'text-blue-500 animate-spin', label: 'Retrieving' },
    MISMATCH: { icon: FileQuestion, className: 'text-orange-500', label: 'Mismatch' },
  };

type SortField = 'title' | 'authors' | 'year' | 'sourceDatabase' | 'status';

function formatAuthors(authors: string[]): string {
  if (!authors || authors.length === 0) return 'Unknown';
  if (authors.length <= 2) return authors.join(', ');
  return `${authors[0]}, ${authors[1]} et al.`;
}

function getYear(publicationDate: string | null): string {
  if (!publicationDate) return '-';
  try {
    return new Date(publicationDate).getFullYear().toString();
  } catch {
    return '-';
  }
}

export function ArticleTable({
  sessionId,
  onArticleSelect,
  filter,
  onFilterChange,
}: ArticleTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchText, setSearchText] = useState(filter.search ?? '');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { data, loading, fetchMore } = useQuery<ArticlesResponse>(GET_ARTICLES, {
    variables: {
      sessionId,
      filter: {
        searchText: filter.search,
        status: filter.status,
        pdfStatus: filter.pdfStatus,
        customFilterPassed: filter.customFilterPassed,
      },
      offset: 0,
      limit: PAGE_SIZE,
    },
  });

  const articles = data?.articles?.items ?? [];
  const total = data?.articles?.total ?? 0;
  const hasMore = articles.length < total;

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || loading || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    if (scrollHeight - scrollTop - clientHeight < 200) {
      fetchMore({
        variables: {
          sessionId,
          filter: {
            searchText: filter.search,
            status: filter.status,
            pdfStatus: filter.pdfStatus,
            customFilterPassed: filter.customFilterPassed,
          },
          offset: articles.length,
          limit: PAGE_SIZE,
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev;
          return {
            articles: {
              ...fetchMoreResult.articles,
              items: [...prev.articles.items, ...fetchMoreResult.articles.items],
            },
          };
        },
      });
    }
  }, [loading, hasMore, articles.length, fetchMore, sessionId, filter]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  function handleSort(field: SortField) {
    const newOrder = filter.sortBy === field && filter.sortOrder === 'ASC' ? 'DESC' : 'ASC';
    onFilterChange({ ...filter, sortBy: field, sortOrder: newOrder });
  }

  function handleSearchSubmit() {
    onFilterChange({ ...filter, search: searchText });
  }

  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      handleSearchSubmit();
    }
  }

  function toggleSelectAll() {
    if (selectedIds.size === articles.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(articles.map((a) => a.id)));
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function renderSortIndicator(field: SortField) {
    if (filter.sortBy !== field) return null;
    return filter.sortOrder === 'ASC' ? (
      <ChevronUp size={14} data-testid={`sort-asc-${field}`} aria-hidden="true" />
    ) : (
      <ChevronDown size={14} data-testid={`sort-desc-${field}`} aria-hidden="true" />
    );
  }

  function getAriaSortValue(field: SortField): 'ascending' | 'descending' | 'none' {
    if (filter.sortBy !== field) return 'none';
    return filter.sortOrder === 'ASC' ? 'ascending' : 'descending';
  }

  const sortableHeaders: { field: SortField; label: string }[] = [
    { field: 'title', label: 'Title' },
    { field: 'authors', label: 'Authors' },
    { field: 'year', label: 'Year' },
    { field: 'sourceDatabase', label: 'Source' },
    { field: 'status', label: 'Status' },
  ];

  const hasAiScores = articles.some((a) => a.relevanceScore !== null);
  const hasCustomFilterScores = articles.some((a) => a.customFilterScore !== null);

  return (
    <div data-testid="article-table" className="flex flex-col">
      {/* Filter row */}
      <div className="mb-3 flex items-center gap-2" data-testid="filter-row">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--cortex-text-muted)]"
            aria-hidden="true"
          />
          <input
            type="text"
            placeholder="Search articles..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            onBlur={handleSearchSubmit}
            className="w-full rounded-md border border-[var(--cortex-border)] bg-white py-2 pl-9 pr-3 text-sm text-[var(--cortex-text-primary)] placeholder:text-[var(--cortex-text-muted)] focus:border-[var(--cortex-blue-500)] focus:outline-none focus:ring-1 focus:ring-[var(--cortex-blue-500)]"
            data-testid="article-search-input"
          />
        </div>
        {hasCustomFilterScores && (
          <select
            value={
              filter.customFilterPassed === undefined
                ? ''
                : filter.customFilterPassed
                  ? 'pass'
                  : 'fail'
            }
            onChange={(e) => {
              const val = e.target.value;
              onFilterChange({
                ...filter,
                customFilterPassed: val === '' ? undefined : val === 'pass',
              });
            }}
            className="rounded-md border border-[var(--cortex-border)] bg-white px-3 py-2 text-sm text-[var(--cortex-text-primary)] focus:border-[var(--cortex-blue-500)] focus:outline-none"
            data-testid="custom-filter-select"
          >
            <option value="">AI Filter: All</option>
            <option value="pass">AI Filter: Pass</option>
            <option value="fail">AI Filter: Fail</option>
          </select>
        )}
      </div>

      {/* Selection count */}
      {selectedIds.size > 0 && (
        <div
          className="mb-2 text-sm text-[var(--cortex-text-secondary)]"
          data-testid="selection-count"
        >
          {selectedIds.size} article{selectedIds.size !== 1 ? 's' : ''} selected
        </div>
      )}

      {/* Table */}
      <div
        ref={scrollContainerRef}
        className="max-h-[600px] overflow-auto rounded-lg border border-gray-200 shadow-sm"
        data-testid="article-table-scroll"
      >
        <table role="table" className="w-full text-left text-sm">
          <thead className="sticky top-0 z-10 bg-gray-50">
            <tr>
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  checked={articles.length > 0 && selectedIds.size === articles.length}
                  onChange={toggleSelectAll}
                  aria-label="Select all articles"
                  data-testid="select-all-checkbox"
                />
              </th>
              {sortableHeaders.map(({ field, label }) => (
                <th
                  key={field}
                  className="cursor-pointer px-3 py-3 text-xs font-medium uppercase tracking-wider text-[var(--cortex-text-muted)] hover:text-[var(--cortex-text-primary)]"
                  onClick={() => handleSort(field)}
                  aria-sort={getAriaSortValue(field)}
                  data-testid={`column-header-${field}`}
                >
                  <div className="flex items-center gap-1">
                    {label}
                    {renderSortIndicator(field)}
                  </div>
                </th>
              ))}
              <th
                className="px-3 py-3 text-xs font-medium uppercase tracking-wider text-[var(--cortex-text-muted)]"
                data-testid="column-header-pdf"
              >
                PDF
              </th>
              {hasAiScores && (
                <>
                  <th
                    className="px-3 py-3 text-xs font-medium uppercase tracking-wider text-[var(--cortex-text-muted)]"
                    data-testid="column-header-aiScore"
                  >
                    AI Score
                  </th>
                  <th
                    className="px-3 py-3 text-xs font-medium uppercase tracking-wider text-[var(--cortex-text-muted)]"
                    data-testid="column-header-aiCategory"
                  >
                    AI Category
                  </th>
                  <th
                    className="px-3 py-3 text-xs font-medium uppercase tracking-wider text-[var(--cortex-text-muted)]"
                    data-testid="column-header-aiExclusionCode"
                  >
                    Exclusion Code
                  </th>
                </>
              )}
              {hasCustomFilterScores && (
                <th
                  className="px-3 py-3 text-xs font-medium uppercase tracking-wider text-[var(--cortex-text-muted)]"
                  data-testid="column-header-customFilter"
                >
                  <div className="flex items-center gap-1">
                    <Filter size={12} aria-hidden="true" />
                    AI Filter
                  </div>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {loading && articles.length === 0 && (
              <tr>
                <td
                  colSpan={7 + (hasAiScores ? 3 : 0) + (hasCustomFilterScores ? 1 : 0)}
                  className="px-3 py-8 text-center text-sm text-[var(--cortex-text-muted)]"
                >
                  Loading articles...
                </td>
              </tr>
            )}

            {!loading && articles.length === 0 && (
              <tr>
                <td
                  colSpan={7 + (hasAiScores ? 3 : 0) + (hasCustomFilterScores ? 1 : 0)}
                  className="px-3 py-8 text-center text-sm text-[var(--cortex-text-muted)]"
                  data-testid="empty-articles"
                >
                  No articles found.
                </td>
              </tr>
            )}

            {articles.map((article) => {
              const accentColor = statusAccentColors[article.status] ?? 'bg-gray-400';
              const badgeStyle = statusBadgeStyles[article.status] ?? 'bg-gray-100 text-gray-600';
              const label = statusLabels[article.status] ?? article.status;
              const dbStyle =
                databaseBadgeStyles[article.sourceDatabase] ?? 'bg-gray-100 text-gray-600';
              const dbLabel = databaseLabels[article.sourceDatabase] ?? article.sourceDatabase;

              return (
                <tr
                  key={article.id}
                  className="group relative cursor-pointer hover:bg-blue-50"
                  onClick={() => onArticleSelect(article.id)}
                  data-testid={`article-row-${article.id}`}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onArticleSelect(article.id);
                    }
                  }}
                >
                  <td className="relative px-3 py-3">
                    <div
                      className={cn('absolute inset-y-0 left-0 w-[3px]', accentColor)}
                      data-testid={`status-accent-${article.id}`}
                    />
                    <input
                      type="checkbox"
                      checked={selectedIds.has(article.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleSelect(article.id);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Select ${article.title}`}
                      data-testid={`select-article-${article.id}`}
                    />
                  </td>
                  <td className="max-w-xs truncate px-3 py-3 font-medium text-[var(--cortex-text-primary)]">
                    {article.title}
                  </td>
                  <td className="max-w-[180px] truncate px-3 py-3 text-[var(--cortex-text-secondary)]">
                    {formatAuthors(article.authors)}
                  </td>
                  <td className="px-3 py-3 text-[var(--cortex-text-secondary)]">
                    {getYear(article.publicationDate)}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                        dbStyle,
                      )}
                      data-testid={`source-badge-${article.id}`}
                    >
                      {dbLabel}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                        badgeStyle,
                      )}
                      data-testid={`status-badge-${article.id}`}
                    >
                      {label}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    {(() => {
                      const cfg = pdfStatusConfig[article.pdfStatus ?? ''];
                      if (!cfg) return <span className="text-xs text-gray-400">—</span>;
                      const Icon = cfg.icon;
                      return (
                        <span
                          className={cn('inline-flex items-center gap-1 text-xs', cfg.className)}
                          title={cfg.label}
                          data-testid={`pdf-status-${article.id}`}
                        >
                          <Icon size={14} />
                          {cfg.label}
                        </span>
                      );
                    })()}
                  </td>
                  {hasAiScores && (
                    <>
                      <td className="px-3 py-3">
                        {article.relevanceScore !== null && (
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                              scoreBadgeStyles(article.relevanceScore),
                            )}
                            data-testid={`ai-score-badge-${article.id}`}
                          >
                            {toPercent(article.relevanceScore)}%
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {article.aiCategory && (
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                              categoryBadgeStyles[article.aiCategory] ??
                                'bg-gray-100 text-gray-600',
                            )}
                            data-testid={`ai-category-badge-${article.id}`}
                          >
                            {categoryLabels[article.aiCategory] ?? article.aiCategory}
                          </span>
                        )}
                      </td>
                      <td
                        className="px-3 py-3 text-xs text-[var(--cortex-text-secondary)]"
                        data-testid={`ai-exclusion-code-${article.id}`}
                      >
                        {article.aiExclusionCode ?? ''}
                      </td>
                    </>
                  )}
                  {hasCustomFilterScores && (
                    <td className="px-3 py-3">
                      {(() => {
                        const badge = filterScoreBadge(article.customFilterScore);
                        if (!badge.style) return <span className="text-xs text-gray-400">—</span>;
                        return (
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                              badge.style,
                            )}
                            data-testid={`custom-filter-badge-${article.id}`}
                            title={
                              article.customFilterScore !== null
                                ? `Score: ${article.customFilterScore}`
                                : ''
                            }
                          >
                            {badge.label}
                          </span>
                        );
                      })()}
                    </td>
                  )}
                </tr>
              );
            })}

            {loading && articles.length > 0 && (
              <tr>
                <td
                  colSpan={7 + (hasAiScores ? 3 : 0) + (hasCustomFilterScores ? 1 : 0)}
                  className="px-3 py-4 text-center text-sm text-[var(--cortex-text-muted)]"
                  data-testid="loading-more"
                >
                  Loading more articles...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div
        className="mt-2 flex items-center justify-between text-xs text-[var(--cortex-text-muted)]"
        data-testid="table-footer"
      >
        <span>
          Showing {articles.length} of {total} articles
        </span>
      </div>
    </div>
  );
}
