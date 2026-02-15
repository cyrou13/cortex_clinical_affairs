import { useState } from 'react';
import { cn } from '../../../shared/utils/cn';
import { useQueryValidation } from '../hooks/use-query-validation';

export interface QueryData {
  id: string;
  name: string;
  queryString: string;
  version: number;
}

interface QueryBuilderProps {
  sessionId: string;
  query?: QueryData;
  onSave: (query: { name: string; queryString: string }) => void;
  onCancel: () => void;
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

export function QueryBuilder({
  query,
  onSave,
  onCancel,
}: QueryBuilderProps) {
  const [name, setName] = useState(query?.name ?? '');
  const [queryString, setQueryString] = useState(query?.queryString ?? '');
  const { isValid, errors } = useQueryValidation(queryString);

  function handleSave() {
    if (!name.trim() || !queryString.trim() || !isValid) return;
    onSave({ name: name.trim(), queryString: queryString.trim() });
  }

  const hasContent = queryString.trim().length > 0;

  return (
    <div data-testid="query-builder" className="space-y-4">
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
            hasContent && !isValid
              ? 'border-red-500'
              : 'border-[var(--cortex-border)]',
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
