import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { ClipboardCheck, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import {
  GET_GRID_CELLS,
  GET_GRID_COLUMNS,
  GET_ARTICLE_QUALITY_ASSESSMENTS,
} from '../graphql/queries';
import { BATCH_ASSESS_QUALITY } from '../graphql/mutations';

interface QualityDashboardProps {
  gridId: string;
  soaAnalysisId: string;
  locked?: boolean;
}

interface AiAssessment {
  id: string;
  articleId: string;
  overallQuality: string;
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  recommendation: string | null;
  criteriaScores: Record<
    string,
    { score: number; rating: string; justification: string; concerns?: string[] }
  >;
}

interface Cell {
  articleId: string;
  gridColumnId: string;
  value: string | null;
  aiExtractedValue: string | null;
}

function QualityBadge({ quality }: { quality: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    HIGH: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
    MEDIUM: { bg: 'bg-amber-100', text: 'text-amber-700' },
    LOW: { bg: 'bg-red-100', text: 'text-red-700' },
  };
  const c = config[quality] ?? { bg: 'bg-gray-100', text: 'text-gray-600' };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.bg} ${c.text}`}
      data-testid="quality-badge"
    >
      {quality}
    </span>
  );
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 rounded-full bg-gray-200">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-medium text-[var(--cortex-text-secondary)]">{score}</span>
    </div>
  );
}

function ArticleDetailPanel({ assessment }: { assessment: AiAssessment }) {
  return (
    <div className="space-y-3 border-t border-[var(--cortex-border)] bg-gray-50 px-4 py-3">
      {/* Criteria scores */}
      {assessment.criteriaScores && Object.keys(assessment.criteriaScores).length > 0 && (
        <div>
          <h5 className="mb-1.5 text-xs font-semibold uppercase text-[var(--cortex-text-muted)]">
            Criteria
          </h5>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(assessment.criteriaScores).map(([key, val]) => (
              <div key={key} className="rounded border border-[var(--cortex-border)] bg-white p-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--cortex-text-primary)]">
                    {key.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-[var(--cortex-text-muted)]">{val.rating}</span>
                </div>
                <ScoreBar score={val.score} />
                <p className="mt-1 text-xs text-[var(--cortex-text-secondary)]">
                  {val.justification}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Strengths */}
        {assessment.strengths?.length > 0 && (
          <div>
            <h5 className="mb-1 text-xs font-semibold uppercase text-emerald-600">Strengths</h5>
            <ul className="space-y-0.5">
              {assessment.strengths.map((s, i) => (
                <li key={i} className="text-xs text-[var(--cortex-text-secondary)]">
                  + {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Weaknesses */}
        {assessment.weaknesses?.length > 0 && (
          <div>
            <h5 className="mb-1 text-xs font-semibold uppercase text-red-600">Weaknesses</h5>
            <ul className="space-y-0.5">
              {assessment.weaknesses.map((w, i) => (
                <li key={i} className="text-xs text-[var(--cortex-text-secondary)]">
                  - {w}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Recommendation */}
      {assessment.recommendation && (
        <div>
          <h5 className="mb-1 text-xs font-semibold uppercase text-[var(--cortex-text-muted)]">
            Recommendation
          </h5>
          <p className="text-xs text-[var(--cortex-text-secondary)]">{assessment.recommendation}</p>
        </div>
      )}
    </div>
  );
}

export function QualityDashboard({ gridId, soaAnalysisId, locked = false }: QualityDashboardProps) {
  const [expandedArticle, setExpandedArticle] = useState<string | null>(null);

  const { data: colsData } = useQuery<any>(GET_GRID_COLUMNS, {
    variables: { gridId },
  });

  const { data: cellsData, loading: cellsLoading } = useQuery<any>(GET_GRID_CELLS, {
    variables: { gridId },
  });

  const {
    data: assessData,
    loading: assessLoading,
    refetch: refetchAssessments,
  } = useQuery<any>(GET_ARTICLE_QUALITY_ASSESSMENTS, {
    variables: { gridId },
  });

  const [batchAssess, { loading: assessing }] = useMutation(BATCH_ASSESS_QUALITY, {
    variables: { gridId, soaAnalysisId },
  });

  const columns: Array<{ id: string; name: string; displayName: string }> =
    colsData?.gridColumns ?? [];
  const cells: Cell[] = cellsData?.gridCells ?? [];
  const assessments: AiAssessment[] = assessData?.articleQualityAssessments ?? [];
  const assessmentMap = new Map(assessments.map((a) => [a.articleId, a]));

  // Map column IDs to names for lookup
  const colNameById = new Map(columns.map((c) => [c.id, c.name.toLowerCase()]));

  // Build article rows from cells
  const articleIds = [...new Set(cells.map((c) => c.articleId))];

  // Get a cell value for an article by column name pattern
  const getArticleField = (articleId: string, ...namePatterns: string[]): string => {
    for (const pattern of namePatterns) {
      const cell = cells.find((c) => {
        if (c.articleId !== articleId) return false;
        const colName = colNameById.get(c.gridColumnId) ?? '';
        return colName.includes(pattern) && (c.value || c.aiExtractedValue);
      });
      if (cell) return cell.value ?? cell.aiExtractedValue ?? '';
    }
    return '';
  };

  const assessedCount = articleIds.filter((id) => assessmentMap.has(id)).length;

  const handleBatchAssess = async () => {
    await batchAssess();
    // Poll for results after a short delay
    setTimeout(() => refetchAssessments(), 5000);
    setTimeout(() => refetchAssessments(), 15000);
    setTimeout(() => refetchAssessments(), 30000);
    setTimeout(() => refetchAssessments(), 60000);
  };

  if (cellsLoading || assessLoading) {
    return (
      <div className="py-8 text-center text-sm text-[var(--cortex-text-muted)]">
        Loading quality data...
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="quality-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardCheck size={16} className="text-[var(--cortex-blue-500)]" />
          <h3 className="text-lg font-semibold text-[var(--cortex-text-primary)]">
            Quality Assessment
          </h3>
          <span className="text-xs text-[var(--cortex-text-muted)]">
            {assessedCount}/{articleIds.length} assessed
          </span>
        </div>
        <button
          type="button"
          onClick={handleBatchAssess}
          disabled={assessing || locked || articleIds.length === 0}
          className="inline-flex items-center gap-1.5 rounded border border-purple-300 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50"
          data-testid="batch-assess-btn"
        >
          <Sparkles size={14} className={assessing ? 'animate-spin' : ''} />
          {assessing ? 'Assessing...' : 'AI Assess All'}
        </button>
      </div>

      {/* Summary bar */}
      {assessments.length > 0 && (
        <div className="flex gap-3" data-testid="quality-summary">
          {(['HIGH', 'MEDIUM', 'LOW'] as const).map((level) => {
            const count = assessments.filter((a) => a.overallQuality === level).length;
            const config: Record<string, { border: string; bg: string; text: string }> = {
              HIGH: { border: 'border-emerald-200', bg: 'bg-emerald-50', text: 'text-emerald-700' },
              MEDIUM: { border: 'border-amber-200', bg: 'bg-amber-50', text: 'text-amber-700' },
              LOW: { border: 'border-red-200', bg: 'bg-red-50', text: 'text-red-700' },
            };
            const c = config[level]!;
            return (
              <div
                key={level}
                className={`flex-1 rounded-lg border ${c.border} ${c.bg} px-4 py-3 text-center`}
              >
                <div className={`text-2xl font-bold ${c.text}`}>{count}</div>
                <div className={`text-xs font-medium ${c.text}`}>{level} Quality</div>
              </div>
            );
          })}
          <div className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-center">
            <div className="text-2xl font-bold text-[var(--cortex-text-primary)]">
              {assessments.length > 0
                ? Math.round(
                    assessments.reduce((sum, a) => sum + a.overallScore, 0) / assessments.length,
                  )
                : '—'}
            </div>
            <div className="text-xs font-medium text-[var(--cortex-text-muted)]">Avg Score</div>
          </div>
        </div>
      )}

      {/* Table */}
      {articleIds.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-[var(--cortex-border)] p-12 text-center text-sm text-[var(--cortex-text-muted)]">
          No articles in extraction grid. Go to the Grid tab and load articles first.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[var(--cortex-border)]">
          <table className="w-full text-sm" data-testid="quality-table">
            <thead>
              <tr className="bg-blue-800 text-white">
                <th className="px-3 py-2 text-left text-xs font-medium">Article</th>
                <th className="w-16 px-3 py-2 text-center text-xs font-medium">Year</th>
                <th className="w-24 px-3 py-2 text-center text-xs font-medium">Quality</th>
                <th className="w-28 px-3 py-2 text-center text-xs font-medium">Score</th>
                <th className="w-20 px-3 py-2 text-center text-xs font-medium">Strengths</th>
                <th className="w-20 px-3 py-2 text-center text-xs font-medium">Weaknesses</th>
                <th className="w-8 px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {articleIds.map((artId, idx) => {
                const assessment = assessmentMap.get(artId);
                const isExpanded = expandedArticle === artId;
                return (
                  <tr key={artId} data-testid={`quality-row-${artId}`}>
                    <td colSpan={6} className="p-0">
                      <div
                        className={`flex cursor-pointer items-center ${idx % 2 === 0 ? 'bg-white' : 'bg-[#F8F9FA]'} ${isExpanded ? 'border-b border-[var(--cortex-border)]' : ''}`}
                        onClick={() => setExpandedArticle(isExpanded ? null : artId)}
                      >
                        <div className="flex-1 truncate px-3 py-2 text-xs text-[var(--cortex-text-primary)]">
                          <span className="font-medium">
                            {getArticleField(artId, 'author') || artId.slice(0, 8) + '...'}
                          </span>
                          {getArticleField(artId, 'device', 'name') && (
                            <span className="ml-1 text-[var(--cortex-text-muted)]">
                              — {getArticleField(artId, 'device', 'name')}
                            </span>
                          )}
                        </div>
                        <div className="w-16 px-3 py-2 text-center text-xs text-[var(--cortex-text-muted)]">
                          {getArticleField(artId, 'year') || '—'}
                        </div>
                        <div className="w-24 px-3 py-2 text-center">
                          {assessment ? (
                            <QualityBadge quality={assessment.overallQuality} />
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </div>
                        <div className="w-28 px-3 py-2 text-center">
                          {assessment ? (
                            <ScoreBar score={assessment.overallScore} />
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </div>
                        <div className="w-20 px-3 py-2 text-center text-xs text-[var(--cortex-text-muted)]">
                          {assessment?.strengths?.length ?? '—'}
                        </div>
                        <div className="w-20 px-3 py-2 text-center text-xs text-[var(--cortex-text-muted)]">
                          {assessment?.weaknesses?.length ?? '—'}
                        </div>
                        <div className="w-8 px-2 py-2 text-center">
                          {assessment &&
                            (isExpanded ? (
                              <ChevronUp size={14} className="text-gray-400" />
                            ) : (
                              <ChevronDown size={14} className="text-gray-400" />
                            ))}
                        </div>
                      </div>
                      {isExpanded && assessment && <ArticleDetailPanel assessment={assessment} />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
