import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@apollo/client', () => ({
  gql: (str: TemplateStringsArray) => str[0],
}));

const mockUseQuery = vi.fn();
const mockCheckHealth = vi.fn();
const mockUseMutation = vi.fn().mockReturnValue([mockCheckHealth, { loading: false }]);

vi.mock('@apollo/client/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

import { ProviderHealthIndicator } from './ProviderHealthIndicator';

const mockProviders = [
  { provider: 'claude', status: 'healthy', lastCheckAt: '2026-02-14T10:00:00Z' },
  { provider: 'openai', status: 'unhealthy', lastCheckAt: '2026-02-14T10:00:00Z' },
  { provider: 'ollama', status: 'unhealthy', lastCheckAt: null },
];

describe('ProviderHealthIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockReturnValue([mockCheckHealth, { loading: false }]);
  });

  it('renders provider health container', () => {
    mockUseQuery.mockReturnValue({
      data: { providerHealth: mockProviders },
      loading: false,
      refetch: vi.fn(),
    });

    render(<ProviderHealthIndicator />);
    expect(screen.getByTestId('provider-health')).toBeInTheDocument();
  });

  it('renders all provider cards', () => {
    mockUseQuery.mockReturnValue({
      data: { providerHealth: mockProviders },
      loading: false,
      refetch: vi.fn(),
    });

    render(<ProviderHealthIndicator />);
    expect(screen.getByTestId('provider-card-claude')).toBeInTheDocument();
    expect(screen.getByTestId('provider-card-openai')).toBeInTheDocument();
    expect(screen.getByTestId('provider-card-ollama')).toBeInTheDocument();
  });

  it('displays provider names correctly', () => {
    mockUseQuery.mockReturnValue({
      data: { providerHealth: mockProviders },
      loading: false,
      refetch: vi.fn(),
    });

    render(<ProviderHealthIndicator />);
    expect(screen.getByText('Claude')).toBeInTheDocument();
    expect(screen.getByText('OpenAI')).toBeInTheDocument();
    expect(screen.getByText('Ollama')).toBeInTheDocument();
  });

  it('shows green dot for healthy provider', () => {
    mockUseQuery.mockReturnValue({
      data: { providerHealth: mockProviders },
      loading: false,
      refetch: vi.fn(),
    });

    render(<ProviderHealthIndicator />);
    const claudeDot = screen.getByTestId('status-dot-claude');
    expect(claudeDot.className).toContain('bg-green-500');
  });

  it('shows red dot for unhealthy provider', () => {
    mockUseQuery.mockReturnValue({
      data: { providerHealth: mockProviders },
      loading: false,
      refetch: vi.fn(),
    });

    render(<ProviderHealthIndicator />);
    const openaiDot = screen.getByTestId('status-dot-openai');
    expect(openaiDot.className).toContain('bg-red-500');
  });

  it('shows Connected text for healthy provider', () => {
    mockUseQuery.mockReturnValue({
      data: { providerHealth: mockProviders },
      loading: false,
      refetch: vi.fn(),
    });

    render(<ProviderHealthIndicator />);
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('shows Not configured text for unhealthy provider', () => {
    mockUseQuery.mockReturnValue({
      data: { providerHealth: mockProviders },
      loading: false,
      refetch: vi.fn(),
    });

    render(<ProviderHealthIndicator />);
    expect(screen.getAllByText('Not configured')).toHaveLength(2);
  });

  it('shows loading state', () => {
    mockUseQuery.mockReturnValue({
      data: null,
      loading: true,
      refetch: vi.fn(),
    });

    render(<ProviderHealthIndicator />);
    expect(screen.getByTestId('provider-health-loading')).toBeInTheDocument();
    expect(screen.getByText('Checking providers...')).toBeInTheDocument();
  });

  it('renders refresh button', () => {
    mockUseQuery.mockReturnValue({
      data: { providerHealth: mockProviders },
      loading: false,
      refetch: vi.fn(),
    });

    render(<ProviderHealthIndicator />);
    expect(screen.getByLabelText('Refresh provider status')).toBeInTheDocument();
  });

  it('calls checkHealth mutation when refresh clicked', () => {
    mockUseQuery.mockReturnValue({
      data: { providerHealth: mockProviders },
      loading: false,
      refetch: vi.fn(),
    });

    render(<ProviderHealthIndicator />);
    fireEvent.click(screen.getByLabelText('Refresh provider status'));
    expect(mockCheckHealth).toHaveBeenCalled();
  });

  it('shows empty state when no providers', () => {
    mockUseQuery.mockReturnValue({
      data: { providerHealth: [] },
      loading: false,
      refetch: vi.fn(),
    });

    render(<ProviderHealthIndicator />);
    expect(screen.getByText('No provider data available')).toBeInTheDocument();
  });
});
