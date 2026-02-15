import { AlertTriangle, Link } from 'lucide-react';

interface UnresolvedClaim {
  id: string;
  text: string;
  sectionNumber: number;
  sectionTitle: string;
}

interface UnresolvedClaimsListProps {
  claims: UnresolvedClaim[];
  onLinkSource?: (claimId: string) => void;
}

export function UnresolvedClaimsList({ claims, onLinkSource }: UnresolvedClaimsListProps) {
  return (
    <div className="space-y-3" data-testid="unresolved-claims">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--cortex-text-primary)]">
        <AlertTriangle size={14} className="text-orange-500" /> Unresolved Claims ({claims.length})
      </h3>

      {claims.length === 0 ? (
        <p className="py-4 text-center text-sm text-emerald-600">All claims resolved.</p>
      ) : (
        <div className="space-y-2">
          {claims.map((claim) => (
            <div
              key={claim.id}
              className="rounded-lg border-l-4 border-l-orange-400 border-t border-r border-b border-[var(--cortex-border)] p-3"
              data-testid="claim-item"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <span
                    className="mr-2 inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono font-medium text-gray-600"
                    data-testid="claim-section"
                  >
                    S{claim.sectionNumber}
                  </span>
                  <span className="text-xs text-[var(--cortex-text-muted)]">{claim.sectionTitle}</span>
                  <p className="mt-1 text-sm text-[var(--cortex-text-primary)]">{claim.text}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onLinkSource?.(claim.id)}
                  className="ml-2 inline-flex shrink-0 items-center gap-1 rounded bg-[var(--cortex-primary)] px-2 py-1 text-xs text-white hover:opacity-90"
                  data-testid="link-source-btn"
                >
                  <Link size={10} /> Link Source
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
