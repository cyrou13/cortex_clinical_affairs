import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@apollo/client', () => ({
  gql: (str: TemplateStringsArray) => str[0],
}));

const mockUseQuery = vi.fn();
const mockCreateConfig = vi.fn();
const mockUpdateConfig = vi.fn();
const mockDeleteConfig = vi.fn();
const mockCheckHealth = vi.fn();
let mutationCallIndex = 0;

vi.mock('@apollo/client/react', () => ({
  useQuery: (..._args: unknown[]) => mockUseQuery(..._args),
  useMutation: (..._args: unknown[]) => {
    const idx = mutationCallIndex++;
    // LlmConfigPanel creates 3 mutations (create, update, delete)
    // ProviderHealthIndicator creates 1 mutation (checkHealth)
    if (idx % 4 === 0) return [mockCreateConfig, { loading: false }];
    if (idx % 4 === 1) return [mockUpdateConfig, { loading: false }];
    if (idx % 4 === 2) return [mockDeleteConfig, { loading: false }];
    return [mockCheckHealth, { loading: false }];
  },
}));

import { LlmConfigPanel } from './LlmConfigPanel';

const mockSystemConfigs = [
  {
    id: 'cfg-1',
    level: 'SYSTEM',
    projectId: null,
    taskType: 'scoring',
    provider: 'claude',
    model: 'claude-sonnet-4-20250514',
    isActive: true,
    createdAt: '2026-02-14T10:00:00Z',
  },
  {
    id: 'cfg-2',
    level: 'SYSTEM',
    projectId: null,
    taskType: 'extraction',
    provider: 'openai',
    model: 'gpt-4o',
    isActive: true,
    createdAt: '2026-02-14T10:00:00Z',
  },
];

const mockProjectConfigs = [
  {
    id: 'cfg-3',
    level: 'PROJECT',
    projectId: 'proj-1',
    taskType: 'scoring',
    provider: 'openai',
    model: 'gpt-4o-mini',
    isActive: true,
    createdAt: '2026-02-14T10:00:00Z',
  },
];

const mockCostSummary = {
  totalCostUsd: 12.5,
  byProvider: [
    { key: 'claude', costUsd: 8.0, requestCount: 120 },
    { key: 'openai', costUsd: 4.5, requestCount: 80 },
  ],
  byTaskType: [
    { key: 'scoring', costUsd: 6.0, requestCount: 100 },
    { key: 'extraction', costUsd: 4.0, requestCount: 60 },
    { key: 'drafting', costUsd: 2.5, requestCount: 40 },
  ],
};

const mockProviderHealth = [
  { provider: 'claude', status: 'healthy', lastCheckAt: '2026-02-14T10:00:00Z' },
  { provider: 'openai', status: 'healthy', lastCheckAt: '2026-02-14T10:00:00Z' },
  { provider: 'ollama', status: 'unhealthy', lastCheckAt: null },
];

function setupDefaultMocks() {
  let callIndex = 0;
  mockUseQuery.mockImplementation(() => {
    const idx = callIndex++;
    // First call is GET_LLM_CONFIGS, second is GET_LLM_COST_SUMMARY, third is GET_PROVIDER_HEALTH
    if (idx % 3 === 0) {
      return {
        data: { llmConfigs: [...mockSystemConfigs, ...mockProjectConfigs] },
        loading: false,
        refetch: vi.fn(),
      };
    }
    if (idx % 3 === 1) {
      return {
        data: { llmCostSummary: mockCostSummary },
        loading: false,
        refetch: vi.fn(),
      };
    }
    return {
      data: { providerHealth: mockProviderHealth },
      loading: false,
      refetch: vi.fn(),
    };
  });
}

describe('LlmConfigPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutationCallIndex = 0;
    setupDefaultMocks();
  });

  it('renders AI Configuration heading with Brain icon', () => {
    render(<LlmConfigPanel />);
    expect(screen.getByText('AI Configuration')).toBeInTheDocument();
    expect(screen.getByTestId('llm-config-panel')).toBeInTheDocument();
  });

  it('renders all three tabs', () => {
    render(<LlmConfigPanel />);
    expect(screen.getByTestId('tab-system')).toHaveTextContent('System Defaults');
    expect(screen.getByTestId('tab-project')).toHaveTextContent('Project Overrides');
    expect(screen.getByTestId('tab-cost')).toHaveTextContent('Cost Dashboard');
  });

  it('shows System Defaults tab by default', () => {
    render(<LlmConfigPanel />);
    expect(screen.getByTestId('system-defaults-tab')).toBeInTheDocument();
  });

  it('renders config cards for all task types', () => {
    render(<LlmConfigPanel />);
    expect(screen.getByTestId('config-card-scoring')).toBeInTheDocument();
    expect(screen.getByTestId('config-card-extraction')).toBeInTheDocument();
    expect(screen.getByTestId('config-card-drafting')).toBeInTheDocument();
    expect(screen.getByTestId('config-card-metadata_extraction')).toBeInTheDocument();
  });

  it('displays provider and model for configured tasks', () => {
    render(<LlmConfigPanel />);
    expect(screen.getByText('claude-sonnet-4-20250514')).toBeInTheDocument();
    expect(screen.getByText('gpt-4o')).toBeInTheDocument();
  });

  it('shows Configure button for unconfigured task types', () => {
    render(<LlmConfigPanel />);
    expect(screen.getAllByText('Configure').length).toBeGreaterThanOrEqual(1);
  });

  it('switches to Project Overrides tab', () => {
    render(<LlmConfigPanel />);
    fireEvent.click(screen.getByTestId('tab-project'));
    expect(screen.getByTestId('project-overrides-tab')).toBeInTheDocument();
  });

  it('displays project overrides in table', () => {
    render(<LlmConfigPanel />);
    fireEvent.click(screen.getByTestId('tab-project'));
    expect(screen.getByText('proj-1')).toBeInTheDocument();
    expect(screen.getByText('gpt-4o-mini')).toBeInTheDocument();
  });

  it('shows Add Override button on project tab', () => {
    render(<LlmConfigPanel />);
    fireEvent.click(screen.getByTestId('tab-project'));
    expect(screen.getByText('Add Override')).toBeInTheDocument();
  });

  it('opens add override form when button clicked', () => {
    render(<LlmConfigPanel />);
    fireEvent.click(screen.getByTestId('tab-project'));
    fireEvent.click(screen.getByText('Add Override'));
    expect(screen.getByTestId('add-override-form')).toBeInTheDocument();
    expect(screen.getByLabelText('Project ID')).toBeInTheDocument();
  });

  it('switches to Cost Dashboard tab', () => {
    render(<LlmConfigPanel />);
    fireEvent.click(screen.getByTestId('tab-cost'));
    expect(screen.getByTestId('cost-dashboard-tab')).toBeInTheDocument();
  });

  it('displays total cost on cost dashboard', () => {
    render(<LlmConfigPanel />);
    fireEvent.click(screen.getByTestId('tab-cost'));
    // totalCostUsd is 12.5 → $12.50
    expect(screen.getByTestId('total-cost')).toHaveTextContent('12.50');
  });

  it('displays cost by provider breakdown', () => {
    render(<LlmConfigPanel />);
    fireEvent.click(screen.getByTestId('tab-cost'));
    expect(screen.getByTestId('cost-by-provider')).toBeInTheDocument();
  });

  it('displays cost by task type breakdown', () => {
    render(<LlmConfigPanel />);
    fireEvent.click(screen.getByTestId('tab-cost'));
    expect(screen.getByTestId('cost-by-task-type')).toBeInTheDocument();
  });

  it('renders time range filter buttons', () => {
    render(<LlmConfigPanel />);
    fireEvent.click(screen.getByTestId('tab-cost'));
    expect(screen.getByTestId('time-range-24h')).toHaveTextContent('Last 24h');
    expect(screen.getByTestId('time-range-7d')).toHaveTextContent('Last 7 days');
    expect(screen.getByTestId('time-range-30d')).toHaveTextContent('Last 30 days');
    expect(screen.getByTestId('time-range-all')).toHaveTextContent('All time');
  });

  it('shows edit form when edit button clicked', () => {
    render(<LlmConfigPanel />);
    fireEvent.click(screen.getByLabelText('Edit Scoring'));
    expect(screen.getByTestId('edit-form-scoring')).toBeInTheDocument();
    expect(screen.getByLabelText('Select provider')).toBeInTheDocument();
    expect(screen.getByLabelText('Select model')).toBeInTheDocument();
  });

  it('shows empty overrides message when no project configs', () => {
    let callIndex = 0;
    mockUseQuery.mockImplementation(() => {
      const idx = callIndex++;
      if (idx % 3 === 0) {
        return {
          data: { llmConfigs: mockSystemConfigs },
          loading: false,
          refetch: vi.fn(),
        };
      }
      if (idx % 3 === 1) {
        return {
          data: { llmCostSummary: mockCostSummary },
          loading: false,
          refetch: vi.fn(),
        };
      }
      return {
        data: { providerHealth: mockProviderHealth },
        loading: false,
        refetch: vi.fn(),
      };
    });

    render(<LlmConfigPanel />);
    fireEvent.click(screen.getByTestId('tab-project'));
    expect(screen.getByText('No project overrides configured')).toBeInTheDocument();
  });

  it('renders provider health indicator', () => {
    render(<LlmConfigPanel />);
    expect(screen.getByTestId('provider-health')).toBeInTheDocument();
  });
});
