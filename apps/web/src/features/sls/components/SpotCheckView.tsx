import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { CheckCircle, XCircle } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';

export const GET_SPOT_CHECK_SAMPLE = gql`
  query GetSpotCheckSample($sessionId: String!, $category: String!, $count: Int!) {
    spotCheckSample(sessionId: $sessionId, category: $category, count: $count) {
      id
      title
      abstract
      relevanceScore
      aiCategory
      aiReasoning
      aiExclusionCode
      status
    }
  }
`;

export const SPOT_CHECK_ARTICLE = gql`
  mutation SpotCheckArticle($input: SpotCheckArticleInput!) {
    spotCheckArticle(input: $input) {
      action
      articleId
    }
  }
`;

interface SpotCheckArticle {
  id: string;
  title: string;
  abstract: string | null;
  relevanceScore: number | null;
  aiCategory: string | null;
  aiReasoning: string | null;
  aiExclusionCode: string | null;
  status: string;
}

interface SpotCheckViewProps {
  sessionId: string;
  category: string;
  sampleSize: number;
}

export function SpotCheckView({ sessionId, category, sampleSize }: SpotCheckViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<Array<{ articleId: string; agreed: boolean }>>([]);

  const { data, loading, error } = useQuery(GET_SPOT_CHECK_SAMPLE, {
    variables: { sessionId, category, count: sampleSize },
  });

  const [spotCheck] = useMutation(SPOT_CHECK_ARTICLE);

  const articles: SpotCheckArticle[] = data?.spotCheckSample ?? [];
  const currentArticle = articles[currentIndex];
  const isComplete = currentIndex >= articles.length && articles.length > 0;

  const agreements = results.filter((r) => r.agreed).length;
  const overrides = results.filter((r) => !r.agreed).length;
  const accuracy = results.length > 0 ? Math.round((agreements / results.length) * 100) : 0;

  const handleAgree = async () => {
    if (!currentArticle) return;
    await spotCheck({
      variables: {
        input: {
          articleId: currentArticle.id,
          agrees: true,
          reason: 'Agrees with AI decision',
        },
      },
    });
    setResults((prev) => [...prev, { articleId: currentArticle.id, agreed: true }]);
    setCurrentIndex((i) => i + 1);
  };

  const handleOverride = async () => {
    if (!currentArticle) return;
    await spotCheck({
      variables: {
        input: {
          articleId: currentArticle.id,
          agrees: false,
          correctedDecision: 'EXCLUDED',
          reason: 'Override: incorrect AI classification',
        },
      },
    });
    setResults((prev) => [...prev, { articleId: currentArticle.id, agreed: false }]);
    setCurrentIndex((i) => i + 1);
  };

  if (loading) {
    return (
      <div className="py-8 text-center text-sm text-[var(--cortex-text-muted)]" data-testid="spot-check-loading">
        Loading spot-check sample...
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center text-sm text-[var(--cortex-error)]" data-testid="spot-check-error">
        Failed to load spot-check sample.
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="space-y-4 rounded-lg border border-[var(--cortex-border)] p-6" data-testid="spot-check-complete">
        <h3 className="text-lg font-semibold text-[var(--cortex-text-primary)]">
          Spot-check Complete
        </h3>
        <div className="text-2xl font-bold" data-testid="spot-check-accuracy">
          AI Accuracy: {accuracy}%
        </div>
        <div className="text-sm text-[var(--cortex-text-secondary)]" data-testid="spot-check-summary">
          {agreements} agreements, {overrides} overrides out of {results.length} articles
        </div>
      </div>
    );
  }

  if (!currentArticle) {
    return (
      <div className="py-8 text-center text-sm text-[var(--cortex-text-muted)]" data-testid="spot-check-empty">
        No articles available for spot-checking.
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="spot-check-view">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm text-[var(--cortex-text-muted)]">
        <span data-testid="spot-check-progress">
          {currentIndex + 1} / {articles.length} articles
        </span>
      </div>

      {/* Article card */}
      <div className="rounded-lg border border-[var(--cortex-border)] p-4" data-testid="spot-check-article">
        <h4 className="mb-2 text-base font-semibold text-[var(--cortex-text-primary)]" data-testid="spot-check-title">
          {currentArticle.title}
        </h4>

        {currentArticle.abstract && (
          <p className="mb-3 text-sm text-[var(--cortex-text-secondary)]" data-testid="spot-check-abstract">
            {currentArticle.abstract}
          </p>
        )}

        {/* AI Reasoning */}
        {currentArticle.aiReasoning && (
          <div
            className="mb-3 rounded border-l-[3px] border-l-[#85BAE0] bg-[#F0F6FB] p-4"
            data-testid="spot-check-ai-reasoning"
          >
            <div className="mb-1 text-xs font-medium text-[var(--cortex-text-muted)]">
              AI Reasoning
            </div>
            <p className="text-sm text-[var(--cortex-text-primary)]">
              {currentArticle.aiReasoning}
            </p>
            {currentArticle.relevanceScore !== null && (
              <div className="mt-1 text-xs text-[var(--cortex-text-muted)]">
                Score: {Math.round(currentArticle.relevanceScore)} — {currentArticle.aiCategory}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleAgree}
            className="inline-flex items-center gap-2 rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            data-testid="spot-check-agree-btn"
          >
            <CheckCircle size={16} />
            Agree with AI
          </button>
          <button
            type="button"
            onClick={handleOverride}
            className="inline-flex items-center gap-2 rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            data-testid="spot-check-override-btn"
          >
            <XCircle size={16} />
            Override AI
          </button>
        </div>
      </div>
    </div>
  );
}
