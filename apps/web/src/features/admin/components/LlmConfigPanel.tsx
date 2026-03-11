import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { Brain, Edit2, Plus, Trash2 } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import { GET_LLM_CONFIGS, GET_LLM_COST_SUMMARY } from '../graphql/queries';
import { CREATE_LLM_CONFIG, UPDATE_LLM_CONFIG, DELETE_LLM_CONFIG } from '../graphql/mutations';
import { ProviderHealthIndicator } from './ProviderHealthIndicator';

type Tab = 'system' | 'project' | 'cost';

const TASK_TYPES = ['scoring', 'extraction', 'drafting', 'metadata_extraction'] as const;

const TASK_TYPE_LABELS: Record<string, string> = {
  scoring: 'Scoring',
  extraction: 'Extraction',
  drafting: 'Drafting',
  metadata_extraction: 'Metadata Extraction',
};

const PROVIDERS = ['claude', 'openai', 'ollama'] as const;

const PROVIDER_LABELS: Record<string, string> = {
  claude: 'Claude',
  openai: 'OpenAI',
  ollama: 'Ollama',
};

const MODELS_BY_PROVIDER: Record<string, string[]> = {
  claude: ['claude-sonnet-4-20250514', 'claude-haiku-4-20250414'],
  openai: ['gpt-4o', 'gpt-4o-mini'],
  ollama: ['llama3', 'mistral', 'codellama'],
};

interface LlmConfig {
  id: string;
  level: string;
  projectId: string | null;
  taskType: string;
  provider: string;
  model: string;
  isActive: boolean;
  createdAt: string;
}

interface CostBreakdownEntry {
  key: string;
  costUsd: number;
  requestCount: number;
}

interface CostSummary {
  totalCostUsd: number;
  byProvider: CostBreakdownEntry[];
  byTaskType: CostBreakdownEntry[];
}

function timeRangeToDateRange(range: string): { startDate: string; endDate: string } | null {
  if (range === 'all') return null;
  const now = new Date();
  const end = now.toISOString();
  if (range === '24h') {
    const start = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    return { startDate: start, endDate: end };
  }
  if (range === '7d') {
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    return { startDate: start, endDate: end };
  }
  if (range === '30d') {
    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    return { startDate: start, endDate: end };
  }
  return null;
}

export function LlmConfigPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('system');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editProvider, setEditProvider] = useState('');
  const [editModel, setEditModel] = useState('');
  // For system tab: track which task type is being created inline
  const [creatingTaskType, setCreatingTaskType] = useState<string | null>(null);
  const [createProvider, setCreateProvider] = useState(PROVIDERS[0] as string);
  const [createModel, setCreateModel] = useState(MODELS_BY_PROVIDER[PROVIDERS[0]]?.[0] ?? '');
  const [showAddOverride, setShowAddOverride] = useState(false);
  const [newOverride, setNewOverride] = useState({
    projectId: '',
    taskType: TASK_TYPES[0] as string,
    provider: PROVIDERS[0] as string,
    model: MODELS_BY_PROVIDER[PROVIDERS[0]]?.[0] ?? '',
  });
  const [costTimeRange, setCostTimeRange] = useState('7d');

  const { data: configData, refetch: refetchConfigs } = useQuery<{
    llmConfigs: LlmConfig[];
  }>(GET_LLM_CONFIGS);

  const dateRange = timeRangeToDateRange(costTimeRange);
  const { data: costData } = useQuery<{ llmCostSummary: CostSummary }>(GET_LLM_COST_SUMMARY, {
    variables: dateRange ?? {},
  });

  const [createConfig] = useMutation(CREATE_LLM_CONFIG, {
    onCompleted: () => refetchConfigs(),
  });
  const [updateConfig] = useMutation(UPDATE_LLM_CONFIG, {
    onCompleted: () => refetchConfigs(),
  });
  const [deleteConfig] = useMutation(DELETE_LLM_CONFIG, {
    onCompleted: () => refetchConfigs(),
  });

  const configs = configData?.llmConfigs ?? [];
  const systemConfigs = configs.filter((c) => c.level === 'SYSTEM');
  const projectConfigs = configs.filter((c) => c.level === 'PROJECT');
  const costSummary = costData?.llmCostSummary;

  const handleStartEdit = (config: LlmConfig) => {
    setEditingId(config.id);
    setEditProvider(config.provider);
    setEditModel(config.model);
  };

  const handleSaveEdit = (id: string) => {
    updateConfig({
      variables: { id, provider: editProvider, model: editModel },
    });
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleStartCreate = (taskType: string) => {
    setCreatingTaskType(taskType);
    setCreateProvider(PROVIDERS[0]);
    setCreateModel(MODELS_BY_PROVIDER[PROVIDERS[0]]?.[0] ?? '');
  };

  const handleSaveCreate = (taskType: string) => {
    createConfig({
      variables: {
        level: 'SYSTEM',
        taskType,
        provider: createProvider,
        model: createModel,
      },
    });
    setCreatingTaskType(null);
  };

  const handleCancelCreate = () => {
    setCreatingTaskType(null);
  };

  const handleAddOverride = () => {
    createConfig({
      variables: {
        level: 'PROJECT',
        projectId: newOverride.projectId,
        taskType: newOverride.taskType,
        provider: newOverride.provider,
        model: newOverride.model,
      },
    });
    setShowAddOverride(false);
    setNewOverride({
      projectId: '',
      taskType: TASK_TYPES[0],
      provider: PROVIDERS[0],
      model: MODELS_BY_PROVIDER[PROVIDERS[0]]?.[0] ?? '',
    });
  };

  const handleDeleteConfig = (id: string) => {
    deleteConfig({ variables: { id } });
  };

  const handleToggleActive = (config: LlmConfig) => {
    updateConfig({
      variables: { id: config.id, isActive: !config.isActive },
    });
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'system', label: 'System Defaults' },
    { key: 'project', label: 'Project Overrides' },
    { key: 'cost', label: 'Cost Dashboard' },
  ];

  const maxCost = costSummary
    ? Math.max(
        ...costSummary.byProvider.map((e) => e.costUsd),
        ...costSummary.byTaskType.map((e) => e.costUsd),
        0.01,
      )
    : 1;

  return (
    <div data-testid="llm-config-panel">
      <div className="mb-6 flex items-center gap-3">
        <Brain size={24} className="text-[var(--cortex-blue-500)]" />
        <h2 className="text-xl font-semibold text-[var(--cortex-blue-900)]">AI Configuration</h2>
      </div>

      <ProviderHealthIndicator />

      <div className="mt-6 border-b border-gray-200">
        <nav className="flex gap-6" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'pb-3 text-sm font-medium',
                activeTab === tab.key
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700',
              )}
              data-testid={`tab-${tab.key}`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-6">
        {activeTab === 'system' && (
          <div data-testid="system-defaults-tab">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {TASK_TYPES.map((taskType) => {
                const config = systemConfigs.find((c) => c.taskType === taskType);
                const isEditing = config && editingId === config.id;
                const isCreating = !config && creatingTaskType === taskType;

                return (
                  <div
                    key={taskType}
                    className="rounded-lg border border-gray-200 p-4 shadow-sm"
                    data-testid={`config-card-${taskType}`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-800">
                        {TASK_TYPE_LABELS[taskType]}
                      </h4>
                      {config && !isEditing && (
                        <button
                          type="button"
                          onClick={() => handleStartEdit(config)}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-blue-500"
                          aria-label={`Edit ${TASK_TYPE_LABELS[taskType]}`}
                        >
                          <Edit2 size={14} />
                        </button>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="space-y-3" data-testid={`edit-form-${taskType}`}>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Provider
                          </label>
                          <select
                            value={editProvider}
                            onChange={(e) => {
                              setEditProvider(e.target.value);
                              setEditModel(MODELS_BY_PROVIDER[e.target.value]?.[0] ?? '');
                            }}
                            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                            aria-label="Select provider"
                          >
                            {PROVIDERS.map((p) => (
                              <option key={p} value={p}>
                                {PROVIDER_LABELS[p]}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Model
                          </label>
                          <select
                            value={editModel}
                            onChange={(e) => setEditModel(e.target.value)}
                            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                            aria-label="Select model"
                          >
                            {(MODELS_BY_PROVIDER[editProvider] ?? []).map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="rounded border border-gray-300 px-3 py-1 text-xs"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(config!.id)}
                            className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : isCreating ? (
                      <div className="space-y-3" data-testid={`create-form-${taskType}`}>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Provider
                          </label>
                          <select
                            value={createProvider}
                            onChange={(e) => {
                              setCreateProvider(e.target.value);
                              setCreateModel(MODELS_BY_PROVIDER[e.target.value]?.[0] ?? '');
                            }}
                            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                            aria-label="Select provider"
                          >
                            {PROVIDERS.map((p) => (
                              <option key={p} value={p}>
                                {PROVIDER_LABELS[p]}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Model
                          </label>
                          <select
                            value={createModel}
                            onChange={(e) => setCreateModel(e.target.value)}
                            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                            aria-label="Select model"
                          >
                            {(MODELS_BY_PROVIDER[createProvider] ?? []).map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={handleCancelCreate}
                            className="rounded border border-gray-300 px-3 py-1 text-xs"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveCreate(taskType)}
                            className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : config ? (
                      <div className="space-y-1">
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Provider:</span>{' '}
                          {PROVIDER_LABELS[config.provider] ?? config.provider}
                        </div>
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Model:</span> {config.model}
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleStartCreate(taskType)}
                        className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-700"
                        data-testid={`configure-${taskType}`}
                      >
                        <Plus size={14} />
                        Configure
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'project' && (
          <div data-testid="project-overrides-tab">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700">Project-Level Overrides</h3>
              <button
                type="button"
                onClick={() => setShowAddOverride(true)}
                className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
              >
                <Plus size={14} />
                Add Override
              </button>
            </div>

            {showAddOverride && (
              <div
                className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4"
                data-testid="add-override-form"
              >
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Project ID
                    </label>
                    <input
                      type="text"
                      value={newOverride.projectId}
                      onChange={(e) =>
                        setNewOverride({ ...newOverride, projectId: e.target.value })
                      }
                      className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                      placeholder="proj-..."
                      aria-label="Project ID"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Task Type
                    </label>
                    <select
                      value={newOverride.taskType}
                      onChange={(e) => setNewOverride({ ...newOverride, taskType: e.target.value })}
                      className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                      aria-label="Task type"
                    >
                      {TASK_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {TASK_TYPE_LABELS[t]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Provider</label>
                    <select
                      value={newOverride.provider}
                      onChange={(e) => {
                        const p = e.target.value;
                        setNewOverride({
                          ...newOverride,
                          provider: p,
                          model: MODELS_BY_PROVIDER[p]?.[0] ?? '',
                        });
                      }}
                      className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                      aria-label="Override provider"
                    >
                      {PROVIDERS.map((p) => (
                        <option key={p} value={p}>
                          {PROVIDER_LABELS[p]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Model</label>
                    <select
                      value={newOverride.model}
                      onChange={(e) => setNewOverride({ ...newOverride, model: e.target.value })}
                      className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                      aria-label="Override model"
                    >
                      {(MODELS_BY_PROVIDER[newOverride.provider] ?? []).map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddOverride(false)}
                    className="rounded border border-gray-300 px-3 py-1 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddOverride}
                    className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
                    disabled={!newOverride.projectId}
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="w-full" role="table">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Project
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Task Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Provider
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Model
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Active
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {projectConfigs.map((config) => (
                    <tr key={config.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{config.projectId ?? '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        {TASK_TYPE_LABELS[config.taskType] ?? config.taskType}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {PROVIDER_LABELS[config.provider] ?? config.provider}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-xs">{config.model}</td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(config)}
                          className={cn(
                            'relative inline-flex h-5 w-9 rounded-full transition-colors',
                            config.isActive ? 'bg-blue-600' : 'bg-gray-300',
                          )}
                          role="switch"
                          aria-checked={config.isActive}
                          aria-label={`Toggle ${config.taskType} active`}
                        >
                          <span
                            className={cn(
                              'inline-block h-4 w-4 translate-y-0.5 rounded-full bg-white shadow transition-transform',
                              config.isActive ? 'translate-x-4' : 'translate-x-0.5',
                            )}
                          />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteConfig(config.id)}
                          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                          aria-label={`Delete override ${config.taskType}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {projectConfigs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                        No project overrides configured
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'cost' && (
          <div data-testid="cost-dashboard-tab">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700">Cost Overview</h3>
              <div className="flex gap-1">
                {[
                  { value: '24h', label: 'Last 24h' },
                  { value: '7d', label: 'Last 7 days' },
                  { value: '30d', label: 'Last 30 days' },
                  { value: 'all', label: 'All time' },
                ].map((range) => (
                  <button
                    key={range.value}
                    type="button"
                    onClick={() => setCostTimeRange(range.value)}
                    className={cn(
                      'rounded px-3 py-1 text-xs font-medium',
                      costTimeRange === range.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                    )}
                    data-testid={`time-range-${range.value}`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6 rounded-lg border border-gray-200 p-6 shadow-sm text-center">
              <div className="text-sm text-gray-500 mb-1">Total Cost</div>
              <div className="text-3xl font-bold text-gray-900" data-testid="total-cost">
                ${costSummary?.totalCostUsd?.toFixed(2) ?? '0.00'}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-lg border border-gray-200 p-4 shadow-sm">
                <h4 className="mb-3 text-sm font-semibold text-gray-700">Cost by Provider</h4>
                <div className="space-y-2" data-testid="cost-by-provider">
                  {(costSummary?.byProvider ?? []).map((entry) => (
                    <div key={entry.key}>
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                        <span>{PROVIDER_LABELS[entry.key] ?? entry.key}</span>
                        <span>
                          ${entry.costUsd.toFixed(2)} ({entry.requestCount} req)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100">
                        <div
                          className="h-2 rounded-full bg-blue-500"
                          style={{ width: `${(entry.costUsd / maxCost) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {(costSummary?.byProvider ?? []).length === 0 && (
                    <div className="text-xs text-gray-400">No data</div>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-4 shadow-sm">
                <h4 className="mb-3 text-sm font-semibold text-gray-700">Cost by Task Type</h4>
                <div className="space-y-2" data-testid="cost-by-task-type">
                  {(costSummary?.byTaskType ?? []).map((entry) => (
                    <div key={entry.key}>
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                        <span>{TASK_TYPE_LABELS[entry.key] ?? entry.key}</span>
                        <span>
                          ${entry.costUsd.toFixed(2)} ({entry.requestCount} req)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100">
                        <div
                          className="h-2 rounded-full bg-green-500"
                          style={{ width: `${(entry.costUsd / maxCost) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {(costSummary?.byTaskType ?? []).length === 0 && (
                    <div className="text-xs text-gray-400">No data</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
