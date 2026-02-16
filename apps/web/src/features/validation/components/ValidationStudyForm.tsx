import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { FileText, Link } from 'lucide-react';

export const CREATE_VALIDATION_STUDY = gql`
  mutation CreateValidationStudy($input: CreateValidationStudyInput!) {
    createValidationStudy(input: $input) {
      id
      name
      type
      status
    }
  }
`;

const STUDY_TYPES = [
  { value: 'STANDALONE', label: 'Standalone Study' },
  { value: 'EQUIVALENCE', label: 'Equivalence Study' },
  { value: 'MRMC', label: 'MRMC Study' },
  { value: 'READER_AGREEMENT', label: 'Reader Agreement Study' },
  { value: 'PIVOTAL', label: 'Pivotal Study' },
  { value: 'FEASIBILITY', label: 'Feasibility Study' },
];

interface ValidationStudyFormProps {
  onSuccess?: (studyId: string) => void;
  onCancel?: () => void;
}

export function ValidationStudyForm({ onSuccess, onCancel }: ValidationStudyFormProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState('STANDALONE');
  const [description, setDescription] = useState('');
  const [soaAnalysisId, setSoaAnalysisId] = useState('');

  const [createStudy, { loading }] = useMutation<any>(CREATE_VALIDATION_STUDY);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = await createStudy({
      variables: {
        input: {
          name,
          type,
          description: description || undefined,
          soaAnalysisId: soaAnalysisId || undefined,
        },
      },
    });

    if (result.data?.createValidationStudy) {
      onSuccess?.(result.data.createValidationStudy.id);
    }
  };

  const isValid = name.trim() && type;

  return (
    <form onSubmit={handleSubmit} className="space-y-6" data-testid="validation-study-form">
      <div>
        <label
          htmlFor="study-name"
          className="mb-1 block text-sm font-medium text-[var(--cortex-text-primary)]"
        >
          Study Name <span className="text-red-500">*</span>
        </label>
        <input
          id="study-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter study name"
          className="w-full rounded border border-[var(--cortex-border)] px-3 py-2 text-sm focus:border-[var(--cortex-primary)] focus:outline-none"
          data-testid="study-name-input"
          required
        />
      </div>

      <div>
        <label
          htmlFor="study-type"
          className="mb-1 block text-sm font-medium text-[var(--cortex-text-primary)]"
        >
          Study Type <span className="text-red-500">*</span>
        </label>
        <select
          id="study-type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full rounded border border-[var(--cortex-border)] px-3 py-2 text-sm focus:border-[var(--cortex-primary)] focus:outline-none"
          data-testid="study-type-select"
          required
        >
          {STUDY_TYPES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="study-description"
          className="mb-1 block text-sm font-medium text-[var(--cortex-text-primary)]"
        >
          Description
        </label>
        <textarea
          id="study-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Provide a brief description of the study"
          rows={4}
          className="w-full rounded border border-[var(--cortex-border)] px-3 py-2 text-sm focus:border-[var(--cortex-primary)] focus:outline-none"
          data-testid="study-description-input"
        />
      </div>

      <div>
        <label
          htmlFor="soa-link"
          className="mb-1 flex items-center gap-2 text-sm font-medium text-[var(--cortex-text-primary)]"
        >
          <Link size={14} />
          Link to SOA Analysis
        </label>
        <input
          id="soa-link"
          type="text"
          value={soaAnalysisId}
          onChange={(e) => setSoaAnalysisId(e.target.value)}
          placeholder="Enter SOA Analysis ID (optional)"
          className="w-full rounded border border-[var(--cortex-border)] px-3 py-2 text-sm focus:border-[var(--cortex-primary)] focus:outline-none"
          data-testid="soa-link-input"
        />
        <p className="mt-1 text-xs text-[var(--cortex-text-muted)]">
          Link this validation study to an existing SOA analysis for reference.
        </p>
      </div>

      <div className="flex justify-end gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-[var(--cortex-border)] px-4 py-2 text-sm text-[var(--cortex-text-secondary)] hover:bg-[var(--cortex-bg-hover)]"
            data-testid="cancel-btn"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={!isValid || loading}
          className="inline-flex items-center gap-2 rounded bg-[var(--cortex-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--cortex-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="submit-btn"
        >
          <FileText size={16} />
          {loading ? 'Creating...' : 'Create Study'}
        </button>
      </div>
    </form>
  );
}
