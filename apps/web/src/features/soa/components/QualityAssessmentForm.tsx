import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { ClipboardCheck } from 'lucide-react';

export const SUBMIT_QUALITY_ASSESSMENT = gql`
  mutation SubmitQualityAssessment(
    $soaAnalysisId: String!
    $articleId: String!
    $assessmentType: String!
    $contributionLevel: String!
    $notes: String
  ) {
    submitQualityAssessment(
      soaAnalysisId: $soaAnalysisId
      articleId: $articleId
      assessmentType: $assessmentType
      contributionLevel: $contributionLevel
      notes: $notes
    ) {
      assessmentId
      status
    }
  }
`;

const ASSESSMENT_TYPES = [
  { value: 'QUADAS_2', label: 'QUADAS-2' },
  { value: 'INTERNAL_READING_GRID', label: 'Internal Reading Grid' },
];

const CONTRIBUTION_LEVELS = [
  { value: 'PIVOTAL', label: 'Pivotal' },
  { value: 'SUPPORTIVE', label: 'Supportive' },
  { value: 'BACKGROUND', label: 'Background' },
];

interface QualityAssessmentFormProps {
  soaAnalysisId: string;
  articleId: string;
  locked?: boolean;
  onSubmitted?: (assessmentId: string) => void;
}

export function QualityAssessmentForm({
  soaAnalysisId,
  articleId,
  locked = false,
  onSubmitted,
}: QualityAssessmentFormProps) {
  const [assessmentType, setAssessmentType] = useState('');
  const [contributionLevel, setContributionLevel] = useState('');
  const [notes, setNotes] = useState('');

  const [submitAssessment, { loading }] = useMutation<any>(SUBMIT_QUALITY_ASSESSMENT);

  const canSubmit = assessmentType !== '' && contributionLevel !== '' && !locked;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const result = await submitAssessment({
      variables: {
        soaAnalysisId,
        articleId,
        assessmentType,
        contributionLevel,
        notes: notes || null,
      },
    });
    if (result.data?.submitQualityAssessment) {
      onSubmitted?.(result.data.submitQualityAssessment.assessmentId);
      setAssessmentType('');
      setContributionLevel('');
      setNotes('');
    }
  };

  return (
    <div
      className="space-y-4 rounded-lg border border-[var(--cortex-border)] p-4"
      data-testid="quality-form"
    >
      <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--cortex-text-primary)]">
        <ClipboardCheck size={14} /> Quality Assessment
      </h3>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--cortex-text-secondary)]">
            Assessment Type
          </label>
          <select
            value={assessmentType}
            onChange={(e) => setAssessmentType(e.target.value)}
            disabled={locked}
            className="w-full rounded border border-[var(--cortex-border)] px-3 py-2 text-sm disabled:opacity-50"
            data-testid="assessment-type-select"
          >
            <option value="">Select type...</option>
            {ASSESSMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--cortex-text-secondary)]">
            Data Contribution Level
          </label>
          <select
            value={contributionLevel}
            onChange={(e) => setContributionLevel(e.target.value)}
            disabled={locked}
            className="w-full rounded border border-[var(--cortex-border)] px-3 py-2 text-sm disabled:opacity-50"
            data-testid="contribution-level-select"
          >
            <option value="">Select level...</option>
            {CONTRIBUTION_LEVELS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--cortex-text-secondary)]">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={locked}
            rows={3}
            placeholder="Additional assessment notes..."
            className="w-full rounded border border-[var(--cortex-border)] px-3 py-2 text-sm disabled:opacity-50"
            data-testid="assessment-notes"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit || loading}
        className="w-full rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        data-testid="submit-assessment-btn"
      >
        {loading ? 'Submitting...' : 'Submit Assessment'}
      </button>
    </div>
  );
}
