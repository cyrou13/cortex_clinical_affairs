import { useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { CheckCircle, XCircle } from 'lucide-react';

export const GET_REVIEW_GATE_STATUS = gql`
  query GetReviewGateStatus($sessionId: String!) {
    reviewGateStatus(sessionId: $sessionId) {
      allArticlesReviewed {
        met
        reviewed
        total
      }
      likelyRelevantSpotChecked {
        met
        checked
        required
        total
      }
      likelyIrrelevantSpotChecked {
        met
        checked
        required
        total
      }
      allGatesMet
    }
  }
`;

interface ReviewGateStatusProps {
  sessionId: string;
}

interface GateData {
  met: boolean;
  label: string;
  detail: string;
}

export function ReviewGateStatus({ sessionId }: ReviewGateStatusProps) {
  const { data, loading, error } = useQuery<any>(GET_REVIEW_GATE_STATUS, {
    variables: { sessionId },
  });

  if (loading) {
    return (
      <div className="text-sm text-[var(--cortex-text-muted)]" data-testid="gate-loading">
        Loading review gates...
      </div>
    );
  }

  if (error || !data?.reviewGateStatus) {
    return null;
  }

  const status = data.reviewGateStatus;
  const gates: GateData[] = [
    {
      met: status.allArticlesReviewed.met,
      label: 'All articles reviewed',
      detail: `${status.allArticlesReviewed.reviewed} / ${status.allArticlesReviewed.total}`,
    },
    {
      met: status.likelyRelevantSpotChecked.met,
      label: 'Likely Relevant spot-checked',
      detail: `${status.likelyRelevantSpotChecked.checked} / ${status.likelyRelevantSpotChecked.required} required`,
    },
    {
      met: status.likelyIrrelevantSpotChecked.met,
      label: 'Likely Irrelevant spot-checked',
      detail: `${status.likelyIrrelevantSpotChecked.checked} / ${status.likelyIrrelevantSpotChecked.required} required`,
    },
  ];

  return (
    <div
      className="space-y-2 rounded-lg border border-[var(--cortex-border)] p-4"
      data-testid="review-gate-status"
    >
      <h4 className="text-sm font-semibold text-[var(--cortex-text-primary)]">Review Gates</h4>
      {gates.map((gate, i) => (
        <div key={i} className="flex items-center gap-2 text-sm" data-testid={`gate-${i}`}>
          {gate.met ? (
            <CheckCircle size={16} className="text-emerald-500" data-testid={`gate-${i}-check`} />
          ) : (
            <XCircle size={16} className="text-red-500" data-testid={`gate-${i}-x`} />
          )}
          <span className="text-[var(--cortex-text-primary)]">{gate.label}:</span>
          <span className="text-[var(--cortex-text-muted)]">{gate.detail}</span>
        </div>
      ))}
      <div className="mt-2 text-xs" data-testid="gates-summary">
        {status.allGatesMet ? (
          <span className="font-medium text-emerald-600">All gates met — ready to lock</span>
        ) : (
          <span className="font-medium text-red-600">Some gates not met</span>
        )}
      </div>
    </div>
  );
}
