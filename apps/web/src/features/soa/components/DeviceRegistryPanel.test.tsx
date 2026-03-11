import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@apollo/client', () => ({
  gql: (str: TemplateStringsArray) => str[0],
}));

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

import { DeviceRegistryPanel } from './DeviceRegistryPanel';

const mockDevices = {
  similarDevices: [
    {
      id: 'dev-1',
      deviceName: 'CardioValve 3000',
      manufacturer: 'MedTech Corp',
      indication: 'Cardiac valve replacement',
      regulatoryStatus: 'CE Marked',
      status: 'APPROVED',
      articleCount: 3,
      createdAt: '2024-01-01',
    },
    {
      id: 'dev-2',
      deviceName: 'NeuroStim Pro',
      manufacturer: 'BioElectric Ltd',
      indication: 'Neurostimulation',
      regulatoryStatus: 'FDA 510(k)',
      status: 'DISCOVERED',
      articleCount: 1,
      createdAt: '2024-01-02',
    },
  ],
};

const emptyDevices = { similarDevices: [] };

describe('DeviceRegistryPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue({ data: mockDevices, loading: false, refetch: vi.fn() });
    mockUseMutation.mockReturnValue([vi.fn(), { loading: false }]);
  });

  it('renders the device registry panel', () => {
    render(<DeviceRegistryPanel soaAnalysisId="soa-1" gridId="grid-1" />);

    expect(screen.getByTestId('device-registry')).toBeInTheDocument();
  });

  it('displays the device table with devices', () => {
    render(<DeviceRegistryPanel soaAnalysisId="soa-1" gridId="grid-1" />);

    expect(screen.getByTestId('device-table')).toBeInTheDocument();
    expect(screen.getByTestId('device-row-dev-1')).toBeInTheDocument();
    expect(screen.getByTestId('device-row-dev-2')).toBeInTheDocument();
  });

  it('shows discover button when gridId is provided', () => {
    render(<DeviceRegistryPanel soaAnalysisId="soa-1" gridId="grid-1" />);

    expect(screen.getByTestId('discover-devices-btn')).toBeInTheDocument();
  });

  it('shows summary cards with correct counts', () => {
    render(<DeviceRegistryPanel soaAnalysisId="soa-1" gridId="grid-1" />);

    expect(screen.getByTestId('device-summary')).toBeInTheDocument();
  });

  it('shows empty state when no devices', () => {
    mockUseQuery.mockReturnValue({ data: emptyDevices, loading: false, refetch: vi.fn() });
    render(<DeviceRegistryPanel soaAnalysisId="soa-1" gridId="grid-1" />);

    expect(screen.queryByTestId('device-table')).not.toBeInTheDocument();
  });

  it('hides discover button and actions when locked', () => {
    render(<DeviceRegistryPanel soaAnalysisId="soa-1" gridId="grid-1" locked />);

    expect(screen.queryByTestId('discover-devices-btn')).not.toBeInTheDocument();
  });
});
