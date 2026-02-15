import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Search, Loader2 } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import { EXECUTE_QUERY } from '../graphql/mutations';

interface ExecuteQueryData {
  executeQuery: {
    id: string;
    status: string;
  };
}

interface ExecuteQueryVars {
  queryId: string;
  databases: string[];
}

const DATABASES = [
  { id: 'pubmed', label: 'PubMed', defaultChecked: true },
  { id: 'cochrane', label: 'Cochrane', defaultChecked: false },
  { id: 'embase', label: 'Embase', defaultChecked: false },
] as const;

interface ExecuteQueryButtonProps {
  queryId: string;
  sessionId: string;
  sessionStatus: string;
  hasValidationErrors: boolean;
  onExecutionStarted: (executionId: string) => void;
}

export function ExecuteQueryButton({
  queryId,
  sessionId,
  sessionStatus,
  hasValidationErrors,
  onExecutionStarted,
}: ExecuteQueryButtonProps) {
  const [selectedDatabases, setSelectedDatabases] = useState<string[]>(['pubmed']);
  const [isOpen, setIsOpen] = useState(false);

  const [executeQuery, { loading }] = useMutation<ExecuteQueryData, ExecuteQueryVars>(EXECUTE_QUERY);

  const isDisabled =
    hasValidationErrors || sessionStatus === 'LOCKED' || loading;

  function handleToggleDatabase(dbId: string) {
    setSelectedDatabases((prev) =>
      prev.includes(dbId)
        ? prev.filter((d) => d !== dbId)
        : [...prev, dbId],
    );
  }

  async function handleExecute() {
    if (isDisabled || selectedDatabases.length === 0) return;

    try {
      const result = await executeQuery({
        variables: {
          queryId,
          databases: selectedDatabases,
        },
      });

      const executionId = result.data?.executeQuery?.id;
      if (executionId) {
        onExecutionStarted(executionId);
        setIsOpen(false);
      }
    } catch {
      // Error is handled by Apollo Client error link
    }
  }

  return (
    <div className="relative" data-testid="execute-query-container">
      <button
        type="button"
        data-testid="execute-query-toggle"
        className={cn(
          'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-colors',
          isDisabled
            ? 'cursor-not-allowed bg-gray-100 text-gray-400'
            : 'bg-[var(--cortex-blue-600)] text-white hover:bg-[var(--cortex-blue-700)]',
        )}
        disabled={isDisabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
        ) : (
          <Search size={16} aria-hidden="true" />
        )}
        {loading ? 'Executing...' : 'Execute Query'}
      </button>

      {isOpen && !isDisabled && (
        <div
          className="absolute right-0 top-full z-10 mt-2 w-64 rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200"
          data-testid="database-selector"
        >
          <p className="mb-3 text-sm font-medium text-[var(--cortex-text-secondary)]">
            Select databases
          </p>

          <div className="space-y-2">
            {DATABASES.map((db) => (
              <label
                key={db.id}
                className="flex items-center gap-2 text-sm text-[var(--cortex-text-primary)]"
              >
                <input
                  type="checkbox"
                  data-testid={`db-checkbox-${db.id}`}
                  checked={selectedDatabases.includes(db.id)}
                  onChange={() => handleToggleDatabase(db.id)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                {db.label}
              </label>
            ))}
          </div>

          <button
            type="button"
            data-testid="execute-button"
            className={cn(
              'mt-4 w-full rounded-lg px-3 py-2 text-sm font-medium shadow-sm transition-colors',
              selectedDatabases.length === 0
                ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                : 'bg-[var(--cortex-blue-600)] text-white hover:bg-[var(--cortex-blue-700)]',
            )}
            disabled={selectedDatabases.length === 0 || loading}
            onClick={handleExecute}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                Executing...
              </span>
            ) : (
              `Execute on ${selectedDatabases.length} database${selectedDatabases.length !== 1 ? 's' : ''}`
            )}
          </button>
        </div>
      )}
    </div>
  );
}
