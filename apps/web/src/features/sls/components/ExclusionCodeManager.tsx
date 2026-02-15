import { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import {
  Plus,
  ArrowUp,
  ArrowDown,
  Pencil,
  EyeOff,
  Eye,
  Check,
  X,
} from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import { GET_EXCLUSION_CODES } from '../graphql/queries';
import {
  ADD_EXCLUSION_CODE,
  RENAME_EXCLUSION_CODE,
  HIDE_EXCLUSION_CODE,
  REORDER_EXCLUSION_CODES,
} from '../graphql/mutations';

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

interface ExclusionCodeManagerProps {
  sessionId: string;
}

export function ExclusionCodeManager({ sessionId }: ExclusionCodeManagerProps) {
  const { data, loading } = useQuery<ExclusionCodesData>(GET_EXCLUSION_CODES, {
    variables: { sessionId },
  });

  const [addExclusionCode] = useMutation(ADD_EXCLUSION_CODE, {
    refetchQueries: [{ query: GET_EXCLUSION_CODES, variables: { sessionId } }],
  });

  const [renameExclusionCode] = useMutation(RENAME_EXCLUSION_CODE, {
    refetchQueries: [{ query: GET_EXCLUSION_CODES, variables: { sessionId } }],
  });

  const [hideExclusionCode] = useMutation(HIDE_EXCLUSION_CODE, {
    refetchQueries: [{ query: GET_EXCLUSION_CODES, variables: { sessionId } }],
  });

  const [reorderExclusionCodes] = useMutation(REORDER_EXCLUSION_CODES, {
    refetchQueries: [{ query: GET_EXCLUSION_CODES, variables: { sessionId } }],
  });

  const [showAddForm, setShowAddForm] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newShortCode, setNewShortCode] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editShortCode, setEditShortCode] = useState('');

  const [confirmHideId, setConfirmHideId] = useState<string | null>(null);

  const codes = data?.exclusionCodes
    ? [...data.exclusionCodes].sort((a, b) => a.displayOrder - b.displayOrder)
    : [];

  const handleAdd = useCallback(async () => {
    if (!newCode.trim() || !newShortCode.trim() || !newLabel.trim()) return;
    try {
      await addExclusionCode({
        variables: {
          sessionId,
          code: newCode.trim(),
          shortCode: newShortCode.trim(),
          label: newLabel.trim(),
          description: newDescription.trim() || null,
        },
      });
      setNewCode('');
      setNewShortCode('');
      setNewLabel('');
      setNewDescription('');
      setShowAddForm(false);
    } catch {
      // Error handled by Apollo Client error link
    }
  }, [
    sessionId,
    newCode,
    newShortCode,
    newLabel,
    newDescription,
    addExclusionCode,
  ]);

  const handleStartEdit = useCallback(
    (code: ExclusionCode) => {
      setEditingId(code.id);
      setEditLabel(code.label);
      setEditShortCode(code.shortCode);
    },
    [],
  );

  const handleSaveEdit = useCallback(async () => {
    if (!editingId || !editLabel.trim()) return;
    try {
      await renameExclusionCode({
        variables: {
          id: editingId,
          label: editLabel.trim(),
          shortCode: editShortCode.trim() || null,
        },
      });
      setEditingId(null);
    } catch {
      // Error handled by Apollo Client error link
    }
  }, [editingId, editLabel, editShortCode, renameExclusionCode]);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
  }, []);

  const handleToggleHide = useCallback(
    async (code: ExclusionCode) => {
      if (!code.isHidden) {
        setConfirmHideId(code.id);
        return;
      }
      try {
        await hideExclusionCode({ variables: { id: code.id } });
      } catch {
        // Error handled by Apollo Client error link
      }
    },
    [hideExclusionCode],
  );

  const handleConfirmHide = useCallback(async () => {
    if (!confirmHideId) return;
    try {
      await hideExclusionCode({ variables: { id: confirmHideId } });
      setConfirmHideId(null);
    } catch {
      // Error handled by Apollo Client error link
    }
  }, [confirmHideId, hideExclusionCode]);

  const handleCancelHide = useCallback(() => {
    setConfirmHideId(null);
  }, []);

  const handleMoveUp = useCallback(
    async (index: number) => {
      if (index <= 0) return;
      const newOrder = [...codes];
      const temp = newOrder[index]!;
      newOrder[index] = newOrder[index - 1]!;
      newOrder[index - 1] = temp;
      try {
        await reorderExclusionCodes({
          variables: {
            sessionId,
            orderedIds: newOrder.map((c) => c.id),
          },
        });
      } catch {
        // Error handled by Apollo Client error link
      }
    },
    [codes, sessionId, reorderExclusionCodes],
  );

  const handleMoveDown = useCallback(
    async (index: number) => {
      if (index >= codes.length - 1) return;
      const newOrder = [...codes];
      const temp = newOrder[index]!;
      newOrder[index] = newOrder[index + 1]!;
      newOrder[index + 1] = temp;
      try {
        await reorderExclusionCodes({
          variables: {
            sessionId,
            orderedIds: newOrder.map((c) => c.id),
          },
        });
      } catch {
        // Error handled by Apollo Client error link
      }
    },
    [codes, sessionId, reorderExclusionCodes],
  );

  if (loading && !data) {
    return (
      <div
        data-testid="exclusion-code-manager"
        className="rounded-lg bg-white p-4 shadow-sm"
      >
        <p className="text-sm text-[var(--cortex-text-muted)]">
          Loading exclusion codes...
        </p>
      </div>
    );
  }

  return (
    <div data-testid="exclusion-code-manager" className="rounded-lg bg-white p-4 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-[var(--cortex-text-primary)]">
        Exclusion Codes
      </h3>

      {/* Confirmation dialog */}
      {confirmHideId && (
        <div
          data-testid="hide-confirmation-dialog"
          className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3"
        >
          <p className="mb-2 text-sm text-amber-800">
            This code may be in use. Are you sure you want to hide it?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              data-testid="confirm-hide-button"
              className="rounded bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700"
              onClick={handleConfirmHide}
            >
              Yes, Hide
            </button>
            <button
              type="button"
              data-testid="cancel-hide-button"
              className="rounded border border-[var(--cortex-border)] px-3 py-1 text-xs font-medium text-[var(--cortex-text-secondary)] hover:bg-gray-50"
              onClick={handleCancelHide}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Code list */}
      <div className="space-y-2" data-testid="exclusion-code-list">
        {codes.map((code, index) => (
          <div
            key={code.id}
            data-testid={`exclusion-code-${code.id}`}
            className={cn(
              'flex items-center gap-3 rounded-md border border-[var(--cortex-border)] p-3',
              code.isHidden && 'opacity-50',
            )}
          >
            {/* Reorder buttons */}
            <div className="flex flex-col gap-0.5">
              <button
                type="button"
                data-testid={`move-up-${code.id}`}
                disabled={index === 0}
                onClick={() => handleMoveUp(index)}
                className="rounded p-0.5 text-[var(--cortex-text-muted)] hover:bg-gray-100 disabled:opacity-30"
                aria-label={`Move ${code.label} up`}
              >
                <ArrowUp size={14} aria-hidden="true" />
              </button>
              <button
                type="button"
                data-testid={`move-down-${code.id}`}
                disabled={index === codes.length - 1}
                onClick={() => handleMoveDown(index)}
                className="rounded p-0.5 text-[var(--cortex-text-muted)] hover:bg-gray-100 disabled:opacity-30"
                aria-label={`Move ${code.label} down`}
              >
                <ArrowDown size={14} aria-hidden="true" />
              </button>
            </div>

            {/* Short code badge */}
            <span
              data-testid={`short-code-badge-${code.id}`}
              className="inline-flex min-w-[2.5rem] items-center justify-center rounded-full bg-[var(--cortex-blue-500)] px-2 py-0.5 text-xs font-bold text-white"
            >
              {code.shortCode}
            </span>

            {/* Label & description */}
            <div className="flex-1 min-w-0">
              {editingId === code.id ? (
                <div className="flex items-center gap-2" data-testid={`edit-form-${code.id}`}>
                  <input
                    type="text"
                    value={editShortCode}
                    onChange={(e) => setEditShortCode(e.target.value)}
                    className="w-16 rounded border border-[var(--cortex-border)] px-2 py-1 text-xs"
                    data-testid={`edit-short-code-input-${code.id}`}
                    placeholder="Code"
                  />
                  <input
                    type="text"
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    className="flex-1 rounded border border-[var(--cortex-border)] px-2 py-1 text-sm"
                    data-testid={`edit-label-input-${code.id}`}
                    placeholder="Label"
                  />
                  <button
                    type="button"
                    data-testid={`save-edit-${code.id}`}
                    onClick={handleSaveEdit}
                    className="rounded p-1 text-emerald-600 hover:bg-emerald-50"
                    aria-label="Save"
                  >
                    <Check size={14} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    data-testid={`cancel-edit-${code.id}`}
                    onClick={handleCancelEdit}
                    className="rounded p-1 text-red-600 hover:bg-red-50"
                    aria-label="Cancel edit"
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <div>
                  <p
                    className={cn(
                      'text-sm font-medium text-[var(--cortex-text-primary)]',
                      code.isHidden && 'line-through',
                    )}
                    data-testid={`code-label-${code.id}`}
                  >
                    {code.label}
                  </p>
                  {code.description && (
                    <p
                      className="text-xs text-[var(--cortex-text-muted)] truncate"
                      data-testid={`code-description-${code.id}`}
                    >
                      {code.description}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Hidden indicator */}
            {code.isHidden && (
              <span
                data-testid={`hidden-indicator-${code.id}`}
                className="text-xs text-[var(--cortex-text-muted)]"
              >
                Hidden
              </span>
            )}

            {/* Actions */}
            {editingId !== code.id && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  data-testid={`edit-code-${code.id}`}
                  onClick={() => handleStartEdit(code)}
                  className="rounded p-1.5 text-[var(--cortex-text-muted)] hover:bg-gray-100"
                  aria-label={`Edit ${code.label}`}
                >
                  <Pencil size={14} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  data-testid={`toggle-hide-${code.id}`}
                  onClick={() => handleToggleHide(code)}
                  className="rounded p-1.5 text-[var(--cortex-text-muted)] hover:bg-gray-100"
                  aria-label={code.isHidden ? `Show ${code.label}` : `Hide ${code.label}`}
                >
                  {code.isHidden ? (
                    <Eye size={14} aria-hidden="true" />
                  ) : (
                    <EyeOff size={14} aria-hidden="true" />
                  )}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {codes.length === 0 && !loading && (
        <p
          className="py-4 text-center text-sm text-[var(--cortex-text-muted)]"
          data-testid="empty-codes"
        >
          No exclusion codes defined yet.
        </p>
      )}

      {/* Add code form */}
      {showAddForm ? (
        <div
          data-testid="add-code-form"
          className="mt-4 space-y-3 rounded-md border border-[var(--cortex-border)] p-3"
        >
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label
                htmlFor="new-short-code"
                className="mb-1 block text-xs font-medium text-[var(--cortex-text-secondary)]"
              >
                Short Code
              </label>
              <input
                id="new-short-code"
                type="text"
                value={newShortCode}
                onChange={(e) => setNewShortCode(e.target.value)}
                placeholder="E1"
                className="w-full rounded border border-[var(--cortex-border)] px-2 py-1.5 text-sm outline-none focus:border-[var(--cortex-blue-500)]"
                data-testid="new-short-code-input"
              />
            </div>
            <div>
              <label
                htmlFor="new-code"
                className="mb-1 block text-xs font-medium text-[var(--cortex-text-secondary)]"
              >
                Code
              </label>
              <input
                id="new-code"
                type="text"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                placeholder="WRONG_POPULATION"
                className="w-full rounded border border-[var(--cortex-border)] px-2 py-1.5 text-sm outline-none focus:border-[var(--cortex-blue-500)]"
                data-testid="new-code-input"
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="new-label"
              className="mb-1 block text-xs font-medium text-[var(--cortex-text-secondary)]"
            >
              Label
            </label>
            <input
              id="new-label"
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Wrong population"
              className="w-full rounded border border-[var(--cortex-border)] px-2 py-1.5 text-sm outline-none focus:border-[var(--cortex-blue-500)]"
              data-testid="new-label-input"
            />
          </div>
          <div>
            <label
              htmlFor="new-description"
              className="mb-1 block text-xs font-medium text-[var(--cortex-text-secondary)]"
            >
              Description (optional)
            </label>
            <input
              id="new-description"
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Study population does not match PICO criteria"
              className="w-full rounded border border-[var(--cortex-border)] px-2 py-1.5 text-sm outline-none focus:border-[var(--cortex-blue-500)]"
              data-testid="new-description-input"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="save-new-code-button"
              disabled={!newCode.trim() || !newShortCode.trim() || !newLabel.trim()}
              onClick={handleAdd}
              className="rounded bg-[var(--cortex-blue-500)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--cortex-blue-600)] disabled:opacity-50"
            >
              Save Code
            </button>
            <button
              type="button"
              data-testid="cancel-add-button"
              onClick={() => {
                setShowAddForm(false);
                setNewCode('');
                setNewShortCode('');
                setNewLabel('');
                setNewDescription('');
              }}
              className="rounded border border-[var(--cortex-border)] px-3 py-1.5 text-xs font-medium text-[var(--cortex-text-secondary)] hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          data-testid="add-code-button"
          onClick={() => setShowAddForm(true)}
          className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-dashed border-[var(--cortex-border)] px-3 py-2 text-sm font-medium text-[var(--cortex-text-secondary)] hover:border-[var(--cortex-blue-500)] hover:text-[var(--cortex-blue-500)]"
        >
          <Plus size={14} aria-hidden="true" />
          Add Code
        </button>
      )}
    </div>
  );
}
