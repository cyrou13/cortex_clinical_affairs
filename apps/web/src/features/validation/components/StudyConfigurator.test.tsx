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

import { StudyConfigurator } from './StudyConfigurator';

const mockSoaData = {
  lockedSoaAnalyses: [
    {
      id: 'soa-1',
      name: 'Clinical SOA 2026',
      type: 'CLINICAL',
      benchmarks: [
        { id: 'b-1', name: 'Sensitivity', value: '95', unit: '%' },
        { id: 'b-2', name: 'Specificity', value: '90', unit: '%' },
      ],
    },
    {
      id: 'soa-2',
      name: 'Similar Device SOA',
      type: 'SIMILAR_DEVICE',
      benchmarks: [],
    },
  ],
};

describe('StudyConfigurator', () => {
  const mockCreateStudy = vi.fn().mockResolvedValue({
    data: { createValidationStudy: { studyId: 'study-1', name: 'Test', type: 'STANDALONE', status: 'DRAFT' } },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockReturnValue([mockCreateStudy, { loading: false }]);
  });

  it('renders the configurator form', () => {
    mockUseQuery.mockReturnValue({ data: mockSoaData, loading: false });
    render(<StudyConfigurator projectId="proj-1" />);

    expect(screen.getByTestId('study-configurator')).toBeInTheDocument();
    expect(screen.getByTestId('study-name-input')).toBeInTheDocument();
    expect(screen.getByTestId('study-type-standalone')).toBeInTheDocument();
    expect(screen.getByTestId('study-type-mrmc')).toBeInTheDocument();
    expect(screen.getByTestId('soa-selector')).toBeInTheDocument();
  });

  it('defaults to standalone study type', () => {
    mockUseQuery.mockReturnValue({ data: mockSoaData, loading: false });
    render(<StudyConfigurator projectId="proj-1" />);

    expect(screen.getByTestId('study-type-standalone')).toBeChecked();
    expect(screen.getByTestId('study-type-mrmc')).not.toBeChecked();
  });

  it('displays SOA analyses in dropdown', () => {
    mockUseQuery.mockReturnValue({ data: mockSoaData, loading: false });
    render(<StudyConfigurator projectId="proj-1" />);

    const selector = screen.getByTestId('soa-selector');
    expect(selector).toBeInTheDocument();
    expect(selector.querySelectorAll('option').length).toBe(3); // placeholder + 2 SOAs
  });

  it('shows benchmarks when SOA selected', () => {
    mockUseQuery.mockReturnValue({ data: mockSoaData, loading: false });
    render(<StudyConfigurator projectId="proj-1" />);

    fireEvent.change(screen.getByTestId('soa-selector'), { target: { value: 'soa-1' } });

    expect(screen.getByTestId('benchmark-list')).toBeInTheDocument();
    expect(screen.getByText('Sensitivity')).toBeInTheDocument();
    expect(screen.getByText('95 %')).toBeInTheDocument();
  });

  it('does not show benchmarks when no SOA selected', () => {
    mockUseQuery.mockReturnValue({ data: mockSoaData, loading: false });
    render(<StudyConfigurator projectId="proj-1" />);

    expect(screen.queryByTestId('benchmark-list')).not.toBeInTheDocument();
  });

  it('shows Launch Mini SLS button for MRMC type', () => {
    mockUseQuery.mockReturnValue({ data: mockSoaData, loading: false });
    render(<StudyConfigurator projectId="proj-1" />);

    expect(screen.queryByTestId('launch-mini-sls-btn')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('study-type-mrmc'));

    expect(screen.getByTestId('launch-mini-sls-btn')).toBeInTheDocument();
  });

  it('calls onLaunchMiniSls when button clicked', () => {
    mockUseQuery.mockReturnValue({ data: mockSoaData, loading: false });
    const onLaunchMiniSls = vi.fn();
    render(<StudyConfigurator projectId="proj-1" onLaunchMiniSls={onLaunchMiniSls} />);

    fireEvent.click(screen.getByTestId('study-type-mrmc'));
    fireEvent.click(screen.getByTestId('launch-mini-sls-btn'));

    expect(onLaunchMiniSls).toHaveBeenCalled();
  });

  it('disables create button when name is empty', () => {
    mockUseQuery.mockReturnValue({ data: mockSoaData, loading: false });
    render(<StudyConfigurator projectId="proj-1" />);

    expect(screen.getByTestId('create-study-btn')).toBeDisabled();
  });

  it('calls mutation on submit', async () => {
    mockUseQuery.mockReturnValue({ data: mockSoaData, loading: false });
    const onCreated = vi.fn();
    render(<StudyConfigurator projectId="proj-1" onCreated={onCreated} />);

    fireEvent.change(screen.getByTestId('study-name-input'), { target: { value: 'My Study' } });
    fireEvent.change(screen.getByTestId('soa-selector'), { target: { value: 'soa-1' } });
    fireEvent.click(screen.getByTestId('create-study-btn'));

    await waitFor(() => {
      expect(mockCreateStudy).toHaveBeenCalledWith({
        variables: {
          input: {
            projectId: 'proj-1',
            name: 'My Study',
            type: 'STANDALONE',
            soaAnalysisId: 'soa-1',
          },
        },
      });
    });
  });

  it('switches study type to MRMC', () => {
    mockUseQuery.mockReturnValue({ data: mockSoaData, loading: false });
    render(<StudyConfigurator projectId="proj-1" />);

    fireEvent.click(screen.getByTestId('study-type-mrmc'));

    expect(screen.getByTestId('study-type-mrmc')).toBeChecked();
    expect(screen.getByTestId('study-type-standalone')).not.toBeChecked();
  });
});
