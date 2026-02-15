import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockUseMutation = vi.fn();
vi.mock('@apollo/client', () => ({ gql: vi.fn((s: TemplateStringsArray) => s[0]) }));
vi.mock('@apollo/client/react', () => ({
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

import { NamedDeviceSearchPanel } from './NamedDeviceSearchPanel';

const mockHistory = [
  { id: 'h-1', deviceName: 'CardioDevice X', date: '2024-01-15', resultCount: 42 },
];

describe('NamedDeviceSearchPanel', () => {
  const mockSearch = vi.fn().mockResolvedValue({ data: { searchVigilance: { searchId: 's-1', status: 'RUNNING' } } });

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockReturnValue([mockSearch, { loading: false }]);
  });

  it('renders the search panel', () => {
    render(<NamedDeviceSearchPanel cerId="cer-1" />);
    expect(screen.getByTestId('search-panel')).toBeInTheDocument();
  });

  it('shows device name input', () => {
    render(<NamedDeviceSearchPanel cerId="cer-1" />);
    expect(screen.getByTestId('device-name-input')).toBeInTheDocument();
  });

  it('shows keywords input', () => {
    render(<NamedDeviceSearchPanel cerId="cer-1" />);
    expect(screen.getByTestId('keywords-input')).toBeInTheDocument();
  });

  it('shows database checkboxes', () => {
    render(<NamedDeviceSearchPanel cerId="cer-1" />);
    expect(screen.getByTestId('db-checkbox-maude')).toBeInTheDocument();
    expect(screen.getByTestId('db-checkbox-ansm')).toBeInTheDocument();
    expect(screen.getByTestId('db-checkbox-bfarm')).toBeInTheDocument();
    expect(screen.getByTestId('db-checkbox-afmps')).toBeInTheDocument();
  });

  it('disables search button when device name is empty', () => {
    render(<NamedDeviceSearchPanel cerId="cer-1" />);
    expect(screen.getByTestId('search-btn')).toBeDisabled();
  });

  it('enables search button when device name entered', () => {
    render(<NamedDeviceSearchPanel cerId="cer-1" />);
    fireEvent.change(screen.getByTestId('device-name-input'), { target: { value: 'CardioDevice' } });
    expect(screen.getByTestId('search-btn')).not.toBeDisabled();
  });

  it('calls mutation on search', async () => {
    render(<NamedDeviceSearchPanel cerId="cer-1" />);
    fireEvent.change(screen.getByTestId('device-name-input'), { target: { value: 'CardioDevice' } });
    fireEvent.click(screen.getByTestId('search-btn'));
    await waitFor(() => {
      expect(mockSearch).toHaveBeenCalled();
    });
  });

  it('shows search history', () => {
    render(<NamedDeviceSearchPanel cerId="cer-1" searchHistory={mockHistory} />);
    expect(screen.getByTestId('search-history')).toBeInTheDocument();
    expect(screen.getByText('CardioDevice X')).toBeInTheDocument();
  });
});
