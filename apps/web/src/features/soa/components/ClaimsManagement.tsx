import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { FileCheck, Sparkles, Check, X, ChevronDown, ChevronUp, Plus, Link2 } from 'lucide-react';
import { GET_CLAIMS, GET_CLAIM_ARTICLE_LINKS, GET_SOA_SECTIONS } from '../graphql/queries';
import {
  CREATE_CLAIM,
  GENERATE_CLAIMS,
  UPDATE_CLAIM_STATUS,
  LINK_CLAIM_TO_ARTICLE,
} from '../graphql/mutations';

interface Claim {
  id: string;
  soaAnalysisId: string;
  statementText: string;
  thematicSectionId: string | null;
  status: string;
  evidenceStrength: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ArticleLink {
  id: string;
  claimId: string;
  articleId: string;
  sourceQuote: string | null;
  createdAt: string;
}

interface ClaimsManagementProps {
  soaAnalysisId: string;
  gridId: string | null;
  locked?: boolean;
}

function EvidenceBadge({ strength }: { strength: string | null }) {
  if (!strength) return null;
  const config: Record<string, { bg: string; text: string }> = {
    HIGH: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
    MEDIUM: { bg: 'bg-amber-100', text: 'text-amber-700' },
    LOW: { bg: 'bg-red-100', text: 'text-red-700' },
  };
  const c = config[strength] ?? { bg: 'bg-gray-100', text: 'text-gray-600' };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${c.bg} ${c.text}`}
      data-testid="evidence-badge"
    >
      {strength}
    </span>
  );
}

function ClaimStatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    DRAFT: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Draft' },
    APPROVED: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Approved' },
    REJECTED: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' },
  };
  const c = config[status] ?? { bg: 'bg-gray-100', text: 'text-gray-600', label: status };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.bg} ${c.text}`}
      data-testid="claim-status-badge"
    >
      {c.label}
    </span>
  );
}

function ClaimArticleLinks({ claimId }: { claimId: string }) {
  const { data, loading } = useQuery<any>(GET_CLAIM_ARTICLE_LINKS, {
    variables: { claimId },
  });

  const links: ArticleLink[] = data?.claimArticleLinks ?? [];

  if (loading) {
    return (
      <div className="px-4 py-2 text-xs text-[var(--cortex-text-muted)]">
        Loading linked articles...
      </div>
    );
  }

  if (links.length === 0) {
    return (
      <div className="px-4 py-2 text-xs text-[var(--cortex-text-muted)]">No linked articles.</div>
    );
  }

  return (
    <div className="border-t border-[var(--cortex-border)] bg-gray-50 px-4 py-3">
      <h5 className="mb-2 text-xs font-semibold uppercase text-[var(--cortex-text-muted)]">
        Linked Articles ({links.length})
      </h5>
      <div className="space-y-1.5">
        {links.map((link) => (
          <div
            key={link.id}
            className="rounded border border-[var(--cortex-border)] bg-white px-3 py-2"
            data-testid={`article-link-${link.id}`}
          >
            <div className="flex items-center gap-2">
              <Link2 size={10} className="text-[var(--cortex-text-muted)]" />
              <span className="text-xs font-medium text-[var(--cortex-text-primary)]">
                {link.articleId}
              </span>
            </div>
            {link.sourceQuote && (
              <p className="mt-1 text-xs italic text-[var(--cortex-text-muted)]">
                &ldquo;{link.sourceQuote}&rdquo;
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function groupClaimsBySection(claims: Claim[]): Map<string, Claim[]> {
  const groups = new Map<string, Claim[]>();
  for (const claim of claims) {
    const key = claim.thematicSectionId ?? 'general';
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(claim);
  }
  return groups;
}

export function ClaimsManagement({ soaAnalysisId, gridId, locked = false }: ClaimsManagementProps) {
  const [expandedClaim, setExpandedClaim] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [claimText, setClaimText] = useState('');

  const { data, loading, refetch } = useQuery<any>(GET_CLAIMS, {
    variables: { soaAnalysisId },
  });

  const { data: sectionsData } = useQuery<any>(GET_SOA_SECTIONS, {
    variables: { soaAnalysisId },
  });

  const sectionTitles = new Map<string, string>(
    (sectionsData?.soaSections ?? []).map((s: { id: string; title: string }) => [s.id, s.title]),
  );

  const [createClaim] = useMutation<any>(CREATE_CLAIM, {
    onCompleted: () => refetch(),
  });

  const [generateClaims, { loading: generating }] = useMutation<any>(GENERATE_CLAIMS, {
    onCompleted: () => refetch(),
  });

  const [updateClaimStatus] = useMutation<any>(UPDATE_CLAIM_STATUS, {
    onCompleted: () => refetch(),
  });

  const [_linkClaimToArticle] = useMutation<any>(LINK_CLAIM_TO_ARTICLE);

  const claims: Claim[] = data?.claims ?? [];

  const approvedCount = claims.filter((c) => c.status === 'APPROVED').length;
  const pendingCount = claims.filter((c) => c.status === 'DRAFT').length;
  const rejectedCount = claims.filter((c) => c.status === 'REJECTED').length;

  const grouped = groupClaimsBySection(claims);

  const handleCreateClaim = async () => {
    if (!claimText.trim()) return;
    await createClaim({
      variables: { soaAnalysisId, statementText: claimText.trim() },
    });
    setClaimText('');
    setShowCreateForm(false);
  };

  const handleGenerate = async () => {
    if (!gridId) return;
    await generateClaims({ variables: { soaAnalysisId, gridId } });
  };

  const handleStatusChange = async (claimId: string, status: string) => {
    await updateClaimStatus({ variables: { claimId, status } });
  };

  if (loading) {
    return (
      <div
        className="py-8 text-center text-sm text-[var(--cortex-text-muted)]"
        data-testid="claims-loading"
      >
        Loading claims...
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="claims-panel">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileCheck size={16} className="text-[var(--cortex-blue-500)]" />
          <h3 className="text-lg font-semibold text-[var(--cortex-text-primary)]">
            Clinical Claims
          </h3>
          <span className="text-xs text-[var(--cortex-text-muted)]">
            {approvedCount} approved, {pendingCount} pending
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!locked && (
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center gap-1.5 rounded border border-[var(--cortex-border)] px-3 py-2 text-sm font-medium text-[var(--cortex-text-secondary)] hover:bg-gray-50"
              data-testid="create-claim-btn"
            >
              <Plus size={14} />
              Add Claim
            </button>
          )}
          {gridId && !locked && (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              className="inline-flex items-center gap-1.5 rounded border border-purple-300 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50"
              data-testid="generate-claims-btn"
            >
              <Sparkles size={14} className={generating ? 'animate-spin' : ''} />
              {generating ? 'Generating...' : 'Generate from Narrative'}
            </button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      {claims.length > 0 && (
        <div className="flex gap-3" data-testid="claims-summary">
          <div className="flex-1 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-center">
            <div className="text-2xl font-bold text-blue-700">{claims.length}</div>
            <div className="text-xs font-medium text-blue-600">Total Claims</div>
          </div>
          <div className="flex-1 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-center">
            <div className="text-2xl font-bold text-emerald-700">{approvedCount}</div>
            <div className="text-xs font-medium text-emerald-600">Approved</div>
          </div>
          <div className="flex-1 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-center">
            <div className="text-2xl font-bold text-amber-700">{pendingCount}</div>
            <div className="text-xs font-medium text-amber-600">Pending Review</div>
          </div>
          <div className="flex-1 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-center">
            <div className="text-2xl font-bold text-red-700">{rejectedCount}</div>
            <div className="text-xs font-medium text-red-600">Rejected</div>
          </div>
        </div>
      )}

      {/* Inline create form */}
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

      {/* Claims grouped by section */}
      {claims.length === 0 ? (
        <div
          className="rounded-lg border-2 border-dashed border-[var(--cortex-border)] p-12 text-center"
          data-testid="no-claims"
        >
          <FileCheck size={32} className="mx-auto mb-3 text-[var(--cortex-text-muted)]" />
          <p className="text-sm text-[var(--cortex-text-muted)]">
            No claims yet. Generate claims from narrative sections.
          </p>
        </div>
      ) : (
        <div className="space-y-6" data-testid="claims-list">
          {Array.from(grouped.entries()).map(([sectionId, sectionClaims]) => (
            <div key={sectionId} className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--cortex-text-muted)]">
                {sectionId === 'general' ? 'General' : (sectionTitles.get(sectionId) ?? sectionId)}
              </h4>
              <div className="overflow-hidden rounded-lg border border-[var(--cortex-border)]">
                {sectionClaims.map((claim, idx) => {
                  const isExpanded = expandedClaim === claim.id;
                  return (
                    <div
                      key={claim.id}
                      className={idx > 0 ? 'border-t border-[var(--cortex-border)]' : ''}
                      data-testid={`claim-${claim.id}`}
                    >
                      <div
                        className={`flex cursor-pointer items-start gap-3 px-4 py-3 ${idx % 2 === 0 ? 'bg-white' : 'bg-[#F8F9FA]'}`}
                        onClick={() => setExpandedClaim(isExpanded ? null : claim.id)}
                      >
                        <div className="flex-1 space-y-1">
                          <p
                            className="text-sm text-[var(--cortex-text-primary)]"
                            data-testid={`claim-statement-${claim.id}`}
                          >
                            {claim.statementText}
                          </p>
                          <div className="flex items-center gap-2">
                            <EvidenceBadge strength={claim.evidenceStrength} />
                            <ClaimStatusBadge status={claim.status} />
                          </div>
                        </div>

                        {!locked && claim.status === 'DRAFT' && (
                          <div
                            className="flex items-center gap-1 pt-0.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => handleStatusChange(claim.id, 'APPROVED')}
                              className="rounded bg-emerald-100 p-1.5 text-emerald-700 hover:bg-emerald-200"
                              title="Approve"
                              data-testid={`approve-${claim.id}`}
                            >
                              <Check size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(claim.id, 'REJECTED')}
                              className="rounded bg-red-100 p-1.5 text-red-700 hover:bg-red-200"
                              title="Reject"
                              data-testid={`reject-${claim.id}`}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        )}

                        <div className="pt-0.5">
                          {isExpanded ? (
                            <ChevronUp size={14} className="text-gray-400" />
                          ) : (
                            <ChevronDown size={14} className="text-gray-400" />
                          )}
                        </div>
                      </div>

                      {isExpanded && <ClaimArticleLinks claimId={claim.id} />}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
