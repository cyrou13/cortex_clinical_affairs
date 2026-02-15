import { useQuery } from '@apollo/client/react';
import { cn } from '../../../shared/utils/cn';
import { GET_EXCLUSION_CODES } from '../graphql/queries';

interface ExclusionCode {
  id: string;
  code: string;
  label: string;
  shortCode: string;
  description: string | null;
  isHidden: boolean;
  displayOrder: number;
}

interface ExclusionCodesData {
  exclusionCodes: ExclusionCode[];
}

interface ExclusionCodeSelectorProps {
  sessionId: string;
  value: string | null;
  onChange: (codeId: string | null) => void;
}

export function ExclusionCodeSelector({
  sessionId,
  value,
  onChange,
}: ExclusionCodeSelectorProps) {
  const { data, loading } = useQuery<ExclusionCodesData>(GET_EXCLUSION_CODES, {
    variables: { sessionId },
  });

  const visibleCodes = (data?.exclusionCodes ?? [])
    .filter((code) => !code.isHidden)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div data-testid="exclusion-code-selector">
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={loading}
        className={cn(
          'w-full rounded-md border border-[var(--cortex-border)] px-3 py-2 text-sm outline-none transition-colors',
          'focus:border-[var(--cortex-blue-500)] focus:ring-1 focus:ring-[var(--cortex-blue-500)]',
          'bg-white',
          loading && 'opacity-50 cursor-not-allowed',
        )}
        data-testid="exclusion-code-select"
        aria-label="Select exclusion code"
      >
        <option value="">-- No exclusion code --</option>
        {visibleCodes.map((code) => (
          <option
            key={code.id}
            value={code.id}
            data-testid={`option-${code.id}`}
          >
            {code.shortCode} - {code.label}
          </option>
        ))}
      </select>
    </div>
  );
}
