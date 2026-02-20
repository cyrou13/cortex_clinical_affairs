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

import { SimilarDeviceRegistry } from './SimilarDeviceRegistry';

const mockDevicesData = {
  similarDevices: [
    {
      id: 'device-1',
      deviceName: 'Device Alpha',
      manufacturer: 'Acme Corp',
      indication: 'Cardiac monitoring',
      regulatoryStatus: 'CE Marked',
      metadata: null,
      createdAt: '2024-01-01',
    },
    {
      id: 'device-2',
      deviceName: 'Device Beta',
      manufacturer: 'TechMed',
      indication: 'Neurostimulation',
      regulatoryStatus: 'FDA 510(k)',
      metadata: null,
      createdAt: '2024-01-02',
    },
  ],
};

describe('SimilarDeviceRegistry', () => {
  const mockAdd = vi.fn().mockResolvedValue({ data: { addSimilarDevice: { id: 'device-new' } } });

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockReturnValue([mockAdd, { loading: false }]);
  });

  it('renders loading state', () => {
    mockUseQuery.mockReturnValue({ data: null, loading: true, error: null });
    render(<SimilarDeviceRegistry soaAnalysisId="soa-1" />);

    expect(screen.getByTestId('registry-loading')).toBeInTheDocument();
  });

  it('renders error state', () => {
    mockUseQuery.mockReturnValue({
      data: null,
      loading: false,
      error: new Error('Failed'),
    });
    render(<SimilarDeviceRegistry soaAnalysisId="soa-1" />);

    expect(screen.getByTestId('registry-error')).toBeInTheDocument();
  });

  it('renders empty state when no devices', () => {
    mockUseQuery.mockReturnValue({
      data: { similarDevices: [] },
      loading: false,
      error: null,
    });
    render(<SimilarDeviceRegistry soaAnalysisId="soa-1" />);

    expect(screen.getByTestId('empty-registry')).toBeInTheDocument();
  });

  it('renders device list', () => {
    mockUseQuery.mockReturnValue({
      data: mockDevicesData,
      loading: false,
      error: null,
    });
    render(<SimilarDeviceRegistry soaAnalysisId="soa-1" />);

    expect(screen.getByTestId('device-list')).toBeInTheDocument();
    expect(screen.getByTestId('device-item-device-1')).toBeInTheDocument();
    expect(screen.getByTestId('device-item-device-2')).toBeInTheDocument();
    expect(screen.getByText('Device Alpha')).toBeInTheDocument();
    expect(screen.getByText('Device Beta')).toBeInTheDocument();
  });

  it('displays device details', () => {
    mockUseQuery.mockReturnValue({
      data: mockDevicesData,
      loading: false,
      error: null,
    });
    render(<SimilarDeviceRegistry soaAnalysisId="soa-1" />);

    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('CE Marked')).toBeInTheDocument();
    expect(screen.getByText(/Cardiac monitoring/)).toBeInTheDocument();
  });

  it('opens add device dialog', () => {
    mockUseQuery.mockReturnValue({
      data: mockDevicesData,
      loading: false,
      error: null,
    });
    render(<SimilarDeviceRegistry soaAnalysisId="soa-1" />);

    fireEvent.click(screen.getByTestId('add-device-btn'));

    expect(screen.getByTestId('add-device-dialog')).toBeInTheDocument();
  });

  it('closes add device dialog on cancel', () => {
    mockUseQuery.mockReturnValue({
      data: mockDevicesData,
      loading: false,
      error: null,
    });
    render(<SimilarDeviceRegistry soaAnalysisId="soa-1" />);

    fireEvent.click(screen.getByTestId('add-device-btn'));
    fireEvent.click(screen.getByTestId('cancel-add-btn'));

    expect(screen.queryByTestId('add-device-dialog')).not.toBeInTheDocument();
  });
});
