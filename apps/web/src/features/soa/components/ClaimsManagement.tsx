import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { FileCheck, Plus, Link } from 'lucide-react';

export const GET_CLAIMS = gql`
  query GetClaims($soaAnalysisId: String!) {
    soaClaims(soaAnalysisId: $soaAnalysisId) {
      id
      statement
      status
      linkedArticles {
        id
        title
      }
    }
  }
`;

export const CREATE_CLAIM = gql`
  mutation CreateClaim($soaAnalysisId: String!, $statement: String!) {
    createSoaClaim(soaAnalysisId: $soaAnalysisId, statement: $statement) {
      claimId
      statement
    }
  }
`;

export const LINK_ARTICLE_TO_CLAIM = gql`
  mutation LinkArticleToClaim($claimId: String!, $articleId: String!) {
    linkArticleToClaim(claimId: $claimId, articleId: $articleId) {
      claimId
      articleId
    }
  }
`;

interface LinkedArticle {
  id: string;
  title: string;
}

interface Claim {
  id: string;
  statement: string;
  status: string;
  linkedArticles: LinkedArticle[];
}

interface ClaimsManagementProps {
  soaAnalysisId: string;
  locked?: boolean;
  onClaimCreated?: (claimId: string) => void;
}

export function ClaimsManagement({
  soaAnalysisId,
  locked = false,
  onClaimCreated,
}: ClaimsManagementProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [claimText, setClaimText] = useState('');
  const [linkingClaimId, setLinkingClaimId] = useState<string | null>(null);
  const [articleIdToLink, setArticleIdToLink] = useState('');

  const { data, loading } = useQuery<any>(GET_CLAIMS, {
    variables: { soaAnalysisId },
  });

  const [createClaim] = useMutation<any>(CREATE_CLAIM);
  const [linkArticle] = useMutation(LINK_ARTICLE_TO_CLAIM);

  const claims: Claim[] = data?.soaClaims ?? [];

  const handleCreateClaim = async () => {
    if (!claimText.trim()) return;
    const result = await createClaim({
      variables: { soaAnalysisId, statement: claimText.trim() },
    });
    if (result.data?.createSoaClaim) {
      onClaimCreated?.(result.data.createSoaClaim.claimId);
      setClaimText('');
      setShowCreateForm(false);
    }
  };

  const handleLinkArticle = async (claimId: string) => {
    if (!articleIdToLink.trim()) return;
    await linkArticle({
      variables: { claimId, articleId: articleIdToLink.trim() },
    });
    setArticleIdToLink('');
    setLinkingClaimId(null);
  };

  if (loading) {
    return (
      <div
        className="py-6 text-center text-sm text-[var(--cortex-text-muted)]"
        data-testid="claims-loading"
      >
        Loading claims...
      </div>
    );
  }

  return (
    <div
      className="space-y-4 rounded-lg border border-[var(--cortex-border)] p-4"
      data-testid="claims-panel"
    >
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--cortex-text-primary)]">
          <FileCheck size={14} /> Claims Management
        </h3>
        {!locked && (
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
            data-testid="create-claim-btn"
          >
            <Plus size={12} /> Create Claim
          </button>
        )}
      </div>

      {showCreateForm && (
        <div
          className="space-y-2 rounded border border-blue-200 bg-blue-50 p-3"
          data-testid="claim-form"
        >
          <textarea
            value={claimText}
            onChange={(e) => setClaimText(e.target.value)}
            placeholder="Enter the clinical claim statement..."
            rows={3}
            className="w-full rounded border px-2 py-1.5 text-sm"
            data-testid="claim-text-input"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCreateClaim}
              className="rounded bg-blue-600 px-3 py-1 text-xs text-white"
              data-testid="confirm-create-claim"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="rounded border px-3 py-1 text-xs"
              data-testid="cancel-create-claim"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {claims.length > 0 ? (
        <div className="space-y-3" data-testid="claims-list">
          {claims.map((claim) => (
            <div
              key={claim.id}
              className="rounded-lg border border-[var(--cortex-border)] p-3"
              data-testid={`claim-${claim.id}`}
            >
              <div className="mb-2 flex items-start justify-between">
                <p
                  className="flex-1 text-sm text-[var(--cortex-text-primary)]"
                  data-testid={`claim-statement-${claim.id}`}
                >
                  {claim.statement}
                </p>
                <span className="ml-2 shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                  {claim.status}
                </span>
              </div>

              {claim.linkedArticles.length > 0 && (
                <div className="mb-2 space-y-1">
                  {claim.linkedArticles.map((article) => (
                    <div key={article.id} className="flex items-center gap-1 text-xs text-blue-600">
                      <Link size={10} />
                      <span data-testid={`linked-article-${article.id}`}>{article.title}</span>
                    </div>
                  ))}
                </div>
              )}

              {!locked && (
                <>
                  <button
                    type="button"
                    onClick={() => setLinkingClaimId(claim.id)}
                    className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:underline"
                    data-testid="link-article-btn"
                  >
                    <Link size={10} /> Link Article
                  </button>

                  {linkingClaimId === claim.id && (
                    <div className="mt-2 flex gap-1" data-testid="link-article-form">
                      <input
                        type="text"
                        value={articleIdToLink}
                        onChange={(e) => setArticleIdToLink(e.target.value)}
                        placeholder="Article ID"
                        className="flex-1 rounded border px-1.5 py-1 text-xs"
                        data-testid="link-article-id-input"
                      />
                      <button
                        type="button"
                        onClick={() => handleLinkArticle(claim.id)}
                        className="rounded bg-blue-600 px-2 py-1 text-[10px] text-white"
                        data-testid="confirm-link-article"
                      >
                        Link
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div
          className="py-4 text-center text-sm text-[var(--cortex-text-muted)]"
          data-testid="no-claims"
        >
          No claims created yet.
        </div>
      )}
    </div>
  );
}
