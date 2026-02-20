import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Sparkles, Loader2 } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import { useQueryValidation } from '../hooks/use-query-validation';
import { GENERATE_QUERY_FROM_TEXT } from '../graphql/mutations';

export interface QueryData {
  id: string;
  name: string;
  queryString: string;
  version: number;
  dateFrom?: string | null;
  dateTo?: string | null;
}

interface QueryBuilderProps {
  sessionId: string;
  query?: QueryData;
  onSave: (query: {
    name: string;
    queryString: string;
    dateFrom?: string;
    dateTo?: string;
  }) => void;
  onCancel: () => void;
}

/** Convert an ISO datetime string to YYYY-MM-DD for <input type="date"> */
function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

/** Convert a YYYY-MM-DD date input value to an ISO datetime string */
function fromDateInputValue(value: string): string | undefined {
  if (!value) return undefined;
  return `${value}T00:00:00.000Z`;
}

function highlightSyntax(queryString: string): React.ReactNode[] {
  if (!queryString) return [];

  // Tokenize preserving whitespace and structure
  const parts = queryString.split(/(\bAND\b|\bOR\b|\bNOT\b)/g);

  return parts.map((part, index) => {
    const upper = part.trim().toUpperCase();
    if (upper === 'AND') {
      return (
        <span key={index} className="text-blue-600 font-bold">
          {part}
        </span>
      );
    }
    if (upper === 'OR') {
      return (
        <span key={index} className="text-green-600 font-bold">
          {part}
        </span>
      );
    }
    if (upper === 'NOT') {
      return (
        <span key={index} className="text-red-600 font-bold">
          {part}
        </span>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

export function QueryBuilder({ sessionId, query, onSave, onCancel }: QueryBuilderProps) {
  const [name, setName] = useState(query?.name ?? '');
  const [queryString, setQueryString] = useState(query?.queryString ?? '');
  const [dateFrom, setDateFrom] = useState(toDateInputValue(query?.dateFrom));
  const [dateTo, setDateTo] = useState(toDateInputValue(query?.dateTo));
  const [aiDescription, setAiDescription] = useState('');
  const [aiError, setAiError] = useState<string | null>(null);
  const { isValid, errors } = useQueryValidation(queryString);

  const [generateQuery, { loading: aiLoading }] = useMutation<{
    generateQueryFromText: {
      queryString: string;
      suggestedDateFrom: string | null;
      suggestedDateTo: string | null;
    };
  }>(GENERATE_QUERY_FROM_TEXT);

  async function handleGenerateQuery() {
    if (aiDescription.trim().length < 10) return;
    setAiError(null);

    try {
      const { data } = await generateQuery({
        variables: { sessionId, description: aiDescription.trim() },
      });

      const result = data?.generateQueryFromText;
      if (result) {
        setQueryString(result.queryString);
        if (result.suggestedDateFrom) {
          setDateFrom(toDateInputValue(result.suggestedDateFrom));
        }
        if (result.suggestedDateTo) {
          setDateTo(toDateInputValue(result.suggestedDateTo));
        }
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Failed to generate query');
    }
  }

  function handleSave() {
    if (!name.trim() || !queryString.trim() || !isValid) return;
    onSave({
      name: name.trim(),
      queryString: queryString.trim(),
      dateFrom: fromDateInputValue(dateFrom),
      dateTo: fromDateInputValue(dateTo),
    });
  }

  const hasContent = queryString.trim().length > 0;

  return (
    <div data-testid="query-builder" className="space-y-4">
      {/* AI Query Generation */}
      <div
        className="rounded-md border border-purple-200 bg-purple-50 p-4"
        data-testid="ai-generation-section"
      >
        <label
          htmlFor="ai-description"
          className="mb-1.5 flex items-center gap-2 text-[14px] font-semibold text-[var(--cortex-text-primary)]"
        >
          <Sparkles className="h-4 w-4 text-purple-600" />
          AI Query Generation
        </label>
        <p className="mb-2 text-xs text-[var(--cortex-text-secondary)]">
          Describe your research topic and let AI generate a Boolean query for you.
        </p>
        <div className="flex gap-2">
          <textarea
            id="ai-description"
            value={aiDescription}
            onChange={(e) => setAiDescription(e.target.value)}
            placeholder="e.g. cervical spine arthroplasty clinical outcomes and complications"
            rows={2}
            className="flex-1 rounded-md border border-[var(--cortex-border)] px-3 py-2 text-sm outline-none transition-colors focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            data-testid="ai-description-input"
          />
          <button
            type="button"
            onClick={handleGenerateQuery}
            disabled={aiLoading || aiDescription.trim().length < 10}
            className="self-end rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
            data-testid="generate-query-button"
          >
            {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Generate'}
          </button>
        </div>
        {aiError && (
          <p className="mt-1 text-xs text-red-600" data-testid="ai-error">
            {aiError}
          </p>
        )}
      </div>

      {/* Query Name */}
      <div>
        <label
          htmlFor="query-name"
          className="mb-1.5 block text-[14px] font-semibold text-[var(--cortex-text-primary)]"
        >
          Query Name
        </label>
        <input
          id="query-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Primary Search Strategy"
          className="w-full rounded-md border border-[var(--cortex-border)] px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--cortex-blue-500)] focus:ring-1 focus:ring-[var(--cortex-blue-500)]"
          data-testid="query-name-input"
        />
      </div>

      {/* Date Range */}
      <div data-testid="date-range-section">
        <label className="mb-1.5 block text-[14px] font-semibold text-[var(--cortex-text-primary)]">
          Date Range
        </label>
        <p className="mb-2 text-xs text-[var(--cortex-text-secondary)]">
          Optionally restrict results to publications within a date range.
        </p>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label
              htmlFor="date-from"
              className="mb-1 block text-xs text-[var(--cortex-text-secondary)]"
            >
              From
            </label>
            <input
              id="date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full rounded-md border border-[var(--cortex-border)] px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--cortex-blue-500)] focus:ring-1 focus:ring-[var(--cortex-blue-500)]"
              data-testid="date-from-input"
            />
          </div>
          <div className="flex-1">
            <label
              htmlFor="date-to"
              className="mb-1 block text-xs text-[var(--cortex-text-secondary)]"
            >
              To
            </label>
            <input
              id="date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full rounded-md border border-[var(--cortex-border)] px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--cortex-blue-500)] focus:ring-1 focus:ring-[var(--cortex-blue-500)]"
              data-testid="date-to-input"
            />
          </div>
        </div>
      </div>

      {/* Query Editor */}
      <div>
        <label
          htmlFor="query-string"
          className="mb-1.5 block text-[14px] font-semibold text-[var(--cortex-text-primary)]"
        >
          Boolean Query
        </label>
        <textarea
          id="query-string"
          value={queryString}
          onChange={(e) => setQueryString(e.target.value)}
          placeholder='e.g. ("cervical spine" OR "neck pain") AND treatment[mh]'
          rows={6}
          className={cn(
            'w-full rounded-md border px-3 py-2 font-mono text-sm outline-none transition-colors',
            'focus:border-[var(--cortex-blue-500)] focus:ring-1 focus:ring-[var(--cortex-blue-500)]',
            hasContent && !isValid ? 'border-red-500' : 'border-[var(--cortex-border)]',
          )}
          data-testid="query-string-input"
        />
        {hasContent && errors.length > 0 && (
          <div className="mt-1 space-y-1" data-testid="validation-errors">
            {errors.map((error, index) => (
              <p key={index} className="text-xs text-red-600" role="alert">
                {error}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Syntax Highlight Preview */}
      {hasContent && isValid && (
        <div
          className="rounded-md border border-[var(--cortex-border)] bg-[var(--cortex-bg-secondary)] p-3 font-mono text-sm whitespace-pre-wrap"
          data-testid="syntax-preview"
        >
          {highlightSyntax(queryString)}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-[var(--cortex-border)] px-4 py-2 text-sm font-medium text-[var(--cortex-text-secondary)] hover:bg-[var(--cortex-bg-secondary)]"
          data-testid="cancel-button"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!name.trim() || !queryString.trim() || !isValid}
          className="rounded-md bg-[var(--cortex-blue-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--cortex-blue-600)] disabled:opacity-50"
          data-testid="save-button"
        >
          {query ? 'Update Query' : 'Save Query'}
        </button>
      </div>
    </div>
  );
}
