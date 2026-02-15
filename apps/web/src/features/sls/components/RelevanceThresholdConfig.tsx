import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { Save } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import { GET_RELEVANCE_THRESHOLDS } from '../graphql/queries';
import { CONFIGURE_RELEVANCE_THRESHOLDS } from '../graphql/mutations';

interface RelevanceThresholdsData {
  relevanceThresholds: {
    likelyRelevantThreshold: number;
    uncertainLowerThreshold: number;
  };
}

interface RelevanceThresholdConfigProps {
  sessionId: string;
}

export function RelevanceThresholdConfig({
  sessionId,
}: RelevanceThresholdConfigProps) {
  const { data, loading } = useQuery<RelevanceThresholdsData>(
    GET_RELEVANCE_THRESHOLDS,
    { variables: { sessionId } },
  );

  const [configureThresholds, { loading: saving }] = useMutation(
    CONFIGURE_RELEVANCE_THRESHOLDS,
    {
      refetchQueries: [
        { query: GET_RELEVANCE_THRESHOLDS, variables: { sessionId } },
      ],
    },
  );

  const [upperThreshold, setUpperThreshold] = useState(75);
  const [lowerThreshold, setLowerThreshold] = useState(40);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (data?.relevanceThresholds) {
      setUpperThreshold(data.relevanceThresholds.likelyRelevantThreshold);
      setLowerThreshold(data.relevanceThresholds.uncertainLowerThreshold);
      setIsDirty(false);
    }
  }, [data]);

  const validationErrors: string[] = [];
  if (lowerThreshold >= upperThreshold) {
    validationErrors.push(
      'Lower threshold must be less than upper threshold',
    );
  }
  if (upperThreshold < 0 || upperThreshold > 100) {
    validationErrors.push('Upper threshold must be between 0 and 100');
  }
  if (lowerThreshold < 0 || lowerThreshold > 100) {
    validationErrors.push('Lower threshold must be between 0 and 100');
  }

  const isValid = validationErrors.length === 0;

  const handleSave = useCallback(async () => {
    if (!isValid) return;
    try {
      await configureThresholds({
        variables: {
          sessionId,
          likelyRelevantThreshold: upperThreshold,
          uncertainLowerThreshold: lowerThreshold,
        },
      });
      setIsDirty(false);
    } catch {
      // Error handled by Apollo Client error link
    }
  }, [sessionId, upperThreshold, lowerThreshold, isValid, configureThresholds]);

  const handleUpperChange = useCallback((value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num)) {
      setUpperThreshold(num);
      setIsDirty(true);
    } else if (value === '') {
      setUpperThreshold(0);
      setIsDirty(true);
    }
  }, []);

  const handleLowerChange = useCallback((value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num)) {
      setLowerThreshold(num);
      setIsDirty(true);
    } else if (value === '') {
      setLowerThreshold(0);
      setIsDirty(true);
    }
  }, []);

  if (loading && !data) {
    return (
      <div
        data-testid="relevance-threshold-config"
        className="rounded-lg bg-white p-4 shadow-sm"
      >
        <p className="text-sm text-[var(--cortex-text-muted)]">
          Loading thresholds...
        </p>
      </div>
    );
  }

  return (
    <div
      data-testid="relevance-threshold-config"
      className="rounded-lg bg-white p-4 shadow-sm"
    >
      <h3 className="mb-4 text-sm font-semibold text-[var(--cortex-text-primary)]">
        Relevance Thresholds
      </h3>

      {/* Inputs */}
      <div className="mb-4 grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="upper-threshold"
            className="mb-1.5 block text-xs font-medium text-[var(--cortex-text-secondary)]"
          >
            Likely Relevant threshold
          </label>
          <input
            id="upper-threshold"
            type="number"
            min={0}
            max={100}
            value={upperThreshold}
            onChange={(e) => handleUpperChange(e.target.value)}
            className={cn(
              'w-full rounded-md border px-3 py-2 text-sm outline-none transition-colors',
              'focus:border-[var(--cortex-blue-500)] focus:ring-1 focus:ring-[var(--cortex-blue-500)]',
              !isValid && upperThreshold <= lowerThreshold
                ? 'border-red-500'
                : 'border-[var(--cortex-border)]',
            )}
            data-testid="upper-threshold-input"
          />
        </div>
        <div>
          <label
            htmlFor="lower-threshold"
            className="mb-1.5 block text-xs font-medium text-[var(--cortex-text-secondary)]"
          >
            Uncertain lower threshold
          </label>
          <input
            id="lower-threshold"
            type="number"
            min={0}
            max={100}
            value={lowerThreshold}
            onChange={(e) => handleLowerChange(e.target.value)}
            className={cn(
              'w-full rounded-md border px-3 py-2 text-sm outline-none transition-colors',
              'focus:border-[var(--cortex-blue-500)] focus:ring-1 focus:ring-[var(--cortex-blue-500)]',
              !isValid && lowerThreshold >= upperThreshold
                ? 'border-red-500'
                : 'border-[var(--cortex-border)]',
            )}
            data-testid="lower-threshold-input"
          />
        </div>
      </div>

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <div className="mb-4" data-testid="threshold-validation-errors">
          {validationErrors.map((error, index) => (
            <p key={index} className="text-xs text-red-600" role="alert">
              {error}
            </p>
          ))}
        </div>
      )}

      {/* Visual preview bar */}
      <div className="mb-4" data-testid="threshold-preview">
        <p className="mb-2 text-xs font-medium text-[var(--cortex-text-secondary)]">
          Score ranges preview
        </p>
        <div className="flex h-8 w-full overflow-hidden rounded-md">
          <div
            className="flex items-center justify-center bg-red-400 text-xs font-medium text-white"
            style={{ width: `${Math.max(lowerThreshold, 0)}%` }}
            data-testid="range-irrelevant"
          >
            {lowerThreshold > 10 && (
              <span>0-{lowerThreshold}</span>
            )}
          </div>
          <div
            className="flex items-center justify-center bg-orange-400 text-xs font-medium text-white"
            style={{
              width: `${Math.max(upperThreshold - lowerThreshold, 0)}%`,
            }}
            data-testid="range-uncertain"
          >
            {upperThreshold - lowerThreshold > 10 && (
              <span>
                {lowerThreshold}-{upperThreshold}
              </span>
            )}
          </div>
          <div
            className="flex items-center justify-center bg-emerald-500 text-xs font-medium text-white"
            style={{ width: `${Math.max(100 - upperThreshold, 0)}%` }}
            data-testid="range-relevant"
          >
            {100 - upperThreshold > 10 && (
              <span>{upperThreshold}-100</span>
            )}
          </div>
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-[var(--cortex-text-muted)]">
          <span>Likely Irrelevant</span>
          <span>Uncertain</span>
          <span>Likely Relevant</span>
        </div>
      </div>

      {/* Save button */}
      <button
        type="button"
        data-testid="save-thresholds-button"
        disabled={!isValid || !isDirty || saving}
        onClick={handleSave}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium text-white transition-colors',
          'bg-[var(--cortex-blue-500)] hover:bg-[var(--cortex-blue-600)]',
          'disabled:opacity-50 disabled:cursor-not-allowed',
        )}
      >
        <Save size={14} aria-hidden="true" />
        {saving ? 'Saving...' : 'Save Thresholds'}
      </button>
    </div>
  );
}
