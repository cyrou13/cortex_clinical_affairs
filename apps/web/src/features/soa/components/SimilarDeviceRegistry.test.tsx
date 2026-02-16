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

import { SimilarDeviceRegistry } from './SimilarDeviceRegistry';

const mockDevicesData = {
  similarDevices: [
    {
      id: 'device-1',
      name: 'Device Alpha',
      manufacturer: 'Acme Corp',
      modelNumber: 'ACM-100',
      regulatoryClass: 'II',
      performanceBenchmark: {
        score: 85,
        category: 'High Performance',
      },
    },
    {
      id: 'device-2',
      name: 'Device Beta',
      manufacturer: 'TechMed',
      modelNumber: 'TM-200',
      regulatoryClass: 'III',
      performanceBenchmark: {
        score: 72,
        category: 'Medium Performance',
      },
    },
  ],
};

describe('SimilarDeviceRegistry', () => {
  const mockRemove = vi
    .fn()
    .mockResolvedValue({ data: { removeSimilarDevice: { success: true } } });
  const mockRefetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockReturnValue([mockRemove, { loading: false }]);
  });

  it('renders loading state', () => {
    mockUseQuery.mockReturnValue({ data: null, loading: true, error: null, refetch: mockRefetch });
    render(<SimilarDeviceRegistry soaAnalysisId="soa-1" />);

    expect(screen.getByTestId('registry-loading')).toBeInTheDocument();
  });

  it('renders error state', () => {
    mockUseQuery.mockReturnValue({
      data: null,
      loading: false,
      error: new Error('Failed'),
      refetch: mockRefetch,
    });
    render(<SimilarDeviceRegistry soaAnalysisId="soa-1" />);

    expect(screen.getByTestId('registry-error')).toBeInTheDocument();
  });

  it('renders empty state when no devices', () => {
    mockUseQuery.mockReturnValue({
      data: { similarDevices: [] },
      loading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<SimilarDeviceRegistry soaAnalysisId="soa-1" />);

    expect(screen.getByTestId('empty-registry')).toBeInTheDocument();
  });

  it('renders device list', () => {
    mockUseQuery.mockReturnValue({
      data: mockDevicesData,
      loading: false,
      error: null,
      refetch: mockRefetch,
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
      refetch: mockRefetch,
    });
    render(<SimilarDeviceRegistry soaAnalysisId="soa-1" />);

    expect(screen.getByText(/Acme Corp/)).toBeInTheDocument();
    expect(screen.getByText(/Model ACM-100/)).toBeInTheDocument();
    expect(screen.getByText('Class II')).toBeInTheDocument();
  });

  it('displays performance benchmarks', () => {
    mockUseQuery.mockReturnValue({
      data: mockDevicesData,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<SimilarDeviceRegistry soaAnalysisId="soa-1" />);

    const badges = screen.getAllByTestId('performance-badge');
    expect(badges.length).toBe(2);
    expect(screen.getByText(/High Performance \(85\)/)).toBeInTheDocument();
    expect(screen.getByText(/Medium Performance \(72\)/)).toBeInTheDocument();
  });

  it('opens add device dialog', () => {
    mockUseQuery.mockReturnValue({
      data: mockDevicesData,
      loading: false,
      error: null,
      refetch: mockRefetch,
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
      refetch: mockRefetch,
    });
    render(<SimilarDeviceRegistry soaAnalysisId="soa-1" />);

    fireEvent.click(screen.getByTestId('add-device-btn'));
    fireEvent.click(screen.getByTestId('cancel-add-btn'));

    expect(screen.queryByTestId('add-device-dialog')).not.toBeInTheDocument();
  });

  it('calls remove mutation on device removal', async () => {
    mockUseQuery.mockReturnValue({
      data: mockDevicesData,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<SimilarDeviceRegistry soaAnalysisId="soa-1" />);

    fireEvent.click(screen.getByTestId('remove-device-btn-device-1'));

    await waitFor(() => {
      expect(mockRemove).toHaveBeenCalledWith({
        variables: { soaAnalysisId: 'soa-1', deviceId: 'device-1' },
      });
    });
  });
});
