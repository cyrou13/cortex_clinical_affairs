import { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { Plus, Pencil, Trash2, Play, X, Check } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import { GET_CUSTOM_AI_FILTERS } from '../graphql/queries';
import {
  CREATE_CUSTOM_AI_FILTER,
  UPDATE_CUSTOM_AI_FILTER,
  DELETE_CUSTOM_AI_FILTER,
  LAUNCH_CUSTOM_FILTER_SCORING,
} from '../graphql/mutations';

interface CustomAiFilter {
  id: string;
  name: string;
  criterion: string;
  isActive: boolean;
  createdAt: string;
}

interface CustomAiFiltersData {
  customAiFilters: CustomAiFilter[];
}

interface LaunchScoringData {
  launchCustomFilterScoring: {
    taskId: string;
  };
}

interface CustomAiFilterEditorProps {
  sessionId: string;
}

export function CustomAiFilterEditor({
  sessionId,
}: CustomAiFilterEditorProps) {
  const { data, loading } = useQuery<CustomAiFiltersData>(
    GET_CUSTOM_AI_FILTERS,
    { variables: { sessionId } },
  );

  const refetchConfig = {
    refetchQueries: [
      { query: GET_CUSTOM_AI_FILTERS, variables: { sessionId } },
    ],
  };

  const [createFilter] = useMutation(CREATE_CUSTOM_AI_FILTER, refetchConfig);
  const [updateFilter] = useMutation(UPDATE_CUSTOM_AI_FILTER, refetchConfig);
  const [deleteFilter] = useMutation(DELETE_CUSTOM_AI_FILTER, refetchConfig);
  const [launchScoring, { loading: launching }] = useMutation<LaunchScoringData>(
    LAUNCH_CUSTOM_FILTER_SCORING,
  );

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCriterion, setNewCriterion] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCriterion, setEditCriterion] = useState('');

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [scoringTaskId, setScoringTaskId] = useState<string | null>(null);

  const filters = data?.customAiFilters ?? [];

  const handleCreate = useCallback(async () => {
    if (!newName.trim() || !newCriterion.trim()) return;
    try {
      await createFilter({
        variables: {
          sessionId,
          name: newName.trim(),
          criterion: newCriterion.trim(),
        },
      });
      setNewName('');
      setNewCriterion('');
      setShowCreateForm(false);
    } catch {
      // Error handled by Apollo Client error link
    }
  }, [sessionId, newName, newCriterion, createFilter]);

  const handleStartEdit = useCallback((filter: CustomAiFilter) => {
    setEditingId(filter.id);
    setEditName(filter.name);
    setEditCriterion(filter.criterion);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingId || !editName.trim() || !editCriterion.trim()) return;
    try {
      await updateFilter({
        variables: {
          id: editingId,
          name: editName.trim(),
          criterion: editCriterion.trim(),
        },
      });
      setEditingId(null);
    } catch {
      // Error handled by Apollo Client error link
    }
  }, [editingId, editName, editCriterion, updateFilter]);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteFilter({ variables: { id } });
        setConfirmDeleteId(null);
      } catch {
        // Error handled by Apollo Client error link
      }
    },
    [deleteFilter],
  );

  const handleLaunchScoring = useCallback(
    async (filterId: string) => {
      try {
        const result = await launchScoring({
          variables: { sessionId, filterId },
        });
        const taskId = result.data?.launchCustomFilterScoring?.taskId;
        if (taskId) {
          setScoringTaskId(taskId);
        }
      } catch {
        // Error handled by Apollo Client error link
      }
    },
    [sessionId, launchScoring],
  );

  if (loading && !data) {
    return (
      <div
        data-testid="custom-ai-filter-editor"
        className="rounded-lg bg-white p-4 shadow-sm"
      >
        <p className="text-sm text-[var(--cortex-text-muted)]">
          Loading custom filters...
        </p>
      </div>
    );
  }

  return (
    <div
      data-testid="custom-ai-filter-editor"
      className="rounded-lg bg-white p-4 shadow-sm"
    >
      <h3 className="mb-4 text-sm font-semibold text-[var(--cortex-text-primary)]">
        Custom AI Filters
      </h3>

      {/* Scoring task ID display */}
      {scoringTaskId && (
        <div
          data-testid="scoring-task-launched"
          className="mb-4 rounded-md border border-emerald-300 bg-emerald-50 p-3"
        >
          <p className="text-sm text-emerald-800">
            Filter scoring launched (task: {scoringTaskId})
          </p>
          <button
            type="button"
            data-testid="dismiss-scoring-task"
            onClick={() => setScoringTaskId(null)}
            className="mt-1 text-xs text-emerald-600 underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Existing filters list */}
      <div className="space-y-3" data-testid="filter-list">
        {filters.map((filter) => (
          <div
            key={filter.id}
            data-testid={`filter-item-${filter.id}`}
            className="rounded-md border border-[var(--cortex-border)] p-3"
          >
            {editingId === filter.id ? (
              <div data-testid={`edit-filter-form-${filter.id}`} className="space-y-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded border border-[var(--cortex-border)] px-2 py-1.5 text-sm outline-none focus:border-[var(--cortex-blue-500)]"
                  data-testid={`edit-filter-name-${filter.id}`}
                  placeholder="Filter name"
                />
                <textarea
                  value={editCriterion}
                  onChange={(e) => setEditCriterion(e.target.value)}
                  rows={3}
                  className="w-full rounded border border-[var(--cortex-border)] px-2 py-1.5 text-sm outline-none focus:border-[var(--cortex-blue-500)]"
                  data-testid={`edit-filter-criterion-${filter.id}`}
                  placeholder="Describe your custom filtering criterion..."
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    data-testid={`save-filter-edit-${filter.id}`}
                    onClick={handleSaveEdit}
                    disabled={!editName.trim() || !editCriterion.trim()}
                    className="inline-flex items-center gap-1 rounded bg-[var(--cortex-blue-500)] px-2 py-1 text-xs font-medium text-white hover:bg-[var(--cortex-blue-600)] disabled:opacity-50"
                  >
                    <Check size={12} aria-hidden="true" />
                    Save
                  </button>
                  <button
                    type="button"
                    data-testid={`cancel-filter-edit-${filter.id}`}
                    onClick={handleCancelEdit}
                    className="inline-flex items-center gap-1 rounded border border-[var(--cortex-border)] px-2 py-1 text-xs font-medium text-[var(--cortex-text-secondary)] hover:bg-gray-50"
                  >
                    <X size={12} aria-hidden="true" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <h4
                    className="text-sm font-medium text-[var(--cortex-text-primary)]"
                    data-testid={`filter-name-${filter.id}`}
                  >
                    {filter.name}
                  </h4>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      data-testid={`launch-scoring-${filter.id}`}
                      onClick={() => handleLaunchScoring(filter.id)}
                      disabled={launching}
                      className={cn(
                        'inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors',
                        'text-emerald-600 hover:bg-emerald-50',
                        launching && 'cursor-not-allowed opacity-50',
                      )}
                      aria-label={`Launch scoring for ${filter.name}`}
                    >
                      <Play size={12} aria-hidden="true" />
                      Score
                    </button>
                    <button
                      type="button"
                      data-testid={`edit-filter-${filter.id}`}
                      onClick={() => handleStartEdit(filter)}
                      className="rounded p-1.5 text-[var(--cortex-text-muted)] hover:bg-gray-100"
                      aria-label={`Edit ${filter.name}`}
                    >
                      <Pencil size={14} aria-hidden="true" />
                    </button>
                    {confirmDeleteId === filter.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          data-testid={`confirm-delete-${filter.id}`}
                          onClick={() => handleDelete(filter.id)}
                          className="rounded bg-red-500 px-2 py-1 text-xs font-medium text-white hover:bg-red-600"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          data-testid={`cancel-delete-${filter.id}`}
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded border border-[var(--cortex-border)] px-2 py-1 text-xs font-medium text-[var(--cortex-text-secondary)] hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        data-testid={`delete-filter-${filter.id}`}
                        onClick={() => setConfirmDeleteId(filter.id)}
                        className="rounded p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600"
                        aria-label={`Delete ${filter.name}`}
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
                <p
                  className="text-xs text-[var(--cortex-text-muted)]"
                  data-testid={`filter-criterion-${filter.id}`}
                >
                  {filter.criterion}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {filters.length === 0 && !loading && (
        <p
          className="py-4 text-center text-sm text-[var(--cortex-text-muted)]"
          data-testid="empty-filters"
        >
          No custom filters created yet.
        </p>
      )}

      {/* Create form */}
      {showCreateForm ? (
        <div
          data-testid="create-filter-form"
          className="mt-4 space-y-3 rounded-md border border-[var(--cortex-border)] p-3"
        >
          <div>
            <label
              htmlFor="filter-name"
              className="mb-1 block text-xs font-medium text-[var(--cortex-text-secondary)]"
            >
              Filter Name
            </label>
            <input
              id="filter-name"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Study design filter"
              className="w-full rounded border border-[var(--cortex-border)] px-2 py-1.5 text-sm outline-none focus:border-[var(--cortex-blue-500)]"
              data-testid="new-filter-name-input"
            />
          </div>
          <div>
            <label
              htmlFor="filter-criterion"
              className="mb-1 block text-xs font-medium text-[var(--cortex-text-secondary)]"
            >
              Criterion
            </label>
            <textarea
              id="filter-criterion"
              value={newCriterion}
              onChange={(e) => setNewCriterion(e.target.value)}
              rows={4}
              placeholder="Describe your custom filtering criterion..."
              className="w-full rounded border border-[var(--cortex-border)] px-2 py-1.5 text-sm outline-none focus:border-[var(--cortex-blue-500)]"
              data-testid="new-filter-criterion-input"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="save-new-filter-button"
              disabled={!newName.trim() || !newCriterion.trim()}
              onClick={handleCreate}
              className="rounded bg-[var(--cortex-blue-500)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--cortex-blue-600)] disabled:opacity-50"
            >
              Create Filter
            </button>
            <button
              type="button"
              data-testid="cancel-create-filter-button"
              onClick={() => {
                setShowCreateForm(false);
                setNewName('');
                setNewCriterion('');
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
          data-testid="add-filter-button"
          onClick={() => setShowCreateForm(true)}
          className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-dashed border-[var(--cortex-border)] px-3 py-2 text-sm font-medium text-[var(--cortex-text-secondary)] hover:border-[var(--cortex-blue-500)] hover:text-[var(--cortex-blue-500)]"
        >
          <Plus size={14} aria-hidden="true" />
          Add Filter
        </button>
      )}
    </div>
  );
}
