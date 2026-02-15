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

import { ProtocolEditor } from './ProtocolEditor';

const mockProtocolData = {
  validationProtocol: {
    id: 'proto-1',
    version: 1,
    status: 'DRAFT',
    summary: 'Test summary',
    endpoints: [
      { id: 'ep-1', name: 'Sensitivity', type: 'PRIMARY', target: '95', unit: '%' },
    ],
    sampleSize: '100 patients',
    statisticalStrategy: 'Superiority test',
  },
};

const mockApprovedProtocol = {
  validationProtocol: {
    ...mockProtocolData.validationProtocol,
    status: 'APPROVED',
    version: 2,
  },
};

describe('ProtocolEditor', () => {
  const mockSaveProtocol = vi.fn().mockResolvedValue({
    data: { saveProtocol: { protocolId: 'proto-1', version: 1, status: 'DRAFT' } },
  });
  const mockApproveProtocol = vi.fn().mockResolvedValue({
    data: { approveProtocol: { protocolId: 'proto-1', version: 1, status: 'APPROVED' } },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    const mutationReturns = [
      [mockSaveProtocol, { loading: false }],
      [mockApproveProtocol, { loading: false }],
    ];
    let callIndex = 0;
    mockUseMutation.mockImplementation(() => {
      const result = mutationReturns[callIndex % mutationReturns.length];
      callIndex++;
      return result;
    });
  });

  it('renders protocol editor', () => {
    mockUseQuery.mockReturnValue({ data: mockProtocolData, loading: false });
    render(<ProtocolEditor studyId="study-1" />);

    expect(screen.getByTestId('protocol-editor')).toBeInTheDocument();
    expect(screen.getByTestId('step-indicator')).toBeInTheDocument();
  });

  it('shows step 1 content by default', () => {
    mockUseQuery.mockReturnValue({ data: mockProtocolData, loading: false });
    render(<ProtocolEditor studyId="study-1" />);

    expect(screen.getByTestId('step-1-content')).toBeInTheDocument();
    expect(screen.queryByTestId('step-2-content')).not.toBeInTheDocument();
  });

  it('navigates to next step', () => {
    mockUseQuery.mockReturnValue({ data: mockProtocolData, loading: false });
    render(<ProtocolEditor studyId="study-1" />);

    fireEvent.click(screen.getByTestId('next-btn'));

    expect(screen.queryByTestId('step-1-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('step-2-content')).toBeInTheDocument();
  });

  it('navigates to previous step', () => {
    mockUseQuery.mockReturnValue({ data: mockProtocolData, loading: false });
    render(<ProtocolEditor studyId="study-1" />);

    fireEvent.click(screen.getByTestId('next-btn'));
    fireEvent.click(screen.getByTestId('prev-btn'));

    expect(screen.getByTestId('step-1-content')).toBeInTheDocument();
  });

  it('disables previous button on first step', () => {
    mockUseQuery.mockReturnValue({ data: mockProtocolData, loading: false });
    render(<ProtocolEditor studyId="study-1" />);

    expect(screen.getByTestId('prev-btn')).toBeDisabled();
  });

  it('disables next button on last step', () => {
    mockUseQuery.mockReturnValue({ data: mockProtocolData, loading: false });
    render(<ProtocolEditor studyId="study-1" />);

    // Navigate to last step (step 4)
    fireEvent.click(screen.getByTestId('next-btn'));
    fireEvent.click(screen.getByTestId('next-btn'));
    fireEvent.click(screen.getByTestId('next-btn'));

    expect(screen.getByTestId('next-btn')).toBeDisabled();
    expect(screen.getByTestId('step-4-content')).toBeInTheDocument();
  });

  it('shows endpoint list on step 2', () => {
    mockUseQuery.mockReturnValue({ data: mockProtocolData, loading: false });
    render(<ProtocolEditor studyId="study-1" />);

    fireEvent.click(screen.getByTestId('next-btn'));

    expect(screen.getByTestId('endpoint-list')).toBeInTheDocument();
    expect(screen.getByTestId('add-endpoint-btn')).toBeInTheDocument();
  });

  it('adds a new endpoint', () => {
    mockUseQuery.mockReturnValue({ data: { validationProtocol: { ...mockProtocolData.validationProtocol, endpoints: [] } }, loading: false });
    render(<ProtocolEditor studyId="study-1" />);

    fireEvent.click(screen.getByTestId('next-btn'));
    fireEvent.click(screen.getByTestId('add-endpoint-btn'));

    const endpointItems = screen.getByTestId('endpoint-list').querySelectorAll('[data-testid^="endpoint-new-"]');
    expect(endpointItems.length).toBe(1);
  });

  it('shows amendment warning for approved protocol', () => {
    mockUseQuery.mockReturnValue({ data: mockApprovedProtocol, loading: false });
    render(<ProtocolEditor studyId="study-1" />);

    expect(screen.getByTestId('amendment-warning')).toBeInTheDocument();
  });

  it('does not show amendment warning for draft protocol', () => {
    mockUseQuery.mockReturnValue({ data: mockProtocolData, loading: false });
    render(<ProtocolEditor studyId="study-1" />);

    expect(screen.queryByTestId('amendment-warning')).not.toBeInTheDocument();
  });

  it('shows approve button', () => {
    mockUseQuery.mockReturnValue({ data: mockProtocolData, loading: false });
    render(<ProtocolEditor studyId="study-1" />);

    expect(screen.getByTestId('approve-btn')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseQuery.mockReturnValue({ data: null, loading: true });
    render(<ProtocolEditor studyId="study-1" />);

    expect(screen.getByTestId('protocol-loading')).toBeInTheDocument();
  });

  it('navigates via step indicator buttons', () => {
    mockUseQuery.mockReturnValue({ data: mockProtocolData, loading: false });
    render(<ProtocolEditor studyId="study-1" />);

    fireEvent.click(screen.getByTestId('step-btn-2'));

    expect(screen.getByTestId('step-3-content')).toBeInTheDocument();
  });
});
