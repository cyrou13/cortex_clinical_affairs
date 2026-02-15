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

import { GsprMappingTable } from './GsprMappingTable';

const mockMappings = {
  gsprMappings: [
    {
      id: 'm-1',
      gsprId: 'GSPR-1',
      chapter: 'Chapter 1',
      title: 'Safety requirements',
      status: 'COMPLIANT',
      evidenceRef: 'REF-001',
      justification: 'Meets all safety requirements',
    },
    {
      id: 'm-2',
      gsprId: 'GSPR-2',
      chapter: 'Chapter 1',
      title: 'Performance requirements',
      status: 'PARTIAL',
      evidenceRef: 'REF-002',
      justification: 'Partially meets performance',
    },
    {
      id: 'm-3',
      gsprId: 'GSPR-3',
      chapter: 'Chapter 2',
      title: 'Biocompatibility',
      status: 'NOT_APPLICABLE',
      evidenceRef: '',
      justification: 'Not applicable for software device',
    },
  ],
};

describe('GsprMappingTable', () => {
  const mockAddMapping = vi.fn().mockResolvedValue({
    data: { addGsprMapping: { mappingId: 'm-new', gsprId: 'GSPR-4', status: 'COMPLIANT' } },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockReturnValue([mockAddMapping, { loading: false }]);
  });

  it('renders the GSPR table', () => {
    mockUseQuery.mockReturnValue({ data: mockMappings, loading: false });
    render(<GsprMappingTable studyId="study-1" />);

    expect(screen.getByTestId('gspr-table')).toBeInTheDocument();
  });

  it('displays GSPR rows', () => {
    mockUseQuery.mockReturnValue({ data: mockMappings, loading: false });
    render(<GsprMappingTable studyId="study-1" />);

    expect(screen.getByTestId('gspr-row-GSPR-1')).toBeInTheDocument();
    expect(screen.getByTestId('gspr-row-GSPR-2')).toBeInTheDocument();
    expect(screen.getByTestId('gspr-row-GSPR-3')).toBeInTheDocument();
  });

  it('displays status badges', () => {
    mockUseQuery.mockReturnValue({ data: mockMappings, loading: false });
    render(<GsprMappingTable studyId="study-1" />);

    expect(screen.getByTestId('gspr-status-GSPR-1')).toBeInTheDocument();
    expect(screen.getByTestId('gspr-status-GSPR-2')).toBeInTheDocument();
    expect(screen.getByTestId('gspr-status-GSPR-3')).toBeInTheDocument();
  });

  it('displays justification', () => {
    mockUseQuery.mockReturnValue({ data: mockMappings, loading: false });
    render(<GsprMappingTable studyId="study-1" />);

    expect(screen.getByTestId('gspr-justification-GSPR-1')).toHaveTextContent('Meets all safety requirements');
  });

  it('displays summary bar with counts', () => {
    mockUseQuery.mockReturnValue({ data: mockMappings, loading: false });
    render(<GsprMappingTable studyId="study-1" />);

    expect(screen.getByTestId('gspr-summary')).toBeInTheDocument();
    expect(screen.getByText('1 Compliant')).toBeInTheDocument();
    expect(screen.getByText('1 Partial')).toBeInTheDocument();
    expect(screen.getByText('1 N/A')).toBeInTheDocument();
  });

  it('shows add mapping button', () => {
    mockUseQuery.mockReturnValue({ data: mockMappings, loading: false });
    render(<GsprMappingTable studyId="study-1" />);

    expect(screen.getByTestId('add-mapping-btn')).toBeInTheDocument();
  });

  it('shows filter controls', () => {
    mockUseQuery.mockReturnValue({ data: mockMappings, loading: false });
    render(<GsprMappingTable studyId="study-1" />);

    expect(screen.getByTestId('gspr-filter')).toBeInTheDocument();
    expect(screen.getByTestId('filter-chapter')).toBeInTheDocument();
    expect(screen.getByTestId('filter-status')).toBeInTheDocument();
  });

  it('filters by chapter', () => {
    mockUseQuery.mockReturnValue({ data: mockMappings, loading: false });
    render(<GsprMappingTable studyId="study-1" />);

    fireEvent.change(screen.getByTestId('filter-chapter'), { target: { value: 'Chapter 2' } });

    expect(screen.getByTestId('gspr-row-GSPR-3')).toBeInTheDocument();
    expect(screen.queryByTestId('gspr-row-GSPR-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('gspr-row-GSPR-2')).not.toBeInTheDocument();
  });

  it('filters by status', () => {
    mockUseQuery.mockReturnValue({ data: mockMappings, loading: false });
    render(<GsprMappingTable studyId="study-1" />);

    fireEvent.change(screen.getByTestId('filter-status'), { target: { value: 'COMPLIANT' } });

    expect(screen.getByTestId('gspr-row-GSPR-1')).toBeInTheDocument();
    expect(screen.queryByTestId('gspr-row-GSPR-2')).not.toBeInTheDocument();
    expect(screen.queryByTestId('gspr-row-GSPR-3')).not.toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseQuery.mockReturnValue({ data: null, loading: true });
    render(<GsprMappingTable studyId="study-1" />);

    expect(screen.getByTestId('gspr-loading')).toBeInTheDocument();
  });

  it('shows empty state', () => {
    mockUseQuery.mockReturnValue({ data: { gsprMappings: [] }, loading: false });
    render(<GsprMappingTable studyId="study-1" />);

    expect(screen.getByTestId('no-gspr')).toBeInTheDocument();
  });
});
