import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

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
      createdAt: '2024-01-01',
    },
    {
      id: 'dev-2',
      deviceName: 'NeuroStim Pro',
      manufacturer: 'BioElectric Ltd',
      indication: 'Neurostimulation',
      regulatoryStatus: 'FDA 510(k)',
      createdAt: '2024-01-02',
    },
  ],
};

const emptyDevices = { similarDevices: [] };

describe('DeviceRegistryPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue({ data: mockDevices, loading: false });
    mockUseMutation.mockReturnValue([vi.fn(), { loading: false }]);
  });

  it('renders the device registry panel', () => {
    render(<DeviceRegistryPanel soaAnalysisId="soa-1" />);

    expect(screen.getByTestId('device-registry')).toBeInTheDocument();
  });

  it('displays the device table with devices', () => {
    render(<DeviceRegistryPanel soaAnalysisId="soa-1" />);

    expect(screen.getByTestId('device-table')).toBeInTheDocument();
    expect(screen.getByTestId('device-row-dev-1')).toBeInTheDocument();
    expect(screen.getByTestId('device-row-dev-2')).toBeInTheDocument();
  });

  it('shows add device button', () => {
    render(<DeviceRegistryPanel soaAnalysisId="soa-1" />);

    expect(screen.getByTestId('add-device-btn')).toBeInTheDocument();
  });

  it('shows device form when add button clicked', () => {
    render(<DeviceRegistryPanel soaAnalysisId="soa-1" />);

    fireEvent.click(screen.getByTestId('add-device-btn'));

    expect(screen.getByTestId('device-form')).toBeInTheDocument();
    expect(screen.getByTestId('device-name-input')).toBeInTheDocument();
    expect(screen.getByTestId('device-manufacturer-input')).toBeInTheDocument();
    expect(screen.getByTestId('device-indication-input')).toBeInTheDocument();
  });

  it('shows empty state when no devices', () => {
    mockUseQuery.mockReturnValue({ data: emptyDevices, loading: false });
    render(<DeviceRegistryPanel soaAnalysisId="soa-1" />);

    expect(screen.getByTestId('no-devices')).toBeInTheDocument();
  });

  it('hides add device button when locked', () => {
    render(<DeviceRegistryPanel soaAnalysisId="soa-1" locked />);

    expect(screen.queryByTestId('add-device-btn')).not.toBeInTheDocument();
  });
});
