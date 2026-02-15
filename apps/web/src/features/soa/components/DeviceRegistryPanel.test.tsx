import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

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
      name: 'CardioValve 3000',
      manufacturer: 'MedTech Corp',
      classification: 'Class III',
      benchmarks: [
        { id: 'bm-1', parameter: 'Durability', value: '15', unit: 'years' },
        { id: 'bm-2', parameter: 'Biocompatibility', value: 'Grade A', unit: '' },
      ],
    },
    {
      id: 'dev-2',
      name: 'NeuroStim Pro',
      manufacturer: 'BioElectric Ltd',
      classification: 'Class IIb',
      benchmarks: [],
    },
  ],
};

const emptyDevices = { similarDevices: [] };

describe('DeviceRegistryPanel', () => {
  const mockAddDevice = vi.fn().mockResolvedValue({ data: { addSimilarDevice: { deviceId: 'dev-new' } } });
  const mockAddBenchmark = vi.fn().mockResolvedValue({ data: { addDeviceBenchmark: { benchmarkId: 'bm-new' } } });

  beforeEach(() => {
    vi.clearAllMocks();
    const mutationReturns = [
      [mockAddDevice, { loading: false }],
      [mockAddBenchmark, { loading: false }],
    ];
    let callIndex = 0;
    mockUseMutation.mockImplementation(() => {
      const result = mutationReturns[callIndex % mutationReturns.length];
      callIndex++;
      return result;
    });
  });

  it('renders the device registry panel', () => {
    mockUseQuery.mockReturnValue({ data: mockDevices, loading: false });
    render(<DeviceRegistryPanel soaAnalysisId="soa-1" />);

    expect(screen.getByTestId('device-registry')).toBeInTheDocument();
  });

  it('displays the device table with devices', () => {
    mockUseQuery.mockReturnValue({ data: mockDevices, loading: false });
    render(<DeviceRegistryPanel soaAnalysisId="soa-1" />);

    expect(screen.getByTestId('device-table')).toBeInTheDocument();
    expect(screen.getByTestId('device-row-dev-1')).toBeInTheDocument();
    expect(screen.getByTestId('device-row-dev-2')).toBeInTheDocument();
  });

  it('shows add device button', () => {
    mockUseQuery.mockReturnValue({ data: mockDevices, loading: false });
    render(<DeviceRegistryPanel soaAnalysisId="soa-1" />);

    expect(screen.getByTestId('add-device-btn')).toBeInTheDocument();
  });

  it('shows device form when add button clicked', () => {
    mockUseQuery.mockReturnValue({ data: mockDevices, loading: false });
    render(<DeviceRegistryPanel soaAnalysisId="soa-1" />);

    fireEvent.click(screen.getByTestId('add-device-btn'));

    expect(screen.getByTestId('device-form')).toBeInTheDocument();
    expect(screen.getByTestId('device-name-input')).toBeInTheDocument();
    expect(screen.getByTestId('device-manufacturer-input')).toBeInTheDocument();
    expect(screen.getByTestId('device-classification-input')).toBeInTheDocument();
  });

  it('displays benchmarks for devices', () => {
    mockUseQuery.mockReturnValue({ data: mockDevices, loading: false });
    render(<DeviceRegistryPanel soaAnalysisId="soa-1" />);

    expect(screen.getByTestId('benchmark-bm-1')).toHaveTextContent('Durability: 15 years');
    expect(screen.getByTestId('benchmark-bm-2')).toHaveTextContent('Biocompatibility: Grade A');
  });

  it('shows empty state when no devices', () => {
    mockUseQuery.mockReturnValue({ data: emptyDevices, loading: false });
    render(<DeviceRegistryPanel soaAnalysisId="soa-1" />);

    expect(screen.getByTestId('no-devices')).toBeInTheDocument();
  });

  it('hides add device button when locked', () => {
    mockUseQuery.mockReturnValue({ data: mockDevices, loading: false });
    render(<DeviceRegistryPanel soaAnalysisId="soa-1" locked />);

    expect(screen.queryByTestId('add-device-btn')).not.toBeInTheDocument();
  });
});
