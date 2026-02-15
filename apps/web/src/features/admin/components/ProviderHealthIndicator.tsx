import { useQuery, useMutation } from '@apollo/client/react';
import { RefreshCw } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import { GET_PROVIDER_HEALTH } from '../graphql/queries';
import { CHECK_PROVIDER_HEALTH } from '../graphql/mutations';

interface ProviderHealth {
  provider: string;
  status: 'healthy' | 'unhealthy';
  lastCheckAt: string | null;
}

const PROVIDER_LABELS: Record<string, string> = {
  claude: 'Claude',
  openai: 'OpenAI',
  ollama: 'Ollama',
};

export function ProviderHealthIndicator() {
  const { data, loading, refetch } = useQuery<{
    providerHealth: ProviderHealth[];
  }>(GET_PROVIDER_HEALTH);

  const [checkHealth, { loading: checking }] = useMutation(CHECK_PROVIDER_HEALTH, {
    onCompleted: () => refetch(),
  });

  const providers = data?.providerHealth ?? [];

  const handleRefresh = () => {
    checkHealth();
  };

  return (
    <div data-testid="provider-health">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">Provider Status</h3>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={checking}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-50"
          aria-label="Refresh provider status"
        >
          <RefreshCw size={12} className={cn(checking && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500" data-testid="provider-health-loading">
          Checking providers...
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {providers.map((provider) => (
            <div
              key={provider.provider}
              className="rounded-lg border border-gray-200 p-4 shadow-sm"
              data-testid={`provider-card-${provider.provider}`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'h-2 w-2 rounded-full',
                    provider.status === 'healthy' ? 'bg-green-500' : 'bg-red-500',
                  )}
                  data-testid={`status-dot-${provider.provider}`}
                />
                <span className="text-sm font-medium">
                  {PROVIDER_LABELS[provider.provider] ?? provider.provider}
                </span>
              </div>
              <div className="mt-1 text-xs text-gray-500">
                {provider.status === 'healthy' ? 'Connected' : 'Not configured'}
              </div>
              {provider.lastCheckAt && (
                <div className="mt-1 text-xs text-gray-400">
                  Last check: {new Date(provider.lastCheckAt).toLocaleTimeString()}
                </div>
              )}
            </div>
          ))}
          {providers.length === 0 && (
            <div className="col-span-3 text-center text-sm text-gray-500">
              No provider data available
            </div>
          )}
        </div>
      )}
    </div>
  );
}
